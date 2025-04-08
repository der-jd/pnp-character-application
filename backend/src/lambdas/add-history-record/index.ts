import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { marshall } from "@aws-sdk/util-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import {
  attributeSchema,
  baseValueSchema,
  calculationPointsSchema,
  combatSkillSchema,
  professionHobbySchema,
  RecordType,
  Record,
  skillSchema,
  historyBlockSchema,
} from "config/index.js";
import { getHistoryItems, createHistoryItem, addHistoryRecord } from "utils/index.js";

const MAX_ITEM_SIZE = 200 * 1024; // 200 KB

/**
 *
 * TODO
 * - add unit tests for add history record
 * - check via getcommand/querycommand if there is an character before creating a new block in the history
 */

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

interface Parameters {
  characterId: string;
  body: Body;
}

async function addRecordToHistory(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // TODO only allow access to the character history if the user has access to the character
    const params = validateRequest(event);

    const items = await getHistoryItems(
      params.characterId,
      false, // Sort descending to get highest block number (latest item) first
      1, // Only need the top result
    );

    // TODO what to do if there is no character for the given id? -> check and throw error?!
    let record: Record;
    if (!items || items.length === 0) {
      console.log("No history found for the given characterId.");
      const newBlock = await createHistoryItem(params.characterId);

      record = {
        number: 1,
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        ...params.body,
      };
      await addHistoryRecord(record, newBlock);
    } else if (items.length !== 1) {
      console.error("More than one latest history block found for the given characterId");
      throw {
        statusCode: 500,
        body: JSON.stringify({
          message: "More than one latest history block found for the given characterId",
        }),
      };
    } else {
      const latestBlock = historyBlockSchema.parse(items[0]);
      console.log("Latest history block:", latestBlock);

      record = {
        number: latestBlock.changes[latestBlock.changes.length - 1].number + 1,
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        ...params.body,
      };

      if (estimateItemSize(latestBlock) + estimateItemSize(record) > MAX_ITEM_SIZE) {
        console.log(`Item size exceeds the maximum limit of ${MAX_ITEM_SIZE} bytes`);
        const newBlock = await createHistoryItem(params.characterId);
        await addHistoryRecord(record, newBlock);
      } else {
        await addHistoryRecord(record, latestBlock);
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
    // TODO use parse function and request object for all lambdas
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

function estimateItemSize(item: any): number {
  const marshalled = marshall(item);
  const json = JSON.stringify(marshalled);
  return Buffer.byteLength(json, "utf8");
}
