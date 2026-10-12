import assert from "node:assert/strict";
import test from "node:test";
import {parseProfile} from "../src/domain/profile.js";
import {getLocale, parseLocale} from "../src/locales/index.js";
import {getPlatform} from "../src/platforms/index.js";
import {buildMilestoneScene} from "../src/scenes/milestone.js";
import {renderH3Prompt} from "../src/providers/minimax-h3/prompt.js";
import {H3_MAX_PROMPT_VERSION, renderH3MaxPrompt} from "../src/providers/minimax-h3-max/prompt.js";

const profile = parseProfile({displayName: "Example", handle: "@example", followers: "47.8K", avatarKind: "non-person"});

test("English and Chinese closing captions preserve the visible count and normalize zh", () => {
  assert.equal(parseLocale("en"), "en");
  assert.equal(parseLocale("zh-CN"), "zh-CN");
  assert.equal(parseLocale("zh"), "zh-CN");
  assert.throws(() => parseLocale("fr"), /Supported: en, zh-CN/);
  for (const followers of ["392", "8,863", "181.9K", "1M"]) {
    assert.equal(getLocale("en").closingText({...profile, followers}), `Thank you for ${followers} followers`);
    assert.equal(getLocale("zh-CN").closingText({...profile, followers}), `感谢 ${followers} 位粉丝的支持`);
  }
});

test("profile validation rejects invalid follower counts", () => {
  assert.throws(() => parseProfile({...profile, followers: "many"}), /followers/);
});

test("English prompt uses the Twitter follower target and exact closing text", () => {
  const locale = getLocale("en");
  const prompt = renderH3Prompt(buildMilestoneScene(profile, getPlatform("twitter")));
  assert.match(prompt, /RIGHT-HAND "47\.8K Followers"/);
  assert.match(prompt, /never the LEFT-HAND Following/);
  assert.match(prompt, /wax candles are shaped as the exact visible milestone string "47\.8K"/);
  assert.match(prompt, /Preserve every digit, comma, decimal point, and K or M suffix exactly/);
  assert.equal(locale.closingText(profile), "Thank you for 47.8K followers");
});

test("milestone candle prompt preserves plain, K, and M follower formats", () => {
  for (const followers of ["9618", "15K", "1M"]) {
    const prompt = renderH3Prompt(buildMilestoneScene({...profile, followers}, getPlatform("twitter")));
    assert.match(prompt, new RegExp(`exact visible milestone string "${followers}"`));
    assert.match(prompt, new RegExp(`candle shapes remain intact and readable`));
  }
});

test("H3 Max prompt treats the screenshot as exact first frame and character as Image 1", () => {
  const prompt = renderH3MaxPrompt(buildMilestoneScene(profile, getPlatform("twitter")));
  assert.match(prompt, /exact first-frame image/);
  assert.match(prompt, /Image 1 is the cartoon character turnaround sheet/);
  assert.match(prompt, /Never duplicate the character/);
  assert.match(prompt, /exact visible milestone string "47\.8K"/);
});

test("H3 Max locks flat 2D foreground, existing empty space, and local candle highlights", () => {
  assert.equal(H3_MAX_PROMPT_VERSION, "h3-max-first-frame-milestone-candles-v4");
  for (const followers of ["8,863", "15K", "1M", "241.5M"]) {
    const prompt = renderH3MaxPrompt(buildMilestoneScene({...profile, followers}, getPlatform("twitter")));
    assert.match(prompt, /light 2D illustrated animation, clean outlines, flat colors/);
    assert.match(prompt, /character, cake, candles, and confetti are flat 2D foreground illustrations/);
    assert.match(prompt, /Never render these foreground elements in 3D/);
    assert.match(prompt, /same face, hair, outfit, colors, proportions, and illustration style/);
    assert.match(prompt, /existing empty area below the profile info/);
    assert.match(prompt, /existing canvas padding/);
    assert.match(prompt, /do not erase or move page content to make room/);
    assert.match(prompt, /small warm illustrated highlights only on the cake and the character's face/);
    assert.match(prompt, /The screenshot layer remains at its original brightness/);
    assert.ok(prompt.includes(`exact visible milestone string "${followers}"`));
    assert.doesNotMatch(prompt, /@Image\d|cartoon woman|one tall candle/);
  }
});

test("both video prompts preserve page brightness and use an outline instead of spotlight", () => {
  const scene = buildMilestoneScene(profile, getPlatform("twitter"));
  for (const render of [renderH3Prompt, renderH3MaxPrompt]) {
    const prompt = render(scene);
    assert.match(prompt, /original background color and brightness throughout/);
    assert.match(prompt, /thin gold outline/);
    assert.match(prompt, /Never darken the page/);
    assert.doesNotMatch(prompt, /warm spotlight lands/);
  }
});
