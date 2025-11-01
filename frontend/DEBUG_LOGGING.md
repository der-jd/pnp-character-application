# Debug Logging Guide

## Overview

The application uses a feature-flag based logging system that only runs in development mode. This provides granular control over what gets logged without impacting production builds.

**All services and use cases include comprehensive logging** to trace the complete flow through the clean architecture layers:
- **Services** (CharacterService, HistoryService, AuthService, ApiClient)
- **Use Cases** (IncreaseSkillUseCase, LoadCharacterUseCase, DeleteHistoryEntryUseCase, SignInUseCase, etc.)
- **ViewModels** (SignInViewModel, HistoryPageViewModel)
- **React Hooks** (useSignInViewModel, useHistoryPageViewModel)
- **UI Components** (SignIn page, History page, etc.)

## Configuration

Debug logging is controlled via environment variables in `.env.local`:

```bash
# Enable debug logging (defaults to true in development, false in production)
NEXT_PUBLIC_DEBUG_ENABLED=true

# Specify which categories to log (comma-separated, or "all")
NEXT_PUBLIC_DEBUG_CATEGORIES="auth,api,viewmodel,usecase,service,ui"
# Or enable all categories:
# NEXT_PUBLIC_DEBUG_CATEGORIES="all"
```

## Available Categories

- **`auth`** - Authentication flow (Cognito, token management)
- **`api`** - API client requests and responses
- **`viewmodel`** - ViewModel state changes and actions
- **`usecase`** - Use case execution and business logic
- **`service`** - Service layer operations
- **`ui`** - React components and hooks
- **`all`** - Enable all categories

## Log Levels

### Debug (Category-Specific)
Only shows when the category is enabled:
```typescript
featureLogger.debug('auth', 'AuthService', 'Signing in user:', email);
// Output: [AUTH][AuthService] Signing in user: user@example.com
```

### Info (Category-Specific)
Informational messages for the category:
```typescript
featureLogger.info('auth', 'AuthService', 'Sign in successful:', email);
// Output: [AUTH][AuthService] Sign in successful: user@example.com
```

### Trace (Category-Specific)
Shows execution flow with call stack:
```typescript
featureLogger.trace('usecase', 'SignInUseCase', '=== execute() called ===');
// Output: [USECASE][SignInUseCase] === execute() called ===
// Plus call stack
```

### Warn (Always Shows)
Warnings always display regardless of category settings:
```typescript
featureLogger.warn('ComponentName', 'Warning message');
// Output: [WARN][ComponentName] Warning message
```

### Error (Always Shows)
Errors always display regardless of category settings:
```typescript
featureLogger.error('ComponentName', 'Error message', error);
// Output: [ERROR][ComponentName] Error message
```

## Example: Debugging Sign In Flow

To see the complete signin authentication flow:

1. **Add to `.env.local`:**
```bash
NEXT_PUBLIC_DEBUG_ENABLED=true
NEXT_PUBLIC_DEBUG_CATEGORIES="auth,usecase,viewmodel,ui"
```

2. **Start dev server:**
```bash
npm run dev
```

3. **Navigate to `/auth/signin` and submit the form**

4. **Expected console output:**
```
[UI][SignIn] === Component rendering ===
[UI][useSignInViewModel] === Hook initialized ===
[UI][useSignInViewModel] Creating ViewModel instance...
[VIEWMODEL][SignInViewModel] === ViewModel constructed ===
[USECASE][SignInUseCase] === UseCase constructed ===
[UI][useSignInViewModel] ViewModel created
[UI][SignIn] Setting up success callback
[UI][SignIn] === Form submitted ===
[UI][SignIn] Submitting signin for: user@example.com
[VIEWMODEL][SignInViewModel] === signIn() called for user@example.com ===
[VIEWMODEL][SignInViewModel] Sign in attempt for: user@example.com
[VIEWMODEL][SignInViewModel] Calling SignInUseCase.execute()
[USECASE][SignInUseCase] === execute() called for user@example.com ===
[USECASE][SignInUseCase] Executing sign in for: user@example.com
[USECASE][SignInUseCase] Validating input
[USECASE][SignInUseCase] Calling AuthService.signIn()
[AUTH][AuthService] === signIn() called for user@example.com ===
[AUTH][AuthService] Signing in user: user@example.com
[AUTH][AuthService] Creating InitiateAuthCommand
[AUTH][AuthService] Sending command to Cognito
[AUTH][AuthService] Parsing authentication result
[AUTH][AuthService] Fetching user info
[AUTH][AuthService] Storing auth data
[AUTH][AuthService] Sign in successful for: user@example.com
[AUTH][AuthService] === signIn() completed successfully ===
[USECASE][SignInUseCase] Transforming result to output format
[USECASE][SignInUseCase] === execute() completed successfully ===
[VIEWMODEL][SignInViewModel] Sign in successful: user@example.com
[VIEWMODEL][SignInViewModel] Calling onSuccess callback
[VIEWMODEL][SignInViewModel] === signIn() completed successfully ===
[UI][SignIn] Sign in successful, updating auth context
[UI][SignIn] User ID: abc-123-def
[UI][SignIn] Loading available characters
[UI][SignIn] Navigating to dashboard
```

## Example: Debugging API Calls

To see only API-related logs:

```bash
NEXT_PUBLIC_DEBUG_ENABLED=true
NEXT_PUBLIC_DEBUG_CATEGORIES="api"
```

Output:
```
[API][ApiClient] Making request: POST auth/signin
[API][ApiClient] Full URL: https://api.example.com/auth/signin
[API][ApiClient] Response status: 200
[API][ApiClient] Response data: { userId: '...', email: '...' }
```

## Performance Timing

Track performance of specific operations:

```typescript
featureLogger.time('api', 'GET /characters');
// ... operation ...
featureLogger.timeEnd('api', 'GET /characters');
```

## Production Safety

**Important:** All debug logs are automatically disabled in production builds:

- `console.log()`, `console.debug()` are stripped by Next.js
- featureLogger checks `NODE_ENV === 'development'`
- No performance impact in production
- Warn and Error levels always work for critical issues

## Best Practices

1. **Use appropriate categories** - Makes filtering easier
2. **Use trace() for flow tracking** - Start/end of functions
3. **Use debug() for details** - Parameter values, intermediate states
4. **Use info() for milestones** - "User authenticated", "Data saved"
5. **Use error() for failures** - Always log errors with context
6. **Include context** - Scope (class/function name) and relevant data
7. **Don't log sensitive data** - Passwords, tokens (only log existence)

## Troubleshooting

### Logs not appearing?

1. **Check environment variables are loaded:**
   ```typescript
   console.log('Debug enabled:', process.env.NEXT_PUBLIC_DEBUG_ENABLED);
   console.log('Debug categories:', process.env.NEXT_PUBLIC_DEBUG_CATEGORIES);
   ```

2. **Verify NODE_ENV:**
   ```bash
   echo $NODE_ENV
   # Should be 'development' for dev server
   ```

3. **Restart dev server after changing `.env.local`:**
   ```bash
   npm run dev
   ```

### Too many logs?

1. **Narrow categories:**
   ```bash
   # Instead of "all"
   NEXT_PUBLIC_DEBUG_CATEGORIES="auth"
   ```

2. **Remove trace calls** - They include full stack traces

3. **Use browser console filters** - Filter by `[CATEGORY]` prefix
