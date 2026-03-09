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

variable "credentials_file" {
  description = "Path to AWS credentials file"
  type        = string
  default     = "C:\\Users\\USER\\OneDrive - Ministere de l'Enseignement Superieur et de la Recherche Scientifique\\Bureau\\pfa\\leave-request-app\\credentials"
}

variable "admin_password" {
  description = "Password for the admin dashboard login"
  type        = string
  sensitive   = true
}

variable "password_salt" {
  description = "Secret salt used when hashing employee passwords"
  type        = string
  sensitive   = true
}

variable "alert_email" {
  description = "Email address to receive CloudWatch alarm notifications"
  type        = string
}
