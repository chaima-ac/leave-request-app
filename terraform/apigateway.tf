# HTTP API Gateway - with a new name to avoid conflicts
resource "aws_apigatewayv2_api" "leave_api" {
  name          = "LeaveManagementAPI-v2"  # Changed name
  protocol_type = "HTTP"
  
  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]  # Added Authorization
  }
}

# Stage
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.leave_api.id
  name        = "dev"
  auto_deploy = true
}

# Lambda Integration
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.leave_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.leave_api_handler.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# ── Existing Routes ───────────────────────────────────────────────────────────

resource "aws_apigatewayv2_route" "get_requests" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "GET /requests"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "submit_request" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "POST /submit"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "update_status" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "PUT /request-status"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# ── New Routes (auth + employee-scoped requests) ──────────────────────────────

resource "aws_apigatewayv2_route" "register" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "POST /register"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "login" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "POST /login"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "admin_login" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "POST /admin-login"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "my_requests" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "GET /my-requests"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# Lambda Permission
resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.leave_api_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.leave_api.execution_arn}/*/*"
}
