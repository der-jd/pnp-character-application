import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { Attribute, Character, characterSchema, CalculationPoints, Skill, CombatValues } from "config/index.js";
import { HttpError } from "./errors.js";

export async function getCharacterItem(userId: string, characterId: string): Promise<Character> {
  console.log(`Get character ${characterId} of user ${userId} from DynamoDB`);

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/get.js
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  const command = new GetCommand({
    TableName: process.env.TABLE_NAME_CHARACTERS,
    Key: {
      userId: userId,
      characterId: characterId,
    },
    ConsistentRead: true,
  });

  const response = await docClient.send(command);

  if (!response.Item) {
    throw new HttpError(404, "No character found for the given user and character id");
  }

  console.log("Successfully got DynamoDB item");

  return characterSchema.parse(response.Item);
}

export async function getCharacterItems(userId: string): Promise<Character[]> {
  console.log(`Get characters for user ${userId} from DynamoDB`);

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/query.js
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  const command = new QueryCommand({
    TableName: process.env.TABLE_NAME_CHARACTERS,
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": userId,
    },
    ConsistentRead: true,
  });

  const response = await docClient.send(command);

  if (!response.Items || response.Items.length === 0) {
    throw new HttpError(404, "No characters found for the given user id");
  }

  console.log("Successfully got DynamoDB items");

  return z.array(characterSchema).parse(response.Items);
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
  updateCalculationPoints(userId, characterId, adventurePoints, CalculationPointsType.ADVENTURE_POINTS);
}

export async function updateAttributePoints(
  userId: string,
  characterId: string,
  attributePoints: CalculationPoints,
): Promise<void> {
  updateCalculationPoints(userId, characterId, attributePoints, CalculationPointsType.ATTRIBUTE_POINTS);
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
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
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

  await docClient.send(command);

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
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
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

  await docClient.send(command);

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
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
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

  await docClient.send(command);

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
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
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

  await docClient.send(command);

  console.log("Successfully updated DynamoDB item");
}
