# Random suffix for unique bucket name
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# ── S3 Bucket ─────────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "frontend" {
  bucket        = "leave-management-frontend-${random_string.suffix.result}"
  force_destroy = true

  tags = {
    Name = "LeaveManagementFrontend"
  }
}

# ── Disable "Block all public access" ─────────────────────────────────────────
# Required for static website hosting — AWS blocks public access by default.
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# ── Bucket policy — allow public read on all objects ──────────────────────────
resource "aws_s3_bucket_policy" "frontend_public_read" {
  bucket = aws_s3_bucket.frontend.id

  # Must wait until the public-access block is disabled before applying policy
  depends_on = [aws_s3_bucket_public_access_block.frontend]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
      }
    ]
  })
}

# ── Static website hosting ────────────────────────────────────────────────────
resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  # React Router: all unknown paths return index.html so the SPA handles routing
  error_document {
    key = "index.html"
  }
}

# ── Upload React build files ──────────────────────────────────────────────────
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
