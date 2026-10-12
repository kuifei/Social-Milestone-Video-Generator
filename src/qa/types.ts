import type {Profile, ProfileExtraction, ProfileVerification, SemanticQa, QaEvidence} from "../domain/types.js";

export interface VisualQaProvider {
  id: string;
  model: string;
  extractProfile(input: {screenshotPath: string}): Promise<ProfileExtraction>;
  verifyProfile(input: {screenshotPath: string; profile: Profile}): Promise<ProfileVerification>;
  inspectAttempt(input: {screenshotPath: string; characterPath: string; contactSheetPath: string; profile: Profile; evidence?: QaEvidence[]}): Promise<SemanticQa>;
}
