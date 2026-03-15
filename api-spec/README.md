# API Documentation

This document outlines all available endpoints of the backend API.

## Base URL

All endpoints are relative to the API base URL.

## Authentication

All endpoints require authentication headers. See `./src/headers.ts` for the required authentication schema.

## 📋 API Versioning

- **API Version**: extracted from `api-spec/package.json` version
- **URL Format**: `https://{api_domain_name}/v1/{endpoint}`

### ⚠️ Version Management

**The version in `package.json` must be bumped according to Semantic Versioning (SemVer) for each change:**

- **MAJOR** (X.0.0): Breaking changes in API contracts, request/response schemas
- **MINOR** (X.Y.0): New endpoints, new optional fields, backward-compatible additions
- **PATCH** (X.Y.Z): Bug fixes, documentation updates, internal improvements

## API Endpoints

### Character Management

- `GET /characters` - Get user's characters
- `GET /characters/{character-id}` - Get specific character
- `POST /characters` - Create new character
- `DELETE /characters/{character-id}` - Delete character
- `POST /characters/{character-id}/clone` - Clone character

### Character Data

- `PATCH /characters/{character-id}/attributes/{attribute-name}` - Update attribute (idempotent)
- `PATCH /characters/{character-id}/base-values/{base-value-name}` - Update base value (idempotent)
- `PATCH /characters/{character-id}/skills/{skill-category}/{skill-name}` - Update skill (idempotent)
- `PATCH /characters/{character-id}/combat-stats/{combat-category}/{combat-skill-name}` - Update combat stats (idempotent)
- `PATCH /characters/{character-id}/calculation-points` - Update calculation points (idempotent)
- `POST /characters/{character-id}/special-abilities` - Add special ability (idempotent)

### Level System

- `GET /characters/{character-id}/level-up` - Get level-up options
- `POST /characters/{character-id}/level-up` - Apply level-up

### Information

- `GET /characters/{character-id}/history` - Get character history
- `GET /characters/{character-id}/skills/{skill-category}/{skill-name}` - Get skill info

### History Management

- `PATCH /characters/{character-id}/history/{record-id}` - Update history comment (idempotent)
- `DELETE /characters/{character-id}/history/{record-id}` - Revert history record

### Error Handling

All endpoints return appropriate HTTP status codes and error messages for validation failures, authentication errors, and business logic violations.

## 🔄 Idempotency

### Version Update Caveat

While the endpoints listed above are designed to be idempotent, if the character's ruleset version differs from the backend's current ruleset version, these endpoints may not be fully idempotent as they trigger an automatic version bump, which creates a version update history record in addition to the main operation.

See [Ruleset Versioning](../backend/README.md#-ruleset-versioning) specification for more details.
