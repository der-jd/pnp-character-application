# CircleCI Configuration

This directory contains the CircleCI CI/CD pipeline configuration for the application.

## Required Environment Variables

The following environment variables must be configured in CircleCI project settings:

### AWS Authentication

- `AWS_ROLE_ARN`: AWS IAM role ARN for CircleCI to access AWS resources via OIDC

### Terraform Cloud Configuration

- `TF_CLOUD_ORGANIZATION`: Terraform Cloud organization name
- `TF_TOKEN_app_terraform_io`: Terraform Cloud API token
- `TF_VAR_alert_email_address`: Email address for CloudWatch/SNS alert notifications (Terraform variable)
- `TF_WORKSPACE_shared`: Terraform Cloud workspace name for the shared infrastructure
- `TF_WORKSPACE_dev`: Terraform Cloud workspace name for the dev environment
- `TF_WORKSPACE_prod`: Terraform Cloud workspace name for the prod environment

All workflows derive `TF_WORKSPACE` from the environment parameter and set it automatically.

### Component Test Secrets

- `COMPONENT_TESTS_COGNITO_USERNAME_dev`: Test user username for Cognito authentication in dev environment
- `COMPONENT_TESTS_COGNITO_PASSWORD_dev`: Test user password for Cognito authentication in dev environment
- `COMPONENT_TESTS_COGNITO_USERNAME_prod`: Test user username for Cognito authentication in prod environment
- `COMPONENT_TESTS_COGNITO_PASSWORD_prod`: Test user password for Cognito authentication in prod environment

`COMPONENT_TESTS_COGNITO_USERNAME` and `COMPONENT_TESTS_COGNITO_PASSWORD` are derived from the environment parameter and set automatically.

#### Automatically set via Terraform outputs

- `COMPONENT_TESTS_API_BASE_URL`: Base URL of the API Gateway
- `COMPONENT_TESTS_COGNITO_REGION`: Region of the Cognito user pool
- `COMPONENT_TESTS_COGNITO_APP_CLIENT_ID`: App client ID of the Cognito user pool

### Frontend Build Variables (automatically set via Terraform outputs)

- `VITE_COGNITO_REGION`: Cognito region for the frontend build
- `VITE_COGNITO_APP_CLIENT_ID`: Cognito app client ID for the frontend build
- `VITE_API_BASE_URL`: API base URL for the frontend build
- `FRONTEND_BUCKET_NAME`: S3 bucket name for frontend deployment
- `FRONTEND_BUCKET_REGION`: AWS region of the S3 bucket

## Pipeline Parameters (Optional)

- `run-component-tests`: Set to `true` to run backend component tests for the specified environment (always runs on `main` for prod)
- `delete-services`: Set to `true` to destroy all Terraform resources for the specified environment (use with caution)
- `deploy-shared`: Set to `true` to deploy the shared infrastructure (Route53 hosted zone). Use when files in `terraform/shared/` change.
- `env`: Target environment (`dev` or `prod`, defaults to `dev`)

## Pipeline Workflows

### `build-deploy-dev`

- Runs on every commit except the special `deploy-shared`, `component-tests` and `delete-services` pipelines
- Deploys the dev environment

### `build-deploy-prod`

- Runs on every commit to `main` except the special `deploy-shared`, `component-tests` and `delete-services` pipelines
- Deploys the prod environment
- Runs backend component tests after the backend and infrastructure deploy finishes

### Deploy Shared Infrastructure

- Triggers when `deploy-shared=true`
- Deploys the shared infrastructure (`terraform/shared/`) which manages the Route53 hosted zone
- Must be triggered manually when files in `terraform/shared/` change
- Runs independently of the dev/prod deployment workflows to avoid Terraform state lock conflicts

### Component Tests

- Triggers when `run-component-tests=true`
- Runs backend component tests against the environment specified by the `env` parameter (defaults to `dev`)

### Delete Services

- Triggers when `delete-services=true`
- Destroys the Terraform resources for the environment specified by the `env` parameter (defaults to `dev`)
