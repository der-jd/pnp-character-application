# AI Agent Development Guide

## Coding Standards

1. **Type Safety**: Favor explicit interfaces in TypeScript. Avoid `any` and keep discriminated unions intact.
2. **Clean Code**: Follow SOLID principles. Keep functions small and focused. Code should be self-documenting; comments only explain non-obvious decisions.
3. **Testing Discipline**:
   - Component tests are potentially expensive and run against the cloud environment. Must run with each PR but may only be run in specific circumstances during development.
   - Add regression tests for bug fixes.
   - Update tests when touching core leveling logic, history records, or character value rules.
4. **Documentation**: Update this guide and general documentation when new patterns or conventions are established.

## Quality Gates

Always run from root after changes:

- `npm run format`
- `npm run lint`
- `npm run lint:terraform`
- `npm run build`
- `npm run test:unit`

## Infrastructure

- Never commit Terraform state or secrets
- Update `terraform/.terraform.lock.hcl` only via `terraform init`
