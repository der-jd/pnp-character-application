import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { postSpecialAbilitiesResponseSchema, MAX_STRING_LENGTH_DEFAULT } from "api-spec";
import { INVALID_UUID, NON_EXISTENT_UUID, expectApiError, verifyCharacterState } from "../shared.js";
import { apiClient, setupTestContext, cleanUpTestContext } from "../setup.js";
import { getTestContext } from "../test-context.js";
import { ApiClient } from "../api-client.js";

export function makeUniqueName(prefix: string): string {
  return `${prefix}-${getTestContext().character?.characterId}-${randomUUID().slice(0, 8)}`;
}

describe("add-special-ability component tests", () => {
  beforeAll(async () => {
    await setupTestContext();
  });

  afterAll(async () => {
    await cleanUpTestContext();
  });

  test("authorization header is missing", async () => {
    // Create a client without authorization header
    const unauthorizedClient = new ApiClient(getTestContext().apiBaseUrl, "");

    await expectApiError(
      () =>
        unauthorizedClient.post(`characters/${getTestContext().character.characterId}/special-abilities`, {
          specialAbility: "Iron Will",
        }),
      401,
      "Unauthorized",
    );
  });

  test("authorization token is invalid", async () => {
    // Create a client with invalid authorization
    const malformedClient = new ApiClient(getTestContext().apiBaseUrl, "Bearer 1234567890");

    await expectApiError(
      () =>
        malformedClient.post(`characters/${getTestContext().character.characterId}/special-abilities`, {
          specialAbility: "Iron Will",
        }),
      401,
      "Unauthorized",
    );
  });

  test("character id is not a uuid", async () => {
    await expectApiError(
      () =>
        apiClient.post(`characters/${INVALID_UUID}/special-abilities`, {
          specialAbility: "Iron Will",
        }),
      400,
      "Invalid input values",
    );
  });

  test("no character found for non-existing character id", async () => {
    await expectApiError(
      () =>
        apiClient.post(`characters/${NON_EXISTENT_UUID}/special-abilities`, {
          specialAbility: "Iron Will",
        }),
      404,
      "No character found",
    );
  });

  test("no character found for non-existing user id", async () => {
    // Create a client with a different user token
    const unauthorizedClient = new ApiClient(getTestContext().apiBaseUrl, "Bearer invalid-user-token");

    await expectApiError(
      () =>
        unauthorizedClient.post(`characters/${getTestContext().character.characterId}/special-abilities`, {
          specialAbility: "Iron Will",
        }),
      401,
      "Unauthorized",
    );
  });

  test("special ability name exceeds max length", async () => {
    await expectApiError(
      () =>
        apiClient.post(`characters/${getTestContext().character.characterId}/special-abilities`, {
          specialAbility: "x".repeat(MAX_STRING_LENGTH_DEFAULT + 1),
        }),
      400,
      "Invalid input values",
    );
  });

  test("special ability already exists (idempotency)", async () => {
    const ability = getTestContext().character.characterSheet.specialAbilities[0];

    expect(ability).toBeDefined();
    expect(ability).not.toBe("");

    const response = postSpecialAbilitiesResponseSchema.parse(
      await apiClient.post(`characters/${getTestContext().character.characterId}/special-abilities`, {
        specialAbility: ability,
      }),
    );

    expect(response.data.characterId).toBe(getTestContext().character.characterId);
    expect(response.data.userId).toBe(getTestContext().character.userId);
    expect(response.data.specialAbilityName).toBe(ability);
    expect(response.data.specialAbilities.old.values).toEqual(
      getTestContext().character.characterSheet.specialAbilities,
    );
    expect(response.data.specialAbilities.new).toStrictEqual(response.data.specialAbilities.old);
    expect(response.data.specialAbilities.new.values).toContain(ability);
    expect(response.historyRecord).toBeNull();
  });

  test("add new special ability", async () => {
    const ability = makeUniqueName("ComponentAbility");

    const response = postSpecialAbilitiesResponseSchema.parse(
      await apiClient.post(`characters/${getTestContext().character.characterId}/special-abilities`, {
        specialAbility: ability,
      }),
    );

    expect(response.data.characterId).toBe(getTestContext().character.characterId);
    expect(response.data.userId).toBe(getTestContext().character.userId);
    expect(response.data.specialAbilityName).toBe(ability);
    expect(response.data.specialAbilities.old.values).toEqual(
      getTestContext().character.characterSheet.specialAbilities,
    );
    expect(response.data.specialAbilities.old.values).not.toContain(ability);
    expect(response.data.specialAbilities.new.values).toContain(ability);
    // Verify the new special abilities array contains the old values plus the new one
    const expectedNewAbilities = [...response.data.specialAbilities.old.values, ability];
    expect(response.data.specialAbilities.new.values).toStrictEqual(expectedNewAbilities);
    expect(response.historyRecord).not.toBeNull();

    // Update test context
    getTestContext().character.characterSheet.specialAbilities = response.data.specialAbilities.new.values;

    await verifyCharacterState(getTestContext().character.characterId, getTestContext().character);
  });
});
