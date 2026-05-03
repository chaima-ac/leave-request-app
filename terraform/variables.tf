variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "GestionDeConges-Serverless"
}

variable "environment" {
  description = "Environment"
  type        = string
  default     = "Dev-School-Project"
}

variable "admin_password" {
  description = "Password for the admin dashboard login"
  type        = string
  sensitive   = true
}

variable "alert_email" {
  description = "Email address to receive CloudWatch alarm notifications"
  type        = string
}
