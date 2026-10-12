import {readFile} from "node:fs/promises";
import type {Profile} from "./types.js";

export function parseProfile(value: unknown): Profile {
  if (typeof value !== "object" || value === null) {
    throw new Error("Profile must be a JSON object.");
  }
  const input = value as Record<string, unknown>;
  for (const field of ["displayName", "handle", "followers"] as const) {
    if (typeof input[field] !== "string" || !input[field].trim()) {
      throw new Error(`Profile field "${field}" must be a non-empty string.`);
    }
  }
  const avatarKind = input.avatarKind ?? "unknown";
  if (!['person', 'non-person', 'unknown'].includes(String(avatarKind))) {
    throw new Error('Profile field "avatarKind" must be person, non-person, or unknown.');
  }
  const followers = String(input.followers).trim();
  if (!/^\d+(?:,\d{3})*(?:\.\d+)?\s*[KMB]?$/.test(followers)) {
    throw new Error('Profile field "followers" must be a count such as "47.8K".');
  }
  return {
    displayName: String(input.displayName).trim(),
    handle: String(input.handle).trim(),
    followers,
    avatarKind: avatarKind as Profile["avatarKind"],
    rightsConfirmed: input.rightsConfirmed === true,
  };
}

export async function loadProfile(path: string): Promise<Profile> {
  return parseProfile(JSON.parse(await readFile(path, "utf8")));
}
