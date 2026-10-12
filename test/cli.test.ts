import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtemp, rm, writeFile} from "node:fs/promises";
import {existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";

test("CLI validates effects and single-attempt settings before paid requests", async () => {
  const dir = await mkdtemp(join(tmpdir(), "milestone-cli-"));
  const profile = join(dir, "profile.json");
  const screenshot = join(dir, "screenshot.png");
  const prompt = join(dir, "prompt.txt");
  const unknown = join(dir, "unknown.txt");
  const empty = join(dir, "empty.txt");
  const out = join(dir, "job");
  await writeFile(profile, JSON.stringify({displayName: "Creator", handle: "@creator", followers: "15K", avatarKind: "non-person", rightsConfirmed: false}));
  await writeFile(screenshot, "Not read before the cost guard");
  await writeFile(prompt, "Celebrate {{followers}} with confetti.");
  await writeFile(unknown, "{{unknown}}");
  await writeFile(empty, "  ");
  const cli = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
  const run = (args: string[]) => spawnSync(process.execPath, ["--import", import.meta.resolve("tsx"), cli, ...args], {cwd: dir, env: {...process.env, FAL_KEY: "unused-test-key"}, encoding: "utf8", timeout: 15000});
  const base = ["generate", "--profile", profile, "--screenshot", screenshot, "--out", out, "--max-estimated-cost-usd", "0.001"];
  for (const extra of [[], ["--effect", "blow-out"], ["--prompt-file", prompt], ["--effect", "custom", "--prompt-file", prompt], ["--locale", "en"], ["--locale", "zh-CN"], ["--locale", "zh"]]) {
    const result = run([...base, ...extra]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Known generation estimate \$1\.28 exceeds/);
    assert.equal(existsSync(out), false);
  }
  for (const [extra, expected] of [
    [["--max-attempts", "2"], /Automatic retries are disabled/],
    [["--locale", "fr"], /Unsupported locale/],
    [["--effect"], /--effect.*argument missing/],
    [["--prompt-file"], /--prompt-file.*argument missing/],
    [["--prompt-file", empty], /non-empty/],
    [["--prompt-file", unknown], /Unknown custom prompt placeholder/],
    [["--effect", "blow-out", "--prompt-file", prompt], /requires --effect custom/],
  ] as const) {
    const result = run([...base, ...extra]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, expected);
    assert.equal(existsSync(out), false);
  }
  assert.match(run(["review"]).stderr, /review approval have been removed/);
});

test("CLI honors equals budgets and rejects malformed options before creating a job", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "milestone-cli-budget-"));
  t.after(() => rm(dir, {recursive: true, force: true}));
  const profile = join(dir, "profile.json");
  const screenshot = join(dir, "screenshot.png");
  const out = join(dir, "job");
  await writeFile(profile, JSON.stringify({displayName: "Creator", handle: "@creator", followers: "15K", avatarKind: "non-person", rightsConfirmed: false}));
  await writeFile(screenshot, "Invalid image prevents external requests even if validation regresses");
  const cli = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
  const base = ["generate", "--profile", profile, "--screenshot", screenshot, "--out", out];
  for (const [extra, expected] of [
    [["--max-estimated-cost-usd=0.001"], /Known generation estimate/],
    [["--max-estimated-cost-usd"], /argument missing|requires an argument|Missing/],
    [["--max-estimated-cost-usd="], /Missing/],
    [["--max-estimated-cost-usd", "--locale", "en"], /argument is ambiguous/],
    [["--max-estimated-cost-us", "0.001"], /Unknown option/],
    [["--character"], /argument missing|requires an argument|Missing/],
    [["--max-estimated-cost-usd", "0.001", "--max-estimated-cost-usd=3"], /Duplicate option/],
    [["--max-estimated-cost-usd", "0.001", "unexpected"], /Unexpected argument/],
    [["--max-estimated-cost-usd=0.001", "--effect=custom"], /non-empty/],
    [["--max-estimated-cost-usd=0.001", "--max-attempts=2"], /Automatic retries are disabled/],
  ] as const) {
    const result = spawnSync(process.execPath, ["--import", import.meta.resolve("tsx"), cli, ...base, ...extra], {cwd: dir, env: {...process.env, FAL_KEY: "unused-test-key"}, encoding: "utf8", timeout: 15000});
    assert.equal(result.status, 1);
    assert.match(result.stderr, expected);
    assert.equal(existsSync(out), false);
  }
});
