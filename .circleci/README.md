# CircleCI Configuration

This directory contains the CircleCI CI/CD pipeline configuration for the application.

## Required Environment Variables

The following environment variables must be configured in CircleCI project settings:

### AWS Authentication

- `AWS_ROLE_ARN`: AWS IAM role ARN for CircleCI to access AWS resources via OIDC

### Terraform Cloud Configuration

- `TF_CLOUD_ORGANIZATION`: Terraform Cloud organization name
- `TF_TOKEN_app_terraform_io`: Terraform Cloud API token
- `TF_WORKSPACE`: Terraform Cloud workspace name (e.g., "prod")
- `TF_VAR_alert_email_address`: Email address for CloudWatch/SNS alert notifications (Terraform variable)

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

- `enable-deployments`: Set to `true` to allow workflows that apply Terraform or upload the frontend to AWS
- `run-component-tests`: Set to `true` to run backend component tests on demand
- `delete-services`: Set to `true` to destroy all Terraform resources (use with caution)

## Pipeline Workflows

### Validate (Default)

- Runs on all branches except when special parameters are set
- Includes formatting checks, linting, building, and tests without deploying to AWS

### Deploy

- Triggers only when `enable-deployments=true`
- Applies Terraform, deploys the frontend, and runs main-branch component tests after deployment

### Component Tests

- Triggers when `run-component-tests=true`
- Runs backend component tests against deployed infrastructure

### Delete Services

- Triggers when `delete-services=true`
- Destroys all AWS resources via Terraform destroy
