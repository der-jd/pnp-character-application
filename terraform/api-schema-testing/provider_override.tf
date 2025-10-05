# LocalStack Provider Override
# This file overrides the AWS provider to point to LocalStack
# All original terraform files remain unchanged

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
  # Override Terraform Cloud backend to use local backend
  backend "local" {}
}

# Override AWS provider to use LocalStack
provider "aws" {
  region                      = "eu-central-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  # Point all AWS services to LocalStack
  endpoints {
    apigateway     = "http://localhost:4566"
    cloudformation = "http://localhost:4566"
    cloudwatch     = "http://localhost:4566"
    dynamodb       = "http://localhost:4566"
    iam            = "http://localhost:4566"
    lambda         = "http://localhost:4566"
    s3             = "http://localhost:4566"
    stepfunctions  = "http://localhost:4566"
    sts            = "http://localhost:4566"
  }
}

# Override table names for LocalStack (use existing local values)
locals {
  characters_table_name = "pnp-app-characters-local"
  history_table_name    = "pnp-app-history-local"
}
