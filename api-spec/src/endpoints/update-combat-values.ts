import { z } from "zod";
import { initialIncreasedSchema, userIdSchema } from "../general-schemas.js";
import { combatValuesSchema } from "../character-schemas.js";

export const updateCombatValuesPathParamsSchema = z
  .object({
    "character-id": z.string().uuid(),
    "combat-category": z.string(),
    "combat-skill-name": z.string(),
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
    characterId: z.string().uuid(),
    userId: userIdSchema,
    combatCategory: z.string(),
    combatSkillName: z.string(),
    combatValues: z
      .object({
        old: combatValuesSchema,
        new: combatValuesSchema,
      })
      .strict(),
  })
  .strict();

export type UpdateCombatValuesResponse = z.infer<typeof updateCombatValuesResponseSchema>;
