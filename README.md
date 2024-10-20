# pnp-character-application

[![CircleCI](https://circleci.com/gh/der-jd/pnp-character-application.svg?style=shield&circle-token=d13a30ac2283a67c44f5efd1d88fbc07372bacf9)](https://circleci.com/gh/der-jd/pnp-character-application)

Serverless web application for character sheets of a custom Pen & Paper game.

## Architecture

![Architecture](aws_architecture.png "Architecture")

## Local development setup

- Install the following tools
  - [Terraform](https://developer.hashicorp.com/terraform/install)
  - [tflint](https://github.com/terraform-linters/tflint)
  - aws-cli (optional; only necessary for local AWS commands)
- Run `make lint-init-terraform` to install the plugins defined in `.tflint.hcl`
- Run `terraform login` to generate an API key for the backend
- Run `terraform init` in the `/terraform` working directory to initialize Terraform
  - Rerun this command if a module or backend configuration for Terraform is set or changed. This will then reinitialize the working directory

## Tech stack

- [Amazon Web Services (AWS)](https://aws.amazon.com/) for the infrastructure
- Frontend: [React](https://react.dev/) with TypeScript
- [CircleCI](https://circleci.com/) for the CI/CD pipeline
- [HCP Terraform Cloud](https://app.terraform.io) for infrastructure as code
- [tflint](https://github.com/terraform-linters/tflint) as linter for Terraform
