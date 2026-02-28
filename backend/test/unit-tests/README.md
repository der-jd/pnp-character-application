# Unit Tests

## Overview

- Test business logic of Lambda functions in isolation
- Sequential execution (prevents race conditions)
- Mock AWS SDK
- Local test data: `./test-data/`

## Running Tests

### Local Development

```bash
# Unit tests (fast, no AWS credentials needed)
npm run test:unit --workspace backend

# Watch mode for development
npm run test:unit:watch --workspace backend
```
