import { z } from "zod";
import { MAX_HEADER_LENGTH, MAX_STRING_LENGTH_LONG } from "./general-schemas.js";

export const headersSchema = z
  .record(z.string().max(MAX_STRING_LENGTH_LONG), z.string().max(MAX_HEADER_LENGTH))
  .refine(
    (headers: Record<string, unknown>) => Object.keys(headers).some((key) => key.toLowerCase() === "authorization"),
    { message: "Authorization header is required (case-insensitive)", path: ["authorization"] },
  )
  .transform((headers: Record<string, unknown>) => {
    const normalized: Record<string, unknown> = {};
    for (const key in headers) {
      if (Object.prototype.hasOwnProperty.call(headers, key)) {
        normalized[key.toLowerCase()] = headers[key];
      }
    }
    if (!("authorization" in normalized)) {
      normalized["authorization"] = undefined;
    }
    return normalized;
  });

export type Headers = z.infer<typeof headersSchema>;
