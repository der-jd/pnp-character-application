export function ensureHttpError(value: unknown): HttpError {
  if (value instanceof HttpError) return value;

  let stringified = "";
  try {
    stringified = JSON.stringify(value);
  } catch {
    stringified = "[Unable to stringify the thrown value]";
  }

  const error = new HttpError(500, `This value was thrown as is, not through an Error: ${stringified}`);
  return error;
}

export class HttpError extends Error {
  public statusCode: number;
  public context?: Record<string, unknown>;

  constructor(httpStatusCode: number, message: string, context?: Record<string, unknown>) {
    super(JSON.stringify({ message: message, statusCode: httpStatusCode }));
    this.statusCode = httpStatusCode;
    this.name = "HttpError";
    this.context = context;
  }
}
