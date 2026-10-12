import {access, cp, mkdir, readFile, writeFile} from "node:fs/promises";
import {dirname, extname, join, resolve} from "node:path";
import {randomUUID} from "node:crypto";
import type {CostEntry, EffectSelection, JobResult, LocaleId, PlatformId, Profile, ProviderId, VideoMetadata} from "../domain/types.js";
import type {PreparedVideoRequest, VideoProvider} from "../providers/types.js";
import {ProviderFailure} from "../providers/types.js";
import type {CharacterProvider, CharacterMode} from "../characters/types.js";
import {validateCharacterPolicy} from "../characters/policy.js";
import {getLocale} from "../locales/index.js";
import {getPlatform} from "../platforms/index.js";
import {buildMilestoneScene} from "../scenes/milestone.js";
import {resolveEffect, renderCustomEffect} from "../effects/index.js";
import {readVideoMetadata} from "./media.js";
import {renderClosingOverlay} from "./remotion-renderer.js";
import {prepareScreenshotCanvas} from "./screenshot-canvas.js";
import {saveJson as save, withJobLock} from "./state.js";
import {parseMaxAttempts} from "../domain/validation.js";
import {checkExportEnvironment} from "./preflight.js";

export interface PipelineOptions {
  outputDir: string;
  profile: Profile;
  profilePath: string;
  screenshotPath: string;
  characterPath?: string;
  characterMode?: CharacterMode;
  locale: LocaleId;
  platform: PlatformId;
  effect?: EffectSelection;
  maxAttempts?: number;
}

export interface PipelineDependencies {
  videoProvider: VideoProvider;
  characterProvider: CharacterProvider;
  preflight?: () => Promise<void>;
  probe?: (path: string) => Promise<VideoMetadata>;
  render?: (source: string, text: string, output: string, jobDir: string, media: VideoMetadata) => Promise<void>;
  now?: () => Date;
}

interface JobPlan {
  jobId: string;
  locale: LocaleId;
  platform: PlatformId;
  profile: Profile;
  provider: ProviderId;
  model: string;
  promptVersion: string;
  prompt: string;
  resolution: string;
  request?: PreparedVideoRequest;
  effect?: EffectSelection;
  characterMode: CharacterMode;
  closingText: string;
  maxAttempts: number;
  qualityGate?: "disabled";
  input: {profile: string; screenshot: string; videoReference?: string; character: string | null; customPrompt?: string};
  createdAt: string;
}

function costs(result: JobResult): void {
  result.estimatedTotalUsd = Number(result.costs.reduce((sum, item) => sum + (item.estimatedUsd ?? 0), 0).toFixed(4));
  result.actualTotalUsd = !result.costs.length || result.costs.some((item) => item.actualUsd === null) ? null : Number(result.costs.reduce((sum, item) => sum + (item.actualUsd ?? 0), 0).toFixed(4));
}

function recordCost(result: JobResult, record: {cost: CostEntry | null}, cost: CostEntry, requestId: string): void {
  if (record.cost && !record.cost.requestId) {
    const legacy = result.costs.find((item) => !item.requestId && item.stage === record.cost!.stage && item.model === record.cost!.model && item.estimatedUsd === record.cost!.estimatedUsd);
    if (legacy) legacy.requestId = requestId;
  }
  record.cost = {...cost, requestId};
  const existing = result.costs.findIndex((item) => item.stage === cost.stage && item.requestId === requestId);
  if (existing === -1) result.costs.push(record.cost);
  else result.costs[existing] = record.cost;
  costs(result);
}

async function persist(jobDir: string, result: JobResult): Promise<void> {
  costs(result);
  await save(join(jobDir, "result.json"), result);
}

