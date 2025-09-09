import { z } from "zod";
import { MAX_STRING_LENGTH_DEFAULT, MAX_COST } from "../general-schemas.js";
import { learningMethodSchema } from "../character-schemas.js";

export const getSkillIncreaseCostPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
    "skill-category": z.string().max(MAX_STRING_LENGTH_DEFAULT),
    "skill-name": z.string().max(MAX_STRING_LENGTH_DEFAULT),
  })
  .strict();

export type GetSkillIncreaseCostPathParams = z.infer<typeof getSkillIncreaseCostPathParamsSchema>;

export const getSkillIncreaseCostQueryParamsSchema = z
  .object({
    "learning-method": learningMethodSchema,
  })
  .strict();

export type GetSkillIncreaseCostQueryParams = z.infer<typeof getSkillIncreaseCostQueryParamsSchema>;

export const getSkillIncreaseCostResponseSchema = z
  .object({
    characterId: z.uuid(),
    skillName: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    increaseCost: z.number().min(0).max(MAX_COST),
  })
  .strict();

export type GetSkillIncreaseCostResponse = z.infer<typeof getSkillIncreaseCostResponseSchema>;
