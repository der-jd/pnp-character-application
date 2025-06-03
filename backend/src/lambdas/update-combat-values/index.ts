import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { Character, getSkill, Skill, getCombatValues, CombatValues, combatValuesSchema } from "config/index.js";
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
  old: combatValuesSchema,
  new: combatValuesSchema,
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
      `Update handling of combat skill '${params.combatCategory}/${params.combatSkillName}' from ${params.combatValues.old.handling} to ${params.combatValues.new.handling}`,
    );
    console.log(
      `Update attack/parade value of combat skill '${params.combatCategory}/${params.combatSkillName}' from ` +
        `${params.combatValues.old.attackValue}/${params.combatValues.old.paradeValue} to ` +
        `${params.combatValues.new.attackValue}/${params.combatValues.new.paradeValue}`,
    );

    const character = await getCharacterItem(params.userId, params.characterId);

    const characterSheet = character.characterSheet;
    const combatCategory = params.combatCategory as keyof Character["characterSheet"]["combatValues"];
    const skillCombatValuesOld = getCombatValues(characterSheet.combatValues, combatCategory, params.combatSkillName);
    const skillCombatValues = structuredClone(skillCombatValuesOld);

    const skillCategory = "combat" as keyof Character["characterSheet"]["skills"];
    const combatSkill = getSkill(characterSheet.skills, skillCategory, params.combatSkillName);

    if (
      params.combatValues.new.attackValue === skillCombatValues.attackValue &&
      params.combatValues.new.paradeValue === skillCombatValues.paradeValue &&
      params.combatValues.new.handling === skillCombatValues.handling
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

    skillCombatValues.handling = params.combatValues.new.handling;
    skillCombatValues.attackValue = params.combatValues.new.attackValue;
    skillCombatValues.paradeValue = params.combatValues.new.paradeValue;

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

    if (combatCategory === "ranged" && body.new.paradeValue != 0) {
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
    (params.combatValues.old.attackValue !== combatValues.attackValue &&
      params.combatValues.new.attackValue !== combatValues.attackValue) ||
    (params.combatValues.old.paradeValue !== combatValues.paradeValue &&
      params.combatValues.new.paradeValue !== combatValues.paradeValue) ||
    (params.combatValues.old.handling !== combatValues.handling &&
      params.combatValues.new.handling !== combatValues.handling)
  ) {
    throw new HttpError(409, "The passed skill combat values doesn't match the values in the backend!", {
      characterId: params.characterId,
      combatSkillName: params.combatSkillName,
      passedAttackValue: params.combatValues.old.attackValue,
      backendAttackValue: combatValues.attackValue,
      passedParadeValue: params.combatValues.old.paradeValue,
      backendParadeValue: combatValues.paradeValue,
    });
  }

  const totalCombatPoints = combatSkill.current + combatSkill.mod + combatValues.handling;
  const availableCombatPoints = totalCombatPoints - combatValues.attackValue - combatValues.paradeValue;
  const passedIncreaseAttackValue = params.combatValues.new.attackValue - params.combatValues.old.attackValue;
  const passedIncreaseParadeValue = params.combatValues.new.paradeValue - params.combatValues.old.paradeValue;
  if (passedIncreaseAttackValue + passedIncreaseParadeValue > availableCombatPoints) {
    throw new HttpError(400, "Not enough combat points available to increase the passed values!", {
      characterId: params.characterId,
      combatSkillName: params.combatSkillName,
      totalCombatPoints: totalCombatPoints,
      availableCombatPoints: availableCombatPoints,
      passedIncreaseAttackValue: passedIncreaseAttackValue,
      passedIncreaseParadeValue: passedIncreaseParadeValue,
    });
  }

  console.log("Passed skill combat values match the values in the backend");
}
