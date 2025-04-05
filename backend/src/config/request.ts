// Abstraction and simplification of APIGatewayProxyEvent to allow testing with less dependencies
// TODO move to separate lambda layer
export interface Request {
  headers: {
    [name: string]: string | undefined;
  };
  pathParameters: {
    [name: string]: string | undefined;
  } | null;
  body: string | null;
}
