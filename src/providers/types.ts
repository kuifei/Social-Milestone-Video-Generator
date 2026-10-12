import type {CostEntry, EffectSelection, FailureKind, ProviderId} from "../domain/types.js";
import type {MilestoneScene} from "../scenes/milestone.js";

export interface PreparedVideoRequest {
  provider: ProviderId;
  model: string;
  promptVersion: string;
  prompt: string;
  effect?: EffectSelection;
  resolution: string;
  durationSeconds: number;
  aspectRatio: "9:16";
  screenshotPath: string;
  characterPath: string;
  estimatedCost: CostEntry;
  settings?: {promptExpansionMode: "disabled"; enableSafetyChecker: boolean};
}

export interface GenerationHooks {
  existingRequestId?: string;
  onSubmitted(requestId: string): Promise<void>;
}

export interface GenerationReceipt {
  requestId: string;
  model: string;
  outputPath: string;
  cost: CostEntry;
}

export class ProviderFailure extends Error {
  constructor(message: string, readonly kind: FailureKind, readonly requestId: string | null = null) {
    super(message);
  }
}

export interface VideoProvider {
  id: ProviderId;
  model: string;
  prepare(input: {scene: MilestoneScene; screenshotPath: string; characterPath: string; effect?: EffectSelection}): PreparedVideoRequest;
  generate(request: PreparedVideoRequest, outputPath: string, hooks: GenerationHooks): Promise<GenerationReceipt>;
}
