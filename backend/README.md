# Backend Development Guide

## Overview

Serverless Node.js backend using AWS Lambda and Step Functions with DynamoDB. Implements event sourcing pattern for character data mutations with history tracking.

The backend is exposed via a REST API to the frontend in the form of AWS API Gateway.

- `./src/lambdas/` contains the source code for each API endpoint
- `./src/core/` contains the core business logic and ruleset

## History System Architecture

All character mutations create immutable history records. This means that a first Lambda function that mutates the character data is linked via a Step Function to a second Lambda function that creates the history record.

## 📋 Ruleset Versioning

The backend implements a comprehensive ruleset versioning system to ensure character data compatibility across different game rule versions.

### Core Components

- **Version Module**: `src/core/version.ts` - Central version validation and management
- **Ruleset Version**: Derived from `backend/package.json` version (source of truth)
- **Character Schema**: Includes `rulesetVersion` field for tracking character version
- **History Integration**: Version changes create `RULESET_VERSION_UPDATED` history records

### ⚠️ Version Management

**The version in `package.json` must be bumped according to Semantic Versioning (SemVer) for each change:**

- **MAJOR** (X.0.0): Breaking changes that require character migration
- **MINOR** (X.Y.0): New features, backward-compatible changes
- **PATCH** (X.Y.Z): Bug fixes, documentation updates

This version is the authoritative source for the ruleset versioning system. All new characters are created with this version, and existing characters are automatically updated when compatible.

### Implementation in Write Endpoints

All character-modifying endpoints follow this pattern:

1. **Early Validation**: Check character version immediately after fetching
2. **Handle Incompatible Versions**: If the character version is incompatible (different major or newer minor/patch), return an error
3. **Auto-Update**: Apply version update if compatible (same major, older minor/patch)
4. **History Record**: Step Function creates a history record for the version update
5. **Response**: Include the additional history record in the API response

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
