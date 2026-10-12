import {fal} from "@fal-ai/client";
import type {CostEntry, Profile, ProfileExtraction, ProfileVerification, SemanticQa, ImageRegion} from "../domain/types.js";
import {parseProfile} from "../domain/profile.js";
import {runFalQueue, uploadFile} from "../providers/fal-queue.js";
import {ProviderFailure} from "../providers/types.js";
import type {VisualQaProvider} from "./types.js";

const ENDPOINT = "openrouter/router/vision";
const MODEL = "google/gemini-2.5-flash";

function jsonObject(text: string): Record<string, unknown> {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new ProviderFailure("Visual QA returned no JSON object.", "invalid_response");
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

function actualCost(stage: CostEntry["stage"], data: Record<string, unknown>): CostEntry {
  const usage = data.usage as {cost?: number; total_tokens?: number} | undefined;
  return {
    stage, provider: "fal-openrouter", model: MODEL, units: usage?.total_tokens ?? 1, unit: usage?.total_tokens ? "token" : "request",
    unitPriceUsd: null, estimatedUsd: null, actualUsd: typeof usage?.cost === "number" ? usage.cost : null,
    pricingAsOf: "2026-10-10", pricingSource: "Actual cost returned by openrouter/router/vision when available.",
  };
}

function bool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function number(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function frameNumbers(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((item): item is number => Number.isInteger(item)) : [];
}

export function profileFromVisionObject(parsed: Record<string, unknown>, cost: CostEntry | null = null): ProfileExtraction {
  const confidence = Math.min(1, Math.max(0, number(parsed.confidence)));
  const issues = strings(parsed.issues);
  if (parsed.status !== "extracted" || confidence < 0.8) return {status: "uncertain", profile: null, confidence, issues, cost};
  try {
    const profile: Profile = parseProfile({
      displayName: parsed.displayName,
      handle: parsed.handle,
      followers: parsed.followers,
      avatarKind: parsed.avatarKind,
      rightsConfirmed: false,
    });
    return {status: "extracted", profile, confidence, issues, cost};
  } catch (error) {
    return {status: "uncertain", profile: null, confidence, issues: [...issues, error instanceof Error ? error.message : String(error)], cost};
  }
}

export function semanticScore(value: Omit<SemanticQa, "score" | "hardPass" | "cost">): {score: number; hardPass: boolean} {
  const weighted: Array<[boolean | null, number]> = [
    [value.pageAcceptablyStable, 20], [value.followersCountPreserved, 20], [value.pointsToFollowers, 15],
    [value.singleCharacter, 10], [value.avatarExitCorrect, 10], [value.candleLit, 5], [value.celebrationVisible, 5],
    [value.candleCountPreserved, 10], [value.candleBlownOut, 5],
  ];
  const score = weighted.reduce((sum, [passed, weight]) => sum + (passed === true ? weight : 0), 0);
  const hardPass = weighted.every(([passed]) => passed === true) && value.confidence >= 0.8;
  return {score, hardPass};
}

export const SEMANTIC_CHECKS = ["pageAcceptablyStable", "followersCountPreserved", "pointsToFollowers", "singleCharacter", "avatarExitCorrect", "candleLit", "celebrationVisible", "candleCountPreserved", "candleBlownOut"] as const;

export function semanticNeedsReview(value: SemanticQa): boolean {
  return value.confidence < 0.8 || SEMANTIC_CHECKS.some((key) => typeof value[key] !== "boolean");
}

function region(value: unknown): ImageRegion | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const box = value as Record<string, unknown>;
  const {x, y, width, height} = box;
  if ([x, y, width, height].some((item) => typeof item !== "number" || !Number.isFinite(item))) return undefined;
  if ((x as number) < 0 || (y as number) < 0 || (width as number) <= 0 || (height as number) <= 0 || (x as number) + (width as number) > 1 || (y as number) + (height as number) > 1) return undefined;
  return {x, y, width, height} as ImageRegion;
}

export function profileExtractionPrompt(): string {
  return `Read the primary X/Twitter profile shown in this screenshot. Return {"status":"extracted|uncertain","displayName":string|null,"handle":string|null,"followers":string|null,"avatarKind":"person|non-person|unknown","confidence":number,"issues":string[]}.
Preserve the visible follower-count formatting such as 47.8K. The handle must include @. Use uncertain if the primary profile, handle, or Followers count is cropped, ambiguous, or unreadable. Do not infer hidden values.
Classify avatarKind from the pixels inside the main circular profile-avatar image only, never from the account name, biography, posts, public identity, or who owns the account. Use person only when a human face or human body is visibly present inside that circle. Use non-person for a rocket, vehicle, animal, logo, text, object, landscape, or abstract artwork, even when the account belongs to or is named after a person. Use unknown when the circular avatar itself is too small, obscured, or ambiguous.`;
}

async function vision(imagePaths: string[], prompt: string): Promise<{parsed: Record<string, unknown>; data: Record<string, unknown>}> {
  const urls = await Promise.all(imagePaths.map((path) => uploadFile(path)));
  const result = await runFalQueue({
    endpoint: ENDPOINT,
    payload: {image_urls: urls, prompt, system_prompt: "Return only one valid JSON object. Do not use Markdown.", model: MODEL, temperature: 0, max_tokens: 800, enable_web_search: false},
    timeoutMs: 2 * 60 * 1000,
    onSubmitted: async () => undefined,
  });
  const output = result.data.output;
  if (typeof output !== "string") throw new ProviderFailure("Visual QA returned no text output.", "invalid_response", result.requestId);
  return {parsed: jsonObject(output), data: result.data};
}

export function createFalOpenRouterQaProvider(apiKey: string): VisualQaProvider {
  fal.config({credentials: apiKey});
  return {
    id: "fal-openrouter-vision",
    model: MODEL,
    async extractProfile({screenshotPath}) {
      const {parsed, data} = await vision([screenshotPath], profileExtractionPrompt());
      return profileFromVisionObject(parsed, actualCost("profile_extraction", data));
    },
    async verifyProfile({screenshotPath, profile}) {
      const prompt = `Read the main social profile in this screenshot. Expected handle: ${profile.handle}. Expected follower count: ${profile.followers}. Return {"status":"matched|mismatch|uncertain","extractedHandle":string|null,"extractedFollowers":string|null,"confidence":number,"issues":string[],"avatarRegion":{"x":number,"y":number,"width":number,"height":number}|null,"followersRegion":{"x":number,"y":number,"width":number,"height":number}|null}. Regions are bounding boxes normalized to the full screenshot (0 to 1); avatarRegion covers the main circular avatar, followersRegion covers the Followers number and label, not Following. Use mismatch only when a visible value clearly conflicts. Use uncertain when the relevant text is unreadable.`;
      const {parsed, data} = await vision([screenshotPath], prompt);
      const status = ["matched", "mismatch", "uncertain"].includes(String(parsed.status)) ? parsed.status as ProfileVerification["status"] : "uncertain";
      return {
        status: status === "matched" && (number(parsed.confidence) < 0.8 || parsed.extractedHandle !== profile.handle || String(parsed.extractedFollowers).replace(/\s/g, "") !== profile.followers.replace(/\s/g, "")) ? "uncertain" : status,
        regions: {avatar: region(parsed.avatarRegion), followers: region(parsed.followersRegion)},
        extractedHandle: typeof parsed.extractedHandle === "string" ? parsed.extractedHandle : null,
        extractedFollowers: typeof parsed.extractedFollowers === "string" ? parsed.extractedFollowers : null,
        confidence: Math.min(1, Math.max(0, number(parsed.confidence))),
        issues: strings(parsed.issues),
        cost: actualCost("profile_verification", data),
      };
    },
    async inspectAttempt({screenshotPath, characterPath, contactSheetPath, profile, evidence = []}) {
      const detail = evidence.map((item, index) => `Image ${index + 4}: ${item.region} evidence, frames at ${item.times.join(", ")} seconds in reading order.`).join("\n");
      const prompt = `Image 1 is the original profile screenshot. Image 2 is the intended single character turnaround. Image 3 is an eight-frame overview ordered left-to-right, top-to-bottom. ${detail} The expected follower count is ${profile.followers}. Evaluate only visible evidence and return {"followersCountPreserved":boolean|null,"pointsToFollowers":boolean|null,"singleCharacter":boolean|null,"pageAcceptablyStable":boolean|null,"avatarExitCorrect":boolean|null,"candleLit":boolean|null,"celebrationVisible":boolean|null,"candleCountPreserved":boolean|null,"candleBlownOut":boolean|null,"confidence":number,"evidenceFrames":number[],"issues":string[]}. candleCountPreserved requires the wax candle shapes on the cake to spell exactly ${profile.followers}, including commas, decimals, and suffixes. candleBlownOut requires visible lit flames before the blow and extinguished flames afterwards by that same single character. Check the page proportions and placement against Image 1 allowing only the added canvas padding. Use null when the images cannot prove an item; do not infer motion from a single still.`;
      const {parsed, data} = await vision([screenshotPath, characterPath, contactSheetPath, ...evidence.map((item) => item.path)], `${prompt}\nFor pageAcceptablyStable, compare the original page background color, brightness, and readable text against multiple video frames. Return false if a white page becomes gray or black, or if global dimming, stage lighting, a spotlight, or a vignette obscures the page. A thin gold outline is allowed only when the surrounding page brightness stays unchanged. Use null when background preservation cannot be judged.`);
      const base = {
        followersCountPreserved: bool(parsed.followersCountPreserved),
        pointsToFollowers: bool(parsed.pointsToFollowers),
        singleCharacter: bool(parsed.singleCharacter),
        pageAcceptablyStable: bool(parsed.pageAcceptablyStable),
        avatarExitCorrect: bool(parsed.avatarExitCorrect),
        candleLit: bool(parsed.candleLit),
        celebrationVisible: bool(parsed.celebrationVisible),
        candleCountPreserved: bool(parsed.candleCountPreserved),
        candleBlownOut: bool(parsed.candleBlownOut),
        confidence: Math.min(1, Math.max(0, number(parsed.confidence))),
        evidenceFrames: frameNumbers(parsed.evidenceFrames),
        issues: strings(parsed.issues),
      };
      return {...base, ...semanticScore({...base}), cost: actualCost("semantic_qa", data)};
    },
  };
}
