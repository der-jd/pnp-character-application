terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.33"
    }

    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }

    local = {
      source  = "hashicorp/local"
      version = "~> 2.7"
    }
  }

  required_version = ">= 1.14.5"
}
