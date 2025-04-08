import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { Character, characterSchema } from "config/index.js";

export async function getCharacterItem(userId: string, characterId: string): Promise<Character> {
  console.log(`Get character ${characterId} of user ${userId} from DynamoDB`);

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/get.js
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  const command = new GetCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      userId: userId,
      characterId: characterId,
    },
    ConsistentRead: true,
  });

  const response = await docClient.send(command);

  if (!response.Item) {
    console.error("No character found for the given user and character id");
    throw {
      statusCode: 404,
      body: JSON.stringify({
        message: "No character found for the given user and character id",
      }),
    };
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
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": userId,
    },
    ConsistentRead: true,
  });

  const response = await docClient.send(command);

  if (!response.Items || response.Items.length === 0) {
    console.error("No characters found for the given user id");
    throw {
      statusCode: 404,
      body: JSON.stringify({
        message: "No characters found for the given user id",
      }),
    };
  }

  console.log("Successfully got DynamoDB items");

  return z.array(characterSchema).parse(response.Items);
}

export async function updateSkill(
  userId: string,
  characterId: string,
  skillCategory: string,
  skillName: string,
  skillValue: number,
  skillTotalCost: number,
  availableAdventurePoints: number,
): Promise<void> {
  console.log(`Update skill '${skillName}' of character ${characterId} (user ${userId}) in DynamoDB`);

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/update.js
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  const command = new UpdateCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      userId: userId,
      characterId: characterId,
    },
    UpdateExpression:
      "SET #characterSheet.#skills.#skillCategory.#skillName.#current = :current, " +
      "#characterSheet.#skills.#skillCategory.#skillName.#totalCost = :totalCost, " +
      "#characterSheet.#calculationPoints.#adventurePoints.#available = :available",
    ExpressionAttributeNames: {
      "#characterSheet": "characterSheet",
      "#skills": "skills",
      "#skillCategory": skillCategory,
      "#skillName": skillName,
      "#current": "current",
      "#totalCost": "totalCost",
      "#calculationPoints": "calculationPoints",
      "#adventurePoints": "adventurePoints",
      "#available": "available",
    },
    ExpressionAttributeValues: {
      ":current": skillValue,
      ":totalCost": skillTotalCost,
      ":available": availableAdventurePoints,
    },
  });

  await docClient.send(command);

  console.log("Successfully updated DynamoDB item");
}
