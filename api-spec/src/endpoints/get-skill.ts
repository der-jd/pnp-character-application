import { z } from "zod";
import { MAX_STRING_LENGTH_DEFAULT, MAX_COST } from "../general-schemas.js";
import { learningMethodSchema } from "../character-schemas.js";

export const getSkillPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
    "skill-category": z.string().max(MAX_STRING_LENGTH_DEFAULT),
    "skill-name": z.string().max(MAX_STRING_LENGTH_DEFAULT),
  })
  .strict();

export type GetSkillPathParams = z.infer<typeof getSkillPathParamsSchema>;

export const getSkillQueryParamsSchema = z
  .object({
    "learning-method": learningMethodSchema,
  })
  .strict();

export type GetSkillQueryParams = z.infer<typeof getSkillQueryParamsSchema>;

export const getSkillResponseSchema = z
  .object({
    characterId: z.uuid(),
    skillName: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    increaseCost: z.number().min(0).max(MAX_COST),
  })
  .strict();

export type GetSkillResponse = z.infer<typeof getSkillResponseSchema>;
