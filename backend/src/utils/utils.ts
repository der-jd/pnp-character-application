import { HttpError } from "./errors.js";

export function validateUUID(id: string): void {
  if (!id) {
    throw new HttpError(400, "Given id is missing!");
  }

  const uuidRegex = new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$");
  if (!uuidRegex.test(id)) {
    throw new HttpError(400, "Given id is not a valid UUID format!", { id: id });
  }
}
