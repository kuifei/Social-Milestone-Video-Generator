import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {buildMilestoneScene} from "../src/scenes/milestone.js";
import {getPlatform} from "../src/platforms/index.js";
import {PEACE_SIGN_PROMPT_VERSION, PEACE_SIGN_TEMPLATE, renderPeaceSignPrompt} from "../src/effects/peace-sign.js";

const scene = (followers: string) => buildMilestoneScene({displayName: "Example", handle: "@example", followers, avatarKind: "person", rightsConfirmed: false}, getPlatform("twitter"));

test("default V6 and the published English template stay aligned", () => {
  assert.equal(PEACE_SIGN_PROMPT_VERSION, "follower-drop-peace-sign-v6");
  assert.equal(PEACE_SIGN_TEMPLATE, readFileSync(new URL("../examples/peace-sign-v6.txt", import.meta.url), "utf8"));
});

test("V6 targets Followers and preserves exact formats in the numeric candle copy", () => {
  for (const followers of ["392", "8,863", "181.9K", "1M", "241.5M"]) {
    const prompt = renderPeaceSignPrompt(scene(followers));
    assert.ok(prompt.includes(`RIGHT-HAND "${followers} Followers"`));
    assert.ok(prompt.includes(`Together the candles read only "${followers}"`));
    assert.match(prompt, /Never use the LEFT-HAND Following/);
    assert.match(prompt, /original UI statistic remains untouched/);
    assert.match(prompt, /whole group follows a short arc/);
    assert.doesNotMatch(prompt, /\{\{|@Image\d/);
  }
});

test("V6 removes the old dimming and retained-avatar instructions", () => {
  const prompt = renderPeaceSignPrompt(scene("15K"));
  assert.match(prompt, /empty solid-black disk/);
  assert.match(prompt, /first frame's bright white color throughout/);
  assert.match(prompt, /Thumbnails are static images/);
  assert.match(prompt, /no plate, board, or support/);
  assert.match(prompt, /Do not add a table, floor, pedestal, shadow, or curtain/);
  assert.match(prompt, /knees slightly/);
  assert.match(prompt, /Do not erase posts, pictures, or padding/);
  assert.match(prompt, /matte, colored wax/);
  assert.match(prompt, /eyes open, and a relaxed closed-mouth smile/);
  assert.match(prompt, /index and middle fingers extended/);
  assert.doesNotMatch(prompt, /dimming is acceptable|Keep the original avatar image in place|render the Thank you/);
});
