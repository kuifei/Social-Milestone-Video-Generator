import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp, readFile, readdir, rm, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import type {CostEntry, VideoMetadata} from "../src/domain/types.js";
import type {PreparedVideoRequest, VideoProvider} from "../src/providers/types.js";
import type {CharacterProvider} from "../src/characters/types.js";
import {resumePipeline, runPipeline, type PipelineDependencies} from "../src/pipeline/run.js";
import {ProviderFailure} from "../src/providers/types.js";
import {resolveEffect, renderCustomEffect} from "../src/effects/index.js";

const videoCost: CostEntry = {stage: "video", provider: "test", model: "test", units: 15, unit: "second", unitPriceUsd: 0.08, estimatedUsd: 1.2, actualUsd: null, pricingAsOf: "test", pricingSource: "test"};
const media: VideoMetadata = {durationSeconds: 15.125, fps: 24, width: 768, height: 1344, hasAudio: true};
const unusedCharacter: CharacterProvider = {id: "test-character", model: "test", promptVersion: "test", estimatedCost: {...videoCost, stage: "character", unit: "image", units: 1, estimatedUsd: 0.08}, async generate() {throw new Error("supplied character should be used");}};

async function fixture(t: {after: (callback: () => Promise<void>) => void}) {
  const dir = await mkdtemp(join(tmpdir(), "milestone-pipeline-"));
  t.after(() => rm(dir, {recursive: true, force: true}));
  const profilePath = join(dir, "profile.json");
  const screenshotPath = join(dir, "screenshot.png");
  const characterPath = join(dir, "character.png");
  const profile = {displayName: "Example", handle: "@example", followers: "47.8K", avatarKind: "non-person" as const, rightsConfirmed: false};
  const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=", "base64");
  await Promise.all([writeFile(profilePath, JSON.stringify(profile)), writeFile(screenshotPath, image), writeFile(characterPath, "character")]);
  return {dir, outputDir: join(dir, "run"), profile, profilePath, screenshotPath, characterPath, locale: "en" as const, platform: "twitter" as const};
}

function harness(onGenerate?: (count: number) => Promise<void>) {
  const calls = {generation: 0, submission: 0, render: 0};
  const requests: PreparedVideoRequest[] = [];
  const provider: VideoProvider = {
    id: "minimax-h3", model: "test-model",
    prepare: ({scene, screenshotPath, characterPath, effect}) => ({provider: "minimax-h3", model: "test-model", promptVersion: "test-prompt", prompt: effect?.id === "custom" ? renderCustomEffect(effect, scene) : "test", effect, resolution: "768P", durationSeconds: 15, aspectRatio: "9:16", screenshotPath, characterPath, estimatedCost: videoCost, settings: {promptExpansionMode: "disabled", enableSafetyChecker: true}}),
    async generate(request, outputPath, hooks) {
      calls.generation += 1;
      requests.push(request);
      const requestId = hooks.existingRequestId ?? "video-request";
      if (!hooks.existingRequestId) {calls.submission += 1; await hooks.onSubmitted(requestId);}
      if (onGenerate) await onGenerate(calls.generation);
      await writeFile(outputPath, "video");
      return {requestId, model: "test-model", outputPath, cost: request.estimatedCost};
    },
  };
  const dependencies: PipelineDependencies = {
    videoProvider: provider, characterProvider: unusedCharacter, preflight: async () => {}, probe: async () => media,
    render: async (source, text, output, _dir, info) => {
      calls.render += 1;
      assert.equal(text, "Thank you for 47.8K followers");
      assert.equal(info.durationSeconds, 15.125);
      await writeFile(output, await readFile(source));
    },
  };
  return {calls, requests, dependencies};
}

async function saved(dir: string, name = "result.json") {return JSON.parse(await readFile(join(dir, name), "utf8"));}

