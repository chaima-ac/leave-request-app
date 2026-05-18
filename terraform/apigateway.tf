# HTTP API Gateway
resource "aws_apigatewayv2_api" "leave_api" {
  name          = "LeaveManagementAPI-v2"
  protocol_type = "HTTP"
  
  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
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

# Lambda Permission
resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.leave_api_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.leave_api.execution_arn}/*/*"
}
# ── Cognito JWT Authorizer ────────────────────────────────────────────────────
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.leave_api.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "cognito-authorizer"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.spa.id]
    issuer   = "https://cognito-idp.${var.region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
  }
}
# ── Auth ──────────────────────────────────────────────────────────────────────
resource "aws_apigatewayv2_route" "register" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "POST /register"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "login" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "POST /login"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "admin_login" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "POST /admin-login"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# ── Employee ──────────────────────────────────────────────────────────────────
resource "aws_apigatewayv2_route" "my_requests" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "GET /my-requests"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "my_balance" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "GET /my-balance"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "submit_request" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "POST /submit"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "cancel_request" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "PUT /cancel-request"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# ── Manager ───────────────────────────────────────────────────────────────────
resource "aws_apigatewayv2_route" "manager_review" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "PUT /manager-review"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# ── HR ────────────────────────────────────────────────────────────────────────
resource "aws_apigatewayv2_route" "hr_review" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "PUT /hr-review"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# ── Shared ────────────────────────────────────────────────────────────────────
resource "aws_apigatewayv2_route" "get_requests" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "GET /requests"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# ── Leave Policy ──────────────────────────────────────────────────────────────
resource "aws_apigatewayv2_route" "get_leave_policy" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "GET /leave-policy"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "put_leave_policy" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "PUT /leave-policy"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# ── Admin User Management ─────────────────────────────────────────────────────
resource "aws_apigatewayv2_route" "create_user" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "POST /admin/create-user"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "get_users" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "GET /admin/users"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "update_user" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "PUT /admin/update-user"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "delete_user" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "DELETE /admin/delete-user"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "delete_request" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "DELETE /admin/delete-request"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "admin_stats" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "GET /admin/stats"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "update_balance" {
  api_id    = aws_apigatewayv2_api.leave_api.id
  route_key = "PUT /admin/update-balance"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}
resource "aws_apigatewayv2_route" "get_notifications" {
  api_id             = aws_apigatewayv2_api.leave_api.id
  route_key          = "GET /notifications"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "read_notification" {
  api_id             = aws_apigatewayv2_api.leave_api.id
  route_key          = "PUT /notifications/read"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}