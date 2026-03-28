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
- **Icons**: [Lucide React](https://lucide.dev/), [react-icons](https://react-icons.github.io/react-icons/)

## Getting Started

```bash
# From the repository root
npm install

# Start the dev server
npm run dev --workspace frontend
```

The dev server connects to the live backend API. You need a `.env.local` file in the root folder with:

```
VITE_API_BASE_URL=https://api.dev.worldhoppers.de/v1
VITE_COGNITO_REGION=eu-central-1
VITE_COGNITO_APP_CLIENT_ID=<your-cognito-app-client-id>
```

## Project Structure

```
src/
├── api/            # Typed HTTP client and endpoint modules
│   └── ...
├── auth/           # AWS Cognito authentication
│   └── ...
├── components/
│   ├── ui/         # Base UI primitives (Badge, Button, etc.)
│   ├── layout/     # AppLayout, Sidebar
│   └── EventDialog.tsx
├── hooks/          # Custom React hooks (useTheme, etc.)
│   └── ...
├── lib/            # Shared utilities
│   └── ...
├── pages/          # Route-level page components
│   └── ...
├── stores/         # Zustand stores
│   └── ...
├── i18n/           # Internationalization and API-to-UI key mappings
│   └── ...
├── styles/         # Tailwind CSS theme tokens
│   └── ...
├── App.tsx         # Root component with routing
└── main.tsx        # Entry point
test/
├── unit-tests/     # Unit tests
└── component-tests/# Component tests
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

## Build Output

`npm run build` produces static HTML/CSS/JS in `dist/`, ready for deployment to S3 behind CloudFront. No server-side runtime required.
