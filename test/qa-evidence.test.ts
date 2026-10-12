import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp, rm} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {run} from "../src/process.js";
import {createQaEvidence, mapScreenshotRegion} from "../src/pipeline/qa-evidence.js";

test("evidence preserves explicit before/after times and falls back to full frames without regions", async () => {
  const dir = await mkdtemp(join(tmpdir(), "milestone-evidence-"));
  try {
    const screenshotPath = join(dir, "screenshot.png");
    const videoPath = join(dir, "video.mp4");
    await run("ffmpeg", ["-y", "-f", "lavfi", "-i", "color=white:size=1200x1550", "-frames:v", "1", screenshotPath], dir);
    await run("ffmpeg", ["-y", "-f", "lavfi", "-i", "color=white:size=320x560:rate=24:duration=15", "-c:v", "libx264", "-preset", "ultrafast", videoPath], dir);
    const media = {width: 320, height: 560, durationSeconds: 15, fps: 24, hasAudio: false, audioIsSilent: null, technicalPass: true, issues: [], score: 100};
    const evidence = await createQaEvidence(videoPath, join(dir, "evidence"), {screenshotPath, media});
    assert.deepEqual(evidence.map((item) => item.region), ["full", "full", "celebration"]);
    assert.deepEqual(evidence[2].times, [8, 9.5, 10.5, 12, 14]);
    for (const item of evidence) {
      const probe = JSON.parse(await run("ffprobe", ["-v", "error", "-show_streams", "-of", "json", item.path], dir));
      assert.equal(probe.streams[0].width, 960);
      assert.ok(probe.streams[0].height >= 560);
    }
    const crop = mapScreenshotRegion({x: 0.2, y: 0.42, width: 0.25, height: 0.04}, {width: 1200, height: 1550}, media);
    assert.ok(crop.x >= 0 && crop.y >= 0);
    assert.ok(crop.width > 0 && crop.x + crop.width <= media.width);
    assert.ok(crop.height > 0 && crop.y + crop.height <= media.height);
  } finally { await rm(dir, {recursive: true, force: true}); }
});
