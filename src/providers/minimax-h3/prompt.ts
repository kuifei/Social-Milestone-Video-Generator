import type {MilestoneScene} from "../../scenes/milestone.js";

export const H3_PROMPT_VERSION = "h3-milestone-candles-v5";

export function renderH3Prompt(scene: MilestoneScene): string {
  return `Make a ${scene.durationSeconds}-second vertical ${scene.aspectRatio}, fixed-camera cartoon celebration video with audible native music and sound effects.
Image 1 is the ${scene.platformName} profile screenshot: keep it as the recognizable, fixed background. Image 2 is the cartoon character turnaround sheet: use it as the only reference for the animated character who climbs out of the existing main circular avatar.
Preserve the screenshot's original background color and brightness throughout. A white profile page must stay white and evenly lit for the entire video. Never darken the page or add a dark stage, spotlight lighting, vignette, global shadow, or exposure fade. Candle flames must not change the page lighting.
The milestone is the ${scene.followersLocation} "${scene.followerCount} ${scene.followersLabel}" statistic, never the ${scene.followingLocation} ${scene.followingLabel} statistic. The original follower number must remain visible and unchanged.
0-3 seconds: The illustrated character grips the avatar rim and visibly climbs out of that exact circle. The avatar itself stays in place.
3-7 seconds: The character steps onto the page and points clearly at "${scene.followerCount} ${scene.followersLabel}". A thin gold outline briefly surrounds that statistic only, leaving the text and all background pixels unobscured and at their original brightness.
7-11 seconds: A plain white celebration cake appears. On the cake, upright wax candles are shaped as the exact visible milestone string "${scene.followerCount}". Preserve every digit, comma, decimal point, and K or M suffix exactly; together the candle shapes must read "${scene.followerCount}" and no other number. Light the wicks with small golden flames.
11-15 seconds: The same character blows out all candle flames, confetti falls, and the character waves. The "${scene.followerCount}" candle shapes remain intact and readable. Hold a stable final shot for ${scene.beats.finalHoldSeconds} seconds for an exact caption added in postproduction.
Preserve the banner, name, handle, buttons, post layout, page text, avatar, and other statistics as closely as possible. Keep exactly one illustrated character outside the avatar throughout. Do not make the character photorealistic. The cake must contain only the exact "${scene.followerCount}" milestone candle shapes, with no extra letters or numbers.
Do not generate captions, slogans, dialogue, singing, voice imitation, or lip-synced speech. Audio: upbeat instrumental music, a soft avatar-rim pop, light footsteps, a chime at the Followers statistic, candle ignition, a breath, and confetti sounds.`;
}
