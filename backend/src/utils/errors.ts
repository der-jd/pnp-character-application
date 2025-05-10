export function ensureHttpError(value: unknown): HttpError {
  if (value instanceof HttpError) return value;

  // TODO delete after test
  console.log("DEBUG: value", value);
  console.log("DEBUG: value type", typeof value);
  console.log("DEBUG: value is instance of Error", value instanceof Error);
  console.log("DEBUG: value is instance of HttpError", value instanceof HttpError);
  console.log("DEBUG: value is instance of Object", value instanceof Object);
  console.log("DEBUG: value is instance of String", value instanceof String);

  let stringified = "";
  try {
    console.log("DEBUG: error message", (value as Error).message);
    stringified = JSON.stringify(value);
  } catch {
    stringified = "[Unable to stringify the thrown value]";
  }

  console.error(`This value was thrown as is, not through an Error: ${stringified}`);
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
