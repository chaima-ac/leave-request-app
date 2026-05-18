output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = "${aws_apigatewayv2_api.leave_api.api_endpoint}/dev"
}

output "frontend_url" {
  description = "S3 website URL"
  value       = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
}

output "dynamodb_table" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.leave_requests.name
}
output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "Cognito App Client ID"
  value       = aws_cognito_user_pool_client.spa.id
}