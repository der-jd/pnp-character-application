import { afterEach, describe, expect, test } from "vitest";
import {
  CharacterSheet,
  Character,
  BaseValue,
  BaseValues,
  CombatStats,
  HistoryRecordType,
  PatchAttributeResponse,
  HistoryRecord,
  RulesetVersionHistoryRecord,
  getHistoryResponseSchema,
  patchAttributeResponseSchema,
} from "api-spec";
import { expectApiError, updateAndVerifyTestContextAfterEachTest } from "./shared.js";
import { TestContext, TestContextFactory } from "./test-context-factory.js";

describe.sequential("version-update component tests", () => {
  let context: TestContext;
  let currentResponse: PatchAttributeResponse | undefined;

  afterEach(async () => {
    if (!context) {
      throw new Error("Context not initialized. Call createContext() first.");
    }

    await updateAndVerifyTestContextAfterEachTest(
      context,
      currentResponse,
      (response: PatchAttributeResponse, character: Character) => {
        character.characterSheet.attributes[response.data.attributeName as keyof CharacterSheet["attributes"]] =
          response.data.changes.new.attribute;
        character.characterSheet.calculationPoints.attributePoints = response.data.attributePoints.new;

        // Update base values if they changed
        if (response.data.changes.new.baseValues) {
          for (const [baseValueName, baseValue] of Object.entries(response.data.changes.new.baseValues)) {
            character.characterSheet.baseValues[baseValueName as keyof BaseValues] = baseValue as BaseValue;
          }
        }

        // Update combat stats if they changed
        if (response.data.changes.new.combat) {
          if (response.data.changes.new.combat.melee) {
            for (const [skillName, combatStats] of Object.entries(response.data.changes.new.combat.melee)) {
              character.characterSheet.combat.melee[skillName as keyof CharacterSheet["combat"]["melee"]] =
                combatStats as CombatStats;
            }
          }
          if (response.data.changes.new.combat.ranged) {
            for (const [skillName, combatStats] of Object.entries(response.data.changes.new.combat.ranged)) {
              character.characterSheet.combat.ranged[skillName as keyof CharacterSheet["combat"]["ranged"]] =
                combatStats as CombatStats;
            }
          }
        }

        // Update ruleset version
        if (response.data.versionUpdate) {
          character.rulesetVersion = response.data.versionUpdate.new.value;
        }
      },
      (response: PatchAttributeResponse, record: HistoryRecord) => {
        if (response.historyRecord) {
          Object.assign(record, response.historyRecord);
        }
      },
    );
    currentResponse = undefined;

    // Delete context that has been created in each test case
    await TestContextFactory.cleanupContext(context);
  });

  /**
   * =============================
   * Version Update Failure Cases
   * =============================
   */

  describe("Version update failures", () => {
    test("should fail when character major version is older", async () => {
      const characterId = TestContextFactory.loadCharacterIdFromTestData("character-major-version-older.dynamodb.json");
      context = await TestContextFactory.createContext(characterId);

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${characterId}/attributes/endurance`, {
            mod: {
              initialValue: context.character.characterSheet.attributes.endurance.mod,
              newValue: context.character.characterSheet.attributes.endurance.mod + 1,
            },
          }),
        409
      );
    });

    test("should fail when character major version is newer", async () => {
      const characterId = TestContextFactory.loadCharacterIdFromTestData("character-major-version-newer.dynamodb.json");
      context = await TestContextFactory.createContext(characterId);

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${characterId}/attributes/endurance`, {
            mod: {
              initialValue: context.character.characterSheet.attributes.endurance.mod,
              newValue: context.character.characterSheet.attributes.endurance.mod + 1,
            },
          }),
        409
      );
    });

    test("should fail when character minor version is newer", async () => {
      const characterId = TestContextFactory.loadCharacterIdFromTestData("character-minor-version-newer.dynamodb.json");
      context = await TestContextFactory.createContext(characterId);

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${characterId}/attributes/endurance`, {
            mod: {
              initialValue: context.character.characterSheet.attributes.endurance.mod,
              newValue: context.character.characterSheet.attributes.endurance.mod + 1,
            },
          }),
        409
      );
    });

    test("should fail when character patch version is newer", async () => {
      const characterId = TestContextFactory.loadCharacterIdFromTestData("character-patch-version-newer.dynamodb.json");
      context = await TestContextFactory.createContext(characterId);

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${characterId}/attributes/endurance`, {
            mod: {
              initialValue: context.character.characterSheet.attributes.endurance.mod,
              newValue: context.character.characterSheet.attributes.endurance.mod + 1,
            },
          }),
        409
      );
    });
  });

  /**
   * =============================
   * No Change Case
   * =============================
   */

  describe("Version no change", () => {
    test("should not change when character version matches current version", async () => {
      const characterId = TestContextFactory.loadCharacterIdFromTestData("character-exact-version-match.dynamodb.json");
      context = await TestContextFactory.createContext(characterId);

      const response = patchAttributeResponseSchema.parse(
        await context.apiClient.patch(`characters/${characterId}/attributes/endurance`, {
          mod: {
            initialValue: context.character.characterSheet.attributes.endurance.mod,
            newValue: context.character.characterSheet.attributes.endurance.mod + 1,
          },
        }),
      );
      currentResponse = response;

      // Since version matches, versionUpdate should be missing
      expect(response.data.versionUpdate).toBeUndefined();
      expect(response.versionUpdateHistoryRecord).toBeNull();
    });
  });

  /**
   * =============================
   * Auto Update Cases
   * =============================
   */

  describe("Version auto-update", () => {
    const updateTestCases = [
      {
        name: "should auto-update when character minor version is older",
        characterId: TestContextFactory.loadCharacterIdFromTestData("character-minor-version-older.dynamodb.json"),
        versionBump: "minor",
      },
      {
        name: "should auto-update when character patch version is older",
        characterId: TestContextFactory.loadCharacterIdFromTestData("character-patch-version-older.dynamodb.json"),
        versionBump: "patch",
      },
    ];

    updateTestCases.forEach((testCase) => {
      test(testCase.name, async () => {
        context = await TestContextFactory.createContext(testCase.characterId);

        const response = patchAttributeResponseSchema.parse(
          await context.apiClient.patch(`characters/${context.character.characterId}/attributes/endurance`, {
            mod: {
              initialValue: context.character.characterSheet.attributes.endurance.mod,
              newValue: context.character.characterSheet.attributes.endurance.mod + 1,
            },
          }),
        );
        currentResponse = response;

        // Verify version update information
        expect(response.data.versionUpdate).toBeDefined();
        expect(response.data.versionUpdate?.old.value).toBe(context.character.rulesetVersion);
        expect(response.data.versionUpdate?.old.value).not.toBe(response.data.versionUpdate?.new.value);

        const oldMinor = parseInt(context.character.rulesetVersion.split(".")[1]);
        const oldPatch = parseInt(context.character.rulesetVersion.split(".")[2]);
        const newMinor = parseInt(response.data.versionUpdate!.new.value.split(".")[1]);
        const newPatch = parseInt(response.data.versionUpdate!.new.value.split(".")[2]);
        switch (testCase.versionBump) {
          case "minor":
            expect(newMinor).toBeGreaterThan(oldMinor);
            expect(newPatch).toBe(oldPatch);
            break;
          case "patch":
            expect(newMinor).toBe(oldMinor);
            expect(newPatch).toBeGreaterThan(oldPatch);
            break;
          default:
            throw new Error(`Unknown version bump: ${testCase.versionBump}`);
        }

        // Verify history record for version update was created
        expect(response.versionUpdateHistoryRecord).not.toBeNull();

        const versionHistoryRecord = response.versionUpdateHistoryRecord as RulesetVersionHistoryRecord;

        // Verify basic record properties
        expect(versionHistoryRecord.type).toBe(HistoryRecordType.RULESET_VERSION_UPDATED);
        expect(versionHistoryRecord.name).toBe(`Update to ruleset version ${response.data.versionUpdate?.new.value}`);
        expect(versionHistoryRecord.number).toBeGreaterThan(0);
        expect(versionHistoryRecord.id).toBeDefined();
        expect(versionHistoryRecord.timestamp).toBeDefined();
        expect(versionHistoryRecord.learningMethod).toBeNull();

        // Verify record data matches response changes
        expect(versionHistoryRecord.data.old).toStrictEqual(response.data.versionUpdate?.old);
        expect(versionHistoryRecord.data.new).toStrictEqual(response.data.versionUpdate?.new);

        // Verify calculation points changes
        expect(versionHistoryRecord.calculationPoints.attributePoints).toBeNull();
        expect(versionHistoryRecord.calculationPoints.adventurePoints).toBeNull();

        // Verify comment is null (not set in this operation)
        expect(versionHistoryRecord.comment).toBeNull();

        // Verify history record for attribute update was created
        expect(response.historyRecord).not.toBeNull();

        // Check if two history records have been created and the 2nd last is the version update record
        const history = getHistoryResponseSchema.parse(
          await context.apiClient.get(`characters/${context.character.characterId}/history`),
        );

        // Should have at least one history block with at least 2 records
        expect(history.items.length).toBeGreaterThanOrEqual(1);
        const latestBlock = history.items[0];
        expect(latestBlock.changes.length).toBeGreaterThanOrEqual(2);

        // The second to last record should be the version update record
        const secondLastRecord = latestBlock.changes[latestBlock.changes.length - 2];
        expect(secondLastRecord).toStrictEqual(versionHistoryRecord);

        // The last record should be the attribute update record
        const lastRecord = latestBlock.changes[latestBlock.changes.length - 1];
        expect(lastRecord).toStrictEqual(response.historyRecord);
      });
    });
  });
});
