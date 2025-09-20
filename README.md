# pnp-character-application

[![CircleCI](https://circleci.com/gh/der-jd/pnp-character-application.svg?style=shield&circle-token=d13a30ac2283a67c44f5efd1d88fbc07372bacf9)](https://circleci.com/gh/der-jd/pnp-character-application)

Serverless web application for characters of a custom Pen & Paper game.

## Architecture

![Architecture](aws_architecture.png "Architecture")

## Local development setup

- Install the following tools
  - [Terraform](https://developer.hashicorp.com/terraform/install)
  - [tflint](https://github.com/terraform-linters/tflint) --> run `npm run install-lint-terraform`
  - [aws-cli](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) (optional; only necessary for local AWS commands)
- Run `terraform login` to generate an API key for the backend
- Run `terraform init` in the `/terraform` working directory to initialize Terraform
  - Rerun this command if a module or backend configuration for Terraform is set or changed. This will then reinitialize the working directory

## Tech stack

- [Amazon Web Services (AWS)](https://aws.amazon.com/) as cloud provider for the infrastructure
- [Next.js](https://nextjs.org/) for the frontend
- [Node.js](https://nodejs.org/) for the backend
- [CircleCI](https://circleci.com/) for the CI/CD pipeline
- [HCP Terraform Cloud](https://app.terraform.io) for infrastructure as code