test("one generation exports immediately without visual or technical QA, selection, or approval", async (t) => {
  const fx = await fixture(t); const h = harness();
  const poison = async () => {throw new Error("QA must not run");};
  const result = await runPipeline(fx, {...h.dependencies, ...{visualQa: {verifyProfile: poison, inspectAttempt: poison}, inspect: poison, contactSheet: poison, evidence: poison}});
  assert.equal(result.status, "completed");
  assert.equal(result.qualityGate, "disabled");
  assert.equal(result.effect?.id, "peace-sign");
  assert.equal(result.attempts.length, 1);
  assert.equal(result.sourceVideo, "attempts/01/raw.mp4");
  assert.equal(result.finalVideo, "final.mp4");
  assert.equal(result.humanReview, undefined); assert.equal(result.finalQa, undefined); assert.equal(result.profileVerification, undefined);
  assert.equal(result.attempts[0].technicalQa, undefined); assert.equal(result.attempts[0].semanticQa, undefined);
  assert.equal(h.calls.generation, 1); assert.equal(h.calls.submission, 1);
  assert.equal(result.estimatedTotalUsd, 1.2); assert.equal(result.actualTotalUsd, null);
  assert.deepEqual(await readdir(join(fx.outputDir, "attempts", "01")), ["raw.mp4"]);
  assert.deepEqual(await readFile(join(fx.outputDir, "input", "screenshot.png")), await readFile(fx.screenshotPath));
  assert.equal((await saved(fx.outputDir, "plan.json")).maxAttempts, 1);
});

test("Chinese caption is frozen in the job plan and reused during export recovery", async (t) => {
  const fx = await fixture(t); const h = harness();
  const captions: string[] = [];
  h.dependencies.render = async (source, text, output) => {
    captions.push(text);
    if (captions.length === 1) throw new Error("local export interrupted");
    await writeFile(output, await readFile(source));
  };
  const result = await runPipeline({...fx, locale: "zh-CN"}, h.dependencies);
  assert.equal(result.status, "failed");
  const before = await readFile(join(fx.outputDir, "plan.json"), "utf8");
  assert.equal(JSON.parse(before).closingText, "感谢 47.8K 位粉丝的支持");
  const resumed = await resumePipeline(fx.outputDir, h.dependencies);
  assert.equal(resumed.status, "completed");
  assert.equal(resumed.locale, "zh-CN");
  assert.deepEqual(captions, ["感谢 47.8K 位粉丝的支持", "感谢 47.8K 位粉丝的支持"]);
  assert.equal(h.calls.submission, 1);
  assert.equal(await readFile(join(fx.outputDir, "plan.json"), "utf8"), before);
});

test("unconfirmed person rights warn once per active invocation and stay false", async (t) => {
  const fx = await fixture(t); const h = harness(); const warning = t.mock.method(console, "warn", () => {});
  const profile = {...fx.profile, avatarKind: "person" as const}; await writeFile(fx.profilePath, JSON.stringify(profile));
  h.dependencies.render = async () => {throw new Error("renderer unavailable");};
  assert.equal((await runPipeline({...fx, profile}, h.dependencies)).status, "failed");
  assert.equal(warning.mock.callCount(), 1);
  assert.match(String(warning.mock.calls[0].arguments[0]), /Generation will continue/);
  assert.equal((await resumePipeline(fx.outputDir, harness().dependencies)).status, "completed");
  assert.equal(warning.mock.callCount(), 2);
  assert.equal((await saved(fx.outputDir, "plan.json")).profile.rightsConfirmed, false);
  assert.equal((await saved(join(fx.outputDir, "input"), "profile.json")).rightsConfirmed, false);
});

test("new jobs reject automatic multi-attempt generation before creating a job", async (t) => {
  const fx = await fixture(t); const h = harness();
  await assert.rejects(runPipeline({...fx, maxAttempts: 2}, h.dependencies), /Automatic retries are disabled/);
  assert.equal(h.calls.generation, 0);
  await assert.rejects(readFile(join(fx.outputDir, "plan.json")));
});

test("failed export preflight stops before character or video requests and job creation", async (t) => {
  const fx = await fixture(t); const h = harness(); let characterCalls = 0;
  const dependencies = {...h.dependencies,
    preflight: async () => {throw new Error("ffprobe unavailable");},
    characterProvider: {...unusedCharacter, async generate() {characterCalls += 1; throw new Error("must not generate");}},
  };
  await assert.rejects(runPipeline({...fx, characterPath: undefined}, dependencies), /ffprobe unavailable/);
  assert.equal(characterCalls, 0);
  assert.equal(h.calls.generation, 0);
  await assert.rejects(readFile(join(fx.outputDir, "plan.json")));
});

