#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import { marshall } from "@aws-sdk/util-dynamodb";
import { parseStringPromise } from "xml2js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  ADVANTAGES,
  DISADVANTAGES,
  Attributes,
  AdvantagesNames,
  BaseValue,
  BaseValues,
  CalculationPoints,
  Character,
  CharacterSheet,
  CombatSection,
  CombatSkillName,
  CombatStats,
  CostCategory,
  DisadvantagesNames,
  LearningMethodString,
  HistoryRecord,
  HistoryRecordType,
  Skill,
  SkillCategory,
  SkillName,
  SkillNameWithCategory,
  START_SKILLS,
  characterSchema,
  characterSheetSchema,
  combatSkills,
  historyBlockSchema,
  levelUpProgressSchema,
  LevelUpProgress,
  EffectByLevelUp,
  LevelUpEffectKind,
  ATTRIBUTE_POINTS_FOR_CREATION,
  HOBBY_SKILL_BONUS,
  PROFESSION_SKILL_BONUS,
  GENERATION_POINTS,
  NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION,
  LEVEL_UP_DICE_EXPRESSION,
  LEVEL_UP_DICE_MIN_TOTAL,
  LEVEL_UP_DICE_MAX_TOTAL,
} from "api-spec";

const TABLE_NAME_PREFIX = "pnp-app";
const REGION = "eu-central-1";

const MAX_ITEM_SIZE = 200 * 1024; // 200 KB, matches backend/src/lambdas/add-history-record/index.ts

const infoMessages = new Map<string, string[]>();

const COMBAT_SKILL_HANDLING: Record<CombatSkillName, number> = {
  // Keep in sync with backend/src/core/rules/constants.ts
  martialArts: 25,
  barehanded: 25,
  chainWeapons: 15,
  daggers: 25,
  slashingWeaponsSharp1h: 25,
  slashingWeaponsBlunt1h: 25,
  thrustingWeapons1h: 20,
  slashingWeaponsSharp2h: 15,
  slashingWeaponsBlunt2h: 15,
  thrustingWeapons2h: 15,
  missile: 15,
  firearmSimple: 30,
  firearmMedium: 20,
  firearmComplex: 10,
  heavyWeapons: 5,
};

const ATTRIBUTE_MAP: Record<string, keyof CharacterSheet["attributes"]> = {
  [normalizeLabel("Mut (MU)")]: "courage",
  [normalizeLabel("Klugheit (KL)")]: "intelligence",
  [normalizeLabel("Konzentration (KO)")]: "concentration",
  [normalizeLabel("Charisma (CH)")]: "charisma",
  [normalizeLabel("Mentale Belastbarkeit (MB)")]: "mentalResilience",
  [normalizeLabel("Geschicklichkeit (GE)")]: "dexterity",
  [normalizeLabel("Ausdauer (AU)")]: "endurance",
  [normalizeLabel("Kraft (KR)")]: "strength",
};

const BASE_VALUE_MAP: Record<string, keyof BaseValues> = {
  [normalizeLabel("Lebenspunkte (LeP)")]: "healthPoints",
  [normalizeLabel("Geistige Gesundheit (GG)")]: "mentalHealth",
  [normalizeLabel("R\u00fcstungslevel")]: "armorLevel",
  [normalizeLabel("INI-Basiswert")]: "initiativeBaseValue",
  [normalizeLabel("AT-Basiswert")]: "attackBaseValue",
  [normalizeLabel("PA-Basiswert")]: "paradeBaseValue",
  [normalizeLabel("FK-Basiswert")]: "rangedAttackBaseValue",
  [normalizeLabel("Gl\u00fcckspunkte")]: "luckPoints",
  [normalizeLabel("Bonusaktionen pro KR")]: "bonusActionsPerCombatRound",
  [normalizeLabel("Legend\u00e4re Aktionen")]: "legendaryActions",
};

const NON_COMBAT_SKILL_MAP = new Map<string, SkillNameWithCategory>([
  [normalizeLabel("Akrobatik"), "body/athletics"],
  [normalizeLabel("Athletik"), "body/athletics"],
  [normalizeLabel("Gaukeleien"), "body/juggleries"],
  [normalizeLabel("Klettern"), "body/climbing"],
  [normalizeLabel("K\u00f6rperbeherrschung"), "body/bodyControl"],
  [normalizeLabel("Reiten"), "body/riding"],
  [normalizeLabel("Schleichen"), "body/sneaking"],
  [normalizeLabel("Schwimmen"), "body/swimming"],
  [normalizeLabel("Selbstbeherrschung"), "body/selfControl"],
  [normalizeLabel("Sich verstecken"), "body/hiding"],
  [normalizeLabel("Sich verkleiden"), "social/acting"],
  [normalizeLabel("Singen"), "body/singing"],
  [normalizeLabel("Sinnensch\u00e4rfe"), "body/sharpnessOfSenses"],
  [normalizeLabel("Tanzen"), "body/dancing"],
  [normalizeLabel("Zechen"), "body/quaffing"],
  [normalizeLabel("Taschendiebstahl"), "body/pickpocketing"],
  [normalizeLabel("Stimmen Imitieren"), "social/acting"],
  [normalizeLabel("Bet\u00f6ren"), "social/seduction"],
  [normalizeLabel("Etikette"), "social/etiquette"],
  [normalizeLabel("Lehren"), "social/teaching"],
  [normalizeLabel("Schauspielerei"), "social/acting"],
  [normalizeLabel("Schriftlicher Ausdruck"), "social/writtenExpression"],
  [normalizeLabel("Gassenwissen"), "social/streetKnowledge"],
  [normalizeLabel("Menschenkenntnis"), "social/knowledgeOfHumanNature"],
  [normalizeLabel("\u00dcberreden"), "social/persuading"],
  [normalizeLabel("\u00dcberzeugen"), "social/convincing"],
  [normalizeLabel("Handel / Feilschen"), "social/bargaining"],
  [normalizeLabel("F\u00e4hrtensuchen"), "nature/tracking"],
  [normalizeLabel("Fesseln / Entfesseln"), "nature/knottingSkills"],
  [normalizeLabel("Fallen stellen"), "nature/trapping"],
  [normalizeLabel("Fischen / Angeln"), "nature/fishing"],
  [normalizeLabel("Orientierung"), "nature/orientation"],
  [normalizeLabel("Wildnisleben"), "nature/wildernessLife"],
  [normalizeLabel("Anatomie"), "knowledge/anatomy"],
  [normalizeLabel("Baukunst"), "knowledge/architecture"],
  [normalizeLabel("Geographie"), "knowledge/geography"],
  [normalizeLabel("Geschichtswissen"), "knowledge/history"],
  [normalizeLabel("Gesteinskunde"), "knowledge/petrology"],
  [normalizeLabel("Pflanzenkunde"), "knowledge/botany"],
  [normalizeLabel("Philosophie"), "knowledge/philosophy"],
  [normalizeLabel("Sternkunde"), "knowledge/astronomy"],
  [normalizeLabel("Rechnen"), "knowledge/mathematics"],
  [normalizeLabel("Rechtskunde"), "knowledge/knowledgeOfTheLaw"],
  [normalizeLabel("Sch\u00e4tzen"), "knowledge/estimating"],
  [normalizeLabel("Tierkunde"), "knowledge/zoology"],
  [normalizeLabel("Technik"), "knowledge/technology"],
  [normalizeLabel("Chemie"), "knowledge/chemistry"],
  [normalizeLabel("Kriegskunst"), "knowledge/warfare"],
  [normalizeLabel("IT Kenntnis"), "knowledge/itSkills"],
  [normalizeLabel("Mechanik"), "knowledge/mechanics"],
  [normalizeLabel("Abrichten"), "handcraft/training"],
  [normalizeLabel("Bogenbau"), "handcraft/woodwork"],
  [normalizeLabel("Maurerarbeiten"), "handcraft/stonework"],
  [normalizeLabel("Alkoholherstellung"), "handcraft/alcoholProduction"],
  [normalizeLabel("Fahrzeug lenken"), "handcraft/steeringVehicles"],
  [normalizeLabel("Falschspiel"), "handcraft/cheating"],
  [normalizeLabel("Feinmechanik"), "handcraft/fineMechanics"],
  [normalizeLabel("Fleischer"), "handcraft/foodProcessing"],
  [normalizeLabel("Gerber / K\u00fcrschner"), "handcraft/leatherProcessing"],
  [normalizeLabel("Erste Hilfe"), "handcraft/firstAid"],
  [normalizeLabel("Beruhigen"), "handcraft/calmingSbDown"],
  [normalizeLabel("Holzbearbeitung"), "handcraft/woodwork"],
  [normalizeLabel("Kochen"), "handcraft/foodProcessing"],
  [normalizeLabel("Lederarbeit / N\u00e4hen"), "handcraft/leatherProcessing"],
  [normalizeLabel("Malen / Zeichnen"), "handcraft/drawingAndPainting"],
  [normalizeLabel("Musizieren"), "handcraft/makingMusic"],
  [normalizeLabel("Schl\u00f6sserknacken"), "handcraft/lockpicking"],
  [normalizeLabel("Ackerbau"), "handcraft/foodProcessing"],
]);

const COMBAT_SKILL_MAP: Record<string, CombatSkillName> = {
  [normalizeLabel("Jiu-Jitsu")]: "martialArts",
  [normalizeLabel("Raufen")]: "barehanded",
  [normalizeLabel("Stichwaffe kurz")]: "daggers",
  [normalizeLabel("Messer")]: "daggers",
  [normalizeLabel("Gro\u00dfschwert")]: "slashingWeaponsSharp2h",
  [normalizeLabel("Katana")]: "slashingWeaponsSharp2h",
  [normalizeLabel("Werfen")]: "missile",
  [normalizeLabel("Wurfgeschoss Faust")]: "missile",
  [normalizeLabel("Ringe")]: "missile",
  [normalizeLabel("Armbrust")]: "firearmMedium",
  [normalizeLabel("Schusswaffe Mittel")]: "firearmMedium",
  [normalizeLabel("Schusswaffe mittel")]: "firearmMedium",
  [normalizeLabel("Handfeuerwaffe")]: "firearmSimple",
  [normalizeLabel("Bogen")]: "firearmComplex",
  [normalizeLabel("Schusswaffe schwierig")]: "firearmComplex",
};

