import { mockClient } from "aws-sdk-client-mock";
import { beforeEach } from "vitest";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Make the mock global
(globalThis as any).dynamoDBMock = mockClient(DynamoDBDocumentClient);

// Reset mock before each test to ensure no state is shared between tests
beforeEach(() => {
  (globalThis as any).dynamoDBMock.reset();
});
