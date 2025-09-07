import { z } from "zod";

export const headersSchema = z
  .record(z.string(), z.unknown())
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
