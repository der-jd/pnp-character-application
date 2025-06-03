import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { Character, getSkill, Skill, getCombatValues, CombatValues } from "config/index.js";
import {
  Request,
  parseBody,
  getCharacterItem,
  decodeUserId,
  HttpError,
  ensureHttpError,
  validateUUID,
  updateCombatValues,
} from "utils/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return _updateCombatValues({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

const bodySchema = z.object({
  attackValue: z.object({
    initialValue: z.number(),
    increasedPoints: z.number(),
  }),
  paradeValue: z.object({
    initialValue: z.number(),
    increasedPoints: z.number(),
  }),
});

export type UpdateCombatValuesBodySchema = z.infer<typeof bodySchema>;

interface Parameters {
  userId: string;
  characterId: string;
  combatCategory: string;
  combatSkillName: string;
  combatValues: UpdateCombatValuesBodySchema;
}

export async function _updateCombatValues(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(`Update character ${params.characterId} of user ${params.userId}`);
    console.log(
      `Update attack/parade value of combat skill '${params.combatCategory}/${params.combatSkillName}' from ` +
        `${params.combatValues.attackValue.initialValue}/${params.combatValues.paradeValue.initialValue} to ` +
        `${params.combatValues.attackValue.initialValue + params.combatValues.attackValue.increasedPoints}/${params.combatValues.paradeValue.initialValue + params.combatValues.paradeValue.increasedPoints}`,
    );

    const character = await getCharacterItem(params.userId, params.characterId);

    const characterSheet = character.characterSheet;
    const combatCategory = params.combatCategory as keyof Character["characterSheet"]["combatValues"];
    const skillCombatValuesOld = getCombatValues(characterSheet.combatValues, combatCategory, params.combatSkillName);
    const skillCombatValues = structuredClone(skillCombatValuesOld);

    const skillCategory = "combat" as keyof Character["characterSheet"]["skills"];
    const combatSkill = getSkill(characterSheet.skills, skillCategory, params.combatSkillName);

    if (
      params.combatValues.attackValue.initialValue + params.combatValues.attackValue.increasedPoints ===
        skillCombatValues.attackValue &&
      params.combatValues.paradeValue.initialValue + params.combatValues.paradeValue.increasedPoints ===
        skillCombatValues.paradeValue
    ) {
      console.log("Combat values already updated to target value. Nothing to do.");
      const response = {
        statusCode: 200,
        body: JSON.stringify({
          characterId: params.characterId,
          userId: params.userId,
          combatCategory: params.combatCategory,
          combatSkillName: params.combatSkillName,
          combatValues: {
            old: skillCombatValuesOld,
            new: skillCombatValues,
          },
        }),
      };
      console.log(response);

      return response;
    }

    validatePassedValues(combatSkill, skillCombatValues, params);

    const combatValuesWithIncreases = [
      {
        valueName: "attack value",
        value: skillCombatValues.attackValue,
        increased: params.combatValues.attackValue.increasedPoints,
      },
      {
        valueName: "parade value",
        value: skillCombatValues.paradeValue,
        increased: params.combatValues.paradeValue.increasedPoints,
      },
    ];
    const increaseCost = 1; // Increase cost are always 1 for combat values

    console.log(`Available points before increasing: ${skillCombatValues.availablePoints}`);
    for (const combatValue of combatValuesWithIncreases) {
      const { valueName, increased } = combatValue;
      let value = combatValue.value;
      console.log(`Increasing ${valueName} from ${value} by ${increased} points...`);
      for (let i = 0; i < increased; i++) {
        console.debug("---------------------------");

        if (increaseCost > skillCombatValues.availablePoints) {
          throw new HttpError(400, "Not enough points to increase the combat value!", {
            characterId: params.characterId,
            combatValueName: valueName,
          });
        }

        console.debug(`Combat value: ${value}`);
        console.debug(`Available points: ${skillCombatValues.availablePoints}`);
        console.debug(`Increasing combat value by 1 for ${increaseCost} point...`);
        value += 1;
        skillCombatValues.availablePoints -= increaseCost;
      }
      skillCombatValues[valueName === "attack value" ? "attackValue" : "paradeValue"] = value;
    }

    await updateCombatValues(
      params.userId,
      params.characterId,
      combatCategory,
      params.combatSkillName,
      skillCombatValues,
    );

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        characterId: params.characterId,
        userId: params.userId,
        combatCategory: params.combatCategory,
        combatSkillName: params.combatSkillName,
        combatValues: {
          old: skillCombatValuesOld,
          new: skillCombatValues,
        },
      }),
    };
    console.log(response);
    return response;
  } catch (error) {
    throw ensureHttpError(error);
  }
}

function validateRequest(request: Request): Parameters {
  try {
    console.log("Validate request");
    const userId = decodeUserId(request.headers.authorization ?? request.headers.Authorization);

    const characterId = request.pathParameters?.["character-id"];
    const combatCategory = request.pathParameters?.["combat-category"];
    const combatSkillName = request.pathParameters?.["combat-skill-name"];

    if (typeof characterId !== "string" || typeof combatCategory !== "string" || typeof combatSkillName !== "string") {
      throw new HttpError(400, "Invalid input values!");
    }

    validateUUID(characterId);

    const body = bodySchema.parse(request.body);

    if (combatCategory === "ranged" && body.paradeValue.increasedPoints != 0) {
      throw new HttpError(400, "Parade value for a ranged combat skill must be 0!");
    }

    return {
      userId: userId,
      characterId: characterId,
      combatCategory: combatCategory,
      combatSkillName: combatSkillName,
      combatValues: body,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation errors:", error.errors);
      throw new HttpError(400, "Invalid input values!");
    }

    // Rethrow other errors
    throw error;
  }
}

function validatePassedValues(combatSkill: Skill, combatValues: CombatValues, params: Parameters) {
  console.log("Compare passed skill combat values with the values in the backend");

  // Values are valid if the passed values have already been applied (idempotent operation)
  if (
    (params.combatValues.attackValue.initialValue !== combatValues.attackValue &&
      params.combatValues.attackValue.initialValue + params.combatValues.attackValue.increasedPoints !==
        combatValues.attackValue) ||
    (params.combatValues.paradeValue.initialValue !== combatValues.paradeValue &&
      params.combatValues.paradeValue.initialValue + params.combatValues.paradeValue.increasedPoints !==
        combatValues.paradeValue)
  ) {
    throw new HttpError(409, "The passed skill combat values don't match the values in the backend!", {
      characterId: params.characterId,
      combatSkillName: params.combatSkillName,
      passedAttackValue: params.combatValues.attackValue.initialValue,
      backendAttackValue: combatValues.attackValue,
      passedParadeValue: params.combatValues.paradeValue.initialValue,
      backendParadeValue: combatValues.paradeValue,
    });
  }

  console.log("Passed skill combat values match the values in the backend");
}
