# =============================================
#  KMS Key — encrypts all DynamoDB tables
# =============================================

resource "aws_kms_key" "dynamodb_key" {
  description             = "KMS key for DynamoDB encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name    = "LeaveDesk-DynamoDB-Key"
    Project = "GestionDeConges-Serverless"
  }
}

resource "aws_kms_alias" "dynamodb_key_alias" {
  name          = "alias/leavedesk-dynamodb"
  target_key_id = aws_kms_key.dynamodb_key.key_id
}

# =============================================
#  DynamoDB Table — LeaveRequests
# =============================================

resource "aws_dynamodb_table" "leave_requests" {
  name         = "LeaveRequests"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "request_id"

  attribute {
    name = "request_id"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "employee_id"
    type = "S"
  }

  global_secondary_index {
    name            = "StatusIndex"
    hash_key        = "status"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "employee_id-index"
    hash_key        = "employee_id"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.dynamodb_key.arn
  }

  tags = {
    Name    = "LeaveRequests"
    Project = "GestionDeConges-Serverless"
  }
}

# =============================================
#  DynamoDB Table — Employees
# =============================================

resource "aws_dynamodb_table" "employees" {
  name         = "Employees"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "employee_id"

  attribute {
    name = "employee_id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.dynamodb_key.arn
  }

  tags = {
    Name    = "Employees"
    Project = "GestionDeConges-Serverless"
  }
}

# =============================================
#  DynamoDB Table — Sessions
# =============================================

resource "aws_dynamodb_table" "sessions" {
  name         = "Sessions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "token"

  attribute {
    name = "token"
    type = "S"
  }

  ttl {
    attribute_name = "ttl_epoch"
    enabled        = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.dynamodb_key.arn
  }

  tags = {
    Name    = "Sessions"
    Project = "GestionDeConges-Serverless"
  }
}
# =============================================
#  DynamoDB Table — LeavePolicies
# =============================================

resource "aws_dynamodb_table" "leave_policies" {
  name         = "LeavePolicies"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "policy_key"

  attribute {
    name = "policy_key"
    type = "S"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.dynamodb_key.arn
  }

  tags = {
    Name    = "LeavePolicies"
    Project = "GestionDeConges-Serverless"
  }
}