import { Result, ResultSuccess, ResultError, ApiError, createApiError } from "../types/result";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  GetUserCommand,
  GlobalSignOutCommand,
  AuthenticationResultType,
} from "@aws-sdk/client-cognito-identity-provider";
import { featureLogger } from "../utils/featureLogger";

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
 * Sign in credentials
 */
export interface SignInCredentials {
  readonly email: string;
  readonly password: string;
}

/**
 * Sign up data
 */
export interface SignUpData {
  readonly email: string;
  readonly password: string;
  readonly name?: string;
}

/**
 * Sign in result
 */
export interface SignInResult {
  readonly tokens: AuthTokens;
  readonly user: AuthUser;
}

/**
 * Service for handling authentication with AWS Cognito
 * Manages tokens, user sessions, and authentication state
 * 
 * Following clean architecture:
 * - Encapsulates all Cognito SDK interactions
 * - Provides clean interface for authentication operations
 * - Uses Result pattern for consistent error handling
 */
export class AuthService {
  private static readonly TOKEN_STORAGE_KEY = "auth_tokens";
  private static readonly USER_STORAGE_KEY = "auth_user";

  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private readonly clientId: string;

  constructor(
    region?: string,
    userPoolId?: string,
    clientId?: string
  ) {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: region || process.env.NEXT_PUBLIC_COGNITO_REGION || "eu-central-1",
    });
    this.userPoolId = userPoolId || process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "";
    this.clientId = clientId || process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID || "";
  }

  /**
   * Sign in with email and password
   */
  async signIn(credentials: SignInCredentials): Promise<Result<SignInResult, ApiError>> {
    featureLogger.debug('auth', 'AuthService', 'Signing in user:', credentials.email);

    try {
      const command = new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: credentials.email,
          PASSWORD: credentials.password,
        },
      });

      const response = await this.cognitoClient.send(command);

      if (!response.AuthenticationResult) {
        return ResultError(
          createApiError("Authentication failed - no authentication result", 401, "auth/signin", "POST")
        );
      }

      const authResult = response.AuthenticationResult;

      // Parse tokens
      const tokens = this.parseAuthenticationResult(authResult);
      if (!tokens) {
        return ResultError(
          createApiError("Failed to parse authentication tokens", 500, "auth/signin", "POST")
        );
      }

      // Get user info
      const userResult = await this.getUserInfo(tokens.accessToken);
      if (!userResult.success) {
        return ResultError(userResult.error);
      }

      const user = userResult.data;

      // Store auth data
      await this.storeAuthData(tokens, user);

      featureLogger.info('auth', 'AuthService', 'Sign in successful for:', user.email);

      return ResultSuccess({
        tokens,
        user,
      });
    } catch (error) {
      featureLogger.error('AuthService', 'Sign in error:', error);
      return ResultError(
        createApiError(
          error instanceof Error ? error.message : "Sign in failed",
          401,
          "auth/signin",
          "POST"
        )
      );
    }
  }

  /**
   * Sign up a new user
   */
  async signUp(data: SignUpData): Promise<Result<{ email: string; userSub: string }, ApiError>> {
    featureLogger.debug('auth', 'AuthService', 'Signing up user:', data.email);

    try {
      const command = new SignUpCommand({
        ClientId: this.clientId,
        Username: data.email,
        Password: data.password,
        UserAttributes: [
          {
            Name: "email",
            Value: data.email,
          },
          ...(data.name
            ? [
                {
                  Name: "name",
                  Value: data.name,
                },
              ]
            : []),
        ],
      });

      const response = await this.cognitoClient.send(command);

      if (!response.UserSub) {
        return ResultError(createApiError("Sign up failed - no user sub", 500, "auth/signup", "POST"));
      }

      featureLogger.info('auth', 'AuthService', 'Sign up successful:', data.email);

      return ResultSuccess({
        email: data.email,
        userSub: response.UserSub,
      });
    } catch (error) {
      featureLogger.error('AuthService', 'Sign up error:', error);
      return ResultError(
        createApiError(
          error instanceof Error ? error.message : "Sign up failed",
          400,
          "auth/signup",
          "POST"
        )
      );
    }
  }

    /**
   * Confirm user sign up with verification code
   */
  async confirmSignUp(email: string, code: string): Promise<Result<void, ApiError>> {
    featureLogger.debug('auth', 'AuthService', 'Confirming sign up for:', email);

    try {
      const command = new ConfirmSignUpCommand({
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: code,
      });

      await this.cognitoClient.send(command);

      featureLogger.info('auth', 'AuthService', 'Sign up confirmed for:', email);

      return ResultSuccess(undefined);
    } catch (error) {
      featureLogger.error('AuthService', 'Confirm sign up error:', error);
      return ResultError(
        createApiError(
          error instanceof Error ? error.message : "Confirmation failed",
          400,
          "auth/confirm",
          "POST"
        )
      );
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<Result<void, ApiError>> {
    featureLogger.debug('auth', 'AuthService', 'Signing out user');

    try {
      const tokens = this.getStoredTokens();

      if (tokens) {
        const command = new GlobalSignOutCommand({
          AccessToken: tokens.accessToken,
        });

        await this.cognitoClient.send(command);
      }

      this.clearAuthData();

      featureLogger.info('auth', 'AuthService', 'User signed out successfully');

      return ResultSuccess(undefined);
    } catch (error) {
      featureLogger.error('AuthService', 'Sign out error:', error);
      // Still clear local data even if API call fails
      this.clearAuthData();
      return ResultError(
        createApiError(error instanceof Error ? error.message : "Sign out failed", 500, "auth/signout", "POST")
      );
    }
  }

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

  /**
   * Parse Cognito AuthenticationResult into our AuthTokens format
   */
  private parseAuthenticationResult(authResult: AuthenticationResultType): AuthTokens | null {
    if (!authResult.IdToken || !authResult.AccessToken || !authResult.RefreshToken) {
      return null;
    }

    // ExpiresIn is in seconds, convert to milliseconds
    const expiresIn = (authResult.ExpiresIn || 3600) * 1000;
    const expiresAt = new Date(Date.now() + expiresIn);

    return {
      idToken: authResult.IdToken,
      accessToken: authResult.AccessToken,
      refreshToken: authResult.RefreshToken,
      expiresAt,
    };
  }

  /**
   * Get user information from Cognito using access token
   */
  private async getUserInfo(accessToken: string): Promise<Result<AuthUser, ApiError>> {
    try {
      const command = new GetUserCommand({
        AccessToken: accessToken,
      });

      const response = await this.cognitoClient.send(command);

      if (!response.Username) {
        return ResultError(
          createApiError("Failed to get user info - no username", 500, "auth/userinfo", "GET")
        );
      }

      // Extract email and name from user attributes
      const email = response.UserAttributes?.find((attr) => attr.Name === "email")?.Value || "";
      const name = response.UserAttributes?.find((attr) => attr.Name === "name")?.Value;

      return ResultSuccess({
        userId: response.Username,
        email,
        name,
      });
    } catch (error) {
      return ResultError(
        createApiError(
          error instanceof Error ? error.message : "Failed to get user info",
          500,
          "auth/userinfo",
          "GET"
        )
      );
    }
  }
}