export async function runPipeline(options: PipelineOptions, dependencies: PipelineDependencies): Promise<JobResult> {
  parseMaxAttempts(options.maxAttempts ?? 1);
  validateCharacterPolicy(options.profile);
  const effect = resolveEffect(options.effect?.id, options.effect?.template);
  if (effect.id === "custom") renderCustomEffect(effect, buildMilestoneScene(options.profile, getPlatform(options.platform)));
  const jobDir = resolve(options.outputDir);
  await (dependencies.preflight ?? checkExportEnvironment)();
  await mkdir(dirname(jobDir), {recursive: true});
  try { await mkdir(jobDir); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new Error("Output directory already exists. Use resume for an existing job, or choose a new --out directory.");
    throw error;
  }
  return withJobLock(jobDir, () => initializePipeline({...options, effect}, dependencies));
}

async function initializePipeline(options: PipelineOptions, dependencies: PipelineDependencies): Promise<JobResult> {
  const jobDir = resolve(options.outputDir);
  const inputDir = join(jobDir, "input");
  await mkdir(join(jobDir, "attempts"));
  await mkdir(inputDir);
  const screenshotName = `screenshot${extname(options.screenshotPath) || ".png"}`;
  const characterName = options.characterPath ? `character${extname(options.characterPath) || ".png"}` : null;
  await cp(options.profilePath, join(inputDir, "profile.json"));
  await cp(options.screenshotPath, join(inputDir, screenshotName));
  if (options.characterPath && characterName) await cp(options.characterPath, join(inputDir, characterName));
  if (options.effect?.id === "custom") await writeFile(join(inputDir, "custom-prompt.txt"), options.effect.template!, {flag: "wx"});
  const platform = getPlatform(options.platform);
  await prepareScreenshotCanvas(join(inputDir, screenshotName), join(inputDir, "screenshot-9x16.png"), platform.outputWidth, platform.outputHeight);
  const prepared = dependencies.videoProvider.prepare({scene: buildMilestoneScene(options.profile, platform), screenshotPath: join(inputDir, "screenshot-9x16.png"), characterPath: join(inputDir, characterName ?? "character.png"), effect: options.effect});
  const createdAt = (dependencies.now ?? (() => new Date()))().toISOString();
  const plan: JobPlan = {
    jobId: randomUUID(), locale: options.locale, platform: options.platform, profile: options.profile,
    provider: prepared.provider, model: prepared.model, promptVersion: prepared.promptVersion, prompt: prepared.prompt,
    resolution: prepared.resolution, request: {...prepared, effect: options.effect, screenshotPath: "input/screenshot-9x16.png", characterPath: `input/${characterName ?? "character.png"}`},
    effect: options.effect, characterMode: options.characterMode ?? "avatar", closingText: getLocale(options.locale).closingText(options.profile),
    maxAttempts: 1, qualityGate: "disabled",
    input: {profile: "input/profile.json", screenshot: `input/${screenshotName}`, videoReference: "input/screenshot-9x16.png", character: characterName ? `input/${characterName}` : null, ...(options.effect?.id === "custom" ? {customPrompt: "input/custom-prompt.txt"} : {})},
    createdAt,
  };
  await save(join(jobDir, "plan.json"), plan);
  const result: JobResult = {
    jobId: plan.jobId, status: "running", provider: plan.provider, model: plan.model, promptVersion: plan.promptVersion,
    locale: plan.locale, platform: plan.platform, effect: plan.effect, qualityGate: "disabled", character: null, attempts: [], sourceVideo: null,
    finalVideo: null, costs: [], estimatedTotalUsd: 0, actualTotalUsd: null, patches: [], failureReason: null, startedAt: createdAt, finishedAt: null,
  };
  await persist(jobDir, result);
  return execute(jobDir, plan, result, dependencies);
}

export async function resumePipeline(jobDirInput: string, dependencies: PipelineDependencies): Promise<JobResult> {
  const jobDir = resolve(jobDirInput);
  return withJobLock(jobDir, async () => {
    const plan = JSON.parse(await readFile(join(jobDir, "plan.json"), "utf8")) as JobPlan;
    const result = JSON.parse(await readFile(join(jobDir, "result.json"), "utf8")) as JobResult;
    if (result.status === "completed") return result;
    if (plan.provider !== dependencies.videoProvider.id || plan.model !== dependencies.videoProvider.model) throw new Error("Resume provider does not match the saved job model.");
    await (dependencies.preflight ?? checkExportEnvironment)();
    result.status = "running";
    result.failureReason = null;
    result.finishedAt = null;
    await persist(jobDir, result);
    return execute(jobDir, plan, result, dependencies);
  });
}

async function execute(jobDir: string, plan: JobPlan, result: JobResult, dependencies: PipelineDependencies): Promise<JobResult> {
  const now = dependencies.now ?? (() => new Date());
  const render = dependencies.render ?? renderClosingOverlay;
  const probe = dependencies.probe ?? readVideoMetadata;
  const rightsWarning = validateCharacterPolicy(plan.profile);
  if (rightsWarning) console.warn(rightsWarning);
  result.qualityGate = "disabled";
  const screenshotPath = join(jobDir, plan.input.screenshot);
  const videoReferencePath = join(jobDir, plan.input.videoReference ?? plan.input.screenshot);
  let characterPath: string;
  if (plan.input.character) {
    characterPath = join(jobDir, plan.input.character);
    result.character ??= {source: "user", mode: "supplied", status: "ready", provider: null, model: null, promptVersion: null, path: plan.input.character, requestId: null, cost: null, failureKind: null, error: null};
  } else {
    characterPath = join(jobDir, "input", "character.png");
    const newCharacter = !result.character;
    result.character ??= {source: "generated", mode: plan.characterMode ?? "avatar", status: "submitted", provider: dependencies.characterProvider.id, model: dependencies.characterProvider.model, promptVersion: dependencies.characterProvider.promptVersion, path: "input/character.png", requestId: null, cost: null, failureKind: null, error: null};
    if (!newCharacter && result.character.status !== "ready" && (!result.character.requestId || ["safety_rejected", "invalid_response"].includes(result.character.failureKind ?? ""))) {
      result.status = "needs_review";
      result.failureReason = "Character submission has a terminal or unknown outcome; reconcile with the provider before regenerating.";
      result.finishedAt = now().toISOString();
      await persist(jobDir, result);
      return result;
    }
    if (result.character.status !== "ready") {
      await persist(jobDir, result);
      try {
        const receipt = await dependencies.characterProvider.generate({screenshotPath, profile: plan.profile, mode: plan.characterMode ?? "avatar", outputPath: characterPath, existingRequestId: result.character.requestId ?? undefined,
          onSubmitted: async (requestId) => {result.character!.requestId = requestId; recordCost(result, result.character!, dependencies.characterProvider.estimatedCost, requestId); await persist(jobDir, result);},
        });
        recordCost(result, result.character, receipt.cost, receipt.requestId);
        result.character = {...result.character, status: "ready", promptVersion: receipt.promptVersion, requestId: receipt.requestId, failureKind: null, error: null};
      } catch (error) {
        result.character = {...result.character, status: "failed", requestId: error instanceof ProviderFailure ? error.requestId ?? result.character.requestId : result.character.requestId, failureKind: error instanceof ProviderFailure ? error.kind : "provider_error", error: error instanceof Error ? error.message : String(error)};
        result.status = "failed";
        result.failureReason = "Character turnaround generation failed.";
        result.finishedAt = now().toISOString();
        await persist(jobDir, result);
        return result;
      }
    }
  }
  await persist(jobDir, result);

  // Legacy jobs retain their old frozen prompt and chosen footage; no quality scoring or new candidate is performed.
  const prepared = plan.request ?? dependencies.videoProvider.prepare({scene: buildMilestoneScene(plan.profile, getPlatform(plan.platform)), screenshotPath: videoReferencePath, characterPath, effect: plan.effect ?? {id: "blow-out"}});
  const request: PreparedVideoRequest = {...prepared, provider: plan.provider, model: plan.model, prompt: plan.prompt, promptVersion: plan.promptVersion, resolution: plan.resolution, screenshotPath: videoReferencePath, characterPath};
  let attempt = result.attempts.find((item) => item.attempt === result.selectedAttempt) ?? result.attempts.find((item) => item.rawVideo) ?? result.attempts[0];
  const newAttempt = !attempt;
  if (!attempt) {
    attempt = {attempt: 1, status: "submitted", startedAt: now().toISOString(), finishedAt: null, durationMs: null, rawVideo: null, requestId: null, cost: null, failureKind: null, error: null};
    result.attempts.push(attempt);
  }
  const attemptDir = join(jobDir, "attempts", String(attempt.attempt).padStart(2, "0"));
  await mkdir(attemptDir, {recursive: true});
  const rawVideo = join(attemptDir, "raw.mp4");
  attempt.request ??= request;
  await persist(jobDir, result);
  if (attempt.rawVideo) {
    try { await access(rawVideo); } catch { attempt.rawVideo = null; }
  }
  if (!attempt.rawVideo && !newAttempt && (!attempt.requestId || ["safety_rejected", "invalid_response"].includes(attempt.failureKind ?? ""))) {
    result.status = "needs_review";
    result.failureReason = "Generation has a terminal or unknown submission outcome; reconcile with the provider before regenerating.";
    result.finishedAt = now().toISOString();
    await persist(jobDir, result);
    return result;
  }
  if (!attempt.rawVideo) {
    try {
      const receipt = await dependencies.videoProvider.generate({...attempt.request, screenshotPath: videoReferencePath, characterPath}, rawVideo, {
        existingRequestId: attempt.requestId ?? undefined,
        onSubmitted: async (requestId) => {attempt!.requestId = requestId; recordCost(result, attempt!, attempt!.request!.estimatedCost, requestId); await persist(jobDir, result);},
      });
      attempt.requestId = receipt.requestId;
      recordCost(result, attempt, receipt.cost, receipt.requestId);
      attempt.rawVideo = `attempts/${String(attempt.attempt).padStart(2, "0")}/raw.mp4`;
      attempt.status = "downloaded";
      attempt.failureKind = null;
      attempt.error = null;
    } catch (error) {
      attempt.status = "failed";
      attempt.failureKind = error instanceof ProviderFailure ? error.kind : "provider_error";
      attempt.requestId = error instanceof ProviderFailure ? error.requestId ?? attempt.requestId : attempt.requestId;
      attempt.error = error instanceof Error ? error.message : String(error);
      result.status = "needs_review";
      result.failureReason = "Generation stopped. Resume only reuses the existing request; unknown submissions or terminal responses require provider-side reconciliation.";
    }
    attempt.finishedAt = now().toISOString();
    attempt.durationMs = Date.parse(attempt.finishedAt) - Date.parse(attempt.startedAt);
    await persist(jobDir, result);
    if (!attempt.rawVideo) {
      result.finishedAt = now().toISOString();
      await persist(jobDir, result);
      return result;
    }
  }

  result.sourceVideo = attempt.rawVideo;
  result.finalVideo = null;
  await persist(jobDir, result);
  try {
    attempt.media = await probe(rawVideo);
    await persist(jobDir, result);
    await render(rawVideo, plan.closingText, join(jobDir, "final.mp4"), jobDir, attempt.media);
    await access(join(jobDir, "final.mp4"));
    result.finalVideo = "final.mp4";
    result.patches = ["remotion-closing-overlay"];
    result.status = "completed";
    result.failureReason = null;
  } catch (error) {
    result.status = "failed";
    result.failureReason = `Video metadata or Remotion delivery failed: ${error instanceof Error ? error.message : String(error)}`;
  }
  result.finishedAt = now().toISOString();
  await persist(jobDir, result);
  return result;
}
