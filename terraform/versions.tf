terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5"
    }

    archive = {
      source  = "hashicorp/archive"
      version = "~> 2"
    }
  }

  required_version = ">= 1.9.8"
}
