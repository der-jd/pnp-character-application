import { validate } from "uuid";
import { HttpError } from "./errors.js";

export function validateUUID(id: string): void {
  if (!id) {
    throw new HttpError(400, "Id is missing!");
  }

  if (!validate(id)) {
    throw new HttpError(400, "Given id is not a valid UUID!", { id: id });
  }
}