const GEWUERFELTE_BEGABUNG_COMMENT = normalizeLabel("Gewürfelte Begabung");
const COMBAT_SKILL_HISTORY_TYPE_LABELS = new Set([normalizeLabel("Kampftalent gesteigert")]);
const IGNORED_HISTORY_TYPES = new Set([normalizeLabel("Sprache/Schrift geändert")]);
const IGNORED_HISTORY_TYPES_WITH_WARNING = new Set([normalizeLabel("Sprache/Schrift geändert")]);
const ADVANTAGE_CHANGED_TYPE = normalizeLabel("Vorteil geändert");
const STUDIUM_NAME = normalizeLabel("Studium");
const DEFAULT_GENERAL_INFORMATION_SKILL = "body/athletics" as SkillNameWithCategory;
const LEVEL_UP_COMMENT_PATTERN = /level\s*(\d+)/i;
const BASE_VALUE_TO_LEVEL_UP_EFFECT: Record<string, LevelUpEffectKind> = {
  [normalizeLabel("Lebenspunkte (LeP)")]: "hpRoll",
  [normalizeLabel("Rüstungslevel")]: "armorLevelRoll",
  [normalizeLabel("INI-Basiswert")]: "initiativePlusOne",
  [normalizeLabel("Glückspunkte")]: "luckPlusOne",
  [normalizeLabel("Bonusaktionen pro KR")]: "bonusActionPlusOne",
  [normalizeLabel("Legendäre Aktionen")]: "legendaryActionPlusOne",
};

const ADVANTAGE_MAP: Record<string, AdvantagesNames> = {
  [normalizeLabel("Abitur")]: AdvantagesNames.HIGH_SCHOOL_DEGREE,
  [normalizeLabel("Charmebolzen")]: AdvantagesNames.CHARMER,
  [normalizeLabel("Dunkelsicht")]: AdvantagesNames.DARK_VISION,
  [normalizeLabel("Gl\u00fcckspilz")]: AdvantagesNames.LUCKY,
  [normalizeLabel("Gutaussehend")]: AdvantagesNames.GOOD_LOOKING,
  [normalizeLabel("Gutes Ged\u00e4chtnis")]: AdvantagesNames.GOOD_MEMORY,
  [normalizeLabel("Herausragender Sinn")]: AdvantagesNames.OUTSTANDING_SENSE_SIGHT_HEARING,
  [normalizeLabel("Herr der Lage")]: AdvantagesNames.MASTER_OF_THE_SITUATION,
  [normalizeLabel("Hohe Allgemeinbildung")]: AdvantagesNames.HIGH_GENERAL_KNOWLEDGE,
  [normalizeLabel("Meister der Improvisation")]: AdvantagesNames.MASTER_OF_IMPROVISATION,
  [normalizeLabel("Milit\u00e4rische Ausbildung")]: AdvantagesNames.MILITARY_TRAINING,
  [normalizeLabel("Mutig")]: AdvantagesNames.BRAVE,
  [normalizeLabel("Sportlich")]: AdvantagesNames.ATHLETIC,
  [normalizeLabel("Studium")]: AdvantagesNames.COLLEGE_EDUCATION,
  [normalizeLabel("Tollk\u00fchn")]: AdvantagesNames.DARING,
  [normalizeLabel("Wohlklang")]: AdvantagesNames.MELODIOUS_VOICE,
};

const DISADVANTAGE_MAP: Record<string, DisadvantagesNames> = {
  [normalizeLabel("Aberglaube")]: DisadvantagesNames.SUPERSTITION,
  [normalizeLabel("Angst vor \u2026 (h\u00e4ufig)")]: DisadvantagesNames.FEAR_OF,
  [normalizeLabel("Angst vor \u2026 (selten)")]: DisadvantagesNames.FEAR_OF,
  [normalizeLabel("Angsthase")]: DisadvantagesNames.COWARD,
  [normalizeLabel("Eingeschr\u00e4nkter Sinn")]: DisadvantagesNames.IMPAIRED_SENSE,
  [normalizeLabel("Geizkragen")]: DisadvantagesNames.MISER,
  [normalizeLabel("Gerechtigkeitssinn")]: DisadvantagesNames.SENSE_OF_JUSTICE,
  [normalizeLabel("Geringe Allgemeinbildung")]: DisadvantagesNames.LOW_GENERAL_KNOWLEDGE,
  [normalizeLabel("Gesellschaftlich inkompetent")]: DisadvantagesNames.SOCIALLY_INEPT,
  [normalizeLabel("Impulsiv")]: DisadvantagesNames.IMPULSIVE,
  [normalizeLabel("J\u00e4hzornig")]: DisadvantagesNames.HOT_TEMPERED,
  [normalizeLabel("Kein Abschluss")]: DisadvantagesNames.NO_DEGREE,
  [normalizeLabel("Lethargisch")]: DisadvantagesNames.LETHARGIC,
  [normalizeLabel("Nachtblind")]: DisadvantagesNames.NIGHT_BLIND,
  [normalizeLabel("Pazifist")]: DisadvantagesNames.PACIFIST,
  [normalizeLabel("Pechvogel")]: DisadvantagesNames.UNLUCKY,
  [normalizeLabel("Rachsucht")]: DisadvantagesNames.VENGEFUL,
  [normalizeLabel("Schlafst\u00f6rung")]: DisadvantagesNames.SLEEP_DISORDER,
  [normalizeLabel("Schlechte Angewohnheit")]: DisadvantagesNames.BAD_HABIT,
  [normalizeLabel("Schlechte Eigenschaft")]: DisadvantagesNames.BAD_TRAIT,
  [normalizeLabel("Schlechtes Ged\u00e4chtnis")]: DisadvantagesNames.POOR_MEMORY,
  [normalizeLabel("Sprachfehler")]: DisadvantagesNames.SPEECH_IMPEDIMENT,
  [normalizeLabel("Streits\u00fcchtig")]: DisadvantagesNames.QUARRELSOME,
  [normalizeLabel("Sucht (Alkohol)")]: DisadvantagesNames.ADDICTION_ALCOHOL,
  [normalizeLabel("Sucht (Drogen)")]: DisadvantagesNames.ADDICTION_DRUGS,
  [normalizeLabel("Sucht (Koffein)")]: DisadvantagesNames.ADDICTION_CAFFEINE,
  [normalizeLabel("Sucht (Nikotin)")]: DisadvantagesNames.ADDICTION_NICOTINE,
  [normalizeLabel("Sucht (Spiel)")]: DisadvantagesNames.ADDICTION_GAMBLING,
  [normalizeLabel("Unangenehme Stimme")]: DisadvantagesNames.UNPLEASANT_VOICE,
  [normalizeLabel("Unansehnlich")]: DisadvantagesNames.UNATTRACTIVE,
  [normalizeLabel("Verschwendungssucht")]: DisadvantagesNames.SPENDTHRIFT,
  [normalizeLabel("Vorzeitiger Schulabbruch")]: DisadvantagesNames.EARLY_SCHOOL_DROPOUT,
};

const FEAR_OF_COST_BY_LABEL: Record<string, number> = {
  [normalizeLabel("Angst vor … (häufig)")]: 5,
  [normalizeLabel("Angst vor … (selten)")]: 2,
};

// Keys are SHA-256 hashes of normalized character names to avoid exposing
// character details in this repository.
const FEAR_OF_DETAIL_BY_CHARACTER_HASH: Record<string, Record<string, string>> = {
  d802629f373db91d25031dd5c7e5712ff85fc036009d0bb017540ca685951f42: {
    [normalizeLabel("Angst vor … (häufig)")]: "Insekten",
  },
};

function hashCharacterName(name: string): string {
  return crypto.createHash("sha256").update(normalizeLabel(name)).digest("hex");
}

type XmlCharacterSheet = Record<string, unknown>;

type HistoryEntry = Record<string, unknown>;

type CombatCategory = keyof CombatSection;

// ---------------------------------------------------------------------------
// Phase 1 — Build the character JSON from the XML sheet and history metadata.
// ---------------------------------------------------------------------------

interface ConvertCharacterResult {
  character: Character;
  warnings: string[];
  activatedSkills: SkillNameWithCategory[];
  levelUpEffects: Record<string, EffectByLevelUp>;
  /** Raw history entries from the XML (unmodified). */
  rawHistoryEntries: HistoryEntry[];
  /** History entries after aggregating combat skill mod entries. */
  historyEntries: HistoryEntry[];
}

function convertCharacter(
  sheet: XmlCharacterSheet,
  rawHistoryEntries: HistoryEntry[],
  userId: string,
  characterId: string,
): ConvertCharacterResult {
  const { characterSheet, warnings } = buildCharacterSheet(sheet);
  const activatedSkills = extractActivatedSkills(sheet, warnings);

  const collegeSkillName = extractCollegeSkillName(rawHistoryEntries);
  patchCollegeEducationSkillName(characterSheet, collegeSkillName, warnings);

  const character: Character = {
    userId,
    characterId,
    characterSheet,
    rulesetVersion: "1.0.0",
  };

  characterSchema.parse(character);

  const historyEntries = aggregateCombatSkillModEntries(rawHistoryEntries, warnings);

  const startAP = getStartAdventurePoints(rawHistoryEntries);
  characterSheet.calculationPoints.adventurePoints.start = startAP;

  const lastAPFromHistory = getLastAdventurePointsAvailable(rawHistoryEntries);
  const computedAP = characterSheet.calculationPoints.adventurePoints.available;
  if (lastAPFromHistory !== null && lastAPFromHistory !== computedAP) {
    warnings.push(
      `Adventure points mismatch: computed from totalCost = ${computedAP}, last history entry = ${lastAPFromHistory}`,
    );
  }

  const levelUpEffects = extractLevelUpEffects(historyEntries);
  characterSheet.generalInformation.levelUpProgress = buildLevelUpProgressFromEffects(levelUpEffects);

  return { character, warnings, activatedSkills, levelUpEffects, rawHistoryEntries, historyEntries };
}

// ---------------------------------------------------------------------------
// Phase 2 — Build the history blocks from the XML history and Phase 1 output.
// ---------------------------------------------------------------------------

type HistoryBlock = {
  blockNumber: number;
  blockId: string;
  previousBlockId: string | null;
  characterId: string;
  changes: HistoryRecord[];
};

