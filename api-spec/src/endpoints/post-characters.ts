import { z } from "zod";
import {
  attributeSchema,
  attributesSchema,
  characterNameSchema,
  advantagesSchema,
  disadvantagesSchema,
  generalInformationSchema,
} from "../character-schemas.js";
import { userIdSchema, MIN_LEVEL } from "../general-schemas.js";
import { activatedSkillsSchema, characterCreationSchema, recordSchema } from "../history-schemas.js";

export const GENERATION_POINTS = 5;
export const MAX_GENERATION_POINTS_THROUGH_DISADVANTAGES = 15;

export const MIN_ATTRIBUTE_VALUE_FOR_CREATION = 4;
export const MAX_ATTRIBUTE_VALUE_FOR_CREATION = 7;
export const ATTRIBUTE_POINTS_FOR_CREATION = 40;

export const PROFESSION_SKILL_BONUS = 50;
export const HOBBY_SKILL_BONUS = 25;

export const attributeForCreationSchema = attributeSchema.omit({ start: true, mod: true, totalCost: true }).extend({
  current: z.number().int().min(MIN_ATTRIBUTE_VALUE_FOR_CREATION).max(MAX_ATTRIBUTE_VALUE_FOR_CREATION),
});

export type AttributeForCreation = z.infer<typeof attributeForCreationSchema>;

export const attributesForCreationSchema = z
  .object(Object.fromEntries(Object.keys(attributesSchema.shape).map((attr) => [attr, attributeForCreationSchema])))
  .strict();

export type AttributesForCreation = z.infer<typeof attributesForCreationSchema>;

export const generalInformationForCreationSchema = generalInformationSchema.extend({
  level: z.literal(MIN_LEVEL),
});

export type GeneralInformationForCreation = z.infer<typeof generalInformationForCreationSchema>;

export const postCharactersRequestSchema = z
  .object({
    generalInformation: generalInformationForCreationSchema,
    attributes: attributesForCreationSchema,
    advantages: advantagesSchema,
    disadvantages: disadvantagesSchema,
    activatedSkills: activatedSkillsSchema,
  })
  .strict();

export type PostCharactersRequest = z.infer<typeof postCharactersRequestSchema>;

export const createCharacterResponseSchema = z
  .object({
    characterId: z.uuid(),
    userId: userIdSchema,
    characterName: characterNameSchema,
    changes: z
      .object({
        new: characterCreationSchema,
      })
      .strict(),
  })
  .strict();

export type CreateCharacterResponse = z.infer<typeof createCharacterResponseSchema>;

export const postCharactersHistoryRecordSchema = recordSchema.extend({
  data: z
    .object({
      new: characterCreationSchema,
    })
    .strict(),
});

export type PostCharactersHistoryRecord = z.infer<typeof postCharactersHistoryRecordSchema>;

export const postCharactersResponseSchema = z
  .object({
    data: createCharacterResponseSchema,
    historyRecord: postCharactersHistoryRecordSchema,
  })
  .strict();

export type PostCharactersResponse = z.infer<typeof postCharactersResponseSchema>;
