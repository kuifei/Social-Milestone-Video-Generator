import assert from "node:assert/strict";
import test from "node:test";
import {characterPrompt} from "../src/characters/prompt.js";
import {parseCharacterMode, validateCharacterPolicy} from "../src/characters/policy.js";
import type {Profile} from "../src/domain/types.js";

const base: Profile = {displayName: "Example", handle: "@example", followers: "15K", avatarKind: "non-person", rightsConfirmed: false};

test("unknown avatars stop but unconfirmed person rights do not block or become confirmed", () => {
  assert.throws(() => validateCharacterPolicy({...base, avatarKind: "unknown"}), /set it to "person" or "non-person"/);
  const person: Profile = {...base, avatarKind: "person"};
  assert.doesNotThrow(() => validateCharacterPolicy(person));
  assert.match(validateCharacterPolicy(person) ?? "", /authorization has not been confirmed.*Generation will continue/);
  assert.equal(person.rightsConfirmed, false);
  assert.equal(validateCharacterPolicy(base), null);
  assert.equal(validateCharacterPolicy({...person, rightsConfirmed: true}), null);
  assert.doesNotThrow(() => validateCharacterPolicy(base));
  assert.doesNotThrow(() => validateCharacterPolicy({...base, avatarKind: "person", rightsConfirmed: true}));
});

test("character modes distinguish avatar mascots from original generic characters", () => {
  assert.match(characterPrompt(base, "avatar"), /Use only the subject or mascot/);
  assert.match(characterPrompt(base, "generic"), /Do not copy or recreate/);
  assert.equal(parseCharacterMode("avatar"), "avatar");
  assert.equal(parseCharacterMode("generic"), "generic");
  assert.throws(() => parseCharacterMode("guess"), /Unsupported/);
});
