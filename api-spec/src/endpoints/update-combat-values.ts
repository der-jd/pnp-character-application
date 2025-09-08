import { z } from "zod";
import { initialIncreasedSchema, MAX_STRING_LENGTH_DEFAULT, userIdSchema } from "../general-schemas.js";
import { combatValuesSchema } from "../character-schemas.js";

export const updateCombatValuesPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
    "combat-category": z.string().max(MAX_STRING_LENGTH_DEFAULT),
    "combat-skill-name": z.string().max(MAX_STRING_LENGTH_DEFAULT),
  })
  .strict();

export type UpdateCombatValuesPathParams = z.infer<typeof updateCombatValuesPathParamsSchema>;

export const updateCombatValuesRequestSchema = z
  .object({
    attackValue: initialIncreasedSchema,
    paradeValue: initialIncreasedSchema,
  })
  .strict();

export type UpdateCombatValuesRequest = z.infer<typeof updateCombatValuesRequestSchema>;

export const updateCombatValuesResponseSchema = z
  .object({
    characterId: z.uuid(),
    userId: userIdSchema,
    combatCategory: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    combatSkillName: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    combatValues: z
      .object({
        old: combatValuesSchema,
        new: combatValuesSchema,
      })
      .strict(),
  })
  .strict();

export type UpdateCombatValuesResponse = z.infer<typeof updateCombatValuesResponseSchema>;
