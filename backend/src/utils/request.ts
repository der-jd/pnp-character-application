type Body = Record<string, any> | null;

// Abstraction and simplification of APIGatewayProxyEvent to allow testing with less dependencies
export interface Request {
  headers: Record<string, string | undefined>;
  pathParameters: Record<string, string | undefined> | null;
  queryStringParameters: Record<string, string | undefined> | null;
  body: Body;
}

// The parse is necessary for Lambda tests via the AWS console
export function parseBody(body: string | Body): Body {
  if (!body) {
    return null;
  } else if (typeof body === "string") {
    return JSON.parse(body);
  } else {
    return body;
  }
}
