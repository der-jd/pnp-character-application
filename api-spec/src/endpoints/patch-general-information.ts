import { z } from "zod";
import {
  MAX_STRING_LENGTH_DEFAULT,
  MAX_STRING_LENGTH_SHORT,
  MAX_STRING_LENGTH_LONG,
  MAX_STRING_LENGTH_VERY_LONG,
  userIdSchema,
} from "../general-schemas.js";
import { generalInformationSchema, characterNameSchema } from "../character-schemas.js";
import { historyRecordSchema, rulesetVersionHistoryRecordSchema, versionUpdateSchema } from "../history-schemas.js";

export const patchGeneralInformationPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
  })
  .strict();

export type PatchGeneralInformationPathParams = z.infer<typeof patchGeneralInformationPathParamsSchema>;

export const patchGeneralInformationRequestSchema = z
  .object({
    name: characterNameSchema.optional(),
    sex: z.string().max(MAX_STRING_LENGTH_SHORT).optional(),
    birthday: z.string().max(MAX_STRING_LENGTH_DEFAULT).optional(),
    birthplace: z.string().max(MAX_STRING_LENGTH_DEFAULT).optional(),
    size: z.string().max(MAX_STRING_LENGTH_DEFAULT).optional(),
    weight: z.string().max(MAX_STRING_LENGTH_DEFAULT).optional(),
    hairColor: z.string().max(MAX_STRING_LENGTH_DEFAULT).optional(),
    eyeColor: z.string().max(MAX_STRING_LENGTH_DEFAULT).optional(),
    residence: z.string().max(MAX_STRING_LENGTH_LONG).optional(),
    appearance: z.string().max(MAX_STRING_LENGTH_VERY_LONG).optional(),
    specialCharacteristics: z.string().max(MAX_STRING_LENGTH_VERY_LONG).optional(),
  })
  .strict();

export type PatchGeneralInformationRequest = z.infer<typeof patchGeneralInformationRequestSchema>;

export const generalInformationChangeSchema = z
  .object({
    generalInformation: generalInformationSchema,
  })
  .strict();

export const updateGeneralInformationResponseSchema = z
  .object({
    characterId: z.uuid(),
    userId: userIdSchema,
    changes: z
      .object({
        old: generalInformationChangeSchema,
        new: generalInformationChangeSchema,
      })
      .strict(),
    versionUpdate: versionUpdateSchema.optional(),
  })
  .strict();

export type UpdateGeneralInformationResponse = z.infer<typeof updateGeneralInformationResponseSchema>;

export const patchGeneralInformationHistoryRecordSchema = historyRecordSchema.extend({
  data: z
    .object({
      old: generalInformationChangeSchema,
      new: generalInformationChangeSchema,
    })
    .strict(),
});

export type PatchGeneralInformationHistoryRecord = z.infer<typeof patchGeneralInformationHistoryRecordSchema>;

export const patchGeneralInformationResponseSchema = z
  .object({
    data: updateGeneralInformationResponseSchema,
    historyRecord: patchGeneralInformationHistoryRecordSchema.nullable(),
    versionUpdateHistoryRecord: rulesetVersionHistoryRecordSchema.nullable(),
  })
  .strict();

export type PatchGeneralInformationResponse = z.infer<typeof patchGeneralInformationResponseSchema>;
