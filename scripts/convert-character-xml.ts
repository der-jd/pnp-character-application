#!/usr/bin/env node

// =============================================================================
// CONVERSION OVERVIEW
//
// This script converts a character from the legacy XML format into the new
// JSON schema (Character + HistoryBlocks) for DynamoDB storage.
//
// The character sheet is fully aligned with the new ruleset and schema.
// The history records use minimal changes — they pass schema validation but
// may reference old skill names or rules. A RULESET_VERSION_UPDATED record
// at the end of the history marks the migration boundary.
//
// -----------------------------------------------------------------------------
// SKILL MERGES (multiple old skills → one new skill)
// -----------------------------------------------------------------------------
//
//   handcraft/foodProcessing     ← Fleischer, Kochen, Ackerbau
//   handcraft/leatherProcessing  ← Gerber/Kürschner, Lederarbeit/Nähen
//   handcraft/woodwork           ← Bogenbau, Holzbearbeitung
//   social/acting                ← Sich verkleiden, Stimmen Imitieren, Schauspielerei
//
//   For merged skills, values are summed: current, start, mod, and totalCost
//   accumulate across all old skills that map to the same new skill.
//
// -----------------------------------------------------------------------------
// COMBAT SKILL MERGES
// -----------------------------------------------------------------------------
//
//   daggers                  ← Stichwaffe kurz, Messer
//   slashingWeaponsSharp2h   ← Großschwert, Katana
//   missile                  ← Werfen, Wurfgeschoss Faust, Ringe
//   firearmMedium            ← Armbrust, Schusswaffe Mittel
//   firearmComplex           ← Bogen, Schusswaffe schwierig
//
// -----------------------------------------------------------------------------
// VALUE RECALCULATIONS
// -----------------------------------------------------------------------------
//
//   1. Base value formulas — healthPoints, mentalHealth, initiative,
//      attack/parade/ranged base values are recalculated from attribute values
//      using fixed formulas (not copied from XML).
//
//   2. Combat stats — attackValue, paradeValue, availablePoints are
//      recalculated from skill values + base values + distributed points.
//
//   3. Profession/hobby bonus shift — for non-combat skills, the bonus is
//      moved from current to mod (old system baked it into current, new system
//      stores it as mod).
//
//   4. College education (Studium) — 20-point bonus shifted from current to
//      mod on the chosen knowledge skill.
//
// -----------------------------------------------------------------------------
// HISTORY TRANSFORMATIONS
// -----------------------------------------------------------------------------
//
//   1. Creation entry absorption — all creation-day entries (attribute
//      allocation, skill activations, initial AP grant, advantage/disadvantage/
//      profession/hobby changes, "Begabung" entries) are filtered out and
//      replaced by a single CHARACTER_CREATED record with a full character
//      snapshot.
//
//   2. Level-up combining — "Ereignis (Level Up)" + following
//      "Ereignis (Basiswerte) / Level X" entries are combined into single
//      LEVEL_UP_APPLIED records with cumulative levelUpProgress.
//
//   3. Gewürfelte Begabung aggregation — multiple combat skill mod entries
//      with "Gewürfelte Begabung" comment for the same skill are merged into
//      one entry (earliest old value → latest new value).
//
//   4. Migration boundary — a RULESET_VERSION_UPDATED record is appended at
//      the end with a full character snapshot.
//
//   5. Ignored types — "Sprache/Schrift geändert" entries are dropped
//      (not in new schema).
//
// -----------------------------------------------------------------------------
// STRUCTURAL CHANGES
// -----------------------------------------------------------------------------
//
//   1. Calculation points — restructured into { start, available, total } with
//      running total tracking across history.
//
//   2. Level-up progress — new effectsByLevel map + effects summary, built
//      from old base value history entries.
//
//   3. History blocks — records are chunked into 200 KB DynamoDB items with
//      block chaining.
//
//   4. Skill totalCost — new per-skill field tracking cumulative AP spent
//      (known to be approximate due to old/new cost rule differences).
//
// =============================================================================

import { main } from "./convert-character-xml/main.js";

main().catch((error) => {
  console.error("Conversion failed:");
  console.error(error);
  process.exit(1);
});
