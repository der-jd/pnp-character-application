import type { z } from "zod";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
  ) {
    const message = extractErrorMessage(body, status, statusText);
    super(message);
    this.name = "ApiError";
  }
}

function extractErrorMessage(body: unknown, status: number, statusText: string): string {
  // Try to extract message from backend error format
  if (body && typeof body === "object") {
    const errorBody = body as Record<string, unknown>;

    // Check for HttpError format: { message: string, statusCode: number, context?: any }
    if (errorBody.message && typeof errorBody.message === "string") {
      return errorBody.message;
    }

    // Check for other common error formats
    if (errorBody.error && typeof errorBody.error === "string") {
      return errorBody.error;
    }

    // Check for array of errors (like validation errors)
    if (Array.isArray(errorBody.errors) && errorBody.errors.length > 0) {
      const firstError = errorBody.errors[0];
      if (typeof firstError === "string") return firstError;
      if (
        firstError &&
        typeof firstError === "object" &&
        (firstError as Record<string, unknown>).message &&
        typeof (firstError as Record<string, unknown>).message === "string"
      ) {
        return (firstError as Record<string, unknown>).message as string;
      }
    }

    // Check for validation errors format
    if (errorBody.detail && typeof errorBody.detail === "string") {
      return errorBody.detail;
    }
  }

  // Fallback to HTTP status
  return statusText || `HTTP ${status}`;
}

let getIdToken: (() => string | null) | null = null;

export function setTokenGetter(getter: () => string | null): void {
  getIdToken = getter;
}

async function request<T>(method: string, path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> {
  const token = getIdToken?.();
  if (!token) throw new Error("Not authenticated");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new ApiError(res.status, res.statusText, errorBody);
  }

  const json: unknown = await res.json();
  return schema.parse(json);
}

export function get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  return request("GET", path, schema);
}

export function post<T>(path: string, schema: z.ZodType<T>, body: unknown): Promise<T> {
  return request("POST", path, schema, body);
}

export function patch<T>(path: string, schema: z.ZodType<T>, body: unknown): Promise<T> {
  return request("PATCH", path, schema, body);
}

export async function del<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  return request("DELETE", path, schema);
}
