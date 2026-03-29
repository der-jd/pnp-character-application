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
- SNS notifications for backup failures

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
- `alert_email_address` - Email for CloudWatch alarm notifications (configured via CircleCI as `TF_VAR_alert_email_address`)

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

## Environment Removal

Environments can be torn down via the `delete-services` pipeline parameter in CircleCI. This triggers a `terraform destroy` that removes all application resources except protected ones.

### Protected Resources

The following resources are **not destroyed** and must be cleaned up manually if needed:

| Resource                                                                 | Reason                                                                         | Manual Cleanup                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------- |
| **DynamoDB tables** (`pnp-app-characters`, `pnp-app-characters-history`) | Contain user data, `deletion_protection_enabled` + `lifecycle.prevent_destroy` | Disable deletion protection in AWS Console, then delete |
| **Cognito user pool** (`pnp-app-user-pool`)                              | Contains user accounts, `deletion_protection` + `lifecycle.prevent_destroy`    | Disable deletion protection in AWS Console, then delete |
| **Backup vault** (`pnp-app-backup-vault`)                                | Contains recovery points, `lifecycle.prevent_destroy`                          | Delete all recovery points first, then delete the vault |
| **Route53 hosted zone**                                                  | NS records are configured at the domain registrar, `lifecycle.prevent_destroy` | Only delete if you no longer need the domain            |

After the destroy pipeline completes, these resources are removed from Terraform state but still exist in AWS. They are logged in the pipeline output.

### Redeploying After a Teardown

If you deploy a new environment to the same account without cleaning up the protected resources, Terraform will attempt to create new resources with the same names, which will fail. Either:

1. **Clean up first**: Manually delete the leftover protected resources before deploying, or
2. **Import existing resources**: Use `terraform import` to bring existing resources back into the new Terraform state

### Migrating Cognito Users

When setting up a new environment that requires the same users, use the migration script:

```bash
./scripts/migrate_cognito_users.sh \
  --source-pool-id <old_pool_id> \
  --target-pool-id <new_pool_id> \
  --profile <aws_profile> \
  --dry-run  # optional: preview without making changes
```

This migrates user email addresses. **Passwords cannot be migrated** between Cognito pools — users will need to reset their password on first login. **User subs (IDs) change** — Cognito always generates a new sub per pool. The script outputs old-to-new sub mappings. If your application stores data keyed by user sub (e.g. `userId` in DynamoDB), you will need to update those references after migration.

After migration (or after creating new test users), update the component test credentials in CircleCI. See the [CircleCI README](../.circleci/README.md#component-test-secrets) for the relevant environment variables.
