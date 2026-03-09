# Random suffix for unique bucket name
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# S3 Bucket for frontend
resource "aws_s3_bucket" "frontend" {
  bucket = "leave-management-frontend-${random_string.suffix.result}"
  
  tags = {
    Name = "LeaveManagementFrontend"
  }
}

# Enable static website hosting
resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }
}

# Upload frontend files
resource "aws_s3_object" "frontend_files" {
  for_each = fileset("../frontend/", "**/*.{html,css,js}")

  bucket       = aws_s3_bucket.frontend.id
  key          = each.value
  source       = "../frontend/${each.value}"
  content_type = lookup({
    "html" = "text/html",
    "css"  = "text/css",
    "js"   = "application/javascript"
  }, split(".", each.value)[length(split(".", each.value)) - 1], "text/plain")

  etag = filemd5("../frontend/${each.value}")
}