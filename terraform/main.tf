terraform {
  cloud {} // Organization and workspace name are defined via environment variables in CircleCI
}

provider "aws" {
  region = "eu-central-1"
}