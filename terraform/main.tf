terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
  shared_credentials_files = ["C:\\Users\\USER\\OneDrive - Ministere de l'Enseignement Superieur et de la Recherche Scientifique\\Bureau\\pfa\\leave-request-app\\credentials"]
}

# Get the LabRole
data "aws_iam_role" "lab_role" {
  name = "LabRole"
}