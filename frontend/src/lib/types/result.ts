/**
 * Result type for handling success/error states in service layer
 * Following coding guidelines for clean error handling
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Helper functions for creating Result types
 */
export const ResultSuccess = <T, E = Error>(data: T): Result<T, E> => ({
  success: true,
  data,
});

export const ResultError = <T, E = Error>(error: E): Result<T, E> => ({
  success: false,
  error,
});

/**
 * API-specific error type with structured error information
 */
export interface ApiError {
  readonly message: string;
  readonly statusCode: number;
  readonly endpoint: string;
  readonly method: string;
  readonly timestamp: Date;
}

/**
 * Creates a standardized API error
 */
export const createApiError = (message: string, statusCode: number, endpoint: string, method: string): ApiError => ({
  message,
  statusCode,
  endpoint,
  method,
  timestamp: new Date(),
});
