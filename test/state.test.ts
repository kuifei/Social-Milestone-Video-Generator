import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp, readFile, readdir, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {saveJson, withJobLock} from "../src/pipeline/state.js";
import {parseMaxAttempts} from "../src/domain/validation.js";
import {createMiniMaxH3MaxProvider} from "../src/providers/minimax-h3-max/index.js";
import {buildMilestoneScene} from "../src/scenes/milestone.js";
import {getPlatform} from "../src/platforms/index.js";

test("atomic manifest replacement leaves valid JSON and no temporary files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "milestone-state-"));
  try {
    await saveJson(join(dir, "result.json"), {value: 1});
    await saveJson(join(dir, "result.json"), {value: 2});
    assert.deepEqual(JSON.parse(await readFile(join(dir, "result.json"), "utf8")), {value: 2});
    assert.deepEqual(await readdir(dir), ["result.json"]);
  } finally { await rm(dir, {recursive: true, force: true}); }
});

test("job lock prevents concurrent work and releases after a failure", async () => {
  const dir = await mkdtemp(join(tmpdir(), "milestone-lock-"));
  try {
    await withJobLock(dir, async () => {
      await assert.rejects(withJobLock(dir, async () => {}));
    });
    await assert.rejects(withJobLock(dir, async () => { throw new Error("fixture failure"); }), /fixture failure/);
    assert.equal(await withJobLock(dir, async () => 42), 42);
    assert.deepEqual(await readdir(dir), []);
  } finally { await rm(dir, {recursive: true, force: true}); }
});

test("one H3 Max 768P attempt is the only automatic generation allowed", () => {
  assert.equal(parseMaxAttempts(), 1);
  for (const value of [NaN, Infinity, 0, 2, 3, 4, -1, 1.5, "", "abc", "--out"]) assert.throws(() => parseMaxAttempts(value));
  const request = createMiniMaxH3MaxProvider("unused-test-key").prepare({scene: buildMilestoneScene({displayName: "Example", handle: "@example", followers: "15K", avatarKind: "non-person", rightsConfirmed: false}, getPlatform("twitter")), screenshotPath: "unused", characterPath: "unused"});
  assert.equal(request.model, "minimax/h3-max/reference-to-video");
  assert.equal(request.resolution, "768P");
  assert.equal(parseMaxAttempts() * request.estimatedCost.estimatedUsd! + 0.08, 1.28);
});
