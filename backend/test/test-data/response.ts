import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { fakeCharacter, fakeCharacter2 } from "./character.js";

export const fakeSingleCharacterResponse = {
  Item: fakeCharacter,
};

type singleResultType = typeof fakeSingleCharacterResponse;

export const fakeMultipleCharactersResponse = {
  Items: [fakeCharacter, fakeCharacter2],
};

type multipleResultsType = typeof fakeMultipleCharactersResponse;

export function mockDynamoDBGetResponse(response: singleResultType) {
  (globalThis as any).dynamoDBMock.on(GetCommand).callsFake((command: { Key: any }) => {
    const key = command.Key;
    if (key.characterId === response.Item.characterId && key.userId === response.Item.userId) {
      return Promise.resolve(response);
    } else {
      return Promise.resolve({ Item: undefined });
    }
  });
}

export function mockDynamoDBQueryResponse(response: multipleResultsType) {
  (globalThis as any).dynamoDBMock.on(QueryCommand).callsFake((command: { ExpressionAttributeValues: any }) => {
    if (response.Items.length === 0) {
      throw new Error("Item list in the response is empty!");
    }
    const userId = response.Items[0].userId;
    const hasInconsistentUserId = response.Items.some((item) => item.userId !== userId);
    if (hasInconsistentUserId) {
      throw new Error("All characters in the response must have the same user id!");
    }

    if (command.ExpressionAttributeValues[":userId"] === userId) {
      return Promise.resolve(response);
    } else {
      return Promise.resolve({ Items: [] });
    }
  });
}
