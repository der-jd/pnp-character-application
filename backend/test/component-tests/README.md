# Component Tests

## Overview

- Test API endpoints against real AWS services
- Validate authentication and authorization
- Ensure functionality of backend API and component
- Test data is stored in DynamoDB, see `./test-data/`
- **Execution**: Parallel
- **Environment**: Real AWS infrastructure

## Running Tests

### Local Development

Requires local environment variables to be set:

- `COMPONENT_TESTS_API_BASE_URL`
- `COMPONENT_TESTS_COGNITO_REGION`
- `COMPONENT_TESTS_COGNITO_APP_CLIENT_ID`
- `COMPONENT_TESTS_COGNITO_USERNAME`
- `COMPONENT_TESTS_COGNITO_PASSWORD`

See [CircleCI Configuration](../../../.circleci/README.md) for details.

```bash
# Component tests (requires AWS credentials and deployed infrastructure)
npm run test:component --workspace backend

# All tests
npm run test --workspace backend
```
