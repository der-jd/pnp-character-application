terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
  }

  required_version = ">= 1.2.0"
}

provider "aws" {
  region  = "eu-central-1"
}


resource "aws_s3_bucket" "frontend_bucket" {
  bucket = "pnp-character-tool-frontend-${data.aws_caller_identity.current.account_id}"

  force_destroy = true

  tags = {
    Project = "pnp-character-tool"
    Environment = "production"
  }
}

resource "aws_s3_bucket_website_configuration" "static_website" {
  bucket = aws_s3_bucket.frontend_bucket

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }
}

output "frontend_bucket_domain_name" {
  value = aws_s3_bucket.static_site_bucket.website_endpoint
}
