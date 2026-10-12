import type {CostEntry, Profile} from "../domain/types.js";

export type CharacterMode = "avatar" | "generic";

export interface CharacterReceipt {
  requestId: string;
  outputPath: string;
  promptVersion: string;
  cost: CostEntry;
}

export interface CharacterProvider {
  id: string;
  model: string;
  promptVersion: string;
  estimatedCost: CostEntry;
  generate(input: {
    screenshotPath: string;
    profile: Profile;
    mode: CharacterMode;
    outputPath: string;
    existingRequestId?: string;
    onSubmitted(requestId: string): Promise<void>;
  }): Promise<CharacterReceipt>;
}
