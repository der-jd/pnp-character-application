import {
  Attribute,
  Attributes,
  BaseValue,
  BaseValues,
  Character,
  CombatSection,
  CombatStats,
  HistoryRecord,
  Skill,
  LEVEL_UP_DICE_EXPRESSION,
  PostLevelUpRequest,
  getHistoryResponseSchema,
  getLevelUpResponseSchema,
  getCharacterResponseSchema,
} from "api-spec";
import { ApiError } from "./api-client.js";
import { apiClient } from "./setup.js";
import { expect } from "vitest";

export const NON_EXISTENT_UUID = "26c5d41d-cef1-455f-a341-b15d8a5b3967";
export const INVALID_UUID = "not-a-uuid";

export type ErrorBody = {
  message: string;
  statusCode?: number;
  context?: Record<string, unknown>;
};

export type SkillCategory = keyof Character["characterSheet"]["skills"];
export type LevelUpOption = ReturnType<typeof getLevelUpResponseSchema.parse>["options"][number];

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

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

export function pickAttribute(
  character: Character,
  preferred: keyof Attributes,
): { name: keyof Attributes; value: Attribute } {
  const preferredValue = character.characterSheet.attributes[preferred];
  if (preferredValue) {
    return { name: preferred, value: preferredValue };
  }

  const entries = Object.entries(character.characterSheet.attributes) as [keyof Attributes, Attribute][];
  if (entries.length === 0) {
    throw new Error("No attributes found on character");
  }
  return { name: entries[0][0], value: entries[0][1] };
}

export function pickBaseValue(
  character: Character,
  preferred: keyof BaseValues,
): { name: keyof BaseValues; value: BaseValue } {
  const preferredValue = character.characterSheet.baseValues[preferred];
  if (preferredValue) {
    return { name: preferred, value: preferredValue };
  }

  const entries = Object.entries(character.characterSheet.baseValues) as [keyof BaseValues, BaseValue][];
  if (entries.length === 0) {
    throw new Error("No base values found on character");
  }
  return { name: entries[0][0], value: entries[0][1] };
}

export function pickActivatedSkill(
  character: Character,
  includeCombat: boolean,
): {
  category: SkillCategory;
  name: string;
  value: Skill;
} {
  const categories = Object.entries(character.characterSheet.skills) as [SkillCategory, Record<string, Skill>][];
  for (const [category, skills] of categories) {
    if (!includeCombat && category === "combat") {
      continue;
    }

    const entry = Object.entries(skills).find(([, skill]) => skill.activated);
    if (entry) {
      return { category, name: entry[0], value: entry[1] };
    }
  }

  throw new Error("No activated skill found");
}

export function pickInactiveSkill(character: Character): {
  category: Exclude<SkillCategory, "combat">;
  name: string;
  value: Skill;
} {
  const categories = Object.entries(character.characterSheet.skills) as [SkillCategory, Record<string, Skill>][];
  for (const [category, skills] of categories) {
    if (category === "combat") {
      continue;
    }

    const entry = Object.entries(skills).find(([, skill]) => !skill.activated);
    if (entry) {
      return {
        category: category as Exclude<SkillCategory, "combat">,
        name: entry[0],
        value: entry[1],
      };
    }
  }

  throw new Error("No inactive non-combat skill found");
}

// TODO remove all these pick functions?!
export function pickCombatSkill(
  character: Character,
  category: keyof CombatSection,
): { category: keyof CombatSection; name: string; value: CombatStats } {
  const entries = Object.entries(character.characterSheet.combat[category]) as [string, CombatStats][];
  if (entries.length === 0) {
    throw new Error(`No combat skill found in category '${category}'`);
  }

  return { category, name: entries[0][0], value: entries[0][1] };
}

export async function getLatestHistoryRecord(characterId: string) {
  const history = getHistoryResponseSchema.parse(await apiClient.get(`characters/${characterId}/history`));

  expect(history.items.length).toBeGreaterThanOrEqual(1);

  const latestBlock = history.items[0];
  expect(latestBlock.changes.length).toBeGreaterThanOrEqual(1);

  const latestRecord = latestBlock.changes[latestBlock.changes.length - 1];
  return { history, latestBlock, latestRecord };
}

export function toLevelUpEffect(option: LevelUpOption): PostLevelUpRequest["effect"] {
  switch (option.kind) {
    case "hpRoll":
    case "armorLevelRoll":
      return {
        kind: option.kind,
        roll: {
          dice: (option.diceExpression ?? LEVEL_UP_DICE_EXPRESSION) as "1d4+2",
          value: 4,
        },
      };
    case "initiativePlusOne":
    case "luckPlusOne":
    case "bonusActionPlusOne":
    case "legendaryActionPlusOne":
      return {
        kind: option.kind,
        delta: 1,
      };
    case "rerollUnlock":
      return { kind: option.kind };
    default:
      throw new Error("Unsupported level-up option kind");
  }
}

/**
 * Verifies that the character state on the backend matches the expected character state.
 */
export async function verifyCharacterState(characterId: string, expectedCharacter: Character): Promise<void> {
  const updatedCharacter = getCharacterResponseSchema.parse(await apiClient.get(`characters/${characterId}`));

  expect(updatedCharacter).toStrictEqual(expectedCharacter);
}

/**
 * Verifies that the latest history record on the backend matches the expected history record.
 */
export async function verifyLatestHistoryRecord<T extends HistoryRecord>(
  characterId: string,
  expectedHistoryRecord: T,
): Promise<void> {
  const { latestRecord } = await getLatestHistoryRecord(characterId);
  expect(latestRecord).toStrictEqual(expectedHistoryRecord);
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
