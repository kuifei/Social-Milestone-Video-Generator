import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import test from "node:test";
import {resolveEffect, renderCustomEffect} from "../src/effects/index.js";
import {buildMilestoneScene} from "../src/scenes/milestone.js";
import {getPlatform} from "../src/platforms/index.js";
import {createMiniMaxH3MaxProvider} from "../src/providers/minimax-h3-max/index.js";
import {createMiniMaxH3Provider} from "../src/providers/minimax-h3/index.js";

const scene = buildMilestoneScene({displayName: "Creator", handle: "@creator", followers: "15K", avatarKind: "non-person", rightsConfirmed: false}, getPlatform("twitter"));
const input = {scene, screenshotPath: "/screenshot.png", characterPath: "/character.png"};

test("both providers default to peace-sign, keeping their own reference syntax and parameters", () => {
  for (const provider of [createMiniMaxH3MaxProvider("unused-test-key"), createMiniMaxH3Provider("unused-test-key")]) {
    const request = provider.prepare(input);
    assert.equal(request.effect?.id, "peace-sign");
    assert.equal(request.promptVersion, "follower-drop-peace-sign-v6");
    assert.equal(request.resolution, "768P");
    assert.equal(request.durationSeconds, 15);
    assert.deepEqual(request.settings, {promptExpansionMode: "disabled", enableSafetyChecker: true});
    assert.match(request.prompt, /index and middle fingers/);
    assert.doesNotMatch(request.prompt, /\b(?:blow\w*|exhal\w*|smok\w*)\b/i);
    if (provider.id === "minimax-h3-max") {
      assert.match(request.prompt, /exact first-frame image is the profile screenshot/);
      assert.match(request.prompt, /Image 1 is the cartoon character/);
      assert.equal(request.estimatedCost.estimatedUsd, 1.2);
    } else {
      assert.match(request.prompt, /Image 1 is the profile screenshot/);
      assert.match(request.prompt, /Image 2 is the cartoon character/);
    }
    const legacy = provider.prepare({...input, effect: {id: "blow-out"}});
    assert.equal(legacy.effect?.id, "blow-out");
    assert.match(legacy.prompt, /blow/i);
    assert.notEqual(legacy.promptVersion, request.promptVersion);
  }
});

test("custom text substitutes known values without evaluating JavaScript", () => {
  const template = "{{ followers }} {{displayName}} {{handle}} {{platform}} ${1+1}";
  const effect = resolveEffect(undefined, template);
  assert.equal(effect.id, "custom");
  assert.equal(effect.template, template);
  assert.equal(effect.templateHash, createHash("sha256").update(template).digest("hex"));
  assert.match(renderCustomEffect(effect, scene), /15K Creator @creator X\/Twitter \$\{1\+1\}/);
  const request = createMiniMaxH3MaxProvider("unused-test-key").prepare({...input, effect});
  assert.equal(request.promptVersion, `custom-v1-${effect.templateHash}`);
  assert.match(request.prompt, /Do not generate captions or dialogue/);
});

test("invalid effects and placeholders fail locally", () => {
  assert.throws(() => resolveEffect("other"), /Unsupported/);
  assert.throws(() => resolveEffect("custom"), /non-empty/);
  assert.throws(() => resolveEffect(undefined, "  "), /non-empty/);
  assert.throws(() => resolveEffect("peace-sign", "custom scene"), /requires --effect custom/);
  for (const placeholder of ["unknown", "constructor", "__proto__"]) {
    assert.throws(() => renderCustomEffect(resolveEffect("custom", `{{${placeholder}}}`), scene), /Unknown custom prompt placeholder/);
  }
});
