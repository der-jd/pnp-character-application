# Frontend — World Hoppers Character Application

Static single-page application for managing characters of the "World Hoppers" pen & paper RPG.

## Tech Stack

- **Framework**: [React](https://react.dev/) 19 + [Vite](https://vite.dev/)
- **Routing**: [React Router](https://reactrouter.com/) v7
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) (client state) + [TanStack React Query](https://tanstack.com/query) (server state)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) v4 with custom dark theme
- **Authentication**: [AWS Cognito](https://aws.amazon.com/cognito/) via `@aws-sdk/client-cognito-identity-provider`
- **Validation**: [Zod](https://zod.dev/) schemas imported from the `api-spec` workspace package
- **Language**: TypeScript (strict mode)
- **Icons**: [Lucide React](https://lucide.dev/)

## Getting Started

```bash
# From the repository root
npm install

# Start the dev server
npm run dev --workspace frontend
```

The dev server connects to the live backend API. You need a `.env.local` file in `frontend/` with:

```
VITE_API_BASE_URL=https://api.worldhoppers.de/v1
VITE_COGNITO_REGION=eu-central-1
VITE_COGNITO_APP_CLIENT_ID=<your-cognito-app-client-id>
```

## Scripts

| Command   | Description                          |
| --------- | ------------------------------------ |
| `dev`     | Start Vite dev server                |
| `build`   | Type-check with `tsc` and build      |
| `preview` | Preview the production build locally |
| `lint`    | Run ESLint                           |

Run via `npm run <command> --workspace frontend`.

## Project Structure

```
src/
├── api/            # Typed HTTP client and endpoint modules
│   ├── client.ts           # Base HTTP client with Zod response validation
│   ├── characters.ts       # Character CRUD endpoints
│   ├── character-edit.ts   # Character modification endpoints
│   ├── level-up.ts         # Level-up system endpoints
│   └── history.ts          # History/changelog endpoints
├── auth/           # AWS Cognito authentication
│   ├── AuthProvider.tsx    # React context provider for auth state
│   └── cognito.ts          # Cognito SDK integration
├── components/
│   ├── ui/         # Base UI primitives (Button, Input, Card, Dialog, Badge, Select, Spinner, Toast)
│   └── layout/     # AppLayout, Sidebar
├── pages/          # Route-level page components
│   ├── SignInPage.tsx
│   ├── DashboardPage.tsx
│   ├── CharacterCreatePage.tsx
│   ├── CharacterSheetPage.tsx
│   ├── SkillsPage.tsx
│   ├── CombatPage.tsx
│   ├── LevelUpPage.tsx
│   └── HistoryPage.tsx
├── stores/         # Zustand stores
│   └── characterStore.ts   # Selected character ID
├── i18n/           # Internationalization
│   ├── de.ts               # German translations (all UI strings)
│   ├── index.ts            # t() helper function
│   └── mappings.ts         # Character/attribute display name mappings
├── styles/
│   └── index.css           # Tailwind config with custom dark theme tokens
├── App.tsx         # Root component with routing
└── main.tsx        # Entry point
```

## Architecture

### API Layer

All API calls go through a typed HTTP client (`src/api/client.ts`) that:

- Attaches the Cognito ID token as a Bearer token
- Validates responses against Zod schemas from `api-spec`
- Provides typed `get()`, `post()`, `patch()`, and `del()` functions

Endpoint modules (`characters.ts`, `character-edit.ts`, etc.) group related API calls and are consumed by React Query hooks in the page components.

### Authentication

Authentication uses AWS Cognito with the `USER_PASSWORD_AUTH` flow. The `AuthProvider` context manages sign-in, sign-out, and automatic token refresh (with a 5-minute pre-expiry buffer). Unauthenticated users are redirected to the sign-in page.

### State Management

- **Server state**: TanStack React Query handles caching, refetching, and loading/error states for all API data
- **Client state**: Zustand stores the currently selected character ID

### Internationalization

All user-facing text is in German and centralized in `src/i18n/de.ts`. Components use the `t(key, ...args)` function to look up strings, supporting positional placeholders (`{0}`, `{1}`). This structure allows adding additional languages without modifying component logic.

### Styling

The app uses a custom dark theme built on Tailwind CSS v4. Theme tokens (colors, spacing) are defined in `src/styles/index.css` via Tailwind's `@theme` directive. The path alias `@/` maps to `src/` for clean imports.

## Features

- **Sign-in** — Cognito-based authentication with automatic token refresh
- **Dashboard** — Character list with create, clone, and delete actions
- **Character creation wizard** — 7-step guided flow (general info, profession/hobby, advantages/disadvantages, attributes, skills, combat values, review)
- **Character sheet** — Comprehensive view of all character data
- **Inline editing** — Edit attributes, base values, skills, combat stats, calculation points, and special abilities
- **Level-up** — Dice roll and increment effects with cost previews
- **History** — Paginated changelog with comments and revert capability
- **Toast notifications** — Success/error feedback for all operations

## Build Output

`npm run build` produces static HTML/CSS/JS in `dist/`, ready for deployment to S3 behind CloudFront. No server-side runtime required.
