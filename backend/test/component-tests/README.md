# Component Tests

## Overview

The component tests test the functionality of the backend component by calling the API endpoints against the real AWS environment including authentication and authorization. The tests only test the interface of the backend component and not the implementation details.

## Test Structure and Setup

- Top level **`beforeAll`**: Initializes local test context which sets up authentication for the test user and loads the seed test character data
- All test files run in **parallel**

### Test File Organization

Each test file follows a consistent structure (except for some special cases):

- **`beforeAll`**: Clones the seed character and history items -> each file has its own, temporary character and history that is shared for all tests in the file
- **`afterAll`**: Cleans up the local test context by deleting the cloned test character and history items.
- **`afterEach`**: Updates local test context to keep it synchronized with backend state (for tests that modify data) and compares the local state with the backend state.
- **`describe.sequential`**: Ensures tests within a file run sequentially to maintain state consistency and avoid race conditions because each test case modifies the same character.

### Test Context Management

Tests share a single, temporary character per file to ensure isolation between test files but reduce the amount of data that needs to be cloned and deleted for each test case.

**Seed characters and history items**: permanently persisted in DynamoDB. Never used directly by tests.

**Cloned characters and history items**: deleted after each test file (temporary)

## Initial Setup

- Create a test user in Cognito by running `scripts/create_user_for_cognito.sh`
- Set the required [environment variables](../../../.circleci/README.md#component-test-secrets) in CircleCI
- Create seed characters and history items: Manually copy the test data from `./test-data` to DynamoDB

## Running Tests

### Local Development

Requires environment variables to be set locally:

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
