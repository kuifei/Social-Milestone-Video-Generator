import type {PlatformId} from "../domain/types.js";
import type {PlatformDefinition} from "./types.js";
import {twitter} from "./twitter.js";

const platforms: Record<PlatformId, PlatformDefinition> = {twitter};

export function getPlatform(id: PlatformId): PlatformDefinition {
  return platforms[id];
}

export function parsePlatform(value: string): PlatformId {
  if (value !== "twitter") throw new Error(`Unsupported platform "${value}". Supported: twitter.`);
  return value;
}
