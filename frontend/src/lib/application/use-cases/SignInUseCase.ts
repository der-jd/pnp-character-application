import { UseCase } from "./interfaces";
import { Result, ResultSuccess, ResultError } from "../../types/result";
import { AuthService, SignInCredentials, SignInResult } from "../../services/authService";
import { featureLogger } from "../../utils/featureLogger";

/**
 * Input for sign in use case
 */
export interface SignInInput {
  email: string;
  password: string;
}

/**
 * Output for sign in use case
 * Returns the complete SignInResult from AuthService
 */
export type SignInOutput = SignInResult;

/**
 * Use Case for user sign in
 *
 * Business Rules:
 * - Validates credentials with Cognito
 * - Stores authentication tokens securely
 * - Returns user information and tokens
 * - Handles authentication errors appropriately
 *
 * Following clean architecture principles:
 * - Application layer coordinates authentication flow
 * - Domain service (AuthService) handles Cognito interactions
 * - Proper transformation of data for presentation layer
 */
export class SignInUseCase implements UseCase<SignInInput, SignInOutput> {
  constructor(private readonly authService: AuthService) {}

  async execute(input: SignInInput): Promise<Result<SignInOutput, Error>> {
    featureLogger.debug('usecase', 'SignInUseCase', 'Executing sign in for:', input.email);

    try {
      // Validate input at application boundary
      if (!input.email || !input.email.includes("@")) {
        return ResultError(new Error("Valid email is required"));
      }

      if (!input.password || input.password.length < 6) {
        return ResultError(new Error("Password must be at least 6 characters"));
      }

      // Call auth service to perform sign in
      const credentials: SignInCredentials = {
        email: input.email,
        password: input.password,
      };

      const result = await this.authService.signIn(credentials);

      if (!result.success) {
        return ResultError(new Error(result.error.message || "Sign in failed"));
      }

      // Return the complete SignInResult with tokens and user
      featureLogger.info('usecase', 'SignInUseCase', 'Sign in successful:', result.data.user.email);
      return ResultSuccess(result.data);
    } catch (error) {
      featureLogger.error('SignInUseCase', 'Error:', error);
      return ResultError(error instanceof Error ? error : new Error("Unknown error occurred"));
    }
  }
}