test("resume checks export readiness before reusing a paid request and preserves state on failure", async (t) => {
  const fx = await fixture(t);
  const h = harness(async (count) => {if (count === 1) throw new ProviderFailure("download failed", "download_error", "video-request");});
  await runPipeline(fx, h.dependencies);
  const before = await readFile(join(fx.outputDir, "result.json"), "utf8");
  await assert.rejects(resumePipeline(fx.outputDir, {...h.dependencies, preflight: async () => {throw new Error("renderer unavailable");}}), /renderer unavailable/);
  assert.equal(h.calls.generation, 1);
  assert.equal(await readFile(join(fx.outputDir, "result.json"), "utf8"), before);
  assert.equal((await resumePipeline(fx.outputDir, h.dependencies)).status, "completed");
  assert.equal(h.calls.submission, 1);
  await resumePipeline(fx.outputDir, {...h.dependencies, preflight: async () => {throw new Error("completed jobs need no renderer");}});
});

test("download failure resumes the same frozen custom request and deduplicates cost", async (t) => {
  const fx = await fixture(t);
  const h = harness(async (count) => {if (count === 1) throw new ProviderFailure("download failed", "download_error", "video-request");});
  const effect = resolveEffect("custom", "Celebrate {{followers}} for {{handle}}.");
  const result = await runPipeline({...fx, effect}, h.dependencies);
  assert.equal(result.status, "needs_review"); assert.equal(result.estimatedTotalUsd, 1.2);
  const planBefore = await readFile(join(fx.outputDir, "plan.json"), "utf8");
  await writeFile(join(fx.outputDir, "input", "custom-prompt.txt"), "edited after submission");
  h.dependencies.videoProvider.prepare = () => {throw new Error("frozen requests must not be rebuilt");};
  const resumed = await resumePipeline(fx.outputDir, h.dependencies);
  assert.equal(resumed.status, "completed"); assert.equal(h.calls.submission, 1);
  assert.equal(resumed.costs.length, 1); assert.equal(resumed.estimatedTotalUsd, 1.2);
  assert.equal(h.requests[1].prompt, h.requests[0].prompt);
  assert.deepEqual(h.requests[1].effect, effect); assert.deepEqual(h.requests[1].settings, h.requests[0].settings);
  assert.equal(await readFile(join(fx.outputDir, "plan.json"), "utf8"), planBefore);
});

test("custom source, hash, and rendered prompt are saved before submission", async (t) => {
  const fx = await fixture(t); const h = harness(); const effect = resolveEffect(undefined, "Celebrate {{followers}} for {{displayName}} {{handle}} on {{platform}}.");
  const result = await runPipeline({...fx, effect}, h.dependencies);
  const plan = await saved(fx.outputDir, "plan.json");
  assert.equal(await readFile(join(fx.outputDir, "input", "custom-prompt.txt"), "utf8"), effect.template);
  assert.equal(plan.effect.templateHash, effect.templateHash); assert.equal(plan.request.effect.templateHash, effect.templateHash);
  assert.match(plan.prompt, /Celebrate 47\.8K for Example @example on X\/Twitter/);
  assert.equal(result.effect?.id, "custom");
});

test("unknown custom placeholders stop before generation or output creation", async (t) => {
  const fx = await fixture(t); const h = harness();
  await assert.rejects(runPipeline({...fx, effect: resolveEffect("custom", "Hello {{missing}}")}, h.dependencies), /Unknown custom prompt placeholder/);
  assert.equal(h.calls.generation, 0); await assert.rejects(readFile(join(fx.outputDir, "plan.json")));
});

test("unknown submission without an ID is never automatically resubmitted", async (t) => {
  const fx = await fixture(t); const h = harness();
  h.dependencies.videoProvider.generate = async () => {h.calls.generation += 1; throw new ProviderFailure("submission timeout", "timeout");};
  assert.equal((await runPipeline(fx, h.dependencies)).status, "needs_review");
  assert.equal((await resumePipeline(fx.outputDir, h.dependencies)).status, "needs_review");
  assert.equal(h.calls.generation, 1);
});

test("an interrupted submitted checkpoint without ID also requires reconciliation", async (t) => {
  const fx = await fixture(t); const h = harness(async () => {throw new ProviderFailure("download failed", "download_error", "video-request");});
  await runPipeline(fx, h.dependencies);
  const result = await saved(fx.outputDir); result.attempts[0].status = "submitted"; result.attempts[0].requestId = null;
  await writeFile(join(fx.outputDir, "result.json"), JSON.stringify(result));
  assert.equal((await resumePipeline(fx.outputDir, h.dependencies)).status, "needs_review");
  assert.equal(h.calls.generation, 1);
});

