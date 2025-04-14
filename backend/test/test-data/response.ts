import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { fakeCharacter, fakeCharacter2 } from "./character.js";
import { fakeHistoryBlock1, fakeHistoryBlock2 } from "./history.js";

export const fakeSingleCharacterResponse = {
  Item: fakeCharacter,
};

type singleCharacterResultType = typeof fakeSingleCharacterResponse;

export const fakeMultipleCharactersResponse = {
  Items: [fakeCharacter, fakeCharacter2],
};

type multipleCharactersResultType = typeof fakeMultipleCharactersResponse;

export const fakeMultipleHistoryItemsResponse = {
  Items: [fakeHistoryBlock1, fakeHistoryBlock2],
};

type multipleHistoryItemsResultType = typeof fakeMultipleHistoryItemsResponse;

export function mockDynamoDBGetCharacterResponse(response: singleCharacterResultType) {
  (globalThis as any).dynamoDBMock.on(GetCommand).callsFake((command: { Key: any }) => {
    const key = command.Key;
    if (key.characterId === response.Item.characterId && key.userId === response.Item.userId) {
      return Promise.resolve(response);
    } else {
      return Promise.resolve({ Item: undefined });
    }
  });
}

export function mockDynamoDBQueryCharactersResponse(response: multipleCharactersResultType) {
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

export function mockDynamoDBQueryHistoryResponse(response: multipleHistoryItemsResultType) {
  (globalThis as any).dynamoDBMock
    .on(QueryCommand)
    .callsFake(
      (command: {
        ExpressionAttributeValues: any;
        ScanIndexForward: boolean | undefined;
        Limit: number | undefined;
      }) => {
        if (response.Items.length === 0) {
          throw new Error("Item list in the response is empty!");
        }
        const characterId = response.Items[0].characterId;
        const hasInconsistentCharacterId = response.Items.some((item) => item.characterId !== characterId);
        if (hasInconsistentCharacterId) {
          throw new Error("All history items in the response must have the same character id!");
        }

        if (command.ScanIndexForward === true || command.Limit !== 1) {
          throw new Error("ScanIndexForward must be false and Limit must be 1 for this test");
        }

        if (
          command.ScanIndexForward === false &&
          command.Limit === 1 &&
          command.ExpressionAttributeValues[":characterId"] === characterId
        ) {
          return Promise.resolve({ Items: [response.Items[response.Items.length - 1]] });
        } else {
          return Promise.resolve({ Items: [] });
        }
      },
    );
}
