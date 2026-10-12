import {createHash} from "node:crypto";
import type {EffectSelection} from "../domain/types.js";
import type {MilestoneScene} from "../scenes/milestone.js";

export function resolveEffect(value?: string, template?: string): EffectSelection {
  const id = value ?? (template === undefined ? "peace-sign" : "custom");
  if (id !== "peace-sign" && id !== "blow-out" && id !== "custom") throw new Error(`Unsupported --effect "${id}". Supported: peace-sign, blow-out, custom.`);
  if (id !== "custom") {
    if (template !== undefined) throw new Error("--prompt-file requires --effect custom (or omit --effect).");
    return {id};
  }
  if (!template?.trim()) throw new Error("Custom effects require a non-empty --prompt-file.");
  return {id, template, templateHash: createHash("sha256").update(template).digest("hex")};
}

export function renderCustomEffect(effect: EffectSelection, scene: MilestoneScene): string {
  if (effect.id !== "custom" || !effect.template?.trim()) throw new Error("Custom effect template is missing.");
  const values: Record<string, string> = {followers: scene.followerCount, displayName: scene.displayName, handle: scene.handle, platform: scene.platformName};
  const body = effect.template.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_match, key: string) => {
    if (!Object.hasOwn(values, key)) throw new Error(`Unknown custom prompt placeholder "${key}".`);
    return values[key];
  });
  return `Create a ${scene.durationSeconds}-second vertical ${scene.aspectRatio} video using the supplied screenshot and single character reference.\n${body}\nKeep the original profile number "${scene.followerCount} ${scene.followersLabel}" visible and unchanged, not the ${scene.followingLabel} count. Keep screenshot proportions and a fixed camera. Reserve the lower caption area for exact closing text added by Remotion. Do not generate captions or dialogue. Include instrumental music and appropriate sound effects.`;
}
