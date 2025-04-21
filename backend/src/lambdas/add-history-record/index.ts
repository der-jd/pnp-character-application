import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { marshall } from "@aws-sdk/util-dynamodb";
import jwt, { JwtPayload } from "jsonwebtoken";
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
import {
  getHistoryItems,
  createHistoryItem,
  addHistoryRecord,
  getCharacterItem,
  Request,
  parseBody,
  HttpError,
  ensureHttpError,
} from "utils/index.js";

const MAX_ITEM_SIZE = 200 * 1024; // 200 KB

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return addRecordToHistory({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

const historyBodySchema = z.object({
  type: z.nativeEnum(RecordType),
  name: z.string(),
  data: z.object({
    old: z.record(z.any()),
    new: z.record(z.any()),
  }),
  learningMethod: z.string().nullable(),
  calculationPointsChange: z.object({
    adjustment: z.number(),
    old: z.number(),
    new: z.number(),
  }),
  comment: z.string().nullable(),
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

export type HistoryBodySchema = z.infer<typeof historyBodySchema>;

interface Parameters {
  userId: string;
  characterId: string;
  body: HistoryBodySchema;
}

export async function addRecordToHistory(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = await validateRequest(request);

    console.log(`Add record to history of character ${params.characterId} of user ${params.userId}`);

    const items = await getHistoryItems(
      params.characterId,
      false, // Sort descending to get highest block number (latest item) first
      1, // Only need the top result
    );

    let record: Record;
    if (!items || items.length === 0) {
      console.log("No history found for the given character id");
      const newBlock = await createHistoryItem(params.characterId);

      record = {
        number: 1,
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        ...params.body,
      };
      await addHistoryRecord(record, newBlock);
    } else if (items.length !== 1) {
      throw new HttpError(500, "More than one latest history block found for the given character id");
    } else {
      const latestBlock = historyBlockSchema.parse(items[0]);
      console.log("Latest history block:", { ...latestBlock, changes: ["..."] }); // Don't log changes as this can be a very long list

      record = {
        number: latestBlock.changes[latestBlock.changes.length - 1].number + 1,
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        ...params.body,
      };

      const blockSize = estimateItemSize(latestBlock);
      const recordSize = estimateItemSize(record);
      if (blockSize + recordSize > MAX_ITEM_SIZE) {
        console.log(
          `Latest block with the new record (total size ~${blockSize + recordSize} bytes) would exceed the maximum allowed size of ${MAX_ITEM_SIZE} bytes/block`,
        );
        const newBlock = await createHistoryItem(params.characterId, latestBlock.blockNumber, latestBlock.blockId);
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
  } catch (error) {
    throw ensureHttpError(error);
  }
}

async function validateRequest(request: Request): Promise<Parameters> {
  console.log("Validate request");

  // Trim the authorization header as it could contain spaces at the beginning
  const authHeader = request.headers.Authorization?.trim() || request.headers.authorization?.trim();
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HttpError(401, "Unauthorized: No token provided!");
  }

  const token = authHeader.split(" ")[1]; // Remove "Bearer " prefix
  // Decode the token without verification (the access to the API itself is already protected by the authorizer)
  const decoded = jwt.decode(token) as JwtPayload | null;
  if (!decoded) {
    throw new HttpError(401, "Unauthorized: Invalid token!");
  }

  const userId = decoded.sub; // Cognito User ID
  if (!userId) {
    throw new HttpError(401, "Unauthorized: User ID not found in token!");
  }

  if (typeof request.pathParameters?.["character-id"] !== "string") {
    throw new HttpError(400, "Invalid input values!");
  }

  const characterId = request.pathParameters?.["character-id"];
  const uuidRegex = new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$");
  if (!uuidRegex.test(characterId)) {
    throw new HttpError(400, "Character id is not a valid UUID format!");
  }

  // Check if the character exists
  await getCharacterItem(userId, characterId);

  try {
    // TODO use parse function and request object for all lambdas
    const body = historyBodySchema.parse(request.body);

    switch (body.type) {
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
        throw new HttpError(400, "Invalid history record type!");
    }

    return {
      userId: userId,
      characterId: characterId,
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

function estimateItemSize(item: any): number {
  const marshalled = marshall(item);
  const json = JSON.stringify(marshalled);
  return Buffer.byteLength(json, "utf8");
}
