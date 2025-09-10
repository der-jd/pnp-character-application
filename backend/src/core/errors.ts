export function logAndEnsureHttpError(value: unknown): HttpError {
  if (value instanceof HttpError) {
    console.error(value);
    return value;
  }

  if (value instanceof Error) {
    console.error(value);
  } else {
    let stringified = "";
    try {
      stringified = JSON.stringify(value);
    } catch {
      stringified = "[Unable to stringify the thrown value]";
    }
    console.error(`This value was thrown as is, not through an Error: ${stringified}`);
  }

  return new HttpError(500, "An internal error occurred!");
}

export class HttpError extends Error {
  public statusCode: number;
  public context?: Record<string, unknown>;

  constructor(httpStatusCode: number, message: string, context?: Record<string, unknown>) {
    super(JSON.stringify({ message: message, statusCode: httpStatusCode, context: context }));
    this.statusCode = httpStatusCode;
    this.name = "HttpError";
    this.context = context;
  }
}

export function isZodError(error: unknown): boolean {
  // Support multiple Zod instances by checking error name
  return error !== null && typeof error === "object" && (error as any).name === "ZodError";
}

export function logZodError(error: unknown): void {
  const issues = (error as any).issues ?? (error as any).errors;
  if (Array.isArray(issues)) {
    issues.forEach((issue: any) => {
      console.error("Zod validation error:", issue);
    });
  } else {
    console.error("Zod validation errors:", issues);
  }
}
