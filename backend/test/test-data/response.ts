import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { fakeCharacter, fakeCharacter2 } from "./character.js";
import { fakeHistoryBlock1, fakeHistoryBlock2, fakeBigHistoryBlock } from "./history.js";

export const fakeCharacterResponse = {
  Item: fakeCharacter,
};

type FakeCharacterResponse = typeof fakeCharacterResponse;

export const fakeCharacterListResponse = {
  Items: [fakeCharacter, fakeCharacter2],
};

type FakeCharacterListResponse = typeof fakeCharacterListResponse;

export const fakeHistoryBlockResponse = {
  Item: fakeHistoryBlock1,
};

type FakeHistoryBlockResponse = typeof fakeHistoryBlockResponse;

export const fakeHistoryBlockListResponse = {
  Items: [fakeHistoryBlock1, fakeHistoryBlock2],
};

export const fakeBigHistoryBlockListResponse = {
  Items: [fakeBigHistoryBlock],
};

type FakeHistoryBlockListResponse = typeof fakeHistoryBlockListResponse;

export const fakeEmptyListResponse = {
  Items: [],
};

export function mockDynamoDBGetCharacterResponse(response: FakeCharacterResponse) {
  (globalThis as any).dynamoDBMock.on(GetCommand).callsFake((command: { Key: any }) => {
    const key = command.Key;
    if (key.characterId === response.Item.characterId && key.userId === response.Item.userId) {
      return Promise.resolve(response);
    } else {
      return Promise.resolve({ Item: undefined });
    }
  });
}

export function mockDynamoDBQueryCharactersResponse(response: FakeCharacterListResponse) {
  (globalThis as any).dynamoDBMock.on(QueryCommand).callsFake((command: { ExpressionAttributeValues: any }) => {
    if (response.Items.length === 0) {
      return Promise.resolve(response);
    } else {
      const userId = response.Items[0].userId;
      const hasInconsistentUserId = response.Items.some((item) => item.userId !== userId);
      if (hasInconsistentUserId) {
        throw new Error("All characters in the mock response must have the same user id!");
      }

      if (command.ExpressionAttributeValues[":userId"] === userId) {
        return Promise.resolve(response);
      } else {
        return Promise.resolve({ Items: [] });
      }
    }
  });
}

export function mockDynamoDBGetHistoryResponse(response: FakeHistoryBlockResponse) {
  (globalThis as any).dynamoDBMock.on(GetCommand).callsFake((command: { Key: any }) => {
    const key = command.Key;
    if (key.characterId === response.Item.characterId && key.blockNumber === response.Item.blockNumber) {
      return Promise.resolve(response);
    } else {
      return Promise.resolve({ Item: undefined });
    }
  });
}

export function mockDynamoDBQueryHistoryResponse(response: FakeHistoryBlockListResponse) {
  (globalThis as any).dynamoDBMock
    .on(QueryCommand)
    .callsFake(
      (command: {
        ExpressionAttributeValues: any;
        ScanIndexForward: boolean | undefined;
        Limit: number | undefined;
      }) => {
        if (response.Items.length === 0) {
          return Promise.resolve(response);
        } else {
          const characterId = response.Items[0].characterId;
          const hasInconsistentCharacterId = response.Items.some((item) => item.characterId !== characterId);
          if (hasInconsistentCharacterId) {
            throw new Error("All history items in the mock response must have the same character id!");
          }

          if (
            command.ScanIndexForward === false &&
            command.Limit === 1 &&
            command.ExpressionAttributeValues[":characterId"] === characterId
          ) {
            return Promise.resolve({ Items: [response.Items[response.Items.length - 1]] }); // return only the item with the highest sort key
          } else if (command.ExpressionAttributeValues[":characterId"] === characterId) {
            return Promise.resolve(response);
          } else {
            return Promise.resolve({ Items: [] });
          }
        }
      },
    );
}
