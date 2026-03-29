# AI Agent Development Guide

## Coding Standards

1. **Type Safety**: Favor explicit interfaces in TypeScript. Avoid `any` and keep discriminated unions intact.
2. **Clean Code**: Follow SOLID principles. Keep functions small and focused. Code should be self-documenting; comments only explain non-obvious decisions.
3. **Testing Discipline**:
   - Component tests are potentially expensive and run against the cloud environment. Must run with each PR but may only be run in specific circumstances during development.
   - Add regression tests for bug fixes.
   - Update tests when touching core leveling logic, history records, or character value rules.
4. **Local Development**: Check if a local environment file (`.env.*`) exists and is properly configured for local development and testing activities. See the [Required local environment variables](./README.md#required-local-environment-variables) section in README.md for setup instructions.
   - For manual frontend testing, verify that `GENERAL_TEST_USER_EMAIL` and `GENERAL_TEST_USER_PASSWORD` are set.
5. **Documentation**: Update this guide and general documentation when new patterns or conventions are established.
6. **Import Style**: Use package imports instead of file paths when available. For example, use `import { HttpError } from "core"` instead of `import { HttpError } from "../../src/core/errors.js"`.

## Quality Gates

Always run from root after changes:

- `npm run format`
- `npm run lint`
- `npm run lint:terraform`
- `npm run build`
- `npm run test:unit`

## Infrastructure

- Never commit Terraform state or secrets
- Update `terraform/app/.terraform.lock.hcl` and `terraform/shared/.terraform.lock.hcl` only via `terraform init`

## Version Management

- **Backend Changes**: Any code change in `backend/` requires a version bump in `backend/package.json` according to SemVer rules (see backend README)
- **API Spec Changes**: Any code change in `api-spec/` requires a version bump in `api-spec/package.json` according to SemVer rules (see api-spec README)
- **Frontend**: The frontend is a static React + Vite + Tailwind CSS application. It imports types and Zod schemas from the `api-spec` workspace package. All user-facing strings are centralized in `frontend/src/i18n/de.ts` — do not hardcode German strings in components
