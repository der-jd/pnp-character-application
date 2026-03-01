import { VersionUpdate, RulesetVersion, rulesetVersionSchema } from "api-spec";
import { HttpError } from "./errors.js";
import backendPackage from "../../package.json" with { type: "json" };

export const RULESET_VERSION = backendPackage.version;

export function getVersionUpdate(characterVersion: RulesetVersion): VersionUpdate | undefined {
  // Explicitly validate the character version format as the zod type is just a string
  rulesetVersionSchema.parse(characterVersion);

  const [charMajor, charMinor, charPatch] = characterVersion.split(".").map(Number);
  const [currentMajor, currentMinor, currentPatch] = RULESET_VERSION.split(".").map(Number);

  if (charMajor !== currentMajor) {
    throw new HttpError(409, `Character must be based on major version ${currentMajor}.x`, {
      characterVersion,
      currentVersion: RULESET_VERSION,
    });
  }

  if (charMinor > currentMinor || (charMinor === currentMinor && charPatch > currentPatch)) {
    throw new HttpError(
      409,
      `Character version is too new: ${characterVersion}, current ruleset is ${RULESET_VERSION}. Please update your character.`,
      {
        characterVersion,
        currentVersion: RULESET_VERSION,
      },
    );
  }

  if (charMinor < currentMinor || (charMinor === currentMinor && charPatch < currentPatch)) {
    console.log(
      `Character is based on version ${characterVersion}, current ruleset is ${RULESET_VERSION}. Version update available.`,
    );

    return {
      old: { value: characterVersion },
      new: { value: RULESET_VERSION },
    };
  }

  return undefined;
}
