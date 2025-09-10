import { z } from "zod";
import {
  attributeSchema,
  attributesSchema,
  characterNameSchema,
  characterSchema,
  combinedSkillCategoryAndNameSchema,
  dis_advantagesSchema,
  generalInformationSchema,
} from "../character-schemas.js";
import {
  NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION,
  userIdSchema,
  MIN_ATTRIBUTE_VALUE_FOR_CREATION,
  MAX_ATTRIBUTE_VALUE_FOR_CREATION,
  MIN_LEVEL,
} from "../general-schemas.js";

export const attributeForCreationSchema = attributeSchema.omit({ totalCost: true }).extend({
  current: z.number().int().min(MIN_ATTRIBUTE_VALUE_FOR_CREATION).max(MAX_ATTRIBUTE_VALUE_FOR_CREATION),
});

export type AttributeForCreation = z.infer<typeof attributeForCreationSchema>;

export const attributesForCreationSchema = z.object(
  Object.fromEntries(Object.keys(attributesSchema.shape).map((attr) => [attr, attributeForCreationSchema])),
);

export type AttributesForCreation = z.infer<typeof attributesForCreationSchema>;

export const generalInformationForCreationSchema = generalInformationSchema.extend({
  level: z.literal(MIN_LEVEL),
});

export type GeneralInformationForCreation = z.infer<typeof generalInformationForCreationSchema>;

export const postCharactersRequestSchema = z
  .object({
    generalInformation: generalInformationForCreationSchema,
    attributes: attributesForCreationSchema,
    advantages: dis_advantagesSchema,
    disadvantages: dis_advantagesSchema,
    activatableSkillsForFree: z
      .array(combinedSkillCategoryAndNameSchema)
      .length(NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION),
  })
  .strict();

export type PostCharactersRequest = z.infer<typeof postCharactersRequestSchema>;

export const postCharactersResponseSchema = z
  .object({
    characterId: z.uuid(),
    userId: userIdSchema,
    characterName: characterNameSchema,
    character: {
      old: {},
      new: characterSchema,
    },
  })
  .strict();

export type PostCharactersResponse = z.infer<typeof postCharactersResponseSchema>;
