/**
 * ViewModel for Sign In Page
 *
 * Responsibilities:
 * - Manage sign-in form state
 * - Handle user authentication
 * - Provide loading and error states for UI
 * - Transform authentication data for presentation
 *
 * Following clean architecture:
 * - Presentation layer sits between UI and Application layer
 * - No direct UI framework dependencies (React hooks in separate file)
 * - Testable without mounting components
 */

import { SignInUseCase, SignInOutput } from "../../application/use-cases/SignInUseCase";
import { featureLogger } from "../../utils/featureLogger";
import { BaseViewModel, BaseViewModelState } from "./BaseViewModel";

export interface SignInViewModelState extends BaseViewModelState {
  isAuthenticated: boolean;
}

export interface SignInFormData {
  email: string;
  password: string;
}

// SignInSuccessData is now the full SignInResult from AuthService
export type SignInSuccessData = SignInOutput;

export class SignInViewModel extends BaseViewModel<SignInViewModelState> {
  private onSuccessCallback?: (data: SignInSuccessData) => void;

  constructor(private readonly signInUseCase: SignInUseCase) {
    super({
      isLoading: false,
      error: null,
      isAuthenticated: false,
    });
  }

  /**
   * Set callback for successful sign in
   */
  public onSuccess(callback: (data: SignInSuccessData) => void): void {
    this.onSuccessCallback = callback;
  }

  /**
   * Sign in with email and password
   */
  public async signIn(formData: SignInFormData): Promise<void> {
    featureLogger.debug('viewmodel', 'SignInViewModel', 'Sign in attempt for:', formData.email);

    this.setLoading(true);

    try {
      const result = await this.signInUseCase.execute({
        email: formData.email,
        password: formData.password,
      });

      if (!result.success) {
        featureLogger.error('SignInViewModel', 'Sign in failed:', result.error);
        this.setError(result.error.message || "Sign in failed. Please check your credentials.");
        return;
      }

      featureLogger.info('viewmodel', 'SignInViewModel', 'Sign in successful:', result.data.user.email);

      this.updateState({
        isLoading: false,
        error: null,
        isAuthenticated: true,
      });

      // Call success callback if provided
      if (this.onSuccessCallback) {
        this.onSuccessCallback(result.data);
      }
    } catch (error) {
      featureLogger.error('SignInViewModel', 'Exception during sign in:', error);
      this.setError(error instanceof Error ? error.message : "An unexpected error occurred");
    }
  }
}
