import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtemp, rm, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import test from "node:test";

test("export preflight identifies missing tools before attempting browser startup", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "milestone-preflight-"));
  t.after(() => rm(dir, {recursive: true, force: true}));
  const moduleUrl = new URL("../src/pipeline/preflight.ts", import.meta.url).href;
  const run = () => spawnSync(process.execPath, ["--import", import.meta.resolve("tsx"), "--input-type=module", "-e", `import {checkExportEnvironment} from ${JSON.stringify(moduleUrl)}; await checkExportEnvironment();`], {cwd: dir, env: {...process.env, PATH: dir}, encoding: "utf8", timeout: 15000});
  const missingFfmpeg = run();
  assert.equal(missingFfmpeg.status, 1);
  assert.match(missingFfmpeg.stderr, /ffmpeg must be installed and runnable/);
  if (process.platform === "win32") return;
  await writeFile(join(dir, "ffmpeg"), "#!/bin/sh\nexit 0\n", {mode: 0o755});
  const missingFfprobe = run();
  assert.equal(missingFfprobe.status, 1);
  assert.match(missingFfprobe.stderr, /ffprobe must be installed and runnable/);
  await writeFile(join(dir, "ffprobe"), "#!/bin/sh\nexit 1\n", {mode: 0o755});
  const brokenFfprobe = run();
  assert.equal(brokenFfprobe.status, 1);
  assert.match(brokenFfprobe.stderr, /ffprobe must be installed and runnable/);
});
