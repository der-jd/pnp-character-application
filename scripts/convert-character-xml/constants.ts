import {
  AdvantagesNames,
  type CombatSkillName,
  DisadvantagesNames,
  type LevelUpEffectKind,
  type SkillNameWithCategory,
} from "api-spec";
import { normalizeLabel } from "./xml-utils.js";

export const CHARACTERS_TABLE_PREFIX = "pnp-app-characters";
export const HISTORY_TABLE_PREFIX = "pnp-app-characters-history";
export const REGION = "eu-central-1";

export const MAX_ITEM_SIZE = 200 * 1024; // 200 KB, matches backend/src/lambdas/add-history-record/index.ts

export const COMBAT_SKILL_HANDLING: Record<CombatSkillName, number> = {
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

export const ATTRIBUTE_MAP: Record<string, string> = {
  [normalizeLabel("Mut (MU)")]: "courage",
  [normalizeLabel("Klugheit (KL)")]: "intelligence",
  [normalizeLabel("Konzentration (KO)")]: "concentration",
  [normalizeLabel("Charisma (CH)")]: "charisma",
  [normalizeLabel("Mentale Belastbarkeit (MB)")]: "mentalResilience",
  [normalizeLabel("Geschicklichkeit (GE)")]: "dexterity",
  [normalizeLabel("Ausdauer (AU)")]: "endurance",
  [normalizeLabel("Kraft (KR)")]: "strength",
};

export const BASE_VALUE_MAP: Record<string, string> = {
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

export const NON_COMBAT_SKILL_MAP = new Map<string, SkillNameWithCategory>([
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

export const COMBAT_SKILL_MAP: Record<string, CombatSkillName> = {
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

export const GEWUERFELTE_BEGABUNG_COMMENT = normalizeLabel("Gewürfelte Begabung");
export const COMBAT_SKILL_HISTORY_TYPE_LABELS = new Set([normalizeLabel("Kampftalent gesteigert")]);
export const IGNORED_HISTORY_TYPES = new Set([normalizeLabel("Sprache/Schrift geändert")]);
export const IGNORED_HISTORY_TYPES_WITH_WARNING = new Set([normalizeLabel("Sprache/Schrift geändert")]);
export const ADVANTAGE_CHANGED_TYPE = normalizeLabel("Vorteil geändert");
export const STUDIUM_NAME = normalizeLabel("Studium");
export const DEFAULT_GENERAL_INFORMATION_SKILL = "body/athletics" as SkillNameWithCategory;
export const LEVEL_UP_COMMENT_PATTERN = /level\s*(\d+)/i;
export const BASE_VALUE_TO_LEVEL_UP_EFFECT: Record<string, LevelUpEffectKind> = {
  [normalizeLabel("Lebenspunkte (LeP)")]: "hpRoll",
  [normalizeLabel("Rüstungslevel")]: "armorLevelRoll",
  [normalizeLabel("INI-Basiswert")]: "initiativePlusOne",
  [normalizeLabel("Glückspunkte")]: "luckPlusOne",
  [normalizeLabel("Bonusaktionen pro KR")]: "bonusActionPlusOne",
  [normalizeLabel("Legendäre Aktionen")]: "legendaryActionPlusOne",
};

export const ADVANTAGE_MAP: Record<string, AdvantagesNames> = {
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

export const DISADVANTAGE_MAP: Record<string, DisadvantagesNames> = {
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

export const FEAR_OF_COST_BY_LABEL: Record<string, number> = {
  [normalizeLabel("Angst vor \u2026 (h\u00e4ufig)")]: 5,
  [normalizeLabel("Angst vor \u2026 (selten)")]: 2,
};

// Keys are SHA-256 hashes of normalized character names to avoid exposing
// character details in this repository.
export const FEAR_OF_DETAIL_BY_CHARACTER_HASH: Record<string, Record<string, string>> = {
  d802629f373db91d25031dd5c7e5712ff85fc036009d0bb017540ca685951f42: {
    [normalizeLabel("Angst vor \u2026 (h\u00e4ufig)")]: "Insekten",
  },
};
