import pino, { Logger } from "pino";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { RequestBody } from "./request.js";

export interface SafeEventLog {
  timestamp: string;
  requestId: string | undefined;
  method: string;
  path: string;
  pathParameters: { [key: string]: string } | null;
  queryStringParameters: { [key: string]: string } | null;
  sourceIp: string;
  cognitoIdentityId: string | null;
  userAgent: string | null;
  bodySanitized: RequestBody | null;
}

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label: string) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function createLogger(component: string): Logger {
  return logger.child({ component });
}

export function sanitizeEvent(event: APIGatewayProxyEvent): SafeEventLog {
  const safeLog: SafeEventLog = {
    timestamp: new Date().toISOString(),
    requestId: event.requestContext.requestId,
    method: event.httpMethod,
    path: event.path,
    pathParameters: event.pathParameters as { [key: string]: string } | null,
    queryStringParameters: event.queryStringParameters as { [key: string]: string } | null,
    sourceIp: event.requestContext.identity.sourceIp,
    cognitoIdentityId: event.requestContext.identity.cognitoIdentityId,
    userAgent: event.requestContext.identity.userAgent,
    bodySanitized: null,
  };

  if (event.body) {
    safeLog.bodySanitized = sanitizeBody(event.body);
  }

  return safeLog;
}

const SENSITIVE_FIELDS = ["password", "token", "secret", "key", "authorization", "auth", "credential", "pass", "pwd"];

function sanitizeBody(body: string | null | RequestBody): RequestBody | null {
  if (!body) return null;

  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      return sanitizeObject(parsed);
    } catch {
      // If JSON parsing fails, return null to avoid breaking the request
      return null;
    }
  } else {
    return sanitizeObject(body);
  }
}

function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some((field) => lowerKey.includes(field));

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
