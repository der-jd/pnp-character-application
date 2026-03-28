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

#### Workspace selection

- All workflows derive `TF_WORKSPACE` from the environment parameter

### Component Test Secrets

- `COMPONENT_TESTS_COGNITO_USERNAME`: Test user username for Cognito authentication
- `COMPONENT_TESTS_COGNITO_PASSWORD`: Test user password for Cognito authentication

#### Automatically set via Terraform outputs

- `COMPONENT_TESTS_API_BASE_URL`: Base URL of the API Gateway
- `COMPONENT_TESTS_COGNITO_REGION`: Region of the Cognito user pool
- `COMPONENT_TESTS_COGNITO_APP_CLIENT_ID`: App client ID of the Cognito user pool

### Frontend Build Variables (set automatically from Terraform outputs)

- `VITE_COGNITO_REGION`: Cognito region for the frontend build
- `VITE_COGNITO_APP_CLIENT_ID`: Cognito app client ID for the frontend build
- `VITE_API_BASE_URL`: API base URL for the frontend build
- `FRONTEND_BUCKET_NAME`: S3 bucket name for frontend deployment
- `FRONTEND_BUCKET_REGION`: AWS region of the S3 bucket

### Pipeline Parameters (Optional)

- `run-component-tests`: Set to `true` to run backend component tests for the specified environment (always runs on `main` for prod)
- `delete-services`: Set to `true` to destroy all Terraform resources for the specified environment (use with caution)
- `env`: Target environment (`dev` or `prod`, defaults to `dev`)

## Pipeline Workflows

### `build-deploy-dev`

- Runs on every commit except the special `component-tests` and `delete-services` pipelines
- Deploys the dev environment from `terraform/variables/common.tfvars` and `terraform/variables/dev.tfvars`
- Uses the Terraform Cloud workspace `pnp-app-dev`

### `build-deploy-prod`

- Runs on every commit to `main`
- Deploys prod from `terraform/variables/common.tfvars` and `terraform/variables/prod.tfvars`
- Uses the Terraform Cloud workspace `pnp-app-prod`
- Runs backend component tests after the backend and infrastructure deploy finishes

### Component Tests

- Triggers when `run-component-tests=true`
- Runs backend component tests against the environment specified by the `env` parameter (defaults to `dev`)

### Delete Services

- Triggers when `delete-services=true`
- Destroys the Terraform resources for the environment specified by the `env` parameter (defaults to `dev`)
