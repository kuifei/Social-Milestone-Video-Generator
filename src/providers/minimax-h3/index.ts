import {fal} from "@fal-ai/client";
import type {CostEntry} from "../../domain/types.js";
import {downloadFile, runFalQueue, uploadFile} from "../fal-queue.js";
import {ProviderFailure, type VideoProvider} from "../types.js";
import {H3_PROMPT_VERSION, renderH3Prompt} from "./prompt.js";
import {resolveEffect, renderCustomEffect} from "../../effects/index.js";
import {PEACE_SIGN_PROMPT_VERSION, renderPeaceSignPrompt} from "../../effects/peace-sign.js";

const MODEL = "minimax/h3/reference-to-video";
const RESOLUTION = "768P";
const UNIT_PRICE_USD = 0.06;

function estimatedCost(durationSeconds: number): CostEntry {
  return {
    stage: "video", provider: "fal", model: MODEL, units: durationSeconds, unit: "second",
    unitPriceUsd: UNIT_PRICE_USD, estimatedUsd: Number((durationSeconds * UNIT_PRICE_USD).toFixed(2)), actualUsd: null,
    pricingAsOf: "2026-10-10", pricingSource: "Phase 0 768P estimate; verify against the fal billing dashboard.",
  };
}

export function createMiniMaxH3Provider(apiKey: string): VideoProvider {
  fal.config({credentials: apiKey});
  return {
    id: "minimax-h3",
    model: MODEL,
    prepare({scene, screenshotPath, characterPath, effect}) {
      const selectedEffect = resolveEffect(effect?.id, effect?.template);
      const header = "Image 1 is the profile screenshot, the only background reference. Image 2 is the cartoon character turnaround sheet, the only animated character reference.";
      const prompt = selectedEffect.id === "blow-out" ? renderH3Prompt(scene) : `${header}\n${selectedEffect.id === "custom" ? renderCustomEffect(selectedEffect, scene) : renderPeaceSignPrompt(scene)}`;
      const promptVersion = selectedEffect.id === "blow-out" ? H3_PROMPT_VERSION : selectedEffect.id === "custom" ? `custom-v1-${selectedEffect.templateHash}` : PEACE_SIGN_PROMPT_VERSION;
      return {
        provider: "minimax-h3", model: MODEL, promptVersion, prompt, effect: selectedEffect,
        resolution: RESOLUTION, durationSeconds: scene.durationSeconds, aspectRatio: scene.aspectRatio,
        screenshotPath, characterPath, estimatedCost: estimatedCost(scene.durationSeconds),
        settings: {promptExpansionMode: "disabled", enableSafetyChecker: true},
      };
    },
    async generate(request, outputPath, hooks) {
      const [screenshotUrl, characterUrl] = hooks.existingRequestId ? ["", ""] : await Promise.all([uploadFile(request.screenshotPath), uploadFile(request.characterPath)]);
      const result = await runFalQueue({
        endpoint: request.model,
        payload: {prompt: request.prompt, reference_image_urls: [screenshotUrl, characterUrl], resolution: request.resolution, duration: request.durationSeconds, aspect_ratio: request.aspectRatio, prompt_expansion_mode: request.settings?.promptExpansionMode ?? "disabled", enable_safety_checker: request.settings?.enableSafetyChecker ?? true},
        existingRequestId: hooks.existingRequestId,
        timeoutMs: 12 * 60 * 1000,
        onSubmitted: hooks.onSubmitted,
      });
      const video = result.data.video as {url?: string} | undefined;
      if (!video?.url) throw new ProviderFailure("MiniMax H3 returned no video URL.", "invalid_response", result.requestId);
      await downloadFile(video.url, outputPath, result.requestId);
      return {requestId: result.requestId, model: request.model, outputPath, cost: request.estimatedCost};
    },
  };
}
