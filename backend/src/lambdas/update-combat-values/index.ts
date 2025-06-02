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
  handling: z.object({
    old: z.number(),
    new: z.number(),
  }),
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
  handling: {
    old: number;
    new: number;
  };
  attackValue: {
    initialValue: number;
    increasedPoints: number;
  };
  paradeValue: {
    initialValue: number;
    increasedPoints: number;
  };
}

export async function _updateCombatValues(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(`Update character ${params.characterId} of user ${params.userId}`);
    console.log(
      `Update handling of combat skill '${params.combatCategory}/${params.combatSkillName}' from ${params.handling.old} to ${params.handling.new}`,
    );
    console.log(
      `Update attack/parade value of combat skill '${params.combatCategory}/${params.combatSkillName}' from ` +
        `${params.attackValue.initialValue}/${params.paradeValue.initialValue} to ` +
        `${params.attackValue.initialValue + params.attackValue.increasedPoints}/${params.paradeValue.initialValue + params.paradeValue.increasedPoints}`,
    );

    const character = await getCharacterItem(params.userId, params.characterId);

    const characterSheet = character.characterSheet;
    const combatCategory = params.combatCategory as keyof Character["characterSheet"]["combatValues"];
    const skillCombatValuesOld = getCombatValues(characterSheet.combatValues, combatCategory, params.combatSkillName);
    const skillCombatValues = structuredClone(skillCombatValuesOld);

    const skillCategory = "combat" as keyof Character["characterSheet"]["skills"];
    const combatSkill = getSkill(characterSheet.skills, skillCategory, params.combatSkillName);

    if (
      params.attackValue.initialValue + params.attackValue.increasedPoints === skillCombatValues.attackValue &&
      params.paradeValue.initialValue + params.paradeValue.increasedPoints === skillCombatValues.paradeValue &&
      params.handling.new === skillCombatValues.handling
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

    skillCombatValues.handling = params.handling.new;
    skillCombatValues.attackValue = params.attackValue.initialValue + params.attackValue.increasedPoints;
    skillCombatValues.paradeValue = params.paradeValue.initialValue + params.paradeValue.increasedPoints;

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
      handling: body.handling,
      attackValue: body.attackValue,
      paradeValue: body.paradeValue,
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
    (params.attackValue.initialValue !== combatValues.attackValue &&
      params.attackValue.initialValue + params.attackValue.increasedPoints !== combatValues.attackValue) ||
    (params.paradeValue.initialValue !== combatValues.paradeValue &&
      params.paradeValue.initialValue + params.paradeValue.increasedPoints !== combatValues.paradeValue) ||
    (params.handling.old !== combatValues.handling && params.handling.new !== combatValues.handling)
  ) {
    throw new HttpError(409, "The passed skill combat values doesn't match the values in the backend!", {
      characterId: params.characterId,
      combatSkillName: params.combatSkillName,
      passedAttackValue: params.attackValue.initialValue,
      backendAttackValue: combatValues.attackValue,
      passedParadeValue: params.paradeValue.initialValue,
      backendParadeValue: combatValues.paradeValue,
    });
  }

  const totalCombatPoints = combatSkill.current + combatSkill.mod + combatValues.handling;
  const availableCombatPoints = totalCombatPoints - combatValues.attackValue - combatValues.paradeValue;
  if (params.attackValue.increasedPoints + params.paradeValue.increasedPoints > availableCombatPoints) {
    throw new HttpError(400, "Not enough combat points available to increase the passed values!", {
      characterId: params.characterId,
      combatSkillName: params.combatSkillName,
      totalCombatPoints: totalCombatPoints,
      availableCombatPoints: availableCombatPoints,
      passedIncreaseAttackValue: params.attackValue.increasedPoints,
      passedIncreaseParadeValue: params.paradeValue.increasedPoints,
    });
  }

  console.log("Passed skill combat values match the values in the backend");
}
