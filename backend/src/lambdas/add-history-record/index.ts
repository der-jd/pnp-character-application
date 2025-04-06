import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { RecordType } from "config/index.js";
import {
  attributeSchema,
  baseValueSchema,
  calculationPointsSchema,
  combatSkillSchema,
  professionHobbySchema,
  skillSchema,
} from "config/character_schemas.js";

const MAX_ITEM_SIZE = 200 * 1024; // 200 KB

// TODO endpoint should only be callable internally?! No need to expose it to the frontend. with a frontend call we would also need to check for an existing character with this id, see TODO below
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return addRecordToHistory(event);
};

const bodySchema = z.object({
  type: z.string(),
  name: z.string(),
  data: z.object({
    old: z.record(z.any()),
    new: z.record(z.any()),
  }),
  learningMethod: z.string(),
  calculationPointsChange: z.object({
    adjustment: z.number(),
    old: z.number(),
    new: z.number(),
  }),
  comment: z.string(),
});

const numberSchema = z.object({
  value: z.number(),
});

const stringSchema = z.object({
  value: z.string(),
});

const booleanSchema = z.object({
  value: z.boolean(),
});

type Body = z.infer<typeof bodySchema>;

const recordSchema = bodySchema.extend({
  number: z.number(),
  id: z.string(),
  timestamp: z.string().datetime(), // YYYY-MM-DDThh:mm:ssZ/±hh:mm, e.g. 2025-03-24T16:34:56Z (UTC) or 2025-03-24T16:34:56+02:00
});

type Record = z.infer<typeof recordSchema>;

const historyBlockSchema = z.object({
  characterId: z.string(),
  blockNumber: z.number(),
  blockId: z.string(),
  previousBlockId: z.string().nullable(),
  changes: z.array(recordSchema),
});

type HistoryBlock = z.infer<typeof historyBlockSchema>;

interface Parameters {
  characterId: string;
  body: Body;
}

async function addRecordToHistory(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // TODO only allow access to the character history if the user has access to the character
    const params = validateRequest(event);

    console.log(`Get history of character ${params.characterId}`);
    const client = new DynamoDBClient({});
    const docClient = DynamoDBDocumentClient.from(client);
    const command = new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: "characterId = :characterId",
      ExpressionAttributeValues: {
        ":characterId": params.characterId,
      },
      ConsistentRead: true,
      ScanIndexForward: false, // Sort descending to get highest block number (latest item) first
      Limit: 1, // Only need the top result
    });

    const dynamoDbResponse = await docClient.send(command);
    console.log("Successfully got DynamoDB items");

    // TODO what to do if there is no character for the given id? -> check and throw error?!
    let record: Record;
    if (!dynamoDbResponse.Items || dynamoDbResponse.Items.length === 0) {
      console.log("No history found for the given characterId.");
      const newBlock = await createHistoryBlock(params.characterId);

      record = {
        number: 1,
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        ...params.body,
      };
      addRecord(record, newBlock);
    } else if (dynamoDbResponse.Items.length !== 1) {
      console.error("More than one latest history block found for the given characterId");
      throw {
        statusCode: 500,
        body: JSON.stringify({
          message: "More than one latest history block found for the given characterId",
        }),
      };
    } else {
      const latestBlock = historyBlockSchema.parse(dynamoDbResponse.Items[0]);
      console.log("Latest history block:", latestBlock);

      record = {
        number: latestBlock.changes[latestBlock.changes.length - 1].number + 1,
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        ...params.body,
      };

      if (estimateItemSize(latestBlock) + estimateItemSize(record) > MAX_ITEM_SIZE) {
        console.log(`Item size exceeds the maximum limit of ${MAX_ITEM_SIZE} bytes`);
        const newBlock = await createHistoryBlock(params.characterId);
        addRecord(record, newBlock);
      } else {
        addRecord(record, latestBlock);
      }
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify(record),
    };
    console.log(response);
    return response;
  } catch (error: any) {
    const response = {
      statusCode: error.statusCode ?? 500,
      body:
        error.body ??
        JSON.stringify({
          message: "An error occurred!",
          error: (error as Error).message,
        }),
    };
    console.error(response);

    return response;
  }
}

