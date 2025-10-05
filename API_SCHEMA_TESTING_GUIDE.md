# API Schema Testing Guide

This guide covers the comprehensive API schema testing strategy for the PnP Character Application, supporting testing against LocalStack, staging, and production environments.

## Overview

Our API schema testing strategy follows a **dual-environment approach** to catch different types of issues:

1. **LocalStack** - Fast local testing for development
2. **Production** - Data drift and compatibility validation

## Testing Strategy

### 1. LocalStack Testing (Development)

- **Purpose**: Fast feedback during development
- **Coverage**: Full test suite including destructive operations
- **Data**: Mock data, controlled test scenarios
- **Speed**: Very fast (~30 seconds)

```bash
npm run api-schema-tests:localstack
```

### 2. Production Testing (Validation)

- **Purpose**: Detect data drift and ensure prod compatibility
- **Coverage**: Read-only operations only
- **Data**: Dedicated test data in production
- **Speed**: Slower (~5 minutes)
- **Safety**: Requires confirmation, read-only access

```bash
npm run api-schema-tests:prod
```

## Environment Setup

### LocalStack Environment

Automatically configured by the setup script:

```bash
npm run api-schema-tests:setup
```

### Production Environment

**CircleCI (Automatic)**:
Set these in CircleCI project settings:

- `USER_TEST`: Test user ID for production API schema testing
- `CHARACTER_TEST`: Test character ID for production API schema testing

Configuration is automatically read from `terraform/terraform_output` when running:

```bash
npm run api-schema-tests:prod
```

**Manual Configuration**:
Create `.env.production` in the frontend directory:

```bash
cp frontend/.env.production.example frontend/.env.production
# Edit with your production API Gateway URL, API keys, etc.
```

**Terraform Output Integration**:
The system automatically reads these Terraform outputs:

- `api_gateway_url` - Production API Gateway URL
- `aws_region` - AWS region
- `cognito_user_pool_id` - Cognito User Pool ID
- `cognito_app_client_id` - Cognito App Client ID

⚠️ **Production Safety**: Production testing requires manual confirmation and should only use dedicated test data.

## Test Types

### 1. Schema Validation Tests

Validate that API responses match the expected Zod schemas:

```typescript
test("API response matches schema", async () => {
  const response = await callAPI(request);
  const validation = ResponseSchema.safeParse(response);
  expect(validation.success).toBe(true);
});
```

### 2. Breaking Change Detection

Detect when API changes break frontend expectations:

```typescript
test("Critical fields exist", async () => {
  const response = await callAPI(request);
  expect(response.characterId).toBeDefined();
  expect(response.level.old.value).toBeTypeOf("number");
});
```

### 3. Data Drift Detection (Production)

Ensure production data matches expected schemas:

```typescript
test("Production data follows schema", async () => {
  const response = await callRealAPI(request);
  // Validates that old production data still matches current schemas
  expect(ResponseSchema.safeParse(response).success).toBe(true);
});
```

## Recommended Workflow

### During Development

```bash
# 1. Run LocalStack tests frequently during development
npm run api-schema-tests:localstack

# 2. Run full LocalStack suite before commits
npm run api-schema-tests
```

### Before Deployment

```bash
# 1. Ensure LocalStack tests pass
npm run api-schema-tests:localstack

# 2. Run comprehensive test suite
npm run api-schema-tests:all
```

### After Deployment

```bash
# Validate production compatibility
npm run api-schema-tests:prod
```

## Troubleshooting

### LocalStack Issues

- **Setup Problems**: Run `npm run api-schema-tests:setup` again
- **Port Conflicts**: Check if LocalStack is already running
- **Lambda Errors**: Check Lambda logs in LocalStack

### Production Issues

- **Authentication**: Verify OIDC token is available
- **Network**: Check API Gateway accessibility
- **Permissions**: Ensure test data IDs are valid

### Common Error Messages

#### "API endpoint not accessible"

- Check environment file configuration
- Verify API Gateway URL is correct
- Test authentication credentials

#### "Schema validation failed"

- API response structure changed
- New fields added without updating schemas
- Data type changes in backend

#### "Breaking change detected"

- Required fields removed from API
- Field names changed
- Response structure modified

## Best Practices

### 1. Test Data Management

- Use dedicated test data for each environment
- Never modify production user data
- Clean up test data after staging tests

### 2. Schema Evolution

- Update schemas when API legitimately changes
- Use semantic versioning for breaking changes
- Document schema changes in commit messages

### 3. Environment Isolation

- Keep environment credentials secure
- Use separate API keys for each environment
- Rotate test credentials regularly

### 4. Test Maintenance

- Review and update tests when API changes
- Remove obsolete tests for deprecated endpoints
- Add tests for new API endpoints

## Advanced Usage

### Custom Environment Testing

```bash
./scripts/run-api-schema-tests-env.sh --env=staging --verbose
```

### Debug Mode

```bash
# Enable verbose output for debugging
API_ENVIRONMENT=staging VITEST_VERBOSE=true npm run api-schema-tests:staging
```

### Selective Test Execution

```bash
# Run only specific test files
npx vitest run src/test/api-schema/level-up-*.test.ts
```

## Integration with CI/CD

### CircleCI Integration (Built-in)

The project includes built-in CircleCI integration that automatically:

1. **Generates terraform_output**: After Terraform deployment, exports infrastructure details
2. **Validates API Schema**: Runs LocalStack baseline tests and prepares production config
3. **Verifies Configuration**: Ensures deployed infrastructure is properly configured

The CircleCI pipeline includes:

```yaml
# After infrastructure deployment
- run-api-schema-tests:
    requires:
      - deploy-backend-and-infrastructure
```

This job:

- ✅ Uses `terraform/terraform_output` from deployed infrastructure
- ✅ Generates production `.env.production` automatically
- ✅ Runs LocalStack baseline validation
- ✅ Prepares production testing configuration

### Manual CI/CD Integration

For other CI/CD systems:

```yaml
# GitHub Actions Example
- name: API Schema Tests - LocalStack
  run: npm run api-schema-tests:localstack

- name: API Schema Tests - Production
  run: npm run api-schema-tests:prod
  env:
    USER_TEST: ${{ secrets.USER_TEST }}
    CHARACTER_TEST: ${{ secrets.CHARACTER_TEST }}
```

### Pre-deployment Validation

```bash
# In CI/CD pipeline before production deployment
npm run api-schema-tests:all
```

### CircleCI terraform_output Integration

The CircleCI pipeline generates `terraform/terraform_output` with:

```bash
export NEXT_PUBLIC_COGNITO_REGION=eu-central-1
export NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-central-1_xxxxxx
export NEXT_PUBLIC_COGNITO_APP_CLIENT_ID=xxxxxxxxxx
export NEXT_PUBLIC_API_BASE_URL=https://xxxxx.execute-api.eu-central-1.amazonaws.com/prod
```

### CircleCI Environment Variables

For production API schema testing, set these in CircleCI project settings:

| Variable         | Purpose                                  | Example                 |
| ---------------- | ---------------------------------------- | ----------------------- |
| `USER_TEST`      | Test user ID for production testing      | `user-test-abc123...`   |
| `CHARACTER_TEST` | Test character ID for production testing | `123e4567-e89b-12d3...` |

Authentication uses CircleCI OIDC tokens automatically - no manual JWT configuration needed.

This ensures API compatibility across all environments before any production deployment.
