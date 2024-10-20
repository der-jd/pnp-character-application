data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "frontend_bucket" {
  bucket = "pnp-character-application-frontend-${data.aws_caller_identity.current.account_id}"

  force_destroy = true
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

resource "aws_s3_bucket_policy" "frontend_bucket_policy" {
  bucket = aws_s3_bucket.frontend_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = "s3:GetObject"
        Effect   = "Allow"
        Resource = "${aws_s3_bucket.frontend_bucket.arn}/*"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.oai.iam_arn
        }
      }
    ]
  })
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.frontend_distribution.domain_name
}

output "frontend_bucket_domain_name" {
  value = aws_s3_bucket_website_configuration.static_website.website_endpoint
}
