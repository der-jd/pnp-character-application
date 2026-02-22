# pnp-character-application

[![CircleCI](https://circleci.com/gh/der-jd/pnp-character-application.svg?style=shield&circle-token=d13a30ac2283a67c44f5efd1d88fbc07372bacf9)](https://circleci.com/gh/der-jd/pnp-character-application)

Serverless web application for characters of a custom Pen & Paper game.

## Architecture

![Architecture](aws_architecture.png "Architecture")

## Local development setup

- Run `npm install` in the root folder to install dependencies for all packages via `npm workspaces`
- Install the following tools
  - [Terraform](https://developer.hashicorp.com/terraform/install)
  - [tflint](https://github.com/terraform-linters/tflint) --> run `npm run install-lint-terraform`
  - [aws-cli](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) (optional; only necessary for local AWS commands)
- Run `terraform login` to generate an API key for the backend
- Run `terraform init` in the `/terraform` working directory to initialize Terraform
  - Rerun this command if a module or backend configuration for Terraform is set or changed. This will then reinitialize the working directory

## API Schema Testing

This project includes comprehensive multi-environment API schema testing to ensure API compatibility between frontend and backend across all deployment stages.

### Quick Start

```bash
# Complete setup and run LocalStack tests
npm run api-schema-tests
```

### Multi-Environment Testing

```bash
# Test against LocalStack (fast, local development)
npm run api-schema-tests:localstack

# Test against production backend (automatically reads terraform_output)
npm run api-schema-tests:prod

# Run full test suite: LocalStack
npm run api-schema-tests:all
```

**CircleCI Integration**: The pipeline automatically runs API schema validation against LocalStack and production. Set `USER_TEST` and `CHARACTER_TEST` environment variables in CircleCI for production testing.

### Individual Commands

```bash
# Setup LocalStack infrastructure
npm run api-schema-tests:setup

# Run basic LocalStack tests
npm run api-schema-tests:run

# Clean up LocalStack environment
npm run api-schema-tests:clean
```

### Environment-Specific Testing

```bash
# Advanced usage with options
./scripts/run-api-schema-tests-env.sh --env=prod --verbose
```

📚 **[Full API Schema Testing Guide →](API_SCHEMA_TESTING_GUIDE.md)**

## Tech stack

- [Amazon Web Services (AWS)](https://aws.amazon.com/) as cloud provider for the infrastructure
- [Next.js](https://nextjs.org/) for the frontend
- [Node.js](https://nodejs.org/) for the backend
- [CircleCI](https://circleci.com/) for the CI/CD pipeline
- [HCP Terraform Cloud](https://app.terraform.io) for infrastructure as code
