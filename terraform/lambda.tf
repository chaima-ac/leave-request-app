# Pip + handler into backend/package. Runs on apply (local dev).
# GitHub Actions also builds backend/package before terraform plan because
# data.archive_file evaluates at plan time — see .github/workflows/deploy.yml
resource "null_resource" "lambda_package" {
  triggers = {
    requirements = filemd5("${path.module}/../backend/requirements.txt")
    handler      = filemd5("${path.module}/../backend/handler.py")
  }

  provisioner "local-exec" {
    environment = {
      HANDLER_SRC = abspath("${path.module}/../backend/handler.py")
      HANDLER_DST = abspath("${path.module}/../backend/package/handler.py")
    }
    command = "pip install -r ${path.module}/../backend/requirements.txt -t ${path.module}/../backend/package --upgrade --no-user --platform manylinux2014_x86_64 --only-binary=:all: --python-version 3.11 && python -c \"import shutil, os, pathlib; pathlib.Path(os.environ['HANDLER_DST']).parent.mkdir(parents=True, exist_ok=True); shutil.copyfile(os.environ['HANDLER_SRC'], os.environ['HANDLER_DST'])\""
  }
}

# Zip the package folder (handler + dependencies)
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/package"
  output_path = "${path.module}/lambda_function.zip"

  depends_on = [null_resource.lambda_package]
}

# Lambda function
resource "aws_lambda_function" "leave_api_handler" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "LeaveRequestHandler"
  role             = data.aws_iam_role.lab_role.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.11"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 30

  environment {
    variables = {
      DYNAMODB_TABLE  = aws_dynamodb_table.leave_requests.name
      EMPLOYEES_TABLE = aws_dynamodb_table.employees.name
      POLICIES_TABLE  = aws_dynamodb_table.leave_policies.name
      SESSIONS_TABLE  = aws_dynamodb_table.sessions.name
      ADMIN_PASSWORD  = var.admin_password
    }
  }
}