export type LocaleId = "en" | "zh-CN";
export type PlatformId = "twitter";
export type ProviderId = "minimax-h3" | "minimax-h3-max";
export type EffectId = "peace-sign" | "blow-out" | "custom";
export interface EffectSelection {
  id: EffectId;
  template?: string;
  templateHash?: string;
}
export type JobStatus = "running" | "completed" | "needs_review" | "failed";
export type FailureKind =
  | "safety_rejected"
  | "timeout"
  | "provider_error"
  | "invalid_response"
  | "download_error"
  | "technical_qa"
  | "semantic_qa"
  | "qa_infrastructure";

export interface Profile {
  displayName: string;
  handle: string;
  followers: string;
  avatarKind: "person" | "non-person" | "unknown";
  rightsConfirmed: boolean;
}

export interface CostEntry {
  requestId?: string;
  stage: "profile_extraction" | "profile_verification" | "character" | "video" | "semantic_qa";
  provider: string;
  model: string;
  units: number;
  unit: "image" | "second" | "request" | "token";
  unitPriceUsd: number | null;
  estimatedUsd: number | null;
  actualUsd: number | null;
  pricingAsOf: string;
  pricingSource: string;
}

export interface VideoMetadata {
  durationSeconds: number;
  fps: number;
  width: number;
  height: number;
  hasAudio: boolean;
}

export interface TechnicalQa extends VideoMetadata {
  backgroundBrightness?: {
    pass: boolean;
    referenceMeanLuma: number;
    samples: Array<{timeSeconds: number; meanLuma: number; darkened: boolean}>;
  } | null;
  technicalPass: boolean;
  score: number;
  audioIsSilent: boolean | null;
  issues: string[];
}

export interface ProfileVerification {
  regions?: {avatar?: ImageRegion; followers?: ImageRegion};
  status: "matched" | "mismatch" | "uncertain";
  extractedHandle: string | null;
  extractedFollowers: string | null;
  confidence: number;
  issues: string[];
  cost: CostEntry | null;
}

export interface ProfileExtraction {
  status: "extracted" | "uncertain";
  profile: Profile | null;
  confidence: number;
  issues: string[];
  cost: CostEntry | null;
}

export interface SemanticQa {
  followersCountPreserved: boolean | null;
  pointsToFollowers: boolean | null;
  singleCharacter: boolean | null;
  pageAcceptablyStable: boolean | null;
  avatarExitCorrect: boolean | null;
  candleLit: boolean | null;
  celebrationVisible: boolean | null;
  candleCountPreserved: boolean | null;
  candleBlownOut: boolean | null;
  confidence: number;
  evidenceFrames: number[];
  issues: string[];
  score: number;
  hardPass: boolean;
  cost: CostEntry | null;
}

export interface CharacterRecord {
  source: "user" | "generated";
  mode: "avatar" | "generic" | "supplied";
  status: "ready" | "submitted" | "failed";
  provider: string | null;
  model: string | null;
  promptVersion: string | null;
  path: string | null;
  requestId: string | null;
  cost: CostEntry | null;
  failureKind: FailureKind | null;
  error: string | null;
}

export interface AttemptRecord {
  attempt: number;
  status: "submitted" | "downloaded" | "generated" | "failed";
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  rawVideo: string | null;
  contactSheet?: string | null;
  evidence?: QaEvidence[];
  request?: import("../providers/types.js").PreparedVideoRequest;
  qaFile?: string;
  technicalQa?: TechnicalQa | null;
  semanticQa?: SemanticQa | null;
  media?: VideoMetadata;
  requestId: string | null;
  cost: CostEntry | null;
  failureKind: FailureKind | null;
  error: string | null;
}

export interface HumanReview {
  status: "pending" | "approved" | "rejected";
  avatarExitCorrect: boolean | null;
  pointsToFollowers: boolean | null;
  pageAcceptablyStable: boolean | null;
  celebrationVisible: boolean | null;
  followersCountPreserved: boolean | null;
  singleCharacter: boolean | null;
  candleLit: boolean | null;
  candleCountPreserved: boolean | null;
  candleBlownOut: boolean | null;
}

export interface ImageRegion {x: number; y: number; width: number; height: number;}
export interface QaEvidence {path: string; region: "avatar" | "followers" | "celebration" | "full"; times: number[];}

export interface JobResult {
  jobId: string;
  status: JobStatus;
  provider: ProviderId;
  model: string;
  promptVersion: string;
  locale: LocaleId;
  platform: PlatformId;
  effect?: EffectSelection;
  qualityGate?: "disabled";
  profileVerification?: ProfileVerification | null;
  character: CharacterRecord | null;
  attempts: AttemptRecord[];
  selectedAttempt?: number | null;
  selectedVideo?: string | null;
  sourceVideo?: string | null;
  finalVideo: string | null;
  finalQa?: TechnicalQa | null;
  humanReview?: HumanReview;
  costs: CostEntry[];
  estimatedTotalUsd: number;
  actualTotalUsd: number | null;
  patches: string[];
  failureReason: string | null;
  startedAt: string;
  finishedAt: string | null;
}