function convertHistory(
  rawHistoryEntries: HistoryEntry[],
  historyEntries: HistoryEntry[],
  character: Character,
  activatedSkills: SkillNameWithCategory[],
  levelUpEffects: Record<string, EffectByLevelUp>,
  warnings: string[],
): HistoryBlock[] {
  const { characterSheet } = character;
  const creationDate = getCreationDate(rawHistoryEntries);
  const postCreationEntries = filterCreationEntries(historyEntries, creationDate, warnings);

  const creationTimestamp = getEarliestHistoryTimestamp(rawHistoryEntries);
  const creationRecord = buildCharacterCreatedRecord(characterSheet, activatedSkills, creationTimestamp);
  const subsequentRecords = buildHistoryRecords(
    postCreationEntries,
    characterSheet,
    warnings,
    levelUpEffects,
    creationRecord.number + 1,
  );
  const records = [creationRecord, ...subsequentRecords];

  const historyBlocks = buildHistoryBlocks(records, character.characterId);
  for (const block of historyBlocks) {
    historyBlockSchema.parse(block);
  }

  return historyBlocks;
}

// ---------------------------------------------------------------------------
// CLI entry point — orchestrates Phase 1, Phase 2, file I/O, and upload.
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
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

  const xml = await fs.readFile(inputPath, "utf-8");
  const parsed = await parseStringPromise(xml, {
    explicitArray: false,
    mergeAttrs: true,
    tagNameProcessors: [normalizeTagName],
  });

  const sheet = asRecord(parsed.character_sheet ?? parsed.characterSheet ?? parsed);
  const historyNode = asRecord(sheet.history);
  const rawHistoryEntries = ensureArray(historyNode.entry) as HistoryEntry[];

  // --- Phase 1: Build character ---
  const { character, warnings, activatedSkills, levelUpEffects, historyEntries } = convertCharacter(
    sheet,
    rawHistoryEntries,
    userId,
    characterId,
  );

  // --- Phase 2: Build history ---
  const historyBlocks = convertHistory(
    rawHistoryEntries,
    historyEntries,
    character,
    activatedSkills,
    levelUpEffects,
    warnings,
  );

  // --- Write output files ---
  await fs.mkdir(outDir, { recursive: true });

  const characterOutPath = path.join(outDir, "character.json");
  await fs.writeFile(characterOutPath, JSON.stringify(character, null, 2), "utf-8");

  for (const block of historyBlocks) {
    const historyOutPath = path.join(outDir, `history-block-${block.blockNumber}.json`);
    await fs.writeFile(historyOutPath, JSON.stringify(block, null, 2), "utf-8");
  }

  flushInfoBlocks();

  warnings.push(
    "Please compare the converted character sheet and history against the original source data; conversion may contain errors and requires manual verification.",
  );

  console.log(`Character JSON written to ${characterOutPath}`);
  console.log(`History blocks written to ${outDir}`);

  // --- Optional DynamoDB upload ---
  if (argv.upload) {
    const envName = argv.env as string;
    const awsProfile = argv["aws-profile"] as string;
    const awsRegion = argv["aws-region"] as string;
    await uploadToDynamoDB(character, historyBlocks, envName, awsProfile, awsRegion);
  }

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

function normalizeTagName(value: string): string {
  return value.replace(/u0020/g, " ").replace(/u0028/g, "(").replace(/u0029/g, ")").replace(/u002F/g, "/");
}

function normalizeLabel(value: string): string {
  return normalizeTagName(value).replace(/\s+/g, " ").trim();
}

function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function queueInfoBlock(title: string, lines: string[]): void {
  const existing = infoMessages.get(title) ?? [];
  infoMessages.set(title, existing.concat(lines));
}

function flushInfoBlocks(): void {
  for (const [title, lines] of infoMessages) {
    console.info(["", `${title}:`, ...lines.map((line) => `  • ${line}`), ""].join("\n"));
  }
  infoMessages.clear();
}

