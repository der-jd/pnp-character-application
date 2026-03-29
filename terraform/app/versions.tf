terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6"
    }

    archive = {
      source  = "hashicorp/archive"
      version = "~> 2"
    }

    local = {
      source  = "hashicorp/local"
      version = "~> 2"
    }
  }

  required_version = "~> 1"
}
