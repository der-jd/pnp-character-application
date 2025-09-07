import { z } from "zod";

export const getSkillIncreaseCostPathParamsSchema = z
  .object({
    "character-id": z.string().uuid(),
    "skill-category": z.string(),
    "skill-name": z.string(),
  })
  .strict();

export type GetSkillIncreaseCostPathParams = z.infer<typeof getSkillIncreaseCostPathParamsSchema>;

export const getSkillIncreaseCostQueryParamsSchema = z
  .object({
    "learning-method": z.string(),
  })
  .strict();

export type GetSkillIncreaseCostQueryParams = z.infer<typeof getSkillIncreaseCostQueryParamsSchema>;

export const getSkillIncreaseCostResponseSchema = z
  .object({
    characterId: z.string().uuid(),
    skillName: z.string(),
    increaseCost: z.number(),
  })
  .strict();

export type GetSkillIncreaseCostResponse = z.infer<typeof getSkillIncreaseCostResponseSchema>;
