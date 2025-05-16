import { HttpError } from "./errors.js";

export function validateCharacterId(characterId: string): void {
  if (!characterId) {
    throw new HttpError(400, "Character id is missing!");
  }

  const uuidRegex = new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$");
  if (!uuidRegex.test(characterId)) {
    throw new HttpError(400, "Character id is not a valid UUID format!");
  }
}
