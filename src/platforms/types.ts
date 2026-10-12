import type {PlatformId} from "../domain/types.js";

export interface PlatformDefinition {
  id: PlatformId;
  displayName: string;
  outputWidth: number;
  outputHeight: number;
  followersLabel: string;
  followingLabel: string;
  followersLocation: string;
  followingLocation: string;
}
