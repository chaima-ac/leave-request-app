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

  # React Router needs this — all 404s go to index.html
  error_document {
    key = "index.html"
  }
}

# Upload React build files (from frontend-react/dist/)
resource "aws_s3_object" "frontend_files" {
  for_each = fileset("../frontend-react/dist/", "**")

  bucket       = aws_s3_bucket.frontend.id
  key          = each.value
  source       = "../frontend-react/dist/${each.value}"
  content_type = lookup({
    "html" = "text/html",
    "css"  = "text/css",
    "js"   = "application/javascript",
    "json" = "application/json",
    "png"  = "image/png",
    "jpg"  = "image/jpeg",
    "svg"  = "image/svg+xml",
    "ico"  = "image/x-icon",
    "txt"  = "text/plain"
  }, split(".", each.value)[length(split(".", each.value)) - 1], "application/octet-stream")

  etag = filemd5("../frontend-react/dist/${each.value}")
}
