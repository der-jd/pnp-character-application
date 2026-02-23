# AI Agent Guide

This document orients automated contributors working inside the `pnp-character-application` repo. Use it as the canonical checklist before coding.

## Mission Context

- **Product**: Serverless character sheet management for a custom Pen & Paper system.
- **Architecture**: Next.js frontend + Node.js (AWS Lambda) backend + Terraform-managed AWS infrastructure.
- **Primary Goals**: Maintain player data integrity, keep infrastructure reproducible, and preserve test coverage for all endpoints (see `backend/test` for examples).

## Quick Start

1. Run `npm install` at the repository root (uses npm workspaces).
2. Ensure local tooling: Terraform, tflint (install via `npm run install-lint-terraform`), AWS CLI (optional but useful).
3. Authenticate Terraform with `terraform login`, then initialize the Terraform workspace via `terraform init` inside `/terraform`.
4. Prefer package-level commands via `npm run <script> --workspace <workspace>`.

## Repository Map

| Path         | Purpose                                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| `frontend/`  | Next.js client application (app router). Interaction layer for character management.                            |
| `backend/`   | AWS Lambda handlers, domain rules, Step Functions integrations, plus vitest tests under `backend/test`.         |
| `api-spec/`  | Shared OpenAPI / schema definitions based on zod schemas and consumed by other packages (frontend and backend). |
| `scripts/`   | Utility scripts for Cognito users, XML→JSON conversion, etc.                                                    |
| `terraform/` | IaC definitions for API Gateway, Cognito, backups, and shared modules.                                          |

Use these anchors to locate code before making changes.

## Development Workflows

### Backend

- Build via `npm run build --workspace backend`.
- Tests live under `backend/test`. Run selectively with `npm run test --workspace backend -- <pattern>`.
- Domain constants live in `backend/src/core/rules`. Update tests alongside any rule changes.

### Frontend

- Run `npm run dev --workspace frontend` for local Next.js dev server.
- Keep hooks under `frontend/src/hooks` side-effect free and colocate API helpers under `frontend/src/lib`.
- When fetching backend resources, reuse shared schema types from `api-spec` to avoid divergence.

### API Spec Package

- Lint and build via `npm run lint --workspace api-spec` and `npm run build --workspace api-spec`.
- Publish-ready artifacts live in `api-spec/src`. Update exports in `/api-spec/src/index.ts` when adding schemas.

### Scripts

- `scripts/package.json` contains targeted CLIs. Run with `npm run <script> --workspace scripts`.
- Shell helpers (e.g., Cognito user creation) assume macOS/Linux tooling.

### Terraform

- Always run `npm run lint:terraform` from the root before planning.
- Always run `npm run format` from the root before planning.
- Use `terraform plan` prior to `apply`. Never apply from CI without reviewing plan output.

## Testing & Quality Gates

| Layer                    | Command                                                            | Notes                                                 |
| ------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------- |
| Backend unit/integration | `npm run test --workspace backend`                                 | Uses vitest; fixtures under `backend/test/test-data`. |
| Frontend lint            | `npm run lint --workspace frontend`                                | Next.js + custom ESLint config.                       |
| API spec lint            | `npm run lint --workspace api-spec`                                | Keeps shared types consistent.                        |
| Terraform lint           | `npm run install-lint-terraform` (once) + `npm run lint:terraform` | Enforce infra best practices.                         |

Always run `npm run format` from the root after changes.
Always run `npm run lint` from the root after changes.
Always run `npm run lint:terraform` from the root after changes.
Always run `npm run build` from the root after changes.
Always run `npm run test:unit` from the root after changes.

Always update or add tests when touching core leveling logic, history records, or character value rules. Tests should be easy to understand and maintain for human users. Therefore a limited redundancy is acceptable if it improves clarity.

## CI/CD

- CircleCI pipeline badge lives in the root README. Pipelines run lint, tests, and Terraform checks.
- Failures in CI usually map to workspace scripts described above; reproduce locally before retrying builds.

## Coding Standards for Agents

1. **Type Safety**: Favor explicit interfaces in TypeScript. Avoid `any` and keep discriminated unions intact.
2. **Locality**: Modify the smallest surface area possible. Align tests nearby the changed logic.
3. **Infrastructure Caution**: Never commit Terraform state or secrets. If you add modules, update `terraform/.terraform.lock.hcl` only via `terraform init`.
4. **Testing Discipline**: Add regression tests for bug fixes.
5. **Communication**: Document non-obvious decisions inline with short comments and reference this guide in PR summaries when relevant.
6. **Code Quality**: Run `npm run format`, `npm run lint`, `npm run lint:terraform`, `npm run build` and `npm run test` from the root after changes.
7. **Clean Code**: Follow the SOLID principles and keep functions small and focused. Avoid code duplication and comments that state the obvious. Code should be self-documenting and self-explanatory, comments are only to be used to explain why something is done if it's not immediately obvious.
8. **Documentation**: Update this guide when new patterns or conventions are established.
9. **Consistency**: Follow the existing code style and patterns in the codebase.
10. **Making Changes**: When making changes, always iterate and refine your approach based on linting, building and testing results.

## Common References

- Architecture diagram: `aws_architecture.png` (root).
- Core rules/constants: `backend/src/core/rules/`.
- History + character value test fixtures: `backend/test/test-data/`.

Use this guide as the first stop before digging deeper or introducing automation changes.
