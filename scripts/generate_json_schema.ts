import * as fs from "fs";
import { parseString, parseStringPromise } from "xml2js"; // xml2js for parsing XML

//import { CostCategory } from "../backend/src/config/cost.js";
import { Character } from "../backend/src/config/character.js";
import { Attribute } from "../backend/src/config/character.js";
import { sample_char } from "./sample_char.js";
import yargs, { parsed } from "yargs";
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
async function readAndMapXmlToInterface(filePath: string): Promise<Character> {
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
    characterId: uuidv4(),
    characterSheet: {
      generalInformation: {
        name: convertToAscii(parsedData.general_information[0].name?.[0] || ""),
        level: parsedData.level?.[0] || 0,
        sex: convertToAscii(parsedData.general_information[0].sex?.[0] || ""),
        profession: {
          name: convertToAscii(parsedData.general_information[0].profession[0].name?.[0] || ""),
          skill: convertToAscii(parsedData.general_information[0].profession[0].skill?.[0] || ""),
        },
        hobby: {
          name: convertToAscii(parsedData.general_information[0].hobby[0].name?.[0] || ""),
          skill: convertToAscii(parsedData.general_information[0].hobby[0].skill?.[0] || ""),
        },
        birthday: convertToAscii(parsedData.general_information[0].birthday?.[0] || ""),
        birthplace: convertToAscii(parsedData.general_information[0].birthplace?.[0] || ""),
        size: convertToAscii(parsedData.general_information[0].size?.[0] || ""),
        weight: convertToAscii(parsedData.general_information[0].weight?.[0] || ""),
        hairColor: convertToAscii(parsedData.general_information[0].hair_color?.[0] || ""),
        eyeColor: convertToAscii(parsedData.general_information[0].eye_color?.[0] || ""),
        residence: convertToAscii(parsedData.general_information[0].residence?.[0] || ""),
        specialCharacteristics: convertToAscii(parsedData.general_information[0].special_characteristics?.[0] || ""),
        appearance: convertToAscii(parsedData.general_information[0].appearance?.[0] || ""),
      },
      calculationPoints: {
        adventurePoints: {
          start: 1000,
          available: parsedData.calculation_points[0].adventure_points[0].available?.[0] || 0,
          total: parsedData.calculation_points[0].adventure_points[0].total?.[0] || 0,
        },
        attributePoints: {
          start: 40,
          available: (40 + parsedData.calculation_points[0].attribute_points[0].additional?.[0] || 0) - parsedData.calculation_points[0].attribute_points[0].spent?.[0] || 0,
          total: 40 + parsedData.calculation_points[0].attribute_points[0].additional?.[0] || 0,
        },
      },
      advantages: parsedData.advantages[0].advantage?.map((adv: any) => convertToAscii(adv)) || [],
      disadvantages: parsedData.disadvantages[0].disadvantage?.map((dis: any) => convertToAscii(dis)) || [],
      specialAbilities: [],
      baseValues: {
        healthPoints: {
          start: parsedData.base_points[0].Lebenspunkteu0020u0028LePu0029[0].start?.[0] || 0,
          current: parsedData.base_points[0].Lebenspunkteu0020u0028LePu0029[0].current?.[0] || 0,
          byLvlUp: parsedData.base_points[0].Lebenspunkteu0020u0028LePu0029[0].bought?.[0] || 0,
          mod: parsedData.base_points[0].Lebenspunkteu0020u0028LePu0029[0].mod?.[0] || 0,
          totalCost: parsedData.base_points[0].Lebenspunkteu0020u0028LePu0029[0].total_cost?.[0] || 0,
        },
        mentalHealth: {
          start: parsedData.base_points[0].Geistigeu0020Gesundheitu0020u0028GGu0029[0].start?.[0] || 0,
          current: parsedData.base_points[0].Geistigeu0020Gesundheitu0020u0028GGu0029[0].current?.[0] || 0,
          byLvlUp: parsedData.base_points[0].Geistigeu0020Gesundheitu0020u0028GGu0029[0].bought?.[0] || 0,
          mod: parsedData.base_points[0].Geistigeu0020Gesundheitu0020u0028GGu0029[0].mod?.[0] || 0,
          totalCost: parsedData.base_points[0].Geistigeu0020Gesundheitu0020u0028GGu0029[0].total_cost?.[0] || 0,
        },
        armorLevel: {
          start: parsedData.base_points[0].Rüstungslevel[0].start?.[0] || 0,
          current: parsedData.base_points[0].Rüstungslevel[0].current?.[0] || 0,
          byLvlUp: parsedData.base_points[0].Rüstungslevel[0].bought?.[0] || 0,
          mod: parsedData.base_points[0].Rüstungslevel[0].mod?.[0] || 0,
          totalCost: parsedData.base_points[0].Rüstungslevel[0].total_cost?.[0] || 0,
        },
        naturalArmor: {
          start: 0,
          current: 0,
          byLvlUp: 0,
          mod: 0,
          totalCost: 0,
        },
        initiativeBaseValue: {
          start: parsedData.base_points[0]["INI-Basiswert"][0].start?.[0] || 0,
          current: parsedData.base_points[0]["INI-Basiswert"][0].current?.[0] || 0,
          byLvlUp: parsedData.base_points[0]["INI-Basiswert"][0].bought?.[0] || 0,
          mod: parsedData.base_points[0]["INI-Basiswert"][0].mod?.[0] || 0,
          totalCost: parsedData.base_points[0]["INI-Basiswert"][0].total_cost?.[0] || 0,
        },
        attackBaseValue: {
          start: parsedData.base_points[0]["AT-Basiswert"][0].start?.[0] || 0,
          current: parsedData.base_points[0]["AT-Basiswert"][0].current?.[0] || 0,
          byLvlUp: parsedData.base_points[0]["AT-Basiswert"][0].bought?.[0] || 0,
          mod: parsedData.base_points[0]["AT-Basiswert"][0].mod?.[0] || 0,
          totalCost: parsedData.base_points[0]["AT-Basiswert"][0].total_cost?.[0] || 0,
        },
        paradeBaseValue: {
          start: parsedData.base_points[0]["PA-Basiswert"][0].start?.[0] || 0,
          current: parsedData.base_points[0]["PA-Basiswert"][0].current?.[0] || 0,
          byLvlUp: parsedData.base_points[0]["PA-Basiswert"][0].bought?.[0] || 0,
          mod: parsedData.base_points[0]["PA-Basiswert"][0].mod?.[0] || 0,
          totalCost: parsedData.base_points[0]["PA-Basiswert"][0].total_cost?.[0] || 0,
        },
        rangedAttackBaseValue: {
          start: parsedData.base_points[0]["FK-Basiswert"][0].start?.[0] || 0,
          current: parsedData.base_points[0]["FK-Basiswert"][0].current?.[0] || 0,
          byLvlUp: parsedData.base_points[0]["FK-Basiswert"][0].bought?.[0] || 0,
          mod: parsedData.base_points[0]["FK-Basiswert"][0].mod?.[0] || 0,
          totalCost: parsedData.base_points[0]["FK-Basiswert"][0].total_cost?.[0] || 0,
        },
        luckPoints: {
          start: parsedData.base_points[0].Glückspunkte[0].start?.[0] || 0,
          current: parsedData.base_points[0].Glückspunkte[0].current?.[0] || 0,
          byLvlUp: parsedData.base_points[0].Glückspunkte[0].bought?.[0] || 0,
          mod: parsedData.base_points[0].Glückspunkte[0].mod?.[0] || 0,
          totalCost: parsedData.base_points[0].Glückspunkte[0].total_cost?.[0] || 0,
        },
        bonusActionsPerCombatRound: {
          start: parsedData.base_points[0].Bonusaktionenu0020prou0020KR[0].start?.[0] || 0,
          current: parsedData.base_points[0].Bonusaktionenu0020prou0020KR[0].current?.[0] || 0,
          byLvlUp: parsedData.base_points[0].Bonusaktionenu0020prou0020KR[0].bought?.[0] || 0,
          mod: parsedData.base_points[0].Bonusaktionenu0020prou0020KR[0].mod?.[0] || 0,
          totalCost: parsedData.base_points[0].Bonusaktionenu0020prou0020KR[0].total_cost?.[0] || 0,
        },
        legendaryActions: {
          start: parsedData.base_points[0].Legendäreu0020Aktionen[0].start?.[0] || 0,
          current: parsedData.base_points[0].Legendäreu0020Aktionen[0].current?.[0] || 0,
          byLvlUp: parsedData.base_points[0].Legendäreu0020Aktionen[0].bought?.[0] || 0,
          mod: parsedData.base_points[0].Legendäreu0020Aktionen[0].mod?.[0] || 0,
          totalCost: parsedData.base_points[0].Legendäreu0020Aktionen[0].total_cost?.[0] || 0,
        },
      },
      attributes: {
        courage: {
          start: parsedData.attributes[0].Mutu0020u0028MUu0029.start?.[0] || 0,
          current: parsedData.attributes[0].Mutu0020u0028MUu0029.current?.[0] || 0,
          mod: parsedData.attributes[0].Mutu0020u0028MUu0029.mod?.[0] || 0,
          totalCost: parsedData.attributes[0].Mutu0020u0028MUu0029.totalCost?.[0] || 0,
        },
        intelligence: {
          start: parsedData.attributes[0].Klugheitu0020u0028KLu0029.start?.[0] || 0,
          current: parsedData.attributes[0].Klugheitu0020u0028KLu0029.current?.[0] || 0,
          mod: parsedData.attributes[0].Klugheitu0020u0028KLu0029.mod?.[0] || 0,
          totalCost: parsedData.attributes[0].Klugheitu0020u0028KLu0029.totalCost?.[0] || 0,
        },
        concentration: {
          start: parsedData.attributes[0].Konzentrationu0020u0028KOu0029.start?.[0] || 0,
          current: parsedData.attributes[0].Konzentrationu0020u0028KOu0029.current?.[0] || 0,
          mod: parsedData.attributes[0].Konzentrationu0020u0028KOu0029.mod?.[0] || 0,
          totalCost: parsedData.attributes[0].Konzentrationu0020u0028KOu0029.totalCost?.[0] || 0,
        },
        charisma: {
          start: parsedData.attributes[0].Charismau0020u0028CHu0029.start?.[0] || 0,
          current: parsedData.attributes[0].Charismau0020u0028CHu0029.current?.[0] || 0,
          mod: parsedData.attributes[0].Charismau0020u0028CHu0029.mod?.[0] || 0,
          totalCost: parsedData.attributes[0].Charismau0020u0028CHu0029.totalCost?.[0] || 0,
        },
        mentalResilience: {
          start: parsedData.attributes[0].Mentaleu0020Belastbarkeitu0020u0028MBu0029.start?.[0] || 0,
          current: parsedData.attributes[0].Mentaleu0020Belastbarkeitu0020u0028MBu0029.current?.[0] || 0,
          mod: parsedData.attributes[0].Mentaleu0020Belastbarkeitu0020u0028MBu0029.mod?.[0] || 0,
          totalCost: parsedData.attributes[0].Mentaleu0020Belastbarkeitu0020u0028MBu0029.totalCost?.[0] || 0,
        },
        dexterity: {
          start: parsedData.attributes[0].Geschicklichkeitu0020u0028GEu0029.start?.[0] || 0,
          current: parsedData.attributes[0].Geschicklichkeitu0020u0028GEu0029.current?.[0] || 0,
          mod: parsedData.attributes[0].Geschicklichkeitu0020u0028GEu0029.mod?.[0] || 0,
          totalCost: parsedData.attributes[0].Geschicklichkeitu0020u0028GEu0029.totalCost?.[0] || 0,
        },
        endurance: {
          start: parsedData.attributes[0].Ausdaueru0020u0028AUu0029.start?.[0] || 0,
          current: parsedData.attributes[0].Ausdaueru0020u0028AUu0029.current?.[0] || 0,
          mod: parsedData.attributes[0].Ausdaueru0020u0028AUu0029.mod?.[0] || 0,
          totalCost: parsedData.attributes[0].Ausdaueru0020u0028AUu0029.totalCost?.[0] || 0,
        },
        strength: {
          start: parsedData.attributes[0].Kraftu0020u0028KRu0029.start?.[0] || 0,
          current: parsedData.attributes[0].Kraftu0020u0028KRu0029.current?.[0] || 0,
          mod: parsedData.attributes[0].Kraftu0020u0028KRu0029.mod?.[0] || 0,
          totalCost: parsedData.attributes[0].Kraftu0020u0028KRu0029.totalCost?.[0] || 0,
        },
      },
      skills: { // TODO
        combat: {
        },
        body: {
        },
        social: {
        },
        nature: {
        },
        knowledge: {
        },
        handcraft: {
        },
      },
      combatSkills: { // TODO
        melee: {

        },
        ranged: {
        },
      }
    },
  };
}

const argv = yargs(hideBin(process.argv))
  .usage("Usage: $0 --input <file> --output <file>")
  .option("input", {
    alias: "i",
    type: "string",
    demandOption: true,
    describe: "Path to input XML file (v6.1)",
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
    const character: Character = await readAndMapXmlToInterface(argv.input);

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

    console.warn("Warning: Check the generated JSON file for correctness!");

    console.warn("Warning: The following fields need to be filled out manually:");
    console.warn("- characterSheet.calculationPoints.adventurePoints.available (number)");
    console.warn("- characterSheet.specialAbilities (string[])");
    console.warn("- characterSheet.attributes.XXX.totalCost (number)");
    console.warn("- characterSheet.baseValues.naturalArmor (number)");
    console.warn("- characterSheet.baseValues.XXX.current (number)");
  } catch (error) {
    console.error("Error:", error);
  }
})();
