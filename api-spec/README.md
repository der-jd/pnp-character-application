# API Documentation

This document outlines all available endpoints of the backend API.

## Base URL

All endpoints are relative to the API base URL.

## Authentication

All endpoints require authentication headers. See `./src/headers.ts` for the required authentication schema.

## 📋 Versioning

- **API Version**: extracted from `api-spec/package.json` version
- **URL Format**: `https://{api_domain_name}/v1/{endpoint}`

## API Endpoints

### Character Management

- `GET /characters` - Get user's characters
- `GET /characters/{character-id}` - Get specific character
- `POST /characters` - Create new character
- `DELETE /characters/{character-id}` - Delete character
- `POST /characters/{character-id}/clone` - Clone character

### Character Data

- `PATCH /characters/{character-id}/attributes/{attribute-name}` - Update attribute
- `PATCH /characters/{character-id}/base-values/{base-value-name}` - Update base value
- `PATCH /characters/{character-id}/skills/{skill-category}/{skill-name}` - Update skill
- `PATCH /characters/{character-id}/combat-stats/{combat-category}/{combat-skill-name}` - Update combat stats
- `PATCH /characters/{character-id}/calculation-points` - Update calculation points
- `POST /characters/{character-id}/special-abilities` - Add special ability

### Level System

- `GET /characters/{character-id}/level-up` - Get level-up options
- `POST /characters/{character-id}/level-up` - Apply level-up

### Information

- `GET /characters/{character-id}/history` - Get character history
- `GET /characters/{character-id}/skills/{skill-category}/{skill-name}` - Get skill info

### History Management

- `PATCH /characters/{character-id}/history/{record-id}` - Update history comment
- `DELETE /characters/{character-id}/history/{record-id}` - Revert history record

### Error Handling

All endpoints return appropriate HTTP status codes and error messages for validation failures, authentication errors, and business logic violations.
