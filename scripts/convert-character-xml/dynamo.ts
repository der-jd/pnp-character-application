import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import type { Character } from "api-spec";
import type { HistoryBlock } from "./types.js";
import { TABLE_NAME_PREFIX } from "./constants.js";

export async function uploadToDynamoDB(
  character: Character | null,
  historyBlocks: HistoryBlock[],
  envName: string,
  awsProfile: string,
  awsRegion: string,
): Promise<void> {
  const charactersTable = `${TABLE_NAME_PREFIX}-characters-${envName}`;
  const historyTable = `${TABLE_NAME_PREFIX}-characters-history-${envName}`;

  const client = new DynamoDBClient({
    region: awsRegion,
    credentials: fromIni({ profile: awsProfile }),
  });
  const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });

  console.log(`\nUploading to DynamoDB (profile: ${awsProfile}, env: ${envName})...`);

  if (character) {
    await docClient.send(
      new PutCommand({
        TableName: charactersTable,
        Item: character,
      }),
    );
    console.log(`  Character uploaded to ${charactersTable}`);
  }

  for (const block of historyBlocks) {
    await docClient.send(
      new PutCommand({
        TableName: historyTable,
        Item: block,
      }),
    );
    console.log(`  History block ${block.blockNumber} uploaded to ${historyTable}`);
  }

  console.log("Upload complete.");
}
