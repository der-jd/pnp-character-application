terraform {
  cloud {} # Organization and workspace name are defined via environment variables in CircleCI
}

locals {
  prefix                   = "pnp-app"
  suffix                   = var.env
  is_prod                  = var.env == "prod"
  frontend_allowed_origins = local.is_prod ? ["https://${var.domain_name}", "https://www.${var.domain_name}"] : ["https://${var.domain_name}"]
  cors_allowed_origins     = concat(local.frontend_allowed_origins, var.local_development_allowed_origins)
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

provider "aws" {
  region = "eu-central-1"

  default_tags {
    tags = {
      (var.project_tag_key) = var.project_tag_value
      environment           = var.env
    }
  }
}

# Additional provider for us-east-1 (required for CloudFront certificates)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      (var.project_tag_key) = var.project_tag_value
      environment           = var.env
    }
  }
}

output "aws_region" {
  value = "eu-central-1"
}
