import type {Profile} from "../domain/types.js";
import type {CharacterMode} from "./types.js";

export const CHARACTER_PROMPT_VERSION = "turnaround-v2";

export function characterPrompt(profile: Profile, mode: CharacterMode): string {
  if (mode === "generic") {
    return `Image 1 is a social profile screenshot. Do not copy or recreate the identity, face, logo, text, animal, object, or artwork inside the circular profile avatar. Create one original, neutral full-body 2D celebration mascot using only the screenshot's broad color palette. Show front view, side view, and back view standing side by side on a plain light gray background. Friendly editorial animation style, clean outlines, consistent proportions and outfit. Do not include the social interface, banner, other people, text, labels, logos, or photorealistic rendering.`;
  }
  const subject = profile.avatarKind === "person" ? "the adult person" : "the subject or mascot";
  return `Image 1 is a social profile screenshot. Use only ${subject} in the main circular profile avatar as the identity, colors, clothing, and style reference. Create one full-body 2D illustrated cartoon turnaround sheet on a plain light gray background: front view, side view, and back view standing side by side. Keep the same recognizable identity, proportions, colors, and outfit across all three views. Friendly editorial animation style, clean outlines, consistent proportions. Do not include the social interface, banner, other people, text, labels, logos, or photorealistic rendering.`;
}
