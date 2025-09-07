import { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { Attribute, Character, CalculationPoints, CombatValues, BaseValue, Skill, characterSchema } from "shared";
import { HttpError } from "./errors.js";
import { dynamoDBDocClient } from "./dynamodb_client.js";

export async function setSpecialAbilities(
  userId: string,
  characterId: string,
  specialAbilities: Set<string>,
): Promise<void> {
  console.log(
    `Set special abilities '${Array.from(specialAbilities).join(", ")}' to character ${characterId} of user ${userId} in DynamoDB`,
  );

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/update.js
  const command = new UpdateCommand({
    TableName: process.env.TABLE_NAME_CHARACTERS,
    Key: {
      userId: userId,
      characterId: characterId,
    },
    UpdateExpression: "SET #characterSheet.#specialAbilities = :specialAbilities",
    ExpressionAttributeNames: {
      "#characterSheet": "characterSheet",
      "#specialAbilities": "specialAbilities",
    },
    ExpressionAttributeValues: {
      ":specialAbilities": specialAbilities,
    },
  });

  await dynamoDBDocClient.send(command);

  console.log("Successfully updated DynamoDB item");
}

export async function getCharacterItem(userId: string, characterId: string): Promise<Character> {
  console.log(`Get character ${characterId} of user ${userId} from DynamoDB`);

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/get.js
  const command = new GetCommand({
    TableName: process.env.TABLE_NAME_CHARACTERS,
    Key: {
      userId: userId,
      characterId: characterId,
    },
    ConsistentRead: true,
  });

  const response = await dynamoDBDocClient.send(command);

  if (!response.Item) {
    throw new HttpError(404, "No character found for the given user and character id");
  }

  console.log("Successfully got DynamoDB item");

  return characterSchema.parse(response.Item);
}

export async function getCharacterItems(userId: string): Promise<Character[]> {
  console.log(`Get characters for user ${userId} from DynamoDB`);

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/query.js
  const command = new QueryCommand({
    TableName: process.env.TABLE_NAME_CHARACTERS,
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": userId,
    },
    ConsistentRead: true,
  });

  const response = await dynamoDBDocClient.send(command);

  if (!response.Items || response.Items.length === 0) {
    throw new HttpError(404, "No characters found for the given user id");
  }

  console.log("Successfully got DynamoDB items");

  return z.array(characterSchema).parse(response.Items);
}

export async function createCharacterItem(character: Character): Promise<void> {
  console.log(`Create new character item ${character.characterId} (user ${character.userId}) in DynamoDB`);

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/put.js
  const command = new PutCommand({
    TableName: process.env.TABLE_NAME_CHARACTERS,
    Item: character,
  });

  await dynamoDBDocClient.send(command);

  console.log("Successfully created new character item in DynamoDB", character);
}

export async function deleteCharacterItem(userId: string, characterId: string): Promise<void> {
  console.log(`Delete character ${characterId} of user ${userId} in DynamoDB`);

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/delete.js
  const command = new DeleteCommand({
    TableName: process.env.TABLE_NAME_CHARACTERS,
    Key: {
      userId: userId,
      characterId: characterId,
    },
    ReturnValues: "ALL_OLD", // Return the deleted item attributes
  });

  const response = await dynamoDBDocClient.send(command);

  if (!response.Attributes) {
    throw new HttpError(404, "No character was deleted because it did not exist.", {
      userId: userId,
      characterId: characterId,
    });
  } else {
    console.log(`Successfully deleted character ${characterId} of user ${userId} in DynamoDB`);
  }
}

enum CalculationPointsType {
  ADVENTURE_POINTS = "adventurePoints",
  ATTRIBUTE_POINTS = "attributePoints",
}

export async function updateAdventurePoints(
  userId: string,
  characterId: string,
  adventurePoints: CalculationPoints,
): Promise<void> {
  await updateCalculationPoints(userId, characterId, adventurePoints, CalculationPointsType.ADVENTURE_POINTS);
}

export async function updateAttributePoints(
  userId: string,
  characterId: string,
  attributePoints: CalculationPoints,
): Promise<void> {
  await updateCalculationPoints(userId, characterId, attributePoints, CalculationPointsType.ATTRIBUTE_POINTS);
}

async function updateCalculationPoints(
  userId: string,
  characterId: string,
  calculationPoints: CalculationPoints,
  type: CalculationPointsType,
): Promise<void> {
  if (!Object.values(CalculationPointsType).includes(type)) {
    throw new HttpError(400, `Invalid calculation points type: ${type}`);
  }
  console.log(`Update ${type} of character ${characterId} (user ${userId}) in DynamoDB`);

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/update.js
  const command = new UpdateCommand({
    TableName: process.env.TABLE_NAME_CHARACTERS,
    Key: {
      userId: userId,
      characterId: characterId,
    },
    UpdateExpression: "SET #characterSheet.#calculationPoints.#type = :calculationPoints",
    ExpressionAttributeNames: {
      "#characterSheet": "characterSheet",
      "#calculationPoints": "calculationPoints",
      "#type": type,
    },
    ExpressionAttributeValues: {
      ":calculationPoints": calculationPoints,
    },
  });

  await dynamoDBDocClient.send(command);

  console.log("Successfully updated DynamoDB item");
}

