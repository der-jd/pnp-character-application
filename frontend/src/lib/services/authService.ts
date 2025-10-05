import { Result, ResultSuccess, ResultError, ApiError, createApiError } from "../types/result";

/**
 * Authentication token information
 */
export interface AuthTokens {
  readonly idToken: string;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: Date;
}

/**
 * User information from authentication
 */
export interface AuthUser {
  readonly userId: string;
  readonly email: string;
  readonly name?: string;
}

/**
 * Authentication state
 */
export interface AuthState {
  readonly isAuthenticated: boolean;
  readonly user: AuthUser | null;
  readonly tokens: AuthTokens | null;
}

/**
 * Service for handling authentication with AWS Cognito
 * Manages tokens, user sessions, and authentication state
 */
export class AuthService {
  private static readonly TOKEN_STORAGE_KEY = "auth_tokens";
  private static readonly USER_STORAGE_KEY = "auth_user";

  /**
   * Gets the current authentication state
   */
  getAuthState(): AuthState {
    const tokens = this.getStoredTokens();
    const user = this.getStoredUser();

    const isAuthenticated = tokens !== null && user !== null && !this.isTokenExpired(tokens);

    return {
      isAuthenticated,
      user,
      tokens,
    };
  }

  /**
   * Gets the current ID token if available and valid
   */
  getIdToken(): string | null {
    const tokens = this.getStoredTokens();

    if (!tokens || this.isTokenExpired(tokens)) {
      return null;
    }

    return tokens.idToken;
  }

  /**
   * Stores authentication tokens and user information
   */
  async storeAuthData(tokens: AuthTokens, user: AuthUser): Promise<Result<void, Error>> {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          AuthService.TOKEN_STORAGE_KEY,
          JSON.stringify({
            idToken: tokens.idToken,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt.toISOString(),
          })
        );

        localStorage.setItem(AuthService.USER_STORAGE_KEY, JSON.stringify(user));
      }

      return ResultSuccess(undefined);
    } catch (error) {
      return ResultError(error instanceof Error ? error : new Error("Failed to store auth data"));
    }
  }

  /**
   * Clears stored authentication data (logout)
   */
  async clearAuthData(): Promise<Result<void, Error>> {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(AuthService.TOKEN_STORAGE_KEY);
        localStorage.removeItem(AuthService.USER_STORAGE_KEY);
      }

      return ResultSuccess(undefined);
    } catch (error) {
      return ResultError(error instanceof Error ? error : new Error("Failed to clear auth data"));
    }
  }

  /**
   * Checks if the current session is valid
   */
  isSessionValid(): boolean {
    const tokens = this.getStoredTokens();
    return tokens !== null && !this.isTokenExpired(tokens);
  }

  /**
   * Gets user information if authenticated
   */
  getCurrentUser(): AuthUser | null {
    const authState = this.getAuthState();
    return authState.isAuthenticated ? authState.user : null;
  }

  /**
   * Validates that a token is available for API calls
   */
  validateTokenForApiCall(): Result<string, ApiError> {
    const idToken = this.getIdToken();

    if (!idToken) {
      return ResultError(
        createApiError("No valid authentication token available", 401, "auth/token-validation", "GET")
      );
    }

    return ResultSuccess(idToken);
  }

  private getStoredTokens(): AuthTokens | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const stored = localStorage.getItem(AuthService.TOKEN_STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored);
      return {
        idToken: parsed.idToken,
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
        expiresAt: new Date(parsed.expiresAt),
      };
    } catch {
      return null;
    }
  }

  private getStoredUser(): AuthUser | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const stored = localStorage.getItem(AuthService.USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private isTokenExpired(tokens: AuthTokens): boolean {
    // Add some buffer time (5 minutes) to account for clock skew
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    return new Date().getTime() > tokens.expiresAt.getTime() - bufferTime;
  }
}
