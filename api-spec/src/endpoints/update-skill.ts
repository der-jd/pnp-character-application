import { z } from "zod";
import {
  initialNewSchema,
  initialIncreasedSchema,
  userIdSchema,
  MAX_STRING_LENGTH_DEFAULT,
  MAX_COST,
} from "../general-schemas.js";
import {
  skillSchema,
  combatValuesSchema,
  calculationPointsSchema,
  learningMethodSchema,
} from "../character-schemas.js";

export const updateSkillPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
    "skill-category": z.string().max(MAX_STRING_LENGTH_DEFAULT),
    "skill-name": z.string().max(MAX_STRING_LENGTH_DEFAULT),
  })
  .strict();

export type UpdateSkillPathParams = z.infer<typeof updateSkillPathParamsSchema>;

export const updateSkillRequestSchema = z
  .object({
    activated: z.boolean().optional(),
    start: initialNewSchema.optional(),
    current: initialIncreasedSchema.optional(),
    mod: initialNewSchema.optional(),
    learningMethod: learningMethodSchema.optional(),
  })
  .strict();

export type UpdateSkillRequest = z.infer<typeof updateSkillRequestSchema>;

export const updateSkillResponseSchema = z
  .object({
    characterId: z.uuid(),
    userId: userIdSchema,
    skillCategory: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    skillName: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    combatCategory: z.string().max(MAX_STRING_LENGTH_DEFAULT).optional(),
    changes: z
      .object({
        old: z
          .object({
            skill: skillSchema,
            combatValues: combatValuesSchema.optional(),
          })
          .strict(),
        new: z
          .object({
            skill: skillSchema,
            combatValues: combatValuesSchema.optional(),
          })
          .strict(),
      })
      .strict(),
    learningMethod: learningMethodSchema.optional(),
    increaseCost: z.number().min(0).max(MAX_COST).optional(),
    adventurePoints: z
      .object({
        old: calculationPointsSchema,
        new: calculationPointsSchema,
      })
      .strict(),
  })
  .strict();

export type UpdateSkillResponse = z.infer<typeof updateSkillResponseSchema>;
