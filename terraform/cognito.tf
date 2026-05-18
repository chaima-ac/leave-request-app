resource "aws_cognito_user_pool" "main" {
  name = "leavedesk-user-pool"

  auto_verified_attributes = []

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = false
    require_uppercase                = false
    temporary_password_validity_days = 7
  }

  mfa_configuration = "OFF"

  schema {
    name                = "role"
    attribute_data_type = "String"
    mutable             = true
    required            = false
    string_attribute_constraints {
      min_length = 1
      max_length = 50
    }
  }

  schema {
    name                = "employee_id"
    attribute_data_type = "String"
    mutable             = true
    required            = false
    string_attribute_constraints {
      min_length = 1
      max_length = 100
    }
  }

  tags = {
    Project = var.project_name
  }
}

resource "aws_cognito_user_pool_client" "spa" {
  name         = "leavedesk-spa-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  read_attributes = [
    "email",
    "name",
    "custom:role",
    "custom:employee_id"
  ]
}
resource "aws_cognito_user" "admin" {
  user_pool_id = aws_cognito_user_pool.main.id
  username     = var.admin_email

  attributes = {
    email                = var.admin_email
    email_verified       = "true"
    "custom:role"        = "admin"
    "custom:employee_id" = "admin"
    name                 = "Admin"
  }

  password       = var.admin_password
  message_action = "SUPPRESS"
}