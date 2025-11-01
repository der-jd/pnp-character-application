import type { Headers } from "api-spec";
import { Result, ResultSuccess, ResultError, ApiError, createApiError } from "../types/result";
import { featureLogger } from "../utils/featureLogger";

/**
 * HTTP methods supported by the API client
 */
export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PATCH = "PATCH",
  DELETE = "DELETE",
}

/**
 * Configuration for API requests
 */
export interface ApiRequestConfig {
  readonly endpoint: string;
  readonly method: HttpMethod;
  readonly body?: unknown;
  readonly headers?: Record<string, string>;
}

/**
 * Base API client for handling HTTP requests to the backend
 * Follows coding guidelines: camelCase, strict typing, clean error handling
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Headers;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_API_BASE_URL || "";
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
  }

  /**
   * Makes an authenticated API request
   */
  async makeRequest<T>(config: ApiRequestConfig, idToken: string): Promise<Result<T, ApiError>> {
    featureLogger.debug('api', 'ApiClient', `${config.method} ${config.endpoint}`);

    if (!idToken) {
      return ResultError(createApiError("Authentication token is required", 401, config.endpoint, config.method));
    }

    const url = `${this.baseUrl}/${config.endpoint}`;

    const headers = {
      ...this.defaultHeaders,
      Authorization: `Bearer ${idToken}`,
      ...config.headers,
    };

    const requestInit: RequestInit = {
      method: config.method,
      headers,
    };

    if (config.body) {
      requestInit.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, requestInit);
      
      featureLogger.debug('api', 'ApiClient', `Response ${response.status}:`, config.endpoint);

      if (!response.ok) {
        const errorBody = await this.safeParseJson(response);
        const errorMessage = (errorBody as { message?: string })?.message || `HTTP ${response.status}: ${response.statusText}`;
        featureLogger.error('ApiClient', `API error ${response.status}:`, errorMessage);
        return ResultError(
          createApiError(
            errorMessage,
            response.status,
            config.endpoint,
            config.method
          )
        );
      }

      const data = await response.json();
      return ResultSuccess<T, ApiError>(data as T);
    } catch (error) {
      featureLogger.error('ApiClient', 'Network error:', error);
      return ResultError(
        createApiError(
          error instanceof Error ? error.message : "Network request failed",
          0,
          config.endpoint,
          config.method
        )
      );
    }
  }

  /**
   * Convenience method for GET requests
   */
  async get<T>(endpoint: string, idToken: string): Promise<Result<T, ApiError>> {
    return this.makeRequest<T>({ endpoint, method: HttpMethod.GET }, idToken);
  }

  /**
   * Convenience method for POST requests
   */
  async post<T>(endpoint: string, body: unknown, idToken: string): Promise<Result<T, ApiError>> {
    return this.makeRequest<T>({ endpoint, method: HttpMethod.POST, body }, idToken);
  }

  /**
   * Convenience method for PATCH requests
   */
  async patch<T>(endpoint: string, body: unknown, idToken: string): Promise<Result<T, ApiError>> {
    return this.makeRequest<T>({ endpoint, method: HttpMethod.PATCH, body }, idToken);
  }

  /**
   * Convenience method for DELETE requests
   */
  async delete<T>(endpoint: string, idToken: string): Promise<Result<T, ApiError>> {
    return this.makeRequest<T>({ endpoint, method: HttpMethod.DELETE }, idToken);
  }

  /**
   * Safely parse JSON response, returning null if parsing fails
   */
  private async safeParseJson(response: Response): Promise<unknown | null> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
}