function asText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object" && "_" in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)._ ?? "");
  }
  return String(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return {};
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function findRepoRoot(startDir: string): Promise<string> {
  let currentDir = startDir;
  while (true) {
    const agentsPath = path.join(currentDir, "AGENTS.md");
    const packagePath = path.join(currentDir, "package.json");
    if ((await pathExists(agentsPath)) && (await pathExists(packagePath))) {
      return currentDir;
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) {
      return startDir;
    }
    currentDir = parent;
  }
}

function toInt(value: unknown, fallback = 0): number {
  const parsed = Number.parseInt(asText(value), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toOptionalInt(value: unknown): number | null {
  const text = asText(value);
  if (!text) {
    return null;
  }
  const parsed = Number.parseInt(text, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

type AggregatedSkillModState = {
  combatSkillName: CombatSkillName;
  firstIndex: number;
  firstEntry: HistoryEntry;
  lastEntry: HistoryEntry;
  oldValue: number | null;
  newValue: number | null;
  displayName: string;
};

function aggregateCombatSkillModEntries(entries: HistoryEntry[], warnings: string[]): HistoryEntry[] {
  const replacementByIndex = new Map<number, HistoryEntry>();
  const skipIndices = new Set<number>();
  const states = new Map<CombatSkillName, AggregatedSkillModState>();

  entries.forEach((entry, index) => {
    if (!isGewuerfelteBegabungCombatSkillEntry(entry)) {
      return;
    }

    const combatSkillName = getCombatSkillNameFromHistoryEntry(entry);
    if (!combatSkillName) {
      return;
    }

    skipIndices.add(index);
    const parsedOld = toOptionalInt(entry.old_value);
    const parsedNew = toOptionalInt(entry.new_value);
    const displayName = asText(entry.name);
    const existing = states.get(combatSkillName);

    if (!existing) {
      states.set(combatSkillName, {
        combatSkillName,
        firstIndex: index,
        firstEntry: entry,
        lastEntry: entry,
        oldValue: parsedOld,
        newValue: parsedNew,
        displayName,
      });
      return;
    }

    existing.lastEntry = entry;
    if (existing.oldValue === null && parsedOld !== null) {
      existing.oldValue = parsedOld;
    }
    if (parsedNew !== null) {
      existing.newValue = parsedNew;
    }
  });

  if (states.size === 0) {
    return entries;
  }

  for (const state of states.values()) {
    const fallbackOldValue = asText(state.firstEntry.old_value);
    const fallbackNewValue = asText(state.lastEntry.new_value);
    if (state.oldValue === null || state.newValue === null) {
      warnings.push(
        `Incomplete Gewürfelte Begabung history data for combat skill '${state.displayName}', using available values`,
      );
    }
    const replacement: HistoryEntry = {
      ...state.firstEntry,
      old_value: state.oldValue !== null ? state.oldValue.toString() : fallbackOldValue,
      new_value: state.newValue !== null ? state.newValue.toString() : fallbackNewValue,
      date: state.lastEntry.date ?? state.firstEntry.date,
      name: state.firstEntry.name ?? state.displayName,
    };
    replacementByIndex.set(state.firstIndex, replacement);
  }

  return entries.reduce<HistoryEntry[]>((result, entry, index) => {
    const replacement = replacementByIndex.get(index);
    if (replacement) {
      result.push(replacement);
      return result;
    }
    if (skipIndices.has(index)) {
      return result;
    }
    result.push(entry);
    return result;
  }, []);
}

function isGewuerfelteBegabungCombatSkillEntry(entry: HistoryEntry): boolean {
  const comment = normalizeLabel(asText(entry.comment));
  if (!comment || comment !== GEWUERFELTE_BEGABUNG_COMMENT) {
    return false;
  }
  const typeLabel = normalizeLabel(asText(entry.type));
  if (!COMBAT_SKILL_HISTORY_TYPE_LABELS.has(typeLabel)) {
    return false;
  }
  return getCombatSkillNameFromHistoryEntry(entry) !== null;
}

function getCombatSkillNameFromHistoryEntry(entry: HistoryEntry): CombatSkillName | null {
  const normalizedSkillName = normalizeLabel(asText(entry.name));
  return COMBAT_SKILL_MAP[normalizedSkillName] ?? null;
}

function buildCharacterSheet(sheet: XmlCharacterSheet): { characterSheet: CharacterSheet; warnings: string[] } {
  const warnings: string[] = [];
  const characterSheet = createEmptyCharacterSheet();

  const general = asRecord(sheet.general_information);
  characterSheet.generalInformation.name = asText(general.name);
  characterSheet.generalInformation.sex = asText(general.sex);
  characterSheet.generalInformation.level = toInt(sheet.level, 1);
  characterSheet.generalInformation.levelUpProgress = levelUpProgressSchema.parse({});
  characterSheet.generalInformation.birthday = asText(general.birthday);
  characterSheet.generalInformation.birthplace = asText(general.birthplace);
  characterSheet.generalInformation.size = asText(general.size);
  characterSheet.generalInformation.weight = asText(general.weight);
  characterSheet.generalInformation.hairColor = asText(general.hair_color);
  characterSheet.generalInformation.eyeColor = asText(general.eye_color);
  characterSheet.generalInformation.residence = asText(general.residence);
  characterSheet.generalInformation.appearance = asText(general.appearance);

  const languagesNode = asRecord(sheet.languages_scripts);
  const languages = ensureArray(languagesNode.language_script)
    .map((entry) => asText(entry))
    .filter(Boolean);
  const specialCharacteristics = asText(general.special_characteristics);
  if (languages.length > 0) {
    queueInfoBlock("Info", [
      `Languages/Scripts entries dropped during conversion (not part of new schema): ${languages.join(", ")}`,
    ]);
  }
  characterSheet.generalInformation.specialCharacteristics = specialCharacteristics;

  const profession = asRecord(general.profession);
  const professionName = asText(profession.name);
  const professionSkillName = asText(profession.skill);
  const professionSkill = mapGeneralInformationSkill(professionSkillName);
  if (!professionSkill) {
    warnings.push(
      `Unknown profession skill '${professionSkillName}', defaulting to ${DEFAULT_GENERAL_INFORMATION_SKILL}`,
    );
  }
  const resolvedProfessionSkill: SkillNameWithCategory = professionSkill ?? DEFAULT_GENERAL_INFORMATION_SKILL;
  characterSheet.generalInformation.profession = {
    name: professionName,
    skill: resolvedProfessionSkill,
  };
  applyProfessionOrHobbyBonus(characterSheet, resolvedProfessionSkill, PROFESSION_SKILL_BONUS, warnings);

  const hobby = asRecord(general.hobby);
  const hobbyName = asText(hobby.name);
  const hobbySkillName = asText(hobby.skill);
  const normalizedHobbyName = normalizeLabel(hobbyName);
  const jiujitsuHobbyName = normalizeLabel("Jiu-Jitsu");
  const forcedHobbySkill: SkillNameWithCategory | null =
    normalizedHobbyName === jiujitsuHobbyName ? "combat/martialArts" : null;
  const hobbySkillFromXml = mapGeneralInformationSkill(hobbySkillName);
  if (!forcedHobbySkill && !hobbySkillFromXml && hobbySkillName) {
    warnings.push(`Unknown hobby skill '${hobbySkillName}', defaulting to ${DEFAULT_GENERAL_INFORMATION_SKILL}`);
  }
  const resolvedHobbySkill: SkillNameWithCategory =
    forcedHobbySkill ?? hobbySkillFromXml ?? DEFAULT_GENERAL_INFORMATION_SKILL;
  characterSheet.generalInformation.hobby = {
    name: hobbyName,
    skill: resolvedHobbySkill,
  };

  applyProfessionOrHobbyBonus(characterSheet, resolvedHobbySkill, HOBBY_SKILL_BONUS, warnings);
  queueInfoBlock("!! Notice !!", [
    "Profession/Hobby bonus for non-combat skills is now stored as the skill's mod value instead of being baked into the current value.",
    "Profession/Hobby bonus for combat skills is expected to already be stored in the mod value in the XML; please adjust manually if that's not the case.",
  ]);

  const calculationPoints = asRecord(sheet.calculation_points);
  const attributePoints = asRecord(calculationPoints.attribute_points);
  const attributeAdditional = toInt(attributePoints.additional);
  const attributeSpent = toInt(attributePoints.spent);

  characterSheet.calculationPoints.attributePoints = {
    start: ATTRIBUTE_POINTS_FOR_CREATION,
    available: ATTRIBUTE_POINTS_FOR_CREATION + attributeAdditional - attributeSpent,
    total: ATTRIBUTE_POINTS_FOR_CREATION + attributeAdditional,
  };

  const adventurePoints = asRecord(calculationPoints.adventure_points);
  const adventurePointsTotal = toInt(adventurePoints.total);
  characterSheet.calculationPoints.adventurePoints = {
    start: 0,
    available: 0,
    total: adventurePointsTotal,
  };

  const advantagesNode = asRecord(sheet.advantages);
  const advantages = ensureArray(advantagesNode.advantage)
    .map((name) => asText(name))
    .filter(Boolean);
  characterSheet.advantages = mapAdvantages(advantages, warnings);

  const disadvantagesNode = asRecord(sheet.disadvantages);
  const disadvantages = ensureArray(disadvantagesNode.disadvantage)
    .map((name) => asText(name))
    .filter(Boolean);
  characterSheet.disadvantages = mapDisadvantages(disadvantages, characterSheet.generalInformation.name, warnings);

  const attributes = asRecord(sheet.attributes);
  for (const [rawName, rawValue] of Object.entries(attributes)) {
    const normalizedName = normalizeLabel(rawName);
    const attributeKey = ATTRIBUTE_MAP[normalizedName];
    if (!attributeKey) {
      warnings.push(`Unknown attribute '${rawName}', skipping`);
      continue;
    }
    const value = rawValue as Record<string, unknown>;
    const start = toInt(value.start);
    const current = toInt(value.current);
    const mod = toInt(value.mod);
    characterSheet.attributes[attributeKey] = {
      start,
      current,
      mod,
      totalCost: current,
    };
  }

  applyBaseValues(sheet, characterSheet, warnings);
  applyBaseValueFormulas(characterSheet);

  const spentOnSkills = applyNonCombatSkills(sheet, characterSheet, warnings);
  const spentOnCombatSkills = applyCombatSkills(sheet, characterSheet, warnings);

  characterSheet.calculationPoints.adventurePoints.available =
    adventurePointsTotal - spentOnSkills - spentOnCombatSkills;

  return { characterSheet, warnings };
}

function extractActivatedSkills(sheet: XmlCharacterSheet, warnings: string[]): SkillNameWithCategory[] {
  const skillsNode = asRecord(sheet.skills);
  const activatedRaw = (skillsNode as Record<string, unknown>)["activated_skills"];
  const resolvedEntries =
    activatedRaw &&
    typeof activatedRaw === "object" &&
    activatedRaw !== null &&
    "skill" in (activatedRaw as Record<string, unknown>)
      ? ensureArray((activatedRaw as Record<string, unknown>).skill)
      : ensureArray(activatedRaw);

  const seen = new Set<SkillNameWithCategory>();
  const activatedSkills: SkillNameWithCategory[] = [];

  for (const entry of resolvedEntries) {
    const label = normalizeLabel(asText(entry));
    if (!label) {
      continue;
    }

    let mapped: SkillNameWithCategory | null = null;
    if (label.includes("/")) {
      mapped = label as SkillNameWithCategory;
    } else {
      mapped = mapNonCombatSkill(label) ?? null;
    }

    if (!mapped) {
      warnings.push(`Unknown activated skill '${label}', skipping`);
      continue;
    }

    if (seen.has(mapped)) {
      continue;
    }

    seen.add(mapped);
    activatedSkills.push(mapped);
  }

  if (activatedSkills.length > NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION) {
    warnings.push(
      `Activated skills exceed maximum (${NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION}), truncating additional entries`,
    );
    return activatedSkills.slice(0, NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION);
  }

  for (const fallback of START_SKILLS) {
    if (activatedSkills.length >= NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION) {
      break;
    }
    if (seen.has(fallback)) {
      continue;
    }
    seen.add(fallback);
    activatedSkills.push(fallback);
  }

  while (activatedSkills.length < NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION) {
    const defaultSkill = START_SKILLS[0] ?? ("body/athletics" as SkillNameWithCategory);
    warnings.push("Activated skills list shorter than required, filling with default skill");
    activatedSkills.push(defaultSkill);
  }

  return activatedSkills;
}

function createEmptyCharacterSheet(): CharacterSheet {
  const zeroAttribute = () => ({ start: 0, current: 0, mod: 0, totalCost: 0 });
  const zeroBaseValue = (): BaseValue => ({ start: 0, current: 0, mod: 0 });
  const zeroSkill = (skill: SkillNameWithCategory): Skill => ({
    activated: START_SKILLS.includes(skill),
    start: 0,
    current: 0,
    mod: 0,
    totalCost: 0,
    defaultCostCategory: combatSkills.includes(skill) ? CostCategory.CAT_3 : CostCategory.CAT_2,
  });

  const skills = Object.fromEntries(
    (Object.keys(characterSheetSchema.shape.skills.shape) as SkillCategory[]).map((category) => {
      const names = Object.keys(characterSheetSchema.shape.skills.shape[category].shape) as SkillName[];
      const skillEntries = names.map((name) => [name, zeroSkill(`${category}/${name}` as SkillNameWithCategory)]);
      return [category, Object.fromEntries(skillEntries)];
    }),
  ) as CharacterSheet["skills"];

  const combatZero = Object.fromEntries(
    Object.keys(COMBAT_SKILL_HANDLING).map((skill) => {
      const name = skill as CombatSkillName;
      return [name, zeroCombatStats(name)];
    }),
  ) as Record<CombatSkillName, CombatStats>;

  return {
    generalInformation: {
      name: "",
      level: 1,
      levelUpProgress: levelUpProgressSchema.parse({}),
      sex: "",
      profession: { name: "", skill: "body/athletics" },
      hobby: { name: "", skill: "body/athletics" },
      birthday: "",
      birthplace: "",
      size: "",
      weight: "",
      hairColor: "",
      eyeColor: "",
      residence: "",
      appearance: "",
      specialCharacteristics: "",
    },
    calculationPoints: {
      adventurePoints: { start: 0, available: 0, total: 0 },
      attributePoints: { start: 0, available: 0, total: 0 },
    },
    advantages: [],
    disadvantages: [],
    specialAbilities: [],
    baseValues: {
      healthPoints: zeroBaseValue(),
      mentalHealth: zeroBaseValue(),
      armorLevel: zeroBaseValue(),
      naturalArmor: zeroBaseValue(),
      initiativeBaseValue: zeroBaseValue(),
      attackBaseValue: zeroBaseValue(),
      paradeBaseValue: zeroBaseValue(),
      rangedAttackBaseValue: zeroBaseValue(),
      luckPoints: zeroBaseValue(),
      bonusActionsPerCombatRound: zeroBaseValue(),
      legendaryActions: zeroBaseValue(),
    },
    attributes: {
      courage: zeroAttribute(),
      intelligence: zeroAttribute(),
      concentration: zeroAttribute(),
      charisma: zeroAttribute(),
      mentalResilience: zeroAttribute(),
      dexterity: zeroAttribute(),
      endurance: zeroAttribute(),
      strength: zeroAttribute(),
    },
    skills,
    combat: {
      melee: {
        martialArts: combatZero.martialArts,
        barehanded: combatZero.barehanded,
        chainWeapons: combatZero.chainWeapons,
        daggers: combatZero.daggers,
        slashingWeaponsSharp1h: combatZero.slashingWeaponsSharp1h,
        slashingWeaponsBlunt1h: combatZero.slashingWeaponsBlunt1h,
        thrustingWeapons1h: combatZero.thrustingWeapons1h,
        slashingWeaponsSharp2h: combatZero.slashingWeaponsSharp2h,
        slashingWeaponsBlunt2h: combatZero.slashingWeaponsBlunt2h,
        thrustingWeapons2h: combatZero.thrustingWeapons2h,
      },
      ranged: {
        missile: combatZero.missile,
        firearmSimple: combatZero.firearmSimple,
        firearmMedium: combatZero.firearmMedium,
        firearmComplex: combatZero.firearmComplex,
        heavyWeapons: combatZero.heavyWeapons,
      },
    },
  };
}

function zeroCombatStats(name: CombatSkillName): CombatStats {
  const handling = COMBAT_SKILL_HANDLING[name];
  return {
    availablePoints: handling,
    handling,
    attackValue: 0,
    skilledAttackValue: 0,
    paradeValue: 0,
    skilledParadeValue: 0,
  };
}

function applyBaseValues(sheet: XmlCharacterSheet, characterSheet: CharacterSheet, warnings: string[]): void {
  const baseValues = asRecord(sheet.base_values);
  const basePoints = asRecord(sheet.base_points);

  for (const [rawName, rawValue] of Object.entries(baseValues)) {
    const normalizedName = normalizeLabel(rawName);
    const baseKey = BASE_VALUE_MAP[normalizedName];
    if (!baseKey) {
      warnings.push(`Unknown base value '${rawName}', skipping`);
      continue;
    }
    const value = rawValue as Record<string, unknown>;
    const mod = toInt(value.mod);

    const points = asRecord(basePoints[rawName]);
    const start = toInt(points.start);
    const bought = toInt(points.bought);

    const baseValue: BaseValue = {
      start,
      current: start,
      mod,
    };

    if (bought !== 0) {
      baseValue.byLvlUp = bought;
      baseValue.current += bought;
    }

    characterSheet.baseValues[baseKey] = baseValue;
  }
}

// Keep in sync with backend/src/core/rules/base-value-formulas.ts
function calculateBaseValueByFormula(baseValueName: keyof BaseValues, attributes: Attributes): number | undefined {
  const attr = (name: keyof Attributes) => attributes[name].current + attributes[name].mod;

  switch (baseValueName) {
    case "healthPoints":
      return 2 * attr("endurance") + attr("strength") + 20;
    case "mentalHealth":
      return attr("courage") + 2 * attr("mentalResilience") + 8;
    case "initiativeBaseValue":
      return (2 * attr("courage") + attr("dexterity") + attr("endurance")) / 5;
    case "attackBaseValue":
      return (10 * (attr("courage") + attr("dexterity") + attr("strength"))) / 5;
    case "paradeBaseValue":
      return (10 * (attr("endurance") + attr("dexterity") + attr("strength"))) / 5;
    case "rangedAttackBaseValue":
      return (10 * (attr("concentration") + attr("dexterity") + attr("strength"))) / 5;
    case "legendaryActions":
      return 1;
    default:
      return undefined;
  }
}

function applyBaseValueFormulas(characterSheet: CharacterSheet): void {
  for (const baseValueName of Object.keys(characterSheet.baseValues) as (keyof BaseValues)[]) {
    const formulaValue = calculateBaseValueByFormula(baseValueName, characterSheet.attributes);
    if (formulaValue === undefined) {
      continue;
    }
    const rounded = Math.round(formulaValue);
    characterSheet.baseValues[baseValueName].byFormula = rounded;
    characterSheet.baseValues[baseValueName].current += rounded;
  }
}

function applyNonCombatSkills(sheet: XmlCharacterSheet, characterSheet: CharacterSheet, warnings: string[]): number {
  const skillsNode = asRecord(sheet.skills);
  delete (skillsNode as Record<string, unknown>).activated_skills;
  let spentTotal = 0;
  for (const [rawName, rawValue] of Object.entries(skillsNode)) {
    const normalizedName = normalizeLabel(rawName);
    const mappedSkill = mapNonCombatSkill(normalizedName);
    if (!mappedSkill) {
      warnings.push(`Unknown skill '${rawName}', skipping`);
      continue;
    }
    const { category, name } = splitSkill(mappedSkill);
    const value = rawValue as Record<string, unknown>;
    const activated = value.activated !== undefined ? toInt(value.activated) > 0 : START_SKILLS.includes(mappedSkill);
    const totalCost = toInt(value.total_costs);
    spentTotal += totalCost;

    const skillCategory = getSkillCategorySection(characterSheet.skills, category);
    const existing = skillCategory[name];
    skillCategory[name] = {
      ...existing,
      activated: activated || existing.activated,
      start: existing.start + toInt(value.start),
      current: existing.current + toInt(value.taw),
      mod: existing.mod + toInt(value.mod),
      totalCost: existing.totalCost + totalCost,
    };
  }
  return spentTotal;
}

function applyCombatSkills(sheet: XmlCharacterSheet, characterSheet: CharacterSheet, warnings: string[]): number {
  const combatSkillsNode = asRecord(sheet.combat_skills);
  const baseValues = characterSheet.baseValues;

  const meleeNode = asRecord(combatSkillsNode.melee);
  const rangedNode = asRecord(combatSkillsNode.ranged);
  const meleeSkills = ensureArray(meleeNode.skill) as Record<string, unknown>[];
  const rangedSkills = ensureArray(rangedNode.skill) as Record<string, unknown>[];

  let spentTotal = 0;
  for (const skillEntry of meleeSkills) {
    spentTotal += applyCombatSkillEntry(skillEntry, "melee", characterSheet, baseValues, warnings);
  }

  for (const skillEntry of rangedSkills) {
    spentTotal += applyCombatSkillEntry(skillEntry, "ranged", characterSheet, baseValues, warnings);
  }

  for (const category of ["melee", "ranged"] as const) {
    const section = getCombatCategorySection(characterSheet.combat, category);
    for (const [skillName, stats] of Object.entries(section)) {
      section[skillName] = recalculateCombatStats(
        stats,
        category,
        characterSheet.skills.combat[skillName as CombatSkillName],
        baseValues,
      );
    }
  }

  return spentTotal;
}

function applyCombatSkillEntry(
  entry: Record<string, unknown>,
  category: CombatCategory,
  characterSheet: CharacterSheet,
  baseValues: BaseValues,
  warnings: string[],
): number {
  const name = normalizeLabel(asText(entry.name));
  const combatSkillName = COMBAT_SKILL_MAP[name];
  if (!combatSkillName) {
    warnings.push(
      `Unknown combat skill '${name}', skipping. Please update COMBAT_SKILL_MAP in the script to include this entry`,
    );
    return 0;
  }

  const skill = characterSheet.skills.combat[combatSkillName];
  const current = toInt(entry.ability);
  const mod = toInt(entry.mod);
  const totalCost = toInt(entry.total_costs);
  characterSheet.skills.combat[combatSkillName] = {
    ...skill,
    activated: true,
    current,
    mod,
    totalCost,
  };

  const handling = toInt(entry.handling, COMBAT_SKILL_HANDLING[combatSkillName]);
  const skilledAttackValue = category === "melee" ? toInt(entry.at_distributed) : toInt(entry.fk_distributed);
  const skilledParadeValue = category === "melee" ? toInt(entry.pa_distributed) : 0;

  const combatCategory = getCombatCategorySection(characterSheet.combat, category);
  const updatedCombatStats = recalculateCombatStats(
    {
      ...combatCategory[combatSkillName],
      handling,
      skilledAttackValue,
      skilledParadeValue,
    },
    category,
    characterSheet.skills.combat[combatSkillName],
    baseValues,
  );

  combatCategory[combatSkillName] = updatedCombatStats;
  return totalCost;
}

function recalculateCombatStats(
  stats: CombatStats,
  category: CombatCategory,
  skill: Skill,
  baseValues: BaseValues,
): CombatStats {
  const availablePoints =
    stats.handling + (skill.current + skill.mod) - (stats.skilledAttackValue + stats.skilledParadeValue);
  const updated: CombatStats = {
    ...stats,
    availablePoints,
  };

  if (category === "melee") {
    updated.attackValue =
      stats.skilledAttackValue + baseValues.attackBaseValue.current + baseValues.attackBaseValue.mod;
    updated.paradeValue =
      stats.skilledParadeValue + baseValues.paradeBaseValue.current + baseValues.paradeBaseValue.mod;
  } else {
    updated.attackValue =
      stats.skilledAttackValue + baseValues.rangedAttackBaseValue.current + baseValues.rangedAttackBaseValue.mod;
    updated.paradeValue = 0;
  }

  return updated;
}

function mapNonCombatSkill(name: string): SkillNameWithCategory | null {
  if (!name) {
    return null;
  }
  return NON_COMBAT_SKILL_MAP.get(normalizeLabel(name)) ?? null;
}

function mapGeneralInformationSkill(name: string): SkillNameWithCategory | null {
  if (!name) {
    return null;
  }
  if (name.includes("/")) {
    return name as SkillNameWithCategory;
  }
  const normalized = normalizeLabel(name);
  const nonCombat = NON_COMBAT_SKILL_MAP.get(normalized);
  if (nonCombat) {
    return nonCombat;
  }
  const combatSkill = COMBAT_SKILL_MAP[normalized];
  if (combatSkill) {
    return `combat/${combatSkill}` as SkillNameWithCategory;
  }
  return null;
}

function applyProfessionOrHobbyBonus(
  characterSheet: CharacterSheet,
  skillName: SkillNameWithCategory,
  bonus: number,
  warnings: string[],
): void {
  const { category, name } = splitSkill(skillName);
  if (category === "combat") {
    // combat skills are expected to already have the bonus in the mod value
    return;
  }
  const skillsInCategory = getSkillCategorySection(characterSheet.skills, category);
  const skill = skillsInCategory[name];
  if (!skill) {
    warnings.push(`Unable to apply profession/hobby bonus for '${skillName}', skill not found in character sheet`);
    return;
  }
  // In the XML the bonus has been added to the current value, but in the new schema it is added to the mod value
  skill.mod += bonus;
  skill.current -= bonus;
}

function splitSkill(skill: SkillNameWithCategory): { category: SkillCategory; name: SkillName } {
  const [category, name] = skill.split("/") as [SkillCategory, SkillName];
  return { category, name };
}

function getSkillCategorySection(skills: CharacterSheet["skills"], category: SkillCategory): Record<string, Skill> {
  return skills[category] as Record<string, Skill>;
}

function getCombatCategorySection(
  combat: CharacterSheet["combat"],
  category: CombatCategory,
): Record<string, CombatStats> {
  return combat[category] as Record<string, CombatStats>;
}

function mapAdvantages(advantages: string[], warnings: string[]): CharacterSheet["advantages"] {
  const result: CharacterSheet["advantages"] = [];
  for (const rawName of advantages) {
    const normalized = normalizeLabel(rawName);
    const enumValue = ADVANTAGE_MAP[normalized];
    if (enumValue === undefined) {
      warnings.push(`Unknown advantage '${rawName}', skipping`);
      continue;
    }
    const defaultEntry = ADVANTAGES.find(([name]) => name === enumValue);
    if (!defaultEntry) {
      warnings.push(`No default advantage cost found for '${rawName}', skipping`);
      continue;
    }
    const [, info, value] = defaultEntry;
    result.push([enumValue, info, value]);
  }
  return result;
}

function mapDisadvantages(
  disadvantages: string[],
  characterName: string,
  warnings: string[],
): CharacterSheet["disadvantages"] {
  const result: CharacterSheet["disadvantages"] = [];
  const fearOfDetails = FEAR_OF_DETAIL_BY_CHARACTER_HASH[hashCharacterName(characterName)] ?? {};
  for (const rawName of disadvantages) {
    const normalized = normalizeLabel(rawName);
    const enumValue = DISADVANTAGE_MAP[normalized];
    if (enumValue === undefined) {
      warnings.push(`Unknown disadvantage '${rawName}', skipping`);
      continue;
    }

    let defaultEntry = DISADVANTAGES.find(([name]) => name === enumValue);
    if (enumValue === DisadvantagesNames.FEAR_OF) {
      const fearCost = FEAR_OF_COST_BY_LABEL[normalized];
      defaultEntry =
        DISADVANTAGES.find(([name, , value]) => name === enumValue && value === (fearCost ?? 5)) ?? defaultEntry;
    }

    if (!defaultEntry) {
      warnings.push(`No default disadvantage cost found for '${rawName}', skipping`);
      continue;
    }
    const [, info, value] = defaultEntry;
    let infoOverride = info;
    if (enumValue === DisadvantagesNames.FEAR_OF) {
      const detail = fearOfDetails[normalized];
      if (detail) {
        infoOverride = detail;
      } else {
        infoOverride = rawName;
        warnings.push(
          `FEAR_OF disadvantage detected ('${rawName}'). Please manually enter the specific matter of fear in the resulting character JSON.`,
        );
      }
    }
    result.push([enumValue, infoOverride, value]);
  }
  return result;
}

function extractCollegeSkillName(entries: HistoryEntry[]): string | null {
  for (const entry of entries) {
    const typeLabel = normalizeLabel(asText(entry.type));
    if (typeLabel !== ADVANTAGE_CHANGED_TYPE) {
      continue;
    }
    const newValue = normalizeLabel(asText(entry.new_value));
    if (newValue !== STUDIUM_NAME) {
      continue;
    }
    const comment = asText(entry.comment).trim();
    if (comment) {
      return comment;
    }
  }
  return null;
}

function patchCollegeEducationSkillName(
  characterSheet: CharacterSheet,
  collegeSkillName: string | null,
  warnings: string[],
): void {
  const index = characterSheet.advantages.findIndex(([name]) => name === AdvantagesNames.COLLEGE_EDUCATION);
  if (index === -1) {
    return;
  }
  if (!collegeSkillName) {
    warnings.push(
      `COLLEGE_EDUCATION advantage detected but no skill name found in history. Please manually enter the skill name in the resulting character JSON.`,
    );
    return;
  }
  const mappedSkill = mapNonCombatSkill(collegeSkillName);
  const mappedSkillName = mappedSkill?.startsWith("knowledge/") ? mappedSkill.replace("knowledge/", "") : null;
  if (!mappedSkillName) {
    warnings.push(
      `COLLEGE_EDUCATION: unknown knowledge skill '${collegeSkillName}', using raw value. Please manually correct the skill name in the resulting character JSON.`,
    );
  }
  const [enumValue, , value] = characterSheet.advantages[index];
  characterSheet.advantages[index] = [enumValue, mappedSkillName ?? collegeSkillName, value];

  // In the XML the COLLEGE_EDUCATION bonus is baked into the current value,
  // but in the new schema it is stored as mod. Subtract the bonus from current
  // so that current + mod stays the same as the original XML value.
  const additionalBonus = 20;
  if (mappedSkillName && mappedSkillName in characterSheet.skills.knowledge) {
    const chosenSkill = characterSheet.skills.knowledge[mappedSkillName as keyof CharacterSheet["skills"]["knowledge"]];
    chosenSkill.mod += additionalBonus;
    chosenSkill.current -= additionalBonus;
  }
  queueInfoBlock("!! Notice !!", [
    `COLLEGE_EDUCATION for ${mappedSkillName}: added ${additionalBonus} to skill mod value and subtracted ${additionalBonus} from skill current value. In the new schema, the bonus is stored as mod value instead of being baked into the current value.`,
  ]);
}

function buildHistoryRecords(
  entries: HistoryEntry[],
  characterSheet: CharacterSheet,
  warnings: string[],
  levelUpEffects: Record<string, EffectByLevelUp>,
  startingNumber = 1,
): HistoryRecord[] {
  const records: HistoryRecord[] = [];
  let number = startingNumber;

  const apTracker = {
    start: characterSheet.calculationPoints.adventurePoints.start,
    runningTotal: characterSheet.calculationPoints.adventurePoints.start,
  };
  const attrTracker = {
    start: characterSheet.calculationPoints.attributePoints.start,
    runningTotal: characterSheet.calculationPoints.attributePoints.start,
  };

  // Running level-up progress state, built incrementally as level-up records are processed
  const runningLevelUpEffects: Record<string, EffectByLevelUp> = {};

  for (const entry of entries) {
    const typeLabel = normalizeLabel(asText(entry.type));
    if (IGNORED_HISTORY_TYPES.has(typeLabel)) {
      if (IGNORED_HISTORY_TYPES_WITH_WARNING.has(typeLabel)) {
        queueInfoBlock("Info", [
          `History entry type '${typeLabel}' ignored during conversion (not part of new schema)`,
        ]);
      }
      continue;
    }

    // Skip base value entries that belong to level-ups (they are absorbed into the LEVEL_UP_APPLIED record)
    if (isLevelUpBaseValueEntry(entry)) {
      continue;
    }

    const name = asText(entry.name);
    const oldValueText = asText(entry.old_value);
    const newValueText = asText(entry.new_value);
    const increaseMode = normalizeLabel(asText(entry.increase_mode));
    const comment = asText(entry.comment) || null;

    const recordType = mapRecordType(typeLabel, warnings);
    const learningMethod = mapLearningMethod(increaseMode, warnings);

    const record: HistoryRecord = {
      type: recordType,
      name,
      number,
      id: crypto.randomUUID(),
      data: {
        new: {},
      },
      learningMethod,
      calculationPoints: {
        adventurePoints: null,
        attributePoints: null,
      },
      comment,
      timestamp: toIsoTimestamp(asText(entry.date)),
    };

    switch (recordType) {
      case HistoryRecordType.CALCULATION_POINTS_CHANGED:
        fillCalculationPointsRecord(record, entry, name, apTracker, attrTracker, warnings);
        break;
      case HistoryRecordType.BASE_VALUE_CHANGED:
        fillBaseValueRecord(record, name, oldValueText, newValueText, characterSheet, warnings);
        break;
      case HistoryRecordType.LEVEL_UP_APPLIED:
        fillLevelUpRecord(record, oldValueText, newValueText, levelUpEffects, runningLevelUpEffects);
        break;
      case HistoryRecordType.ATTRIBUTE_CHANGED:
        fillAttributeRecord(record, name, oldValueText, newValueText, characterSheet, warnings);
        break;
      case HistoryRecordType.SKILL_CHANGED:
        fillSkillRecord(record, name, oldValueText, newValueText, comment, characterSheet, warnings);
        break;
      case HistoryRecordType.COMBAT_STATS_CHANGED:
        fillCombatStatsRecord(record, typeLabel, name, oldValueText, newValueText, characterSheet, warnings);
        break;
      case HistoryRecordType.SPECIAL_ABILITIES_CHANGED:
        fillSpecialAbilityRecord(record, typeLabel, name, oldValueText, newValueText);
        break;
      default:
        warnings.push(`Unhandled record type '${typeLabel}', leaving data empty`);
        break;
    }

    records.push(record);
    number += 1;
  }

  return records;
}

function getLastAdventurePointsAvailable(entries: HistoryEntry[]): number | null {
  let lastAvailable: number | null = null;
  for (const entry of entries) {
    const typeLabel = normalizeLabel(asText(entry.type));
    const name = normalizeLabel(asText(entry.name)).toLowerCase();
    const isAPEvent = typeLabel === normalizeLabel("Ereignis (Berechnungspunkte)") && name.includes("abenteuer");
    const isSkillIncrease =
      typeLabel === normalizeLabel("Talent gesteigert") || typeLabel === normalizeLabel("Kampftalent gesteigert");
    if (!isAPEvent && !isSkillIncrease) continue;
    const change = toInt(entry.calculation_points_change);
    if (change === 0) continue;
    lastAvailable = toInt(entry.new_calculation_points_available);
  }
  return lastAvailable;
}

function getEarliestHistoryTimestamp(entries: HistoryEntry[]): string {
  let earliest: string | null = null;
  for (const entry of entries) {
    const rawDate = asText(entry.date);
    if (!rawDate) {
      continue;
    }
    const iso = toIsoTimestamp(rawDate);
    if (!earliest || iso < earliest) {
      earliest = iso;
    }
  }
  return earliest ?? new Date().toISOString();
}

function buildCharacterCreatedRecord(
  characterSheet: CharacterSheet,
  activatedSkills: SkillNameWithCategory[],
  timestamp: string,
): HistoryRecord {
  const startAP = characterSheet.calculationPoints.adventurePoints.start;
  const startAttr = characterSheet.calculationPoints.attributePoints.start;

  const creationCharacterSheet: CharacterSheet = {
    ...characterSheet,
    generalInformation: {
      ...characterSheet.generalInformation,
      level: 1,
      levelUpProgress: levelUpProgressSchema.parse({}),
    },
    calculationPoints: {
      adventurePoints: { start: startAP, available: startAP, total: startAP },
      attributePoints: { start: startAttr, available: 0, total: startAttr },
    },
  };

  return {
    type: HistoryRecordType.CHARACTER_CREATED,
    name: characterSheet.generalInformation.name || "Character Created",
    number: 1,
    id: crypto.randomUUID(),
    data: {
      new: {
        character: creationCharacterSheet,
        generationPoints: calculateGenerationPoints(characterSheet),
        activatedSkills,
      },
    },
    learningMethod: null,
    calculationPoints: {
      adventurePoints: null,
      attributePoints: null,
    },
    comment: null,
    timestamp,
  };
}

function calculateGenerationPoints(characterSheet: CharacterSheet): {
  throughDisadvantages: number;
  spent: number;
  total: number;
} {
  const throughDisadvantages = characterSheet.disadvantages.reduce((sum, [, , value]) => sum + (value ?? 0), 0);
  const spent = characterSheet.advantages.reduce((sum, [, , value]) => sum + (value ?? 0), 0);
  return {
    throughDisadvantages,
    spent,
    total: GENERATION_POINTS + throughDisadvantages,
  };
}

/**
 * Extracts a map of level → EffectByLevelUp from the old history's "Ereignis (Basiswerte)" entries
 * that have a "Level X" comment pattern.
 */
function extractLevelUpEffects(entries: HistoryEntry[]): Record<string, EffectByLevelUp> {
  const effectsByLevel: Record<string, EffectByLevelUp> = {};

  for (const entry of entries) {
    const typeLabel = normalizeLabel(asText(entry.type));
    if (typeLabel !== normalizeLabel("Ereignis (Basiswerte)")) {
      continue;
    }

    const comment = asText(entry.comment);
    const levelMatch = comment.match(LEVEL_UP_COMMENT_PATTERN);
    if (!levelMatch) {
      continue;
    }
    const level = Number.parseInt(levelMatch[1], 10);
    if (Number.isNaN(level)) {
      continue;
    }

    const effectKind = BASE_VALUE_TO_LEVEL_UP_EFFECT[normalizeLabel(asText(entry.name))];
    if (!effectKind) {
      continue;
    }

    const newValue = toInt(entry.new_value, 0);
    const oldValue = toInt(entry.old_value, 0);
    const delta = newValue - oldValue;
    if (delta <= 0 && effectKind !== "rerollUnlock") {
      continue;
    }

    let effect: EffectByLevelUp;
    if (effectKind === "hpRoll" || effectKind === "armorLevelRoll") {
      effect = {
        kind: effectKind,
        roll: {
          dice: LEVEL_UP_DICE_EXPRESSION,
          value: clamp(delta, LEVEL_UP_DICE_MIN_TOTAL, LEVEL_UP_DICE_MAX_TOTAL),
        },
      };
    } else if (effectKind === "rerollUnlock") {
      effect = { kind: effectKind };
    } else {
      effect = {
        kind: effectKind as Exclude<LevelUpEffectKind, "hpRoll" | "armorLevelRoll" | "rerollUnlock">,
        delta: 1,
      } as EffectByLevelUp;
    }

    const levelKey = String(level);
    if (!(levelKey in effectsByLevel)) {
      effectsByLevel[levelKey] = effect;
    }
  }

  return effectsByLevel;
}

function buildLevelUpProgressFromEffects(effectsByLevel: Record<string, EffectByLevelUp>): LevelUpProgress {
  const progress = levelUpProgressSchema.parse({});
  const summaries: Partial<
    Record<LevelUpEffectKind, { selectionCount: number; firstChosenLevel: number; lastChosenLevel: number }>
  > = {};

  for (const [levelKey, effect] of Object.entries(effectsByLevel)) {
    const level = Number.parseInt(levelKey, 10);
    const summary = summaries[effect.kind];
    if (summary) {
      summary.selectionCount += 1;
      summary.lastChosenLevel = Math.max(summary.lastChosenLevel, level);
      summary.firstChosenLevel = Math.min(summary.firstChosenLevel, level);
    } else {
      summaries[effect.kind] = {
        selectionCount: 1,
        firstChosenLevel: level,
        lastChosenLevel: level,
      };
    }
  }

  progress.effectsByLevel = effectsByLevel;
  progress.effects = summaries as LevelUpProgress["effects"];
  return progress;
}

/**
 * Returns true if this "Ereignis (Basiswerte)" entry belongs to a level-up
 * (has "Level X" in the comment and maps to a known level-up effect).
 */
function isLevelUpBaseValueEntry(entry: HistoryEntry): boolean {
  const typeLabel = normalizeLabel(asText(entry.type));
  if (typeLabel !== normalizeLabel("Ereignis (Basiswerte)")) {
    return false;
  }
  const comment = asText(entry.comment);
  const levelMatch = comment.match(LEVEL_UP_COMMENT_PATTERN);
  if (!levelMatch) {
    return false;
  }
  const effectKind = BASE_VALUE_TO_LEVEL_UP_EFFECT[normalizeLabel(asText(entry.name))];
  return !!effectKind;
}

function mapRecordType(typeLabel: string, warnings: string[]): HistoryRecordType {
  const normalized = normalizeLabel(typeLabel);
  switch (normalized) {
    case normalizeLabel("Ereignis (Berechnungspunkte)"):
      return HistoryRecordType.CALCULATION_POINTS_CHANGED;
    case normalizeLabel("Ereignis (Basiswerte)"):
      return HistoryRecordType.BASE_VALUE_CHANGED;
    case normalizeLabel("Ereignis (Level Up)"):
      return HistoryRecordType.LEVEL_UP_APPLIED;
    case normalizeLabel("Eigenschaft gesteigert"):
      return HistoryRecordType.ATTRIBUTE_CHANGED;
    case normalizeLabel("Talent gesteigert"):
      return HistoryRecordType.SKILL_CHANGED;
    case normalizeLabel("Kampftalent gesteigert"):
      return HistoryRecordType.SKILL_CHANGED;
    case normalizeLabel("Talent aktiviert"):
      return HistoryRecordType.SKILL_CHANGED;
    case normalizeLabel("AT/FK verteilt"):
      return HistoryRecordType.COMBAT_STATS_CHANGED;
    case normalizeLabel("PA verteilt"):
      return HistoryRecordType.COMBAT_STATS_CHANGED;
    case normalizeLabel("Vorteil ge\u00e4ndert"):
    case normalizeLabel("Nachteil ge\u00e4ndert"):
    case normalizeLabel("Beruf ge\u00e4ndert"):
    case normalizeLabel("Hobby ge\u00e4ndert"):
      // Creation-date entries of these types are filtered out before reaching
      // buildHistoryRecords(). Any post-creation entries are kept as
      // SPECIAL_ABILITIES_CHANGED records.
      return HistoryRecordType.SPECIAL_ABILITIES_CHANGED;
    default:
      warnings.push(`Unknown history entry type '${typeLabel}', defaulting to SPECIAL_ABILITIES_CHANGED`);
      return HistoryRecordType.SPECIAL_ABILITIES_CHANGED;
  }
}

function mapLearningMethod(value: string, warnings: string[]): LearningMethodString | null {
  const normalized = normalizeLabel(value).toLowerCase();
  if (!normalized) {
    return null;
  }
  switch (normalized) {
    case normalizeLabel("G\u00fcnstig").toLowerCase():
      return "LOW_PRICED";
    case normalizeLabel("Normal").toLowerCase():
      return "NORMAL";
    case normalizeLabel("Teuer").toLowerCase():
      return "EXPENSIVE";
    case normalizeLabel("Frei").toLowerCase():
      return "FREE";
    default:
      warnings.push(`Unknown learning method '${value}', setting to null`);
      return null;
  }
}

function fillCalculationPointsRecord(
  record: HistoryRecord,
  entry: HistoryEntry,
  name: string,
  apTracker: { start: number; runningTotal: number },
  attrTracker: { start: number; runningTotal: number },
  warnings: string[],
): void {
  const oldAvailable = toInt(entry.old_calculation_points_available);
  const newAvailable = toInt(entry.new_calculation_points_available);
  const change = newAvailable - oldAvailable;

  const normalizedName = normalizeLabel(name).toLowerCase();
  const isAttributePoints = normalizedName.includes("attribut") || normalizedName.includes("eigenschaft");
  const key = isAttributePoints ? "attributePoints" : "adventurePoints";

  const tracker = isAttributePoints ? attrTracker : apTracker;
  const oldTotal = tracker.runningTotal;
  tracker.runningTotal += change;
  const newTotal = tracker.runningTotal;

  const oldPoints: CalculationPoints = { start: tracker.start, available: oldAvailable, total: oldTotal };
  const newPoints: CalculationPoints = { start: tracker.start, available: newAvailable, total: newTotal };

  record.data.old = { [key]: oldPoints };
  record.data.new = { [key]: newPoints };
  record.calculationPoints = {
    adventurePoints: key === "adventurePoints" ? { old: oldPoints, new: newPoints } : null,
    attributePoints: key === "attributePoints" ? { old: oldPoints, new: newPoints } : null,
  };

  if (!isAttributePoints && !normalizeLabel(name).toLowerCase().includes("abenteuer")) {
    warnings.push(`Calculation points entry '${name}' assumed to be adventure points`);
  }
}

function fillBaseValueRecord(
  record: HistoryRecord,
  name: string,
  oldValueText: string,
  newValueText: string,
  characterSheet: CharacterSheet,
  warnings: string[],
): void {
  const key = BASE_VALUE_MAP[normalizeLabel(name)];
  if (!key) {
    warnings.push(`Unknown base value history name '${name}', storing raw values`);
    record.data.new = { value: newValueText };
    if (oldValueText) {
      record.data.old = { value: oldValueText };
    }
    return;
  }

  const baseValue = characterSheet.baseValues[key];
  const oldValue = { ...baseValue, current: toInt(oldValueText) };
  const newValue = { ...baseValue, current: toInt(newValueText) };

  record.data.old = { baseValue: oldValue };
  record.data.new = { baseValue: newValue };
}

function fillLevelUpRecord(
  record: HistoryRecord,
  oldValueText: string,
  newValueText: string,
  levelUpEffects: Record<string, EffectByLevelUp>,
  runningLevelUpEffects: Record<string, EffectByLevelUp>,
): void {
  const oldLevel = toInt(oldValueText);
  const newLevel = toInt(newValueText);

  // Build the old progress from the current running state (before this level-up)
  const oldProgress = buildLevelUpProgressFromEffects({ ...runningLevelUpEffects });

  // Add the effect for the new level to the running state
  const newLevelKey = String(newLevel);
  if (newLevelKey in levelUpEffects) {
    runningLevelUpEffects[newLevelKey] = levelUpEffects[newLevelKey];
  }

  // Build the new progress from the updated running state (after this level-up)
  const newProgress = buildLevelUpProgressFromEffects({ ...runningLevelUpEffects });

  record.data.old = { level: oldLevel, levelUpProgress: oldProgress };
  record.data.new = { level: newLevel, levelUpProgress: newProgress };
}

function fillAttributeRecord(
  record: HistoryRecord,
  name: string,
  oldValueText: string,
  newValueText: string,
  characterSheet: CharacterSheet,
  warnings: string[],
): void {
  const key = ATTRIBUTE_MAP[normalizeLabel(name)];
  if (!key) {
    warnings.push(`Unknown attribute history name '${name}', storing raw values`);
    record.data.new = { value: newValueText };
    if (oldValueText) {
      record.data.old = { value: oldValueText };
    }
    return;
  }

  const baseAttribute = characterSheet.attributes[key];
  const oldAttribute = { ...baseAttribute, current: toInt(oldValueText) };
  const newAttribute = { ...baseAttribute, current: toInt(newValueText) };

  record.data.old = { attribute: oldAttribute };
  record.data.new = { attribute: newAttribute };
}

function fillSkillRecord(
  record: HistoryRecord,
  name: string,
  oldValueText: string,
  newValueText: string,
  comment: string | null,
  characterSheet: CharacterSheet,
  warnings: string[],
): void {
  const normalizedName = normalizeLabel(name);
  const mappedNonCombat = mapNonCombatSkill(normalizedName);
  const mappedCombat = COMBAT_SKILL_MAP[normalizedName];
  const normalizedComment = comment ? normalizeLabel(comment) : "";

  if (mappedCombat && normalizedComment === GEWUERFELTE_BEGABUNG_COMMENT) {
    const skill = characterSheet.skills.combat[mappedCombat];
    const oldMod = toOptionalInt(oldValueText);
    const newMod = toOptionalInt(newValueText);

    if (oldMod === null || newMod === null) {
      warnings.push(`Missing mod values for Gewürfelte Begabung history entry '${name}', storing raw values`);
    } else {
      record.data.old = { skill: { ...skill, mod: oldMod } };
      record.data.new = { skill: { ...skill, mod: newMod } };
      return;
    }
  }

  if (mappedCombat) {
    const skill = characterSheet.skills.combat[mappedCombat];
    record.data.old = { skill: { ...skill, current: toInt(oldValueText) } };
    record.data.new = { skill: { ...skill, current: toInt(newValueText) } };
    return;
  }

  if (mappedNonCombat) {
    const { category, name: skillName } = splitSkill(mappedNonCombat);
    const skillCategory = getSkillCategorySection(characterSheet.skills, category);
    const skill = skillCategory[skillName];
    record.data.old = { skill: { ...skill, current: toInt(oldValueText) } };
    record.data.new = { skill: { ...skill, current: toInt(newValueText) } };
    return;
  }

  warnings.push(`Unknown skill history name '${name}', storing raw values`);
  record.data.new = { value: newValueText };
  if (oldValueText) {
    record.data.old = { value: oldValueText };
  }
}

function fillCombatStatsRecord(
  record: HistoryRecord,
  typeLabel: string,
  name: string,
  oldValueText: string,
  newValueText: string,
  characterSheet: CharacterSheet,
  warnings: string[],
): void {
  const combatSkillName = COMBAT_SKILL_MAP[normalizeLabel(name)];
  if (!combatSkillName) {
    warnings.push(`Unknown combat stats history name '${name}', storing raw values`);
    record.data.new = { value: newValueText };
    if (oldValueText) {
      record.data.old = { value: oldValueText };
    }
    return;
  }

  const category = getCombatCategory(combatSkillName);
  const combatCategory = getCombatCategorySection(characterSheet.combat, category);
  const baseStats = combatCategory[combatSkillName];
  const skill = characterSheet.skills.combat[combatSkillName];

  const isAttackDistribution = normalizeLabel(typeLabel) === normalizeLabel("AT/FK verteilt");
  const isParadeDistribution = normalizeLabel(typeLabel) === normalizeLabel("PA verteilt");

  if (!isAttackDistribution && !isParadeDistribution) {
    warnings.push(`Unknown combat stats distribution type '${typeLabel}' for '${name}'`);
  }

  const oldAttack = isAttackDistribution ? toInt(oldValueText) : baseStats.skilledAttackValue;
  const newAttack = isAttackDistribution ? toInt(newValueText) : baseStats.skilledAttackValue;
  const oldParade = isParadeDistribution ? toInt(oldValueText) : baseStats.skilledParadeValue;
  const newParade = isParadeDistribution ? toInt(newValueText) : baseStats.skilledParadeValue;

  const oldStats = recalculateCombatStats(
    {
      ...baseStats,
      skilledAttackValue: oldAttack,
      skilledParadeValue: category === "melee" ? oldParade : 0,
    },
    category,
    skill,
    characterSheet.baseValues,
  );

  const newStats = recalculateCombatStats(
    {
      ...baseStats,
      skilledAttackValue: newAttack,
      skilledParadeValue: category === "melee" ? newParade : 0,
    },
    category,
    skill,
    characterSheet.baseValues,
  );

  record.data.old = oldStats;
  record.data.new = newStats;
}

function fillSpecialAbilityRecord(
  record: HistoryRecord,
  typeLabel: string,
  name: string,
  oldValueText: string,
  newValueText: string,
): void {
  const normalizedType = normalizeLabel(typeLabel);
  let value = newValueText || name;
  if (normalizedType === normalizeLabel("Vorteil ge\u00e4ndert")) {
    value = `Advantage: ${value}`;
  } else if (normalizedType === normalizeLabel("Nachteil ge\u00e4ndert")) {
    value = `Disadvantage: ${value}`;
  } else if (normalizedType === normalizeLabel("Beruf ge\u00e4ndert")) {
    value = `Profession: ${name} / ${newValueText}`;
  }

  record.data.new = { values: [value] };
  if (oldValueText) {
    record.data.old = { values: [oldValueText] };
  }
}

function getCombatCategory(skill: CombatSkillName): CombatCategory {
  const meleeSkills = Object.keys(characterSheetSchema.shape.combat.shape.melee.shape);
  return meleeSkills.includes(skill) ? "melee" : "ranged";
}

// The first history entry's date is assumed to be the character creation date.
// Creation entries are identified by type and comment, NOT purely by date,
// because gameplay entries can also occur on the creation date.
//
// Assumptions:
// - "Talent gesteigert" / "Kampftalent gesteigert" on the creation date are
//   normal history records UNLESS the comment indicates otherwise (e.g.
//   "Gewürfelte Begabung" / "Begabung").
// - "Eigenschaft gesteigert" on the creation date is always initial attribute
//   allocation (no gameplay attribute increases on day one).
// - "Talent aktiviert" on the creation date is an initial activation unless the
//   comment starts with "SE:" (Sonderereignis / special event).
// - "AT/FK verteilt" / "PA verteilt" are always normal history records, even
//   on the creation date (combat stat distribution is a post-creation action).
// - "Vorteil geändert" / "Nachteil geändert" are always creation entries; if
//   they appear after the creation date, an error is emitted.
function getCreationDate(entries: HistoryEntry[]): string | null {
  if (entries.length === 0) {
    return null;
  }
  return asText(entries[0].date) || null;
}

function getStartAdventurePoints(entries: HistoryEntry[]): number {
  for (const entry of entries) {
    const typeLabel = normalizeLabel(asText(entry.type));
    const comment = normalizeLabel(asText(entry.comment));
    if (typeLabel === normalizeLabel("Ereignis (Berechnungspunkte)") && comment === normalizeLabel("Erstellung")) {
      return toInt(entry.new_calculation_points_available);
    }
  }
  return 0;
}

function isCreationEntry(entry: HistoryEntry, creationDate: string | null, warnings: string[]): boolean {
  const typeLabel = normalizeLabel(asText(entry.type));
  const comment = normalizeLabel(asText(entry.comment));
  const date = asText(entry.date);
  const isOnCreationDate = creationDate !== null && date === creationDate;

  // Vorteil/Nachteil geändert are always creation; error if post-creation
  if (typeLabel === normalizeLabel("Vorteil geändert") || typeLabel === normalizeLabel("Nachteil geändert")) {
    if (!isOnCreationDate) {
      warnings.push(
        `ERROR: '${asText(entry.type)}' entry found after creation date (${date}): '${asText(entry.new_value)}'. ` +
          `These entries must only appear during character creation.`,
      );
    }
    return true;
  }

  // Beruf/Hobby geändert are always creation
  if (typeLabel === normalizeLabel("Beruf geändert") || typeLabel === normalizeLabel("Hobby geändert")) {
    return true;
  }

  // Everything below requires being on the creation date
  if (!isOnCreationDate) {
    return false;
  }

  // Initial AP grant (comment "Erstellung")
  if (typeLabel === normalizeLabel("Ereignis (Berechnungspunkte)") && comment === normalizeLabel("Erstellung")) {
    return true;
  }

  // Initial attribute allocation
  if (typeLabel === normalizeLabel("Eigenschaft gesteigert")) {
    return true;
  }

  // Talent activations that are NOT special events (SE:)
  if (typeLabel === normalizeLabel("Talent aktiviert")) {
    return !comment.toLowerCase().startsWith("se:");
  }

  // Initial combat skill values: comment contains "Begabung" (matches
  // "Gewürfelte Begabung", "Begabung", and variants)
  if (comment.toLowerCase().includes("begabung")) {
    return true;
  }

  return false;
}

function filterCreationEntries(
  entries: HistoryEntry[],
  creationDate: string | null,
  warnings: string[],
): HistoryEntry[] {
  const filtered: HistoryEntry[] = [];
  let skipped = 0;

  for (const entry of entries) {
    if (isCreationEntry(entry, creationDate, warnings)) {
      skipped += 1;
    } else {
      filtered.push(entry);
    }
  }

  if (skipped > 0) {
    queueInfoBlock("Info", [`${skipped} history entries absorbed into CHARACTER_CREATED record`]);
  }

  return filtered;
}

function toIsoTimestamp(value: string): string {
  const normalized = normalizeLabel(value);
  const match = normalized.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) {
    return new Date().toISOString();
  }
  const [, day, month, year] = match;
  return `${year}-${month}-${day}T00:00:00Z`;
}

function estimateItemSize(item: unknown): number {
  const marshalled = marshall(item as Record<string, unknown>);
  const json = JSON.stringify(marshalled);
  return Buffer.byteLength(json, "utf8");
}

function buildHistoryBlocks(records: HistoryRecord[], characterId: string): HistoryBlock[] {
  const blocks: HistoryBlock[] = [];

  let blockNumber = 1;
  let previousBlockId: string | null = null;
  let currentBlock = createHistoryBlock(characterId, blockNumber, previousBlockId);

  for (const record of records) {
    const testBlock = {
      ...currentBlock,
      changes: [...currentBlock.changes, record],
    };

    if (estimateItemSize(testBlock) > MAX_ITEM_SIZE && currentBlock.changes.length > 0) {
      blocks.push(currentBlock);
      previousBlockId = currentBlock.blockId;
      blockNumber += 1;
      currentBlock = createHistoryBlock(characterId, blockNumber, previousBlockId);
    }

    currentBlock.changes.push(record);

    if (estimateItemSize(currentBlock) > MAX_ITEM_SIZE) {
      console.warn(`History record ${record.number} exceeds MAX_ITEM_SIZE (${MAX_ITEM_SIZE} bytes) when stored alone.`);
    }
  }

  if (currentBlock.changes.length > 0) {
    blocks.push(currentBlock);
  }

  return blocks;
}

function createHistoryBlock(characterId: string, blockNumber: number, previousBlockId: string | null) {
  return {
    characterId,
    blockNumber,
    blockId: crypto.randomUUID(),
    previousBlockId,
    changes: [] as HistoryRecord[],
  };
}

async function uploadToDynamoDB(
  character: Character,
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

  await docClient.send(
    new PutCommand({
      TableName: charactersTable,
      Item: character,
    }),
  );
  console.log(`  Character uploaded to ${charactersTable}`);

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

main().catch((error) => {
  console.error("Conversion failed:");
  console.error(error);
  process.exit(1);
});
