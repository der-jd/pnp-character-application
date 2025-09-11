import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
  Request,
  parseBody,
  decodeUserId,
  HttpError,
  logAndEnsureHttpError,
  createCharacterItem,
  isZodError,
  logZodError,
  getSkill,
  getAttribute,
  createEmptyCharacterSheet,
} from "core";
import {
  CharacterSheet,
  Character,
  headersSchema,
  PostCharactersRequest,
  postCharactersRequestSchema,
  AttributesForCreation,
  GeneralInformation,
  Skill,
  PostCharactersResponse,
  ATTRIBUTE_POINTS_FOR_CREATION,
  PROFESSION_SKILL_BONUS,
  HOBBY_SKILL_BONUS,
} from "api-spec";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return _createCharacter({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  body: PostCharactersRequest;
}

export async function _createCharacter(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    const characterId = uuidv4();

    console.log(`Create new character with id '${characterId}' for user ${params.userId}`);

    let characterSheet = createEmptyCharacterSheet();

    characterSheet = setAttributes(characterSheet, params.body.attributes);

    characterSheet = setGeneralInformation(characterSheet, params.body.generalInformation);

    // TODO check if advantages and disadvantages are valid -> does the names exist and are the cost points correct?
    // TODO advantages and disadvantages: set benefits and costs

    characterSheet = activateSkills(characterSheet, params.body.activatableSkillsForFree);

    const character: Character = {
      characterId: characterId,
      userId: params.userId,
      characterSheet: characterSheet,
    };

    await createCharacterItem(character);

    const responseBody: PostCharactersResponse = {
      characterId: character.characterId,
      userId: character.userId,
      characterName: character.characterSheet.generalInformation.name,
      character: {
        old: {},
        new: character,
      },
    };
    const response = {
      statusCode: 200,
      body: JSON.stringify(responseBody),
    };
    console.log(response);
    return response;
  } catch (error) {
    throw logAndEnsureHttpError(error);
  }
}

function validateRequest(request: Request): Parameters {
  try {
    console.log("Validate request");
    return {
      userId: decodeUserId(headersSchema.parse(request.headers).authorization as string | undefined),
      body: postCharactersRequestSchema.parse(request.body),
    };
  } catch (error) {
    if (isZodError(error)) {
      logZodError(error);
      throw new HttpError(400, "Invalid input values!");
    }

    // Rethrow other errors
    throw error;
  }
}

function setAttributes(characterSheet: CharacterSheet, passedAttributes: AttributesForCreation): CharacterSheet {
  console.log("Set attributes");

  let spentAttributePoints = 0;
  for (const [attr, value] of Object.entries(passedAttributes)) {
    const attribute = getAttribute(characterSheet.attributes, attr);
    attribute.start = value.current;
    attribute.current = value.current;
    attribute.mod = value.mod;
    attribute.totalCost = value.current;
    spentAttributePoints += attribute.totalCost;
  }

  if (spentAttributePoints !== ATTRIBUTE_POINTS_FOR_CREATION) {
    throw new HttpError(
      400,
      `Expected ${ATTRIBUTE_POINTS_FOR_CREATION} distributed attribute points, but got ${spentAttributePoints} points.`,
    );
  }

  characterSheet.calculationPoints.attributePoints.start = ATTRIBUTE_POINTS_FOR_CREATION;
  characterSheet.calculationPoints.attributePoints.total = ATTRIBUTE_POINTS_FOR_CREATION;

  return characterSheet;
}

function setGeneralInformation(characterSheet: CharacterSheet, generalInformation: GeneralInformation): CharacterSheet {
  const setupSkill = (skillString: string, bonus: number, type: string) => {
    console.log(`Set up ${type} with skill '${skillString}' and bonus ${bonus}`);

    const [skillCategory, skillName] = skillString.split("/");
    try {
      const skill = getSkill(characterSheet.skills, skillCategory as keyof CharacterSheet["skills"], skillName);
      skill.activated = true;
      skill.start = bonus;
      skill.current = bonus;
    } catch (error) {
      throw logAndEnsureHttpError(error);
    }
  };

  setupSkill(generalInformation.profession.skill, PROFESSION_SKILL_BONUS, "profession");
  setupSkill(generalInformation.hobby.skill, HOBBY_SKILL_BONUS, "hobby");

  console.log("Set general information");
  characterSheet.generalInformation = { ...generalInformation };

  return characterSheet;
}

function activateSkills(
  characterSheet: CharacterSheet,
  activatableSkillsForFree: PostCharactersRequest["activatableSkillsForFree"],
): CharacterSheet {
  console.log("Activate skills for free");

  for (const skill of activatableSkillsForFree) {
    const [category, name] = skill.split("/");

    let characterSkill: Skill;
    try {
      characterSkill = getSkill(characterSheet.skills, category as keyof CharacterSheet["skills"], name);
    } catch (error) {
      throw logAndEnsureHttpError(error);
    }

    if (characterSkill.activated) {
      throw new HttpError(400, `Skill '${skill}' is already activated.`);
    }

    characterSkill.activated = true;
  }

  return characterSheet;
}
