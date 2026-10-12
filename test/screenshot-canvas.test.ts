import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp, readFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {run} from "../src/process.js";
import {prepareScreenshotCanvas} from "../src/pipeline/screenshot-canvas.js";

test("screenshot canvas preserves the complete page for both wider and taller inputs", async () => {
  const dir = await mkdtemp(join(tmpdir(), "milestone-canvas-"));
  try {
    for (const size of [
      {source: "1200x1550", fitted: "1080:1395", offset: "0:262"},
      {source: "1200x2400", fitted: "960:1920", offset: "60:0"},
    ]) {
      const source = join(dir, `${size.source}.png`);
      const output = join(dir, `${size.source}-canvas.png`);
      await run("ffmpeg", ["-y", "-f", "lavfi", "-i", `testsrc=size=${size.source}`, "-frames:v", "1", source], dir);
      const original = await readFile(source);
      await prepareScreenshotCanvas(source, output, 1080, 1920);
      const probe = JSON.parse(await run("ffprobe", ["-v", "error", "-show_streams", "-of", "json", output], dir));
      assert.equal(probe.streams[0].width, 1080);
      assert.equal(probe.streams[0].height, 1920);
      // Removing only the padding must exactly recover the proportionally scaled page.
      const comparison = await run("ffmpeg", [
        "-i", source, "-i", output,
        "-filter_complex", `[0:v]scale=${size.fitted},setsar=1[expected];[1:v]crop=${size.fitted}:${size.offset},setsar=1[actual];[expected][actual]psnr`,
        "-frames:v", "1", "-f", "null", "-",
      ], dir);
      assert.match(comparison, /average:inf/);
      assert.deepEqual(await readFile(source), original);
    }
  } finally { await rm(dir, {recursive: true, force: true}); }
});
