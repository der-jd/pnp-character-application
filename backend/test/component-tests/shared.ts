import { expect } from "vitest";
import { Character, HistoryRecord, getCharacterResponseSchema } from "api-spec";
import { ApiError } from "./api-client.js";
import { TestContext, TestContextFactory } from "./test-context-factory.js";

export const NON_EXISTENT_UUID = "26c5d41d-cef1-455f-a341-b15d8a5b3967";
export const INVALID_UUID = "not-a-uuid";

export type ErrorBody = {
  message: string;
  statusCode?: number;
  context?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function parseErrorBody(body: unknown): ErrorBody {
  const parsed = typeof body === "string" ? tryParseJson(body) : body;
  if (!isRecord(parsed)) {
    return { message: String(parsed) };
  }

  const message = typeof parsed.message === "string" ? parsed.message : JSON.stringify(parsed);
  const statusCode = typeof parsed.statusCode === "number" ? parsed.statusCode : undefined;
  const contextValue = parsed.context;
  const context = isRecord(contextValue) ? contextValue : undefined;

  return { message, statusCode, context };
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function expectApiError(
  request: () => Promise<unknown>,
  expectedStatus: number,
  expectedMessage?: string | RegExp,
): Promise<ErrorBody> {
  let error: ApiError;

  try {
    await request();
    expect.fail("Expected request to throw an ApiError");
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
    error = e as ApiError;
  }

  expect(error.status).toBe(expectedStatus);

  const parsedBody = parseErrorBody(error.body);

  if (parsedBody.statusCode !== undefined) {
    expect(parsedBody.statusCode).toBe(expectedStatus);
  }

  if (expectedMessage !== undefined) {
    if (expectedMessage instanceof RegExp) {
      expect(parsedBody.message).toMatch(expectedMessage);
    } else {
      expect(parsedBody.message).toContain(expectedMessage);
    }
  }

  return parsedBody;
}

/**
 * Updates the local test context after each test to keep it synchronized with the backend.
 *
 * All tests in a file share the same test character, so they depend on each other's state.
 * If one test fails and the context isn't updated, subsequent tests will fail due to
 * stale local data that doesn't match the actual backend character state.
 *
 * @param response - The current endpoint response to process. If undefined, no update is performed
 *                   (e.g. when the test was idempotent and the local test context should already be up to date)
 * @param updateCharacter - Function that updates the local character state based on the response
 * @param updateLastHistoryRecord - Function that updates the local last history record state based on the response
 */
export async function updateAndVerifyTestContextAfterEachTest<T>(
  context: TestContext,
  response: T | undefined,
  updateCharacter: (response: T, character: Character) => void,
  updateLastHistoryRecord: (response: T, record: HistoryRecord) => void,
): Promise<void> {
  if (response) {
    updateCharacter(response, context.character);
    updateLastHistoryRecord(response, context.lastHistoryRecord);
  } else {
    console.log("No current endpoint response set, skipping update of test context.");
  }

  await verifyCharacterState(context);
  await verifyLatestHistoryRecord(context);
}

/**
 * Common invalid test case template with complete configuration
 */
export const commonInvalidTestCases = [
  {
    name: "authorization header is missing",
    expectedStatusCode: 401,
    expectedErrorMessage: "Unauthorized",
    authorizationHeader: "",
  },
  {
    name: "authorization header is malformed",
    expectedStatusCode: 401,
    expectedErrorMessage: "Unauthorized",
    authorizationHeader: "dummyValue",
  },
  {
    name: "authorization token is invalid",
    expectedStatusCode: 401,
    expectedErrorMessage: "Unauthorized",
    authorizationHeader: "Bearer 1234567890",
  },
  {
    name: "unauthorized for non-existing user id",
    expectedStatusCode: 401,
    expectedErrorMessage: "Unauthorized",
    /**
     * JWT token for non existing user id 'fbcc6196-6959-4a76-b647-efae2b78fdfa'
     * Header
     * {
     *   "typ": "JWT",
     *   "alg": "RS256",
     *   "kid": "d517b1aa2632baaab4e7a463c4c872cf"
     * }
     *
     * Payload
     * {
     *   "iss": "test",
     *   "iat": 1743940581,
     *   "exp": 1775480181,
     *   "aud": "www.test.com",
     *   "sub": "fbcc6196-6959-4a76-b647-efae2b78fdfa"
     * }
     */
    authorizationHeader:
      "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6ImQ1MTdiMWFhMjYzMmJhYWFiNGU3YTQ2M2M0Yzg3MmNmIn0." +
      "eyJpc3MiOiJ0ZXN0IiwiaWF0IjoxNzQzOTQwNTgxLCJleHAiOjE3NzU0ODAxODEsImF1ZCI6Ind3dy50ZXN0LmNvbSIsInN1YiI6ImZiY2M2MTk2LTY5NTktNGE3Ni1iNjQ3LWVmYWUyYjc4ZmRmYSJ9." +
      "rdMLo75dttDhieMjnNt2k7_T2SW2LvDYTJe_jqafxkFfGKM74nwoEAg9Fr-r7TOgZ2kmPI3H5HGsK5eMedAiM1TzsbTYMq0EOgaFiit__hu7NS-AE6--TIRdFYw2b5oARbCmgJHD7uGR8n_terkUvo2Wk" +
      "t8TxIxR20W9bpUStpMk3aIRpkhtlGv0A0QuB76XM2l7kdKeXVJhzIVnHSB0HnRgp4eRc9l6x4xDLkvyycGbiuJ6LAEnkM_sT4iDobielbTcFCBUQFuZjRMbNYu18Ii6BOL-AdOmHFX8QweGSfbsGdhUpOQgHFfyq7n1ckaDA4hc1drbA7xG-i1DQUkbOxoR3MATb6LQF0NlaBoMatu9yux8eukSzgCM5mZYI-z-HaE5RICPs3p-hdJcgpbWo1zuKVe9GEzv80JqGFbCWVxWnNwKHytpqs82QjDLHqjZCi8sBFsmjJP6o9jtdAEN_HO6bfi_Eshfx4Hzn6uUuaPGevL1GJdjFb4F8W_ucKvc",
  },
  {
    name: "character id is not an uuid",
    expectedStatusCode: 400,
    expectedErrorMessage: "Invalid input values",
    characterId: INVALID_UUID,
  },
  {
    name: "no character found for non-existing character id",
    expectedStatusCode: 404,
    expectedErrorMessage: "No character found",
    characterId: NON_EXISTENT_UUID,
  },
];

/**
 * Verifies that the character state on the backend matches the expected character state.
 * Handles special abilities comparison as Set to account for unordered storage.
 */
async function verifyCharacterState(context: TestContext): Promise<void> {
  const updatedCharacter = getCharacterResponseSchema.parse(
    await context.apiClient.get(`characters/${context.character.characterId}`),
  );

  // Compare specialAbilities as Sets (order not guaranteed due to Set storage)
  if (context.character.characterSheet.specialAbilities || updatedCharacter.characterSheet.specialAbilities) {
    expect(new Set(updatedCharacter.characterSheet.specialAbilities || [])).toEqual(
      new Set(context.character.characterSheet.specialAbilities || []),
    );
  }

  // Create copies without specialAbilities for strict comparison of other properties
  const expectedCopy = {
    ...context.character,
    characterSheet: {
      ...context.character.characterSheet,
      specialAbilities: undefined,
    },
  };

  const updatedCopy = {
    ...updatedCharacter,
    characterSheet: {
      ...updatedCharacter.characterSheet,
      specialAbilities: undefined,
    },
  };

  // Strict comparison of all other properties
  expect(updatedCopy).toStrictEqual(expectedCopy);
}

/**
 * Verifies that the latest history record on the backend matches the expected history record.
 */
async function verifyLatestHistoryRecord(context: TestContext): Promise<void> {
  const { latestRecord } = await TestContextFactory.getLatestHistoryRecord(context.character.characterId);
  expect(latestRecord).toStrictEqual(context.lastHistoryRecord);
}
