# Terraform Infrastructure as Code

This directory contains the Terraform configuration for deploying the infrastructure on AWS, organized into two root modules:

- **[`app/`](app/)** — Per-environment application infrastructure (API Gateway, Lambda, DynamoDB, CloudFront, etc.), deployed with separate Terraform Cloud workspaces per environment
- **[`shared/`](shared/)** — Shared infrastructure that persists independently of environments (Route53 hosted zone), deployed with its own Terraform Cloud workspace

## Architecture Overview

The application uses a serverless AWS architecture deployed via [Terraform Cloud](https://cloud.hashicorp.com/) with separate workspaces per environment and one for shared infrastructure.

The infrastructure setup includes the following components:

### Multi-Region Setup

- **Primary region**: `eu-central-1` for main infrastructure
- **Secondary region**: `us-east-1` for CloudFront certificates

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

- Route53 hosted zone managed in a [shared root module](shared/) that persists independently of per-environment infrastructure
- Per-environment DNS records and certificates for API and frontend custom domains

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
- `daily_backup_retention_days` - Retention period in days for daily backups
- `monthly_backup_retention_days` - Retention period in days for monthly backups
- `alert_email_address` - Email for CloudWatch alarm notifications (configured via CircleCI as `TF_VAR_alert_email_address`)

Shared defaults live in `terraform/app/variables/common.tfvars`. Environment-specific overrides live in `terraform/app/variables/prod.tfvars` and `terraform/app/variables/dev.tfvars`.

### Outputs

- `aws_region` - Primary AWS region (`eu-central-1`)
- `api_versioned_url` - Complete API endpoint URL with version
- `api_version` - API version number
- `cognito_user_pool_id` - Cognito user pool ID (sensitive)
- `cognito_app_client_id` - Cognito app client ID (sensitive)
- `frontend_bucket_name` - S3 bucket name for frontend static assets

The shared root module (`terraform/shared/`) provides:

- `route53_nameservers` - Route53 nameservers for DNS delegation
- `route53_zone_id` - Route53 hosted zone ID

## Shared Infrastructure

The `terraform/shared/` directory is a separate Terraform root module that manages resources shared across all environments. It uses its own Terraform Cloud workspace and is deployed before any per-environment infrastructure.

Currently managed in the shared module:

- **Route53 hosted zone** — NS records are configured at the domain registrar, so the zone must persist even when individual environments are torn down

Per-environment root modules reference the hosted zone via a data source and only manage their own DNS records and certificates.

## Multi-Environment Notes

- Resource names follow the pattern `prefix-name-suffix`, using `pnp-app` as the prefix and the environment as the suffix
- The Route 53 hosted zone is managed in the [shared root module](shared/) and referenced by all environments via a data source
- Backups and monitoring are enabled in every environment, with shorter backup retention in dev than in prod

## Monitoring & Alerting Configuration

**Design Rationale:**

- Account-level metrics avoid CloudWatch's 10-metric-query limit per alarm (which would be exceeded with per-function or per-state-machine metrics)
- `treat_missing_data = "notBreaching"` ensures low-traffic periods show `OK` instead of `INSUFFICIENT_DATA`
- All alarms include `ok_actions` to send "all clear" notifications

### CloudWatch Dashboard

The `${local.prefix}-backend-${local.suffix}` dashboard provides detailed visibility about:

- API Gateway endpoints
- Lambda functions
- Step Functions state machines
- DynamoDB tables

### SNS Topic for Alerts

The `${local.prefix}-alerts-topic-${local.suffix}` SNS topic in `alerts.tf` is shared by all alerting mechanisms within an environment.

All notifications are sent to the email address specified in `TF_VAR_alert_email_address` (CircleCI environment variable).

### Deployment

See [CircleCI configuration](../.circleci/README.md)

## Environment Removal

Environments can be torn down via the `delete-services` pipeline parameter in CircleCI. This triggers a `terraform destroy` that removes all per-environment application resources except protected ones.

The Route53 hosted zone is **not affected** by environment teardowns — it lives in the [shared root module](shared/) with its own Terraform state.

### Protected Resources

The following per-environment resources are **not destroyed** and must be cleaned up manually if needed:

| Resource                                                                 | Reason                                                                         | Manual Cleanup                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------- |
| **DynamoDB tables** (`pnp-app-characters`, `pnp-app-characters-history`) | Contain user data, `deletion_protection_enabled` + `lifecycle.prevent_destroy` | Disable deletion protection in AWS Console, then delete |
| **Cognito user pool** (`pnp-app-user-pool`)                              | Contains user accounts, `deletion_protection` + `lifecycle.prevent_destroy`    | Disable deletion protection in AWS Console, then delete |
| **Backup vault** (`pnp-app-backup-vault`)                                | Contains recovery points, `lifecycle.prevent_destroy`                          | Delete all recovery points first, then delete the vault |

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
