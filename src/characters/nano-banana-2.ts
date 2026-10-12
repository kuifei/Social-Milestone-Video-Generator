import {fal} from "@fal-ai/client";
import type {CostEntry} from "../domain/types.js";
import {downloadFile, runFalQueue, uploadFile} from "../providers/fal-queue.js";
import {ProviderFailure} from "../providers/types.js";
import {CHARACTER_PROMPT_VERSION, characterPrompt} from "./prompt.js";
import type {CharacterProvider} from "./types.js";

const MODEL = "fal-ai/nano-banana-2/edit";
const COST: CostEntry = {
  stage: "character", provider: "fal", model: MODEL, units: 1, unit: "image", unitPriceUsd: 0.08,
  estimatedUsd: 0.08, actualUsd: null, pricingAsOf: "2026-10-10", pricingSource: "https://fal.ai/pricing",
};

export function createNanoBananaCharacterProvider(apiKey: string): CharacterProvider {
  fal.config({credentials: apiKey});
  return {
    id: "nano-banana-2",
    model: MODEL,
    promptVersion: CHARACTER_PROMPT_VERSION,
    estimatedCost: COST,
    async generate(input) {
      const screenshotUrl = input.existingRequestId ? "" : await uploadFile(input.screenshotPath);
      const result = await runFalQueue({
        endpoint: MODEL,
        payload: {prompt: characterPrompt(input.profile, input.mode), image_urls: [screenshotUrl], aspect_ratio: "16:9", resolution: "1K", output_format: "png", num_images: 1, safety_tolerance: "4"},
        existingRequestId: input.existingRequestId,
        timeoutMs: 5 * 60 * 1000,
        onSubmitted: input.onSubmitted,
      });
      const images = result.data.images as Array<{url?: string}> | undefined;
      if (!images?.[0]?.url) throw new ProviderFailure("Character provider returned no image URL.", "invalid_response", result.requestId);
      await downloadFile(images[0].url, input.outputPath, result.requestId);
      return {requestId: result.requestId, outputPath: input.outputPath, promptVersion: CHARACTER_PROMPT_VERSION, cost: COST};
    },
  };
}
