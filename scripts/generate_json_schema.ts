import * as fs from "fs";
import { parseString, parseStringPromise } from "xml2js"; // xml2js for parsing XML

//import { CostCategory } from "../backend/src/config/cost.js";
import { Character } from "../backend/src/config/character.js";
import { Attribute } from "../backend/src/config/character.js";
import { sample_char } from "./sample_char.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { v4 as uuidv4 } from "uuid";
import unidecode from "unidecode"; // unidecode for converting Unicode to ASCII

import { marshall, unmarshall } from "@aws-sdk/util-dynamodb"; // SDK V3, but worked the same in V2

//const { exec } = require("child_process");

const pathToTsFile = "../backend/src/config/character.ts";
const pathToTsconfigFile = "../backend/tsconfig.json";
const interfaceName = "Character";
const outputSchema = "character_schema.json";

//console.log(sample_char);

//console.log(jsonString)

// Custom function to replace German umlauts and ß with proper ASCII equivalents
function convertToAscii(input: string): string {
  // Step 1: Replace specific German characters manually to ensure correctness
  const customReplacements: { [key: string]: string } = {
    ä: "ae",
    ö: "oe",
    ü: "ue",
    ß: "ss",
    Ä: "Ae",
    Ö: "Oe",
    Ü: "Ue",
  };

  let converted = input.replace(/[äöüßÄÖÜ]/g, (match) => customReplacements[match]);

  // Step 2: Use `unidecode` to handle other Unicode characters
  converted = unidecode(converted);

  // Check if any remaining non-ASCII characters exist
  const upperLimitStandardAsciiTable = 127;
  for (let i = 0; i < converted.length; i++) {
    if (converted.charCodeAt(i) > upperLimitStandardAsciiTable) {
      console.warn(`Warning: Found unconvertible character '${converted[i]}' at position ${i}`);
    }
  }

  return converted;
}

// Define the interface that matches the XML fields
interface MyData {
  name: string;
  age: number;
  city: string;
  description: string;
}

// Function to read XML file, map it to the interface, and handle Unicode
async function readAndMapXmlToInterface(filePath: string): Promise<Attribute> {
  console.log("Current working directory:", process.cwd());
  console.log("Reading file:", filePath);
  if (!fs.existsSync(filePath)) {
    throw new Error("Error: File does not exist - " + filePath);
  }

  const data = fs.readFileSync(filePath, "utf8"); // ✅ Use synchronous file reading
  let parsedData: any;

  const result = await parseStringPromise(data);
  console.log("XML data:");
  console.log(result);
  if (!result || !result.character_sheet) {
    throw new Error("Error: Parsed data is undefined or missing root element.");
  }
  parsedData = result.character_sheet; // Adjust based on XML structure
  //console.log("Parsed data:");
  //console.log(parsedData);

  if (!parsedData) {
    throw new Error("Error: Parsed data is undefined.");
  }

  //return {
  //  characterId: uuidv4(),
  //  characterSheet: {
  //    name: convertToAscii(parsedData.name?.[0] || ""),
  //    age: parseInt(parsedData.age?.[0], 10) || 0,
  //    city: convertToAscii(parsedData.city?.[0] || ""),
  //    description: convertToAscii(parsedData.description?.[0] || ""),
  //  },
  //};
  console.log("parsedData.attributes.Mutu0020u0028MUu0029");
  console.log(parsedData.attributes[0]);
  console.log("====");
  return {
    start: parsedData.attributes[0].Mutu0020u0028MUu0029.start?.[0] || 0,
    current: parsedData.attributes[0].Mutu0020u0028MUu0029.current?.[0] || 0,
    mod: parsedData.attributes[0].Mutu0020u0028MUu0029.mod?.[0] || 0,
    totalCost: parsedData.attributes[0].Mutu0020u0028MUu0029.totalCost?.[0] || 0,
  };
}

const argv = yargs(hideBin(process.argv))
  .usage("Usage: $0 --input <file> --output <file>")
  .option("input", {
    alias: "i",
    type: "string",
    demandOption: true,
    describe: "Path to input XML file",
  })
  .option("output", {
    alias: "o",
    type: "string",
    demandOption: true,
    describe: "Path to output JSON file",
  })
  .help()
  .parseSync();

// Main function to execute the logic
(async () => {
  try {
    const character: Attribute = await readAndMapXmlToInterface(argv.input); // Await the result

    // Convert the character data to a formatted JSON string
    let jsonString = JSON.stringify(character, null, 2);

    // Write the JSON string to a file
    fs.writeFileSync(`${argv.output}.json`, jsonString); // Synchronous file write
    console.log("JSON string saved to:", argv.output + ".json");

    // Marshal the character data to DynamoDB format and save
    const marshalled = marshall(character);
    const jsonString2 = JSON.stringify(marshalled, null, 2);
    fs.writeFileSync(`${argv.output}_dynamodb.json`, jsonString2);
    console.log("DynamoDB JSON saved to:", argv.output + "_dynamodb.json");
  } catch (error) {
    console.error("Error:", error);
  }
})();
