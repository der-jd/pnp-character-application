#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

/**
 * Mapping for history record type numbers:
 *
 * Old type number -> New type number:
 */
const TYPE_MAPPING: Record<string, string> = {
  '"10"': '"6"', // SKILL_CHANGED
  '"8"': '"5"', // ATTRIBUTE_CHANGED
  '"2"': '"3"', // BASE_VALUE_CHANGED
  '"0"': '"2"', // CALCULATION_POINTS_CHANGED
  '"7"': '"4"', // SPECIAL_ABILITIES_CHANGED
  '"11"': '"7"', // COMBAT_VALUES_CHANGED
};

function updateTypeNumbers(jsonContent: string): string {
  let updatedContent = jsonContent;

  // Replace each type mapping in the JSON structure
  // We need to be careful to only replace type fields, not other numeric values
  const typePattern = /"type":\s*{\s*"N":\s*("(?:0|2|7|8|10|11)")\s*}/g;

  updatedContent = updatedContent.replace(typePattern, (match, typeValue) => {
    const newTypeValue = TYPE_MAPPING[typeValue];
    if (newTypeValue) {
      console.log(`Replacing type ${typeValue} with ${newTypeValue}`);
      return match.replace(typeValue, newTypeValue);
    }
    return match;
  });

  return updatedContent;
}

function processFile(filePath: string): void {
  try {
    console.log(`Processing file: ${filePath}`);

    // Read the file
    const content = readFileSync(filePath, "utf8");

    // Update type numbers
    const updatedContent = updateTypeNumbers(content);

    // Check if any changes were made
    if (content === updatedContent) {
      console.log("No changes were needed for this file.");
      return;
    }

    // Write the updated content back to the file
    writeFileSync(filePath, updatedContent, "utf8");

    console.log(`Successfully updated ${filePath}`);
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: npm run update-history-types <file-path> [file-path2] ...");
    console.error("");
    console.error("This script updates record type numbers for DynamoDB history items in JSON format.");
    console.error(
      "Copy the JSON data from the DynamoDB console and save it to a local file, then run this script with the file path as an argument.",
    );
    console.error("Copy the resulting updated JSON back to the DynamoDB console to update the item.");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("History Type Number Update Script");
  console.log("=".repeat(60));
  console.log("");

  // Process each file provided as argument
  for (const filePath of args) {
    const resolvedPath = resolve(filePath);
    processFile(resolvedPath);
    console.log("");
  }

  console.log("=".repeat(60));
  console.log("Update complete!");
  console.log("=".repeat(60));
}

// Run the script if executed directly
if (require.main === module) {
  main();
}
