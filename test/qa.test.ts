import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp, rm, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {fal} from "@fal-ai/client";
import {parseFrameRate, parseMeanVolume, parseProbe} from "../src/pipeline/qa.js";
import {createFalOpenRouterQaProvider, profileExtractionPrompt, profileFromVisionObject, semanticScore} from "../src/qa/fal-openrouter.js";

test("vision uploads use the default timeout rather than the array index", async () => {
  const dir = await mkdtemp(join(tmpdir(), "milestone-vision-upload-"));
  const originalUpload = fal.storage.upload;
  const originalQueue = {...fal.queue};
  const originalConfig = fal.config;
  let submittedPrompt = "";
  fal.config = () => {};
  fal.storage.upload = async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    return "https://example.invalid/screenshot.png";
  };
  fal.queue.submit = async (_endpoint, options) => {
    submittedPrompt = (options.input as {prompt: string}).prompt;
    return {request_id: "vision-test", response_url: "", status_url: "", cancel_url: ""};
  };
  fal.queue.status = async () => ({status: "COMPLETED", request_id: "vision-test", response_url: "", status_url: "", cancel_url: "", logs: []});
  fal.queue.result = async () => ({requestId: "vision-test", data: {output: JSON.stringify({status: "extracted", displayName: "Example", handle: "@example", followers: "47.8K", avatarKind: "non-person", confidence: 1, issues: []})}});
  try {
    const screenshotPath = join(dir, "screenshot.png");
    await writeFile(screenshotPath, "fixture");
    const result = await createFalOpenRouterQaProvider("mock-key").extractProfile({screenshotPath});
    assert.equal(result.status, "extracted");
    assert.equal(result.profile?.followers, "47.8K");
    await createFalOpenRouterQaProvider("mock-key").inspectAttempt({screenshotPath, characterPath: screenshotPath, contactSheetPath: screenshotPath, profile: result.profile!});
    assert.match(submittedPrompt, /Return false if a white page becomes gray or black/);
    assert.match(submittedPrompt, /surrounding page brightness stays unchanged/);
  } finally {
    fal.storage.upload = originalUpload;
    Object.assign(fal.queue, originalQueue);
    fal.config = originalConfig;
    await rm(dir, {recursive: true, force: true});
  }
});

test("ffprobe and volumedetect parsers handle ratios and silence", () => {
  assert.equal(parseFrameRate("24000/1001").toFixed(3), "23.976");
  assert.equal(parseMeanVolume("[Parsed_volumedetect] mean_volume: -inf dB"), Number.NEGATIVE_INFINITY);
  const media = parseProbe(JSON.stringify({streams: [{codec_type: "video", width: 768, height: 1366, avg_frame_rate: "24/1"}, {codec_type: "audio"}], format: {duration: "15.125"}}));
  assert.deepEqual(media, {durationSeconds: 15.125, fps: 24, width: 768, height: 1366, hasAudio: true});
});

test("semantic score treats page, follower count, pointing and one character as hard gates", () => {
  const base = {followersCountPreserved: true, pointsToFollowers: true, singleCharacter: true, pageAcceptablyStable: true, avatarExitCorrect: true, candleLit: true, celebrationVisible: true, candleCountPreserved: true, candleBlownOut: true, confidence: 1, evidenceFrames: [], issues: []};
  assert.deepEqual(semanticScore(base), {score: 100, hardPass: true});
  assert.deepEqual(semanticScore({...base, followersCountPreserved: false}), {score: 80, hardPass: false});
  for (const key of ["avatarExitCorrect", "candleLit", "celebrationVisible", "candleCountPreserved", "candleBlownOut"] as const) assert.equal(semanticScore({...base, [key]: false}).hardPass, false);
  assert.equal(semanticScore({...base, confidence: 0.5}).hardPass, false);
});

test("profile extraction validates fields and never confirms likeness rights", () => {
  const extracted = profileFromVisionObject({status: "extracted", displayName: "Example", handle: "@example", followers: "47.8K", avatarKind: "person", confidence: 0.96, issues: []});
  assert.equal(extracted.status, "extracted");
  assert.deepEqual(extracted.profile, {displayName: "Example", handle: "@example", followers: "47.8K", avatarKind: "person", rightsConfirmed: false});
  assert.equal(profileFromVisionObject({status: "extracted", displayName: "Example", handle: null, followers: "47.8K", avatarKind: "person", confidence: 0.96, issues: []}).status, "uncertain");
  assert.equal(profileFromVisionObject({status: "extracted", displayName: "Example", handle: "@example", followers: "47.8K", avatarKind: "person", confidence: 0.6, issues: []}).status, "uncertain");
});

test("avatar classification is based only on the circular avatar pixels", () => {
  const prompt = profileExtractionPrompt();
  assert.match(prompt, /never from the account name/);
  assert.match(prompt, /Use non-person for a rocket/);
  assert.match(prompt, /human face or human body is visibly present inside that circle/);
});
