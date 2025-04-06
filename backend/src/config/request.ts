// Abstraction and simplification of APIGatewayProxyEvent to allow testing with less dependencies
// TODO move to separate lambda layer

type bodyType = Record<string, string | number | undefined> | null;

export interface Request {
  headers: Record<string, string | undefined>;
  pathParameters: Record<string, string | undefined> | null;
  body: bodyType;
}

// The parse is necessary for Lambda tests via the AWS console
export function parseBody(body: string | bodyType): bodyType {
  if (!body) {
    return null;
  } else if (typeof body === "string") {
    return JSON.parse(body);
  } else {
    return body;
  }
}