function validateRequest(event: APIGatewayProxyEvent): Parameters {
  console.log("Validate request");

  if (typeof event.pathParameters?.["character-id"] !== "string") {
    console.error("Invalid input values!");
    throw {
      statusCode: 400,
      body: JSON.stringify({
        message: "Invalid input values!",
      }),
    };
  }

  const characterId = event.pathParameters?.["character-id"];
  const uuidRegex = new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$");
  if (!uuidRegex.test(characterId)) {
    console.error("Character id is not a valid UUID format!");
    throw {
      statusCode: 400,
      body: JSON.stringify({
        message: "Character id is not a valid UUID format!",
      }),
    };
  }

  try {
    // The conditional parse is necessary for Lambda tests via the AWS console
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    bodySchema.parse(body);

    switch (RecordType.parse(body.type)) {
      case RecordType.EVENT_CALCULATION_POINTS:
        calculationPointsSchema.parse(body.data.old);
        calculationPointsSchema.parse(body.data.new);
        break;
      case RecordType.EVENT_LEVEL_UP:
        numberSchema.parse(body.data.old);
        numberSchema.parse(body.data.new);
        break;
      case RecordType.EVENT_BASE_VALUE:
        baseValueSchema.parse(body.data.old);
        baseValueSchema.parse(body.data.new);
        break;
      case RecordType.PROFESSION_CHANGED:
        professionHobbySchema.parse(body.data.old);
        professionHobbySchema.parse(body.data.new);
        break;
      case RecordType.HOBBY_CHANGED:
        professionHobbySchema.parse(body.data.old);
        professionHobbySchema.parse(body.data.new);
        break;
      case RecordType.ADVANTAGE_CHANGED:
      case RecordType.DISADVANTAGE_CHANGED:
      case RecordType.SPECIAL_ABILITY_CHANGED:
        stringSchema.parse(body.data.old);
        stringSchema.parse(body.data.new);
        break;
      case RecordType.ATTRIBUTE_RAISED:
        attributeSchema.parse(body.data.old);
        attributeSchema.parse(body.data.new);
        break;
      case RecordType.SKILL_ACTIVATED:
        booleanSchema.parse(body.data.old);
        booleanSchema.parse(body.data.new);
        break;
      case RecordType.SKILL_RAISED:
        skillSchema.parse(body.data.old);
        skillSchema.parse(body.data.new);
        break;
      case RecordType.ATTACK_PARADE_DISTRIBUTED:
        combatSkillSchema.parse(body.data.old);
        combatSkillSchema.parse(body.data.new);
        break;
      default:
        console.error("Invalid history record type!");
        throw {
          statusCode: 400,
          body: JSON.stringify({
            message: "Invalid history record type!",
          }),
        };
    }

    return {
      characterId,
      body: body,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation errors:", error.errors);
      throw {
        statusCode: 400,
        body: JSON.stringify({
          message: "Invalid input values!",
          errors: error.errors,
        }),
      };
    }

    // Rethrow other errors
    throw error;
  }
}

async function createHistoryBlock(
  characterId: string,
  previousBlockNumber: number | undefined = undefined,
  previousBlockId: string | undefined = undefined,
): Promise<HistoryBlock> {
  console.log("Create new history block");
  const blockNumber = previousBlockNumber ? previousBlockNumber + 1 : 1;
  const _previousBlockId = previousBlockId ? previousBlockId : null;

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/put.js
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  const blockId = uuidv4();
  const command = new PutCommand({
    TableName: process.env.TABLE_NAME,
    Item: {
      characterId: characterId,
      blockNumber: blockNumber,
      blockId: blockId,
      previousBlockId: _previousBlockId,
      changes: [],
    },
  });
  await docClient.send(command);

  const newBlock: HistoryBlock = {
    characterId: characterId,
    blockId: blockId,
    blockNumber: blockNumber,
    previousBlockId: _previousBlockId,
    changes: [],
  };
  console.log("Successfully created new history block in DynamoDB", newBlock);

  return newBlock;
}

async function addRecord(record: Record, block: HistoryBlock) {
  console.log(`Add record to history block #${block.blockNumber}, id ${block.blockId}`);
  console.log("Record:", record);

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/update.js
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  const command = new UpdateCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      characterId: block.characterId,
      blockNumber: block.blockNumber,
    },
    UpdateExpression: "SET #changes = :changes",
    ExpressionAttributeNames: {
      "#changes": "changes",
    },
    ExpressionAttributeValues: {
      ":changes": "TODO add record",
    },
  });
  await docClient.send(command);
  console.log(`Successfully added record ${record.id} to history block in DynamoDB`);
}

function estimateItemSize(item: any): number {
  const marshalled = marshall(item);
  const json = JSON.stringify(marshalled);
  return Buffer.byteLength(json, "utf8");
}