test("safety refusal with a known ID is not resubmitted by resume", async (t) => {
  const fx = await fixture(t); const h = harness(async () => {throw new ProviderFailure("safety refused", "safety_rejected", "video-request");});
  await runPipeline(fx, h.dependencies); await resumePipeline(fx.outputDir, h.dependencies);
  assert.equal(h.calls.generation, 1); assert.equal(h.calls.submission, 1);
});

test("metadata and render failures recover on the already downloaded video", async (t) => {
  for (const stage of ["probe", "render"] as const) {
    const fx = await fixture(t); const h = harness();
    if (stage === "probe") h.dependencies.probe = async () => {throw new Error("metadata failed");};
    else h.dependencies.render = async () => {throw new Error("render failed");};
    const result = await runPipeline(fx, h.dependencies);
    assert.equal(result.status, "failed"); assert.equal(result.finalVideo, null); assert.ok(result.attempts[0].rawVideo);
    const recovered = harness();
    const resumed = await resumePipeline(fx.outputDir, recovered.dependencies);
    assert.equal(resumed.status, "completed"); assert.equal(recovered.calls.generation, 0); assert.equal(resumed.costs.length, 1);
  }
});

test("renderer returning without an output file cannot report completed", async (t) => {
  const fx = await fixture(t); const h = harness(); h.dependencies.render = async () => {};
  const result = await runPipeline(fx, h.dependencies);
  assert.equal(result.status, "failed"); assert.equal(result.finalVideo, null);
});

test("legacy failed-QA footage is reused without rewriting the frozen plan or old QA", async (t) => {
  const fx = await fixture(t); const h = harness(); h.dependencies.render = async () => {throw new Error("render failed");};
  await runPipeline(fx, h.dependencies);
  const plan = await saved(fx.outputDir, "plan.json"); plan.maxAttempts = 3; delete plan.effect; delete plan.request;
  const result = await saved(fx.outputDir); delete result.effect; delete result.attempts[0].request;
  result.attempts[0].technicalQa = {...media, technicalPass: false, score: 80, audioIsSilent: false, issues: ["legacy dimming failure"]};
  result.attempts[0].status = "failed"; result.attempts[0].failureKind = "technical_qa";
  await writeFile(join(fx.outputDir, "plan.json"), JSON.stringify(plan)); await writeFile(join(fx.outputDir, "result.json"), JSON.stringify(result));
  const recovered = harness(); const before = await readFile(join(fx.outputDir, "plan.json"), "utf8");
  const resumed = await resumePipeline(fx.outputDir, recovered.dependencies);
  assert.equal(resumed.status, "completed"); assert.equal(recovered.calls.generation, 0);
  assert.equal(resumed.attempts[0].technicalQa?.technicalPass, false);
  assert.equal(await readFile(join(fx.outputDir, "plan.json"), "utf8"), before);
});

test("generated-character cost survives download failure and resumes the original character request", async (t) => {
  const fx = await fixture(t); const h = harness(); let characterCalls = 0; let characterSubmissions = 0;
  h.dependencies.characterProvider = {...unusedCharacter, async generate(input) {
    characterCalls += 1; const requestId = input.existingRequestId ?? "character-request";
    if (!input.existingRequestId) {characterSubmissions += 1; await input.onSubmitted(requestId);}
    if (characterCalls === 1) throw new ProviderFailure("character download failed", "download_error", requestId);
    await writeFile(input.outputPath, "character");
    return {requestId, outputPath: input.outputPath, promptVersion: "test", cost: unusedCharacter.estimatedCost};
  }};
  assert.equal((await runPipeline({...fx, characterPath: undefined}, h.dependencies)).status, "failed");
  const result = await resumePipeline(fx.outputDir, h.dependencies);
  assert.equal(result.status, "completed"); assert.equal(characterSubmissions, 1);
  assert.equal(result.estimatedTotalUsd, 1.28); assert.equal(result.costs.length, 2);
});

test("generate refuses an existing directory and completed resume is idempotent", async (t) => {
  const fx = await fixture(t); const h = harness(); await runPipeline(fx, h.dependencies);
  const before = await readFile(join(fx.outputDir, "result.json"), "utf8");
  await assert.rejects(runPipeline(fx, h.dependencies), /already exists/);
  const result = await resumePipeline(fx.outputDir, h.dependencies);
  assert.equal(result.status, "completed"); assert.equal(h.calls.generation, 1);
  assert.equal(await readFile(join(fx.outputDir, "result.json"), "utf8"), before);
});
