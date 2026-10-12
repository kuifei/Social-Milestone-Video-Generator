import type {Profile} from "../domain/types.js";
import type {CharacterMode} from "./types.js";

export function parseCharacterMode(value: string): CharacterMode {
  if (value !== "avatar" && value !== "generic") throw new Error(`Unsupported --character-mode "${value}". Supported: avatar, generic.`);
  return value;
}

export function validateCharacterPolicy(profile: Profile): string | null {
  if (profile.avatarKind === "unknown") {
    throw new Error('Profile avatarKind is "unknown". Review the screenshot and set it to "person" or "non-person" before any paid generation.');
  }
  if (profile.avatarKind === "person" && !profile.rightsConfirmed) {
    return "Warning: Image usage authorization has not been confirmed (rightsConfirmed: false). Generation will continue; check permissions before publishing or commercial use.";
  }
  return null;
}
