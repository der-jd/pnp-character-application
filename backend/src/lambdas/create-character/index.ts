import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { Request, parseBody, decodeUserId, HttpError, ensureHttpError, createCharacterItem } from "utils/index.js";
import {
  dis_advantagesSchema,
  generalInformationSchema,
  MAX_STRING_LENGTH_DEFAULT,
  NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION,
  MAX_ATTRIBUTE_VALUE_FOR_CREATION,
  MIN_ATTRIBUTE_VALUE_FOR_CREATION,
  createEmptyCharacterSheet,
  CharacterSheet,
  START_LEVEL,
  attributes,
  ATTRIBUTE_POINTS_FOR_CREATION,
  getAttribute,
  getSkill,
  PROFESSION_SKILL_BONUS,
  HOBBY_SKILL_BONUS,
  Character,
} from "config/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return _createCharacter({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

const generalInformationSchemaWithoutLevel = generalInformationSchema.omit({ level: true });

const attributeSchema = z.object(
  Object.fromEntries(
    attributes.map((attr) => [
      attr,
      z.number().min(MIN_ATTRIBUTE_VALUE_FOR_CREATION).max(MAX_ATTRIBUTE_VALUE_FOR_CREATION),
    ]),
  ),
);

const activatableSkillsForFreeSchema = z
  .array(
    z.string().regex(new RegExp(`^[^/]{1,${MAX_STRING_LENGTH_DEFAULT}}/[^/]{1,${MAX_STRING_LENGTH_DEFAULT}}$`), {
      message: `Skill must be in the format "skillCategory/skillName", each max ${MAX_STRING_LENGTH_DEFAULT} characters.`,
    }),
  )
  .length(NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION);

const bodySchema = z
  .object({
    generalInformationWithoutLevel: generalInformationSchemaWithoutLevel,
    attributes: attributeSchema,
    advantages: dis_advantagesSchema,
    disadvantages: dis_advantagesSchema,
    activatableSkillsForFree: activatableSkillsForFreeSchema,
  })
  .strict();

interface Parameters {
  userId: string;
  body: z.infer<typeof bodySchema>;
}

export async function _createCharacter(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    const characterId = uuidv4();

    console.log(`Create new character with id '${characterId}' for user ${params.userId}`);

    let characterSheet = createEmptyCharacterSheet();

    characterSheet = setAttributes(characterSheet, params.body.attributes);

    characterSheet = setGeneralInformation(characterSheet, params.body.generalInformationWithoutLevel);

    // TODO check if advantages and disadvantages are valid -> does the names exist and are the cost points correct?
    // TODO advanteges and disadvantages: set benefits and costs

    characterSheet = activateSkills(characterSheet, params.body.activatableSkillsForFree);

    const character: Character = {
      characterId: characterId,
      userId: params.userId,
      characterSheet: characterSheet,
    };

    await createCharacterItem(character);

    const response = {
      statusCode: 200,
      // JSON.stringify() does not work with Set, so we need to convert it to an array
      body: JSON.stringify(
        {
          characterId: character.characterId,
          userId: character.userId,
          characterName: character.characterSheet.generalInformation.name,
          character: {
            old: {},
            new: character,
          },
        },
        (key, value) => {
          if (value instanceof Set) {
            return Array.from(value);
          }
          return value;
        },
      ),
    };
    console.log(response);
    return response;
  } catch (error) {
    throw ensureHttpError(error);
  }
}

function validateRequest(request: Request): Parameters {
  console.log("Validate request");

  const userId = decodeUserId(request.headers.authorization ?? request.headers.Authorization);

  try {
    const body = bodySchema.parse(request.body);

    return {
      userId: userId,
      body: body,
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

function setAttributes(
  characterSheet: CharacterSheet,
  passedAttributes: z.infer<typeof attributeSchema>,
): CharacterSheet {
  let spentAttributePoints = 0;
  for (const [attr, value] of Object.entries(passedAttributes)) {
    const attribute = getAttribute(characterSheet.attributes, attr);
    attribute.start = value;
    attribute.current = value;

    spentAttributePoints += value;
  }

  if (spentAttributePoints !== ATTRIBUTE_POINTS_FOR_CREATION) {
    throw new HttpError(
      400,
      `Expected ${ATTRIBUTE_POINTS_FOR_CREATION} distributed attribute points, but only got ${spentAttributePoints} points.`,
    );
  }

  characterSheet.calculationPoints.attributePoints.start = ATTRIBUTE_POINTS_FOR_CREATION;
  characterSheet.calculationPoints.attributePoints.total = ATTRIBUTE_POINTS_FOR_CREATION;

  return characterSheet;
}

function setGeneralInformation(
  characterSheet: CharacterSheet,
  generalInformationWithoutLevel: z.infer<typeof generalInformationSchemaWithoutLevel>,
): CharacterSheet {
  const [professionSkillCategory, professionSkillName] = generalInformationWithoutLevel.profession.skill.split("/");
  const professionSkill = getSkill(
    characterSheet.skills,
    professionSkillCategory as keyof CharacterSheet["skills"],
    professionSkillName,
  );
  professionSkill.activated = true;
  professionSkill.start = PROFESSION_SKILL_BONUS;
  professionSkill.current = PROFESSION_SKILL_BONUS;

  const [hobbySkillCategory, hobbySkillName] = generalInformationWithoutLevel.hobby.skill.split("/");
  const hobbySkill = getSkill(
    characterSheet.skills,
    hobbySkillCategory as keyof CharacterSheet["skills"],
    hobbySkillName,
  );
  hobbySkill.activated = true;
  hobbySkill.start = HOBBY_SKILL_BONUS;
  hobbySkill.current = HOBBY_SKILL_BONUS;

  characterSheet.generalInformation = { ...generalInformationWithoutLevel, level: START_LEVEL };

  return characterSheet;
}

function activateSkills(
  characterSheet: CharacterSheet,
  activatableSkillsForFree: z.infer<typeof activatableSkillsForFreeSchema>,
): CharacterSheet {
  for (const skill of activatableSkillsForFree) {
    const [category, name] = skill.split("/");
    const characterSkill = getSkill(characterSheet.skills, category as keyof CharacterSheet["skills"], name);

    if (characterSkill.activated) {
      throw new HttpError(400, `Skill '${skill}' is already activated.`);
    }

    characterSkill.activated = true;
  }

  return characterSheet;
}
