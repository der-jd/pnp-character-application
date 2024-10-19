data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "frontend_bucket" {
  bucket = "pnp-character-application-frontend-${data.aws_caller_identity.current.account_id}"

  force_destroy = true

  tags = {
    project     = "pnp-character-application"
    environment = "prod"
  }
}

resource "aws_s3_bucket_website_configuration" "static_website" {
  bucket = aws_s3_bucket.frontend_bucket.bucket

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }
}

output "frontend_bucket_domain_name" {
  value = aws_s3_bucket_website_configuration.static_website.website_endpoint
}
