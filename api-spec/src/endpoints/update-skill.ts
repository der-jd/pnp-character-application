import { z } from "zod";
import { initialNewSchema, initialIncreasedSchema, userIdSchema } from "../general-schemas.js";
import {
  skillSchema,
  combatValuesSchema,
  calculationPointsSchema,
  learningMethodSchema,
} from "../character-schemas.js";

export const updateSkillPathParamsSchema = z
  .object({
    "character-id": z.string().uuid(),
    "skill-category": z.string(),
    "skill-name": z.string(),
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
    characterId: z.string().uuid(),
    userId: userIdSchema,
    skillCategory: z.string(),
    skillName: z.string(),
    combatCategory: z.string().optional(),
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
    increaseCost: z.number().optional(),
    adventurePoints: z
      .object({
        old: calculationPointsSchema,
        new: calculationPointsSchema,
      })
      .strict(),
  })
  .strict();

export type UpdateSkillResponse = z.infer<typeof updateSkillResponseSchema>;
