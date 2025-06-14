import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { Record, HistoryBlock, historyBlockSchema } from "config/index.js";
import { HttpError } from "./errors.js";

export async function getHistoryItem(characterId: string, blockNumber: number): Promise<HistoryBlock> {
  console.log(`Get history item #${blockNumber} of character ${characterId} from DynamoDB`);

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/get.js
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  const command = new GetCommand({
    TableName: process.env.TABLE_NAME_HISTORY,
    Key: {
      characterId: characterId,
      blockNumber: blockNumber,
    },
    ConsistentRead: true,
  });

  const response = await docClient.send(command);

  if (!response.Item) {
    throw new HttpError(404, "No history block found for the given character id");
  }

  console.log("Successfully got DynamoDB item");

  return historyBlockSchema.parse(response.Item);
}

export async function getHistoryItems(
  characterId: string,
  scanIndexForward: boolean,
  limit: number,
): Promise<HistoryBlock[]> {
  console.log(`Get history items of character ${characterId} from DynamoDB`);

  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
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

  const response = await docClient.send(command);

  console.log("Successfully got DynamoDB items");

  return z.array(historyBlockSchema).parse(response.Items);
}

export async function createHistoryItem(
  characterId: string,
  previousBlockNumber: number | undefined = undefined,
  previousBlockId: string | undefined = undefined,
): Promise<HistoryBlock> {
  console.log(`Create new history item for character ${characterId} in DynamoDB`);
  const blockNumber = previousBlockNumber ? previousBlockNumber + 1 : 1;
  const _previousBlockId = previousBlockId ? previousBlockId : null;

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/put.js
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  const blockId = uuidv4();
  const command = new PutCommand({
    TableName: process.env.TABLE_NAME_HISTORY,
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

  console.log("Successfully created new history item in DynamoDB", newBlock);

  return newBlock;
}

export async function addHistoryRecord(record: Record, block: HistoryBlock) {
  console.log(
    `Add record to history block #${block.blockNumber}, id ${block.blockId} of character ${block.characterId} in DynamoDB`,
  );
  console.log("Record:", record);

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/update.js
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
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

  await docClient.send(command);

  console.log(`Successfully added record ${record.id} to history item in DynamoDB`);
}

export async function setRecordComment(characterId: string, blockNumber: number, recordIndex: number, comment: string) {
  console.log(
    `Set comment for record (index: ${recordIndex}) in history block #${blockNumber} of character ${characterId} in DynamoDB`,
  );

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/update.js
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
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

  await docClient.send(command);

  console.log("Successfully set history comment for record in DynamoDB");
}

export async function deleteHistoryItem(block: HistoryBlock) {
  console.log(
    `Delete history item #${block.blockNumber}, id ${block.blockId} of character ${block.characterId} in DynamoDB`,
  );

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/delete.js
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  const command = new DeleteCommand({
    TableName: process.env.TABLE_NAME_HISTORY,
    Key: {
      characterId: block.characterId,
      blockNumber: block.blockNumber,
    },
  });

  await docClient.send(command);

  console.log(`Successfully deleted history item #${block.blockNumber} of character ${block.characterId} in DynamoDB`);
}

export async function deleteLatestHistoryRecord(block: HistoryBlock) {
  const latestRecordIndex = block.changes.length - 1;
  const latestRecordId = block.changes[latestRecordIndex].id;
  console.log(
    `Delete latest record ${latestRecordId} from history block #${block.blockNumber}, id ${block.blockId} of character ${block.characterId} in DynamoDB`,
  );

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/update.js
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
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

  await docClient.send(command);

  console.log(`Successfully deleted record ${latestRecordId} from history item in DynamoDB`);
}
