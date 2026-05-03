# Install dependencies targeting Linux x86_64 (required for Lambda)
resource "null_resource" "install_dependencies" {
  triggers = {
    requirements = filemd5("${path.module}/../backend/requirements.txt")
    handler      = filemd5("${path.module}/../backend/handler.py")
  }

  provisioner "local-exec" {
    command     = "pip install -r ${path.module}/../backend/requirements.txt -t ${path.module}/../backend/package --upgrade --no-user --platform manylinux2014_x86_64 --only-binary=:all: --python-version 3.11"
    interpreter = ["cmd", "/C"]
  }
}

# Copy handler.py into the package folder
resource "null_resource" "copy_handler" {
  depends_on = [null_resource.install_dependencies]

  triggers = {
    handler = filemd5("${path.module}/../backend/handler.py")
  }

  provisioner "local-exec" {
    command     = "copy ${path.module}\\..\\backend\\handler.py ${path.module}\\..\\backend\\package\\handler.py"
    interpreter = ["cmd", "/C"]
  }
}

# Zip the package folder (handler + dependencies)
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/package"
  output_path = "${path.module}/lambda_function.zip"

  depends_on = [null_resource.copy_handler]
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
