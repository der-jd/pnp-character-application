# Backend Development Guide

## Overview

Serverless Node.js backend using AWS Lambda and Step Functions with DynamoDB. Implements event sourcing pattern for character data mutations with history tracking.

The backend is exposed via a REST API to the frontend in the form of AWS API Gateway.

- `./src/lambdas/` contains the source code for each API endpoint
- `./src/core/` contains the core business logic and ruleset

## History System Architecture

All character mutations create immutable history records. This means that a first Lambda function that mutates the character data is linked via a Step Function to a second Lambda function that creates the history record.

## Lambda Package Structure

Each Lambda is independently deployable with minimal dependencies:

```
lambda-name/
├── package.json        # Lambda-specific deps only
└── index.mjs           # Main business logic
```

## Testing Strategy

### Unit Tests

See [Unit Tests](./test/unit-tests/README.md) for details.

### Component Tests

See [Component Tests](./test/component-tests/README.md) for details.

## Deployment Notes

- **Terraform**:
  - Lambda configuration in `../terraform/lambdas.tf`
  - Step Function configuration in `../terraform/state-machine-...tf`
- **Build Process**: `build-backend.mjs` bundles each Lambda independently
