terraform {
  cloud {} # Organization and workspace name are defined via environment variables in CircleCI
}

provider "aws" {
  region = "eu-central-1"

  default_tags {
    tags = {
      (var.project_tag_key) = var.project_tag_value
    }
  }
}
