import { BaseViewModel, BaseViewModelState } from "./BaseViewModel";
import { AuthService, AuthUser, AuthTokens } from "../../services/authService";
import { featureLogger } from "../../utils/featureLogger";

/**
 * Authentication ViewModel state
 */
export interface AuthViewModelState extends BaseViewModelState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isInitialized: boolean;
}

/**
 * AuthViewModel - Centralized authentication state management
 *
 * Responsibilities:
 * - Manage authentication state (isAuthenticated, user, tokens)
 * - Handle token persistence via AuthService
 * - Verify tokens on initialization
 * - Provide sign in/out interface
 * - Notify subscribers of auth state changes
 *
 * Following clean architecture:
 * - Presentation layer - manages UI state
 * - Uses AuthService for infrastructure concerns
 * - Framework-agnostic (no React dependencies)
 * - Testable without mounting components
 */
export class AuthViewModel extends BaseViewModel<AuthViewModelState> {
  private readonly authService: AuthService;

  constructor(authService: AuthService) {
    super({
      isLoading: false,
      error: null,
      isAuthenticated: false,
      user: null,
      tokens: null,
      isInitialized: false,
    });

    this.authService = authService;
  }

  /**
   * Initialize authentication state
   * Checks for stored tokens and verifies them
   * Should be called once on app startup
   */
  async initialize(): Promise<void> {
    if (this.state.isInitialized) {
      featureLogger.debug("auth", "AuthViewModel", "Already initialized, skipping");
      return;
    }

    featureLogger.debug("auth", "AuthViewModel", "Initializing authentication state");
    this.setLoading(true);

    try {
      const authState = this.authService.getAuthState();

      if (authState.isAuthenticated && authState.tokens) {
        // Check if session is still valid
        if (this.authService.isSessionValid()) {
          featureLogger.info("auth", "AuthViewModel", "Restored authenticated session");
          this.updateState({
            isAuthenticated: true,
            user: authState.user,
            tokens: authState.tokens,
            isInitialized: true,
            isLoading: false,
            error: null,
          });
          return;
        } else {
          featureLogger.warn("auth", "AuthViewModel", "Stored token is invalid, clearing auth state");
          await this.authService.signOut();
        }
      }

      // No valid auth state
      this.updateState({
        isAuthenticated: false,
        user: null,
        tokens: null,
        isInitialized: true,
        isLoading: false,
        error: null,
      });

      featureLogger.debug("auth", "AuthViewModel", "No authenticated session found");
    } catch (error) {
      featureLogger.error("AuthViewModel", "Initialization error:", error);
      this.updateState({
        isAuthenticated: false,
        user: null,
        tokens: null,
        isInitialized: true,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to initialize authentication",
      });
    }
  }

  /**
   * Set authentication state after successful sign in
   * Called by SignInViewModel after successful authentication
   */
  setAuthState(tokens: AuthTokens, user: AuthUser): void {
    featureLogger.info("auth", "AuthViewModel", "Setting authenticated state for:", user.email);

    this.updateState({
      isAuthenticated: true,
      user,
      tokens,
      isLoading: false,
      error: null,
    });
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    featureLogger.debug("auth", "AuthViewModel", "Signing out user");
    this.setLoading(true);

    try {
      const result = await this.authService.signOut();

      if (result.success) {
        this.updateState({
          isAuthenticated: false,
          user: null,
          tokens: null,
          isLoading: false,
          error: null,
        });
        featureLogger.info("auth", "AuthViewModel", "User signed out successfully");
      } else {
        this.setError(result.error.message);
        featureLogger.error("AuthViewModel", "Sign out failed:", result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Sign out failed";
      this.setError(errorMessage);
      featureLogger.error("AuthViewModel", "Sign out error:", error);
    }
  }

  /**
   * Get the current ID token
   */
  getIdToken(): string | null {
    return this.state.tokens?.idToken ?? null;
  }

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    return this.state.tokens?.accessToken ?? null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  /**
   * Check if initialization is complete
   */
  isInitialized(): boolean {
    return this.state.isInitialized;
  }
}
