import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import {
  patchGeneralInformationResponseSchema,
  Character,
  HistoryRecordType,
  PatchGeneralInformationHistoryRecord,
  PatchGeneralInformationResponse,
  HistoryRecord,
} from "api-spec";
import { expectApiError, commonInvalidTestCases, updateAndVerifyTestContextAfterEachTest } from "./shared.js";
import { ApiClient } from "./api-client.js";
import { TestContext, TestContextFactory } from "./test-context-factory.js";

describe.sequential("patch-general-information component tests", () => {
  let context: TestContext;
  let currentResponse: PatchGeneralInformationResponse | undefined;

  beforeAll(async () => {
    context = await TestContextFactory.createContext();
  });

  afterAll(async () => {
    await TestContextFactory.cleanupContext(context);
  });

  afterEach(async () => {
    await updateAndVerifyTestContextAfterEachTest(
      context,
      currentResponse,
      (response: PatchGeneralInformationResponse, character: Character) => {
        character.characterSheet.generalInformation = response.data.changes.new.generalInformation;
      },
      (response: PatchGeneralInformationResponse, record: HistoryRecord) => {
        if (response.historyRecord) {
          Object.assign(record, response.historyRecord);
        }
      },
    );
    currentResponse = undefined;
  });

  /**
   * =============================
   * Invalid requests
   * =============================
   */

  describe("Invalid requests", () => {
    commonInvalidTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = context.character;

        const authorizationHeader = _case.authorizationHeader ?? context.authorizationHeader;
        const path = _case.characterId
          ? `characters/${_case.characterId}/general-information`
          : `characters/${character.characterId}/general-information`;
        const client = new ApiClient(context.apiBaseUrl, authorizationHeader);

        await expectApiError(
          () => client.patch(path, { name: "Test Name" }),
          _case.expectedStatusCode,
          _case.expectedErrorMessage,
        );
      });
    });

    test("request body contains unknown field", async () => {
      const character = context.character;

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/general-information`, {
            name: "Test",
            unknownField: "should fail",
          }),
        400,
        "Invalid input values",
      );
    });
  });

  /**
   * =============================
   * Idempotent requests
   * =============================
   */

  describe("Idempotent requests", () => {
    test("sending same name as current value (idempotency)", async () => {
      const character = context.character;
      const gi = character.characterSheet.generalInformation;

      const response = patchGeneralInformationResponseSchema.parse(
        await context.apiClient.patch(`characters/${character.characterId}/general-information`, {
          name: gi.name,
        }),
      );
      /**
       * Notice: The response is not stored in the currentResponse variable
       * because we explicitly do not want to update the local test context.
       * This is because we want to verify that the local test context is
       * still identical to the backend character after the update (idempotency).
       */

      // Verify response structure
      expect(response.data.userId).toBe(character.userId);
      expect(response.data.characterId).toBe(character.characterId);

      // Verify idempotency - no history record
      expect(response.historyRecord).toBeNull();

      // Verify general information remains unchanged
      expect(response.data.changes.old.generalInformation).toStrictEqual(gi);
      expect(response.data.changes.new.generalInformation).toStrictEqual(gi);

      // Verify missing version update (character already at current version)
      expect(response.data.versionUpdate).toBeUndefined();
      expect(response.versionUpdateHistoryRecord).toBeNull();
    });

    test("sending same multiple fields as current values (idempotency)", async () => {
      const character = context.character;
      const gi = character.characterSheet.generalInformation;

      const response = patchGeneralInformationResponseSchema.parse(
        await context.apiClient.patch(`characters/${character.characterId}/general-information`, {
          birthplace: gi.birthplace,
          eyeColor: gi.eyeColor,
          weight: gi.weight,
        }),
      );

      expect(response.data.changes.old.generalInformation).toStrictEqual(gi);
      expect(response.data.changes.new.generalInformation).toStrictEqual(gi);
      expect(response.historyRecord).toBeNull();
    });
  });

  /**
   * =============================
   * Patch general information
   * =============================
   */

  describe("Patch general information", () => {
    test("update name", async () => {
      const character = context.character;
      const gi = character.characterSheet.generalInformation;
      const newName = "Updated Character Name";

      const response = patchGeneralInformationResponseSchema.parse(
        await context.apiClient.patch(`characters/${character.characterId}/general-information`, {
          name: newName,
        }),
      );
      currentResponse = response;

      // Verify response structure
      expect(response.data.userId).toBe(character.userId);
      expect(response.data.characterId).toBe(character.characterId);

      // Verify old values match current state
      expect(response.data.changes.old.generalInformation).toStrictEqual(gi);

      // Verify new values have the updated name
      expect(response.data.changes.new.generalInformation.name).toBe(newName);

      // Verify other fields remain unchanged
      expect(response.data.changes.new.generalInformation.sex).toBe(gi.sex);
      expect(response.data.changes.new.generalInformation.birthplace).toBe(gi.birthplace);
      expect(response.data.changes.new.generalInformation.profession).toStrictEqual(gi.profession);

      // Verify missing version update (character already at current version)
      expect(response.data.versionUpdate).toBeUndefined();
      expect(response.versionUpdateHistoryRecord).toBeNull();

      // Verify history record was created
      expect(response.historyRecord).not.toBeNull();

      const historyRecord = response.historyRecord as PatchGeneralInformationHistoryRecord;

      // Verify basic record properties
      expect(historyRecord.type).toBe(HistoryRecordType.GENERAL_INFORMATION_CHANGED);
      expect(historyRecord.name).toBe("General Information");
      expect(historyRecord.number).toBeGreaterThan(0);
      expect(historyRecord.id).toBeDefined();
      expect(historyRecord.timestamp).toBeDefined();
      expect(historyRecord.learningMethod).toBeNull();

      // Verify record data matches response changes
      expect(historyRecord.data.old).toStrictEqual(response.data.changes.old);
      expect(historyRecord.data.new).toStrictEqual(response.data.changes.new);

      // Verify calculation points are not affected
      expect(historyRecord.calculationPoints.adventurePoints).toBeNull();
      expect(historyRecord.calculationPoints.attributePoints).toBeNull();

      // Verify comment is null
      expect(historyRecord.comment).toBeNull();
    });

    test("update multiple fields at once", async () => {
      const character = context.character;
      const gi = character.characterSheet.generalInformation;

      const response = patchGeneralInformationResponseSchema.parse(
        await context.apiClient.patch(`characters/${character.characterId}/general-information`, {
          birthplace: "Updated Birthplace",
          weight: "190 lbs",
          eyeColor: "Green",
          residence: "New Residence",
        }),
      );
      currentResponse = response;

      // Verify updated fields
      expect(response.data.changes.new.generalInformation.birthplace).toBe("Updated Birthplace");
      expect(response.data.changes.new.generalInformation.weight).toBe("190 lbs");
      expect(response.data.changes.new.generalInformation.eyeColor).toBe("Green");
      expect(response.data.changes.new.generalInformation.residence).toBe("New Residence");

      // Verify untouched fields remain the same
      expect(response.data.changes.new.generalInformation.sex).toBe(gi.sex);
      expect(response.data.changes.new.generalInformation.hairColor).toBe(gi.hairColor);

      // Verify history record was created
      expect(response.historyRecord).not.toBeNull();
      const historyRecord = response.historyRecord as PatchGeneralInformationHistoryRecord;
      expect(historyRecord.type).toBe(HistoryRecordType.GENERAL_INFORMATION_CHANGED);
    });

    test("update appearance and special characteristics", async () => {
      const character = context.character;

      const response = patchGeneralInformationResponseSchema.parse(
        await context.apiClient.patch(`characters/${character.characterId}/general-information`, {
          appearance: "Short and stocky with a red beard",
          specialCharacteristics: "Missing left pinky finger",
        }),
      );
      currentResponse = response;

      expect(response.data.changes.new.generalInformation.appearance).toBe("Short and stocky with a red beard");
      expect(response.data.changes.new.generalInformation.specialCharacteristics).toBe("Missing left pinky finger");

      expect(response.historyRecord).not.toBeNull();
    });
  });
});
