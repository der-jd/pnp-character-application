import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { fakeCharacter } from "./character.js";

export const fakeDynamoDBCharacterResponse = {
  Item: fakeCharacter,
};

type responseType = typeof fakeDynamoDBCharacterResponse;

export function mockDynamoDBGetResponse(response: responseType = fakeDynamoDBCharacterResponse) {
  (globalThis as any).dynamoDBMock.on(GetCommand).callsFake((command) => {
    const key = command.Key;
    if (key.characterId === response.Item.characterId && key.userId === response.Item.userId) {
      return Promise.resolve(response);
    } else {
      return Promise.resolve({ Item: undefined });
    }
  });
}
