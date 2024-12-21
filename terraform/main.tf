variable "aws_region" {
  type    = string
  default = "eu-central-1"
}

terraform {
  cloud {} // Organization and workspace name are defined via environment variables in CircleCI
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      project     = "pnp-character-application"
      environment = "prod"
    }
  }
}
