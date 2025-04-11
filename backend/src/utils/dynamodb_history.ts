import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { Record, HistoryBlock, historyBlockSchema } from "config/index.js";

export async function getHistoryItems(
  characterId: string,
  scanIndexForward: boolean,
  limit: number,
): Promise<HistoryBlock[]> {
  console.log(`Get history items of character ${characterId} from DynamoDB`);

  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  const command = new QueryCommand({
    TableName: process.env.TABLE_NAME,
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
  console.log("Create new history item in DynamoDB");
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

  console.log("Successfully created new history item in DynamoDB", newBlock);

  return newBlock;
}

export async function addHistoryRecord(record: Record, block: HistoryBlock) {
  console.log(`Add record to history block #${block.blockNumber}, id ${block.blockId} in DynamoDB`);
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
