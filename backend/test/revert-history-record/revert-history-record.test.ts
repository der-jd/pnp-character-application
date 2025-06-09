import { describe, expect, test } from "vitest";
import { UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { fakeHeaders } from "../test-data/request.js";
import { fakeHistoryBlockListResponse, mockDynamoDBQueryHistoryResponse } from "../test-data/response.js";
import { fakeCharacterId } from "../test-data/character.js";
import {
  addFakeHistoryRecord,
  attributeAndBaseValueChangedRecord,
  attributeChangedRecord,
  combatSkillChangedRecord,
  combatValuesChangedRecord,
  skillChangedRecord,
} from "../test-data/history.js";
import { expectHttpError } from "../utils.js";
import { revertRecordFromHistory } from "revert-history-record/index.js";

const lastBlock = fakeHistoryBlockListResponse.Items[fakeHistoryBlockListResponse.Items.length - 1];

describe("Invalid requests", () => {
  const fakeRecordId = lastBlock.changes[lastBlock.changes.length - 1].id;

  const invalidTestCases = [
    {
      name: "Authorization header is malformed",
      request: {
        headers: {
          authorization: "dummyValue",
        },
        pathParameters: {
          "character-id": fakeCharacterId,
          "record-id": fakeRecordId,
        },
        queryStringParameters: null,
        body: null,
      },
      expectedStatusCode: 401,
    },
    {
      name: "Authorization token is invalid",
      request: {
        headers: {
          authorization: "Bearer 1234567890",
        },
        pathParameters: {
          "character-id": fakeCharacterId,
          "record-id": fakeRecordId,
        },
        queryStringParameters: null,
        body: null,
      },
      expectedStatusCode: 401,
    },
    {
      name: "Character id is not an UUID",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": "1234567890",
          "record-id": fakeRecordId,
        },
        queryStringParameters: null,
        body: null,
      },
      expectedStatusCode: 400,
    },
    {
      name: "Record id is not an UUID",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "record-id": "1234567890",
        },
        queryStringParameters: null,
        body: null,
      },
      expectedStatusCode: 400,
    },
    {
      name: "No history for the given character id",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": "539c0670-0323-4287-956c-910b4a9ae643", // random character id
          "record-id": fakeRecordId,
        },
        queryStringParameters: null,
        body: null,
      },
      expectedStatusCode: 404,
    },
    {
      name: "Given record id does not match the latest change",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "record-id": "9eebacbd-2449-4446-8584-71c26e09799e", // random record id
        },
        queryStringParameters: null,
        body: null,
      },
      expectedStatusCode: 404,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBQueryHistoryResponse(fakeHistoryBlockListResponse);

      await expectHttpError(() => revertRecordFromHistory(_case.request), _case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  const testCasesForRevertingRecord = [
    {
      name: "Revert history record for a changed attribute",
      fakeRecord: attributeChangedRecord,
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "record-id": "to-be-replaced", // This will be replaced with the actual record id in the test
        },
        queryStringParameters: null,
        body: null,
      },
      expectedStatusCode: 200,
    },
    {
      name: "Revert history record for a changed attribute and base values",
      fakeRecord: attributeAndBaseValueChangedRecord,
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "record-id": "to-be-replaced", // This will be replaced with the actual record id in the test
        },
        queryStringParameters: null,
        body: null,
      },
      expectedStatusCode: 200,
    },
    {
      name: "Revert history record for a changed skill",
      fakeRecord: skillChangedRecord,
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "record-id": "to-be-replaced", // This will be replaced with the actual record id in the test
        },
        queryStringParameters: null,
        body: null,
      },
      expectedStatusCode: 200,
    },
    {
      name: "Revert history record for a changed combat skill and combat values",
      fakeRecord: combatSkillChangedRecord,
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "record-id": "to-be-replaced", // This will be replaced with the actual record id in the test
        },
        queryStringParameters: null,
        body: null,
      },
      expectedStatusCode: 200,
    },
    {
      name: "Revert history record for changed combat values",
      fakeRecord: combatValuesChangedRecord,
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "record-id": "to-be-replaced", // This will be replaced with the actual record id in the test
        },
        queryStringParameters: null,
        body: null,
      },
      expectedStatusCode: 200,
    },
  ];

  testCasesForRevertingRecord.forEach((_case) => {
    test(_case.name, async () => {
      addFakeHistoryRecord(lastBlock, _case.fakeRecord);
      mockDynamoDBQueryHistoryResponse(fakeHistoryBlockListResponse);

      _case.request.pathParameters["record-id"] = _case.fakeRecord.id;
      const result = await revertRecordFromHistory(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = JSON.parse(result.body);
      expect(parsedBody).toEqual(_case.fakeRecord);

      /**
       * Check if the UpdateCommand was called at least once for the removal of the latest record from the history item.
       * It could be called more often depending on how the revert of the record data is implemented.
       */
      const calls = (globalThis as any).dynamoDBMock.commandCalls(UpdateCommand);
      expect(calls.length).toBeGreaterThanOrEqual(1);

      const matchingCall = calls.find((call: any) => {
        const input = call.args[0].input;
        return (
          input.Key.characterId === _case.request.pathParameters["character-id"] &&
          input.Key.blockNumber === lastBlock.blockNumber &&
          input.UpdateExpression === `REMOVE #changes[${lastBlock.changes.length - 1}]`
        );
      });
      expect(matchingCall).toBeTruthy();
    });
  });

  const testCasesForRevertingWholeBlock = [
    {
      name: "Delete history block that contains only the reverted record",
      fakeRecord: skillChangedRecord,
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "record-id": "to-be-replaced", // This will be replaced with the actual record id in the test
        },
        queryStringParameters: null,
        body: null,
      },
      expectedStatusCode: 200,
    },
  ];

  testCasesForRevertingWholeBlock.forEach((_case) => {
    test(_case.name, async () => {
      addFakeHistoryRecord(lastBlock, _case.fakeRecord, true);
      mockDynamoDBQueryHistoryResponse(fakeHistoryBlockListResponse);

      _case.request.pathParameters["record-id"] = _case.fakeRecord.id;
      const result = await revertRecordFromHistory(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = JSON.parse(result.body);
      expect(parsedBody).toEqual(_case.fakeRecord);

      /**
       * Check if the DeleteCommand was called at least once for the removal of the latest, now empty block from the history table.
       * It could be called more often depending on how the revert of the record data is implemented.
       */
      const calls = (globalThis as any).dynamoDBMock.commandCalls(DeleteCommand);
      expect(calls.length).toBeGreaterThanOrEqual(1);

      const matchingCall = calls.find((call: any) => {
        const input = call.args[0].input;
        return (
          input.Key.characterId === _case.request.pathParameters["character-id"] &&
          input.Key.blockNumber === lastBlock.blockNumber
        );
      });
      expect(matchingCall).toBeTruthy();
    });
  });
});
