import {
  GetCommand,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { Record, HistoryBlock, historyBlockSchema } from "config/index.js";
import { HttpError } from "./errors.js";
import { dynamoDBDocClient } from "./dynamodb_client.js";

const DYNAMODB_BATCH_WRITE_LIMIT = 25;

/**
 * Local convenience function. It takes an array and returns
 * a generator function. The generator function yields every N items.
 */
function* chunkArray<T>(arr: T[], stride: number = 1): Generator<T[], void, unknown> {
  for (let i = 0; i < arr.length; i += stride) {
    yield arr.slice(i, Math.min(i + stride, arr.length));
  }
}

export async function getHistoryItem(characterId: string, blockNumber: number): Promise<HistoryBlock> {
  console.log(`Get history item #${blockNumber} of character ${characterId} from DynamoDB`);

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/get.js
  const command = new GetCommand({
    TableName: process.env.TABLE_NAME_HISTORY,
    Key: {
      characterId: characterId,
      blockNumber: blockNumber,
    },
    ConsistentRead: true,
  });

  const response = await dynamoDBDocClient.send(command);

  if (!response.Item) {
    throw new HttpError(404, "No history block found for the given character id");
  }

  console.log("Successfully got DynamoDB item");

  return historyBlockSchema.parse(response.Item);
}

export async function getHistoryItems(
  characterId: string,
  scanIndexForward: boolean,
  limit?: number,
): Promise<HistoryBlock[]> {
  console.log(`Get history items of character ${characterId} from DynamoDB`);

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/query.js
  const command = new QueryCommand({
    TableName: process.env.TABLE_NAME_HISTORY,
    KeyConditionExpression: "characterId = :characterId",
    ExpressionAttributeValues: {
      ":characterId": characterId,
    },
    ConsistentRead: true,
    ScanIndexForward: scanIndexForward,
    Limit: limit,
  });

  const response = await dynamoDBDocClient.send(command);

  console.log("Successfully got DynamoDB items");

  return z.array(historyBlockSchema).parse(response.Items);
}

export async function createHistoryItem(historyItem: HistoryBlock): Promise<void> {
  console.log(`Create new history item for character ${historyItem.characterId} in DynamoDB`);

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/put.js
  const command = new PutCommand({
    TableName: process.env.TABLE_NAME_HISTORY,
    Item: historyItem,
  });

  await dynamoDBDocClient.send(command);

  console.log("Successfully created new history item in DynamoDB", historyItem);
}

export async function createBatchHistoryItems(historyItems: HistoryBlock[]): Promise<void> {
  console.log(`Create new history items for ${historyItems.length} items in DynamoDB`);

  const historyChunks = chunkArray(historyItems, DYNAMODB_BATCH_WRITE_LIMIT);

  for (const chunk of historyChunks) {
    const putRequests = chunk.map((historyItem) => ({
      PutRequest: {
        Item: historyItem,
      },
    }));

    // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/batch-write.js
    const command = new BatchWriteCommand({
      RequestItems: {
        [process.env.TABLE_NAME_HISTORY!]: putRequests,
      },
    });

    await dynamoDBDocClient.send(command);
  }

  console.log("Successfully created new history items in DynamoDB");
}

export async function deleteBatchHistoryItems(historyItems: HistoryBlock[]): Promise<void> {
  console.log(`Delete ${historyItems.length} history items in DynamoDB`);

  const historyChunks = chunkArray(historyItems, DYNAMODB_BATCH_WRITE_LIMIT);

  for (const chunk of historyChunks) {
    const deleteRequests = chunk.map((historyItem) => ({
      DeleteRequest: {
        Key: {
          characterId: historyItem.characterId,
          blockNumber: historyItem.blockNumber,
        },
      },
    }));

    // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/batch-write.js
    const command = new BatchWriteCommand({
      RequestItems: {
        [process.env.TABLE_NAME_HISTORY!]: deleteRequests,
      },
    });

    await dynamoDBDocClient.send(command);
  }

  console.log("Successfully deleted history items in DynamoDB");
}

export async function addHistoryRecord(record: Record, block: HistoryBlock): Promise<void> {
  console.log(
    `Add record to history block #${block.blockNumber}, id ${block.blockId} of character ${block.characterId} in DynamoDB`,
  );
  console.log("Record:", record);

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/update.js
  const command = new UpdateCommand({
    TableName: process.env.TABLE_NAME_HISTORY,
    Key: {
      characterId: block.characterId,
      blockNumber: block.blockNumber,
    },
    UpdateExpression: "SET #changes = list_append(#changes, :newRecord)",
    ExpressionAttributeNames: {
      "#changes": "changes",
    },
    ExpressionAttributeValues: {
      ":newRecord": [record],
    },
  });

  await dynamoDBDocClient.send(command);

  console.log(`Successfully added record ${record.id} to history item in DynamoDB`);
}

export async function setRecordComment(
  characterId: string,
  blockNumber: number,
  recordIndex: number,
  comment: string,
): Promise<void> {
  console.log(
    `Set comment for record (index: ${recordIndex}) in history block #${blockNumber} of character ${characterId} in DynamoDB`,
  );

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/update.js
  const command = new UpdateCommand({
    TableName: process.env.TABLE_NAME_HISTORY,
    Key: {
      characterId: characterId,
      blockNumber: blockNumber,
    },
    UpdateExpression: `SET #changes[${recordIndex}].#comment = :comment`,
    ExpressionAttributeNames: {
      "#changes": "changes",
      "#comment": "comment",
    },
    ExpressionAttributeValues: {
      ":comment": comment,
    },
  });

  await dynamoDBDocClient.send(command);

  console.log("Successfully set history comment for record in DynamoDB");
}

export async function deleteHistoryItem(block: HistoryBlock): Promise<void> {
  console.log(
    `Delete history item #${block.blockNumber}, id ${block.blockId} of character ${block.characterId} in DynamoDB`,
  );

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/delete.js
  const command = new DeleteCommand({
    TableName: process.env.TABLE_NAME_HISTORY,
    Key: {
      characterId: block.characterId,
      blockNumber: block.blockNumber,
    },
  });

  await dynamoDBDocClient.send(command);

  console.log(`Successfully deleted history item #${block.blockNumber} of character ${block.characterId} in DynamoDB`);
}

export async function deleteLatestHistoryRecord(block: HistoryBlock): Promise<void> {
  const latestRecordIndex = block.changes.length - 1;
  const latestRecordId = block.changes[latestRecordIndex].id;
  console.log(
    `Delete latest record ${latestRecordId} from history block #${block.blockNumber}, id ${block.blockId} of character ${block.characterId} in DynamoDB`,
  );

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/update.js
  const command = new UpdateCommand({
    TableName: process.env.TABLE_NAME_HISTORY,
    Key: {
      characterId: block.characterId,
      blockNumber: block.blockNumber,
    },
    UpdateExpression: `REMOVE #changes[${latestRecordIndex}]`,
    ExpressionAttributeNames: {
      "#changes": "changes",
    },
  });

  await dynamoDBDocClient.send(command);

  console.log(`Successfully deleted record ${latestRecordId} from history item in DynamoDB`);
}
