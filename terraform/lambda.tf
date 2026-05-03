# Zip the Python code
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/../backend/handler.py"
  output_path = "${path.module}/lambda_function.zip"
}

# Lambda function
resource "aws_lambda_function" "leave_api_handler" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "LeaveRequestHandler"
  role             = data.aws_iam_role.lab_role.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.9"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 30

  environment {
    variables = {
      DYNAMODB_TABLE  = aws_dynamodb_table.leave_requests.name
      EMPLOYEES_TABLE = aws_dynamodb_table.employees.name
      POLICIES_TABLE = aws_dynamodb_table.leave_policies.name
      SESSIONS_TABLE  = aws_dynamodb_table.sessions.name
      ADMIN_PASSWORD  = var.admin_password
      PASSWORD_SALT   = var.password_salt
    }
  }
}