export async function updateAttribute(
  userId: string,
  characterId: string,
  attributeName: string,
  attribute: Attribute,
  attributePoints: CalculationPoints,
): Promise<void> {
  console.log(`Update attribute '${attributeName}' of character ${characterId} (user ${userId}) in DynamoDB`);

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/update.js
  const command = new UpdateCommand({
    TableName: process.env.TABLE_NAME_CHARACTERS,
    Key: {
      userId: userId,
      characterId: characterId,
    },
    UpdateExpression:
      "SET #characterSheet.#attributes.#attributeName = :attribute, " +
      "#characterSheet.#calculationPoints.#attributePoints = :attributePoints",
    ExpressionAttributeNames: {
      "#characterSheet": "characterSheet",
      "#attributes": "attributes",
      "#attributeName": attributeName,
      "#calculationPoints": "calculationPoints",
      "#attributePoints": "attributePoints",
    },
    ExpressionAttributeValues: {
      ":attribute": attribute,
      ":attributePoints": attributePoints,
    },
  });

  await dynamoDBDocClient.send(command);

  console.log("Successfully updated DynamoDB item");
}

export async function updateBaseValue(
  userId: string,
  characterId: string,
  baseValueName: string,
  baseValue: BaseValue,
): Promise<void> {
  console.log(`Update base value '${baseValueName}' of character ${characterId} (user ${userId}) in DynamoDB`);

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/update.js
  const command = new UpdateCommand({
    TableName: process.env.TABLE_NAME_CHARACTERS,
    Key: {
      userId: userId,
      characterId: characterId,
    },
    UpdateExpression: "SET #characterSheet.#baseValues.#baseValueName = :baseValue",
    ExpressionAttributeNames: {
      "#characterSheet": "characterSheet",
      "#baseValues": "baseValues",
      "#baseValueName": baseValueName,
    },
    ExpressionAttributeValues: {
      ":baseValue": baseValue,
    },
  });

  await dynamoDBDocClient.send(command);

  console.log("Successfully updated DynamoDB item");
}

export async function updateLevel(userId: string, characterId: string, level: number): Promise<void> {
  console.log(`Update level of character ${characterId} (user ${userId}) to ${level} in DynamoDB`);

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/update.js
  const command = new UpdateCommand({
    TableName: process.env.TABLE_NAME_CHARACTERS,
    Key: {
      userId: userId,
      characterId: characterId,
    },
    UpdateExpression: "SET #characterSheet.#generalInformation.#level = :level",
    ExpressionAttributeNames: {
      "#characterSheet": "characterSheet",
      "#generalInformation": "generalInformation",
      "#level": "level",
    },
    ExpressionAttributeValues: {
      ":level": level,
    },
  });

  await dynamoDBDocClient.send(command);

  console.log("Successfully updated DynamoDB item");
}

export async function updateSkill(
  userId: string,
  characterId: string,
  skillCategory: string,
  skillName: string,
  skill: Skill,
  adventurePoints: CalculationPoints,
): Promise<void> {
  console.log(`Update skill '${skillName}' of character ${characterId} (user ${userId}) in DynamoDB`);

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/update.js
  const command = new UpdateCommand({
    TableName: process.env.TABLE_NAME_CHARACTERS,
    Key: {
      userId: userId,
      characterId: characterId,
    },
    UpdateExpression:
      "SET #characterSheet.#skills.#skillCategory.#skillName = :skill, " +
      "#characterSheet.#calculationPoints.#adventurePoints = :adventurePoints",
    ExpressionAttributeNames: {
      "#characterSheet": "characterSheet",
      "#skills": "skills",
      "#skillCategory": skillCategory,
      "#skillName": skillName,
      "#calculationPoints": "calculationPoints",
      "#adventurePoints": "adventurePoints",
    },
    ExpressionAttributeValues: {
      ":skill": skill,
      ":adventurePoints": adventurePoints,
    },
  });

  await dynamoDBDocClient.send(command);

  console.log("Successfully updated DynamoDB item");
}

export async function updateCombatValues(
  userId: string,
  characterId: string,
  combatCategory: string,
  combatSkillName: string,
  combatValues: CombatValues,
): Promise<void> {
  console.log(
    `Update combat values of combat skill '${combatSkillName}' of character ${characterId} (user ${userId}) in DynamoDB`,
  );

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/update.js
  const command = new UpdateCommand({
    TableName: process.env.TABLE_NAME_CHARACTERS,
    Key: {
      userId: userId,
      characterId: characterId,
    },
    UpdateExpression: "SET #characterSheet.#combatValues.#combatCategory.#combatSkillName = :combatValues",
    ExpressionAttributeNames: {
      "#characterSheet": "characterSheet",
      "#combatValues": "combatValues",
      "#combatCategory": combatCategory,
      "#combatSkillName": combatSkillName,
    },
    ExpressionAttributeValues: {
      ":combatValues": combatValues,
    },
  });

  await dynamoDBDocClient.send(command);

  console.log("Successfully updated DynamoDB item");
}
