import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { parseStringPromise } from "xml2js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import type { HistoryEntry, HistoryBlock, XmlCharacterSheet } from "./types.js";
import { normalizeTagName, ensureArray, asRecord, findRepoRoot, flushInfoBlocks } from "./xml-utils.js";
import { REGION, XML_CHARACTER_SHEET_KEYS, XML_ROOT_NODE_NAMES } from "./constants.js";
import { convertCharacter } from "./character-builder.js";
import { convertHistory } from "./history-builder.js";
import { uploadToDynamoDB } from "./dynamo.js";

export async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .option("input", {
      type: "string",
      demandOption: true,
      describe: "Path to character XML file",
    })
    .option("user-id", {
      type: "string",
      describe: "User ID to embed in character JSON",
    })
    .option("character-id", {
      type: "string",
      describe: "Character UUID to embed in character JSON",
    })
    .option("out-dir", {
      type: "string",
      describe: "Output directory for generated JSON files",
    })
    .option("phase", {
      type: "string",
      choices: ["character", "history", "both"] as const,
      default: "both",
      describe: "Which conversion phase to run: character, history, or both",
    })
    .option("upload", {
      type: "boolean",
      default: false,
      describe: "Upload converted character and history to DynamoDB",
    })
    .option("aws-profile", {
      type: "string",
      describe: "AWS profile to use for DynamoDB upload (required with --upload)",
    })
    .option("aws-region", {
      type: "string",
      default: REGION,
      describe: `AWS region for DynamoDB upload (default: ${REGION})`,
    })
    .option("env", {
      type: "string",
      choices: ["dev", "prod"] as const,
      describe: "Environment name for DynamoDB table names (required with --upload)",
    })
    .check((args) => {
      if (args.upload && !args["aws-profile"]) {
        throw new Error("--aws-profile is required when --upload is set");
      }
      if (args.upload && !args.env) {
        throw new Error("--env is required when --upload is set");
      }
      if (args.upload && !args["user-id"]) {
        throw new Error("--user-id is required when --upload is set");
      }
      return true;
    })
    .help()
    .strict()
    .parse();

  // --- Parse XML ---
  const inputPath = path.resolve(argv.input);
  const repoRoot = await findRepoRoot(process.cwd());
  const defaultOutDir = path.join(repoRoot, "tmp", "xml-conversion");
  const outDir = argv["out-dir"] ? path.resolve(argv["out-dir"]) : defaultOutDir;
  const userId = argv["user-id"] ?? crypto.randomUUID().replace(/-/g, "");
  const characterId = argv["character-id"] ?? crypto.randomUUID();
  const phase = argv.phase as "character" | "history" | "both";

  const xml = await fs.readFile(inputPath, "utf-8");
  const parsed = await parseStringPromise(xml, {
    explicitArray: false,
    mergeAttrs: true,
    tagNameProcessors: [normalizeTagName],
  });

  const sheet = asRecord(
    parsed[XML_ROOT_NODE_NAMES[0]] ?? parsed[XML_ROOT_NODE_NAMES[1]] ?? parsed,
  ) as XmlCharacterSheet;
  const historyNode = asRecord(sheet[XML_CHARACTER_SHEET_KEYS.history]);
  const rawHistoryEntries = ensureArray(historyNode[XML_CHARACTER_SHEET_KEYS.entry]) as HistoryEntry[];

  await fs.mkdir(outDir, { recursive: true });
  console.log(`Character ID: ${characterId}`);
  const warnings: string[] = [];

  // --- Phase 1: Build character (independent) ---
  let character = null;
  if (phase === "character" || phase === "both") {
    const result = convertCharacter(sheet, rawHistoryEntries, userId, characterId);
    character = result.character;
    warnings.push(...result.warnings);

    const characterOutPath = path.join(outDir, "character.json");
    await fs.writeFile(characterOutPath, JSON.stringify(character, null, 2), "utf-8");
    console.log(`Character JSON written to ${characterOutPath}`);
  }

  // --- Phase 2: Build history (independent) ---
  let historyBlocks: HistoryBlock[] = [];
  if (phase === "history" || phase === "both") {
    historyBlocks = convertHistory(rawHistoryEntries, userId, characterId, warnings);

    for (const block of historyBlocks) {
      const historyOutPath = path.join(outDir, `history-block-${block.blockNumber}.json`);
      await fs.writeFile(historyOutPath, JSON.stringify(block, null, 2), "utf-8");
    }
    console.log(`History blocks written to ${outDir}`);
  }

  // --- Optional DynamoDB upload ---
  if (argv.upload) {
    const envName = argv.env as string;
    const awsProfile = argv["aws-profile"] as string;
    const awsRegion = argv["aws-region"] as string;
    await uploadToDynamoDB(character, historyBlocks, envName, awsProfile, awsRegion);
  }

  flushInfoBlocks();

  warnings.push(
    "Please compare the converted character sheet and history against the original source data; conversion may contain errors and requires manual verification.",
  );

  if (warnings.length > 0) {
    console.warn("\n" + "=".repeat(60));
    console.warn(`  ${warnings.length} WARNING(S) DURING CONVERSION`);
    console.warn("=".repeat(60));
    for (const warning of warnings) {
      console.warn(`  - ${warning}`);
    }
    console.warn("=".repeat(60) + "\n");
  }
}
