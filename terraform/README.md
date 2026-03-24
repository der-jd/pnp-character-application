# Terraform Infrastructure as Code

This directory contains the Terraform configuration for deploying the infrastructure on AWS.

## Architecture Overview

The application uses a serverless AWS architecture deployed via Terraform Cloud, with the following key components:

### Multi-Region Setup

- **Primary region**: `eu-central-1` for main infrastructure
- **Secondary region**: `us-east-1` for CloudFront certificates
- **Management**: [Terraform Cloud](https://cloud.hashicorp.com/) with workspace configuration via CircleCI environment variables

### Core Infrastructure Components

#### API Gateway Layer

- Regional REST API endpoint for direct application access
- Integrates with multiple character management state machines (Step Functions)
- Authentication and authorization via AWS Cognito

#### Compute Layer

Single Lambda function or Step Function for each API endpoint.
Endpoints that mutate data use Step Functions to combine the update of the character data and the creation of a history record.

#### Authentication & Authorization

- AWS Cognito user pool for user management
- Admin-only user creation with email verification
- JWT token validation in API Gateway

#### Data Storage

- DynamoDB tables for character data and history tracking
- Backup configurations with CloudWatch alerting
- SNS notifications for backup failures and monitoring alerts

#### Frontend Infrastructure

- S3 bucket for static website hosting
- CloudFront distribution with custom domain configuration
- SSL certificate management

#### DNS Management

- Route53 configuration for domain management
- Custom domain setup for API and frontend

#### Monitoring & Alerting

- CloudWatch alarms for backend health monitoring (Lambda, API Gateway, DynamoDB, Step Functions)
- CloudWatch dashboard for visualization of service metrics
- SNS topic for email alerting on alarm state changes
- Account-level metric aggregation to avoid CloudWatch API limits

## Configuration

### Variables

- `env` - Environment identifier
- `project_tag_key`/`project_tag_value` - Project tagging
- `domain_name` - Main application domain
- `api_domain_name` - API-specific domain
- `alert_email_address` - Email for CloudWatch alarm notifications (both backup and monitoring alerts, configured via CircleCI as `TF_VAR_alert_email_address`)

### Outputs

- `aws_region` - Primary AWS region ("eu-central-1")
- `api_versioned_url` - Complete API endpoint URL with version
- `api_version` - API version number
- `cognito_user_pool_id` - Cognito user pool ID (sensitive)
- `cognito_app_client_id` - Cognito app client ID (sensitive)
- `frontend_bucket_name` - S3 bucket name for frontend static assets
- `route53_nameservers` - Route53 nameservers for DNS delegation
- `route53_zone_id` - Route53 hosted zone ID

## Monitoring & Alerting Configuration

**Design Rationale:**

- Account-level metrics avoid CloudWatch's 10-metric-query limit per alarm (which would be exceeded with per-function or per-state-machine metrics)
- `treat_missing_data = "notBreaching"` ensures low-traffic periods show `OK` instead of `INSUFFICIENT_DATA`
- All alarms include `ok_actions` to send "all clear" notifications

### CloudWatch Dashboard

The `pnp-app-backend` dashboard provides detailed visibility about:

- API Gateway endpoints
- Lambda functions
- Step Functions state machines
- DynamoDB tables

### SNS Topic for Alerts

The `pnp-app-alerts-topic` SNS topic in `alerts.tf` is shared by all alerting mechanisms.

All notifications are sent to the email address specified in `TF_VAR_alert_email_address` (CircleCI environment variable).

### Deployment

See [CircleCI configuration](../.circleci/README.md)
