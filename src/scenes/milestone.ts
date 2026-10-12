import type {Profile} from "../domain/types.js";
import type {PlatformDefinition} from "../platforms/types.js";

export interface MilestoneScene {
  durationSeconds: 15;
  aspectRatio: "9:16";
  followerCount: string;
  displayName: string;
  handle: string;
  platformName: string;
  followersLabel: string;
  followingLabel: string;
  followersLocation: string;
  followingLocation: string;
  beats: {
    avatarExit: true;
    pointToFollowers: true;
    candleCelebration: true;
    finalHoldSeconds: 2;
  };
}

export function buildMilestoneScene(profile: Profile, platform: PlatformDefinition): MilestoneScene {
  return {
    durationSeconds: 15,
    aspectRatio: "9:16",
    followerCount: profile.followers,
    displayName: profile.displayName,
    handle: profile.handle,
    platformName: platform.displayName,
    followersLabel: platform.followersLabel,
    followingLabel: platform.followingLabel,
    followersLocation: platform.followersLocation,
    followingLocation: platform.followingLocation,
    beats: {avatarExit: true, pointToFollowers: true, candleCelebration: true, finalHoldSeconds: 2},
  };
}
