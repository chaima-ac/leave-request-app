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

  # S3 backend — stores tfstate in S3 so both
  # your PC and GitHub Actions share the same state
  backend "s3" {
    bucket = "leavedesk-tfstate-chaima"
    key    = "terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
  # Credentials are picked up automatically from:
  # - Local: ~/.aws/credentials
  # - CI/CD: AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY env vars
}

# Get the LabRole
data "aws_iam_role" "lab_role" {
  name = "LabRole"
}
