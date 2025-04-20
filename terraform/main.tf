terraform {
  cloud {} // Organization and workspace name are defined via environment variables in CircleCI
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

provider "aws" {
  region = "eu-central-1"

  default_tags {
    tags = {
      project     = "pnp-character-application"
      environment = "prod"
    }
  }
}

output "aws_region" {
  value = "eu-central-1"
}
