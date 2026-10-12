import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp, rm} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {run} from "../src/process.js";
import {inspectVideo} from "../src/pipeline/qa.js";

test("reference-aware QA rejects global dimming without rejecting a dark source or local overlays", async () => {
  const dir = await mkdtemp(join(tmpdir(), "milestone-brightness-"));
  try {
    const reference = join(dir, "reference.png");
    const darkReference = join(dir, "dark-reference.png");
    for (const [path, color] of [[reference, "white"], [darkReference, "0x202020"]]) {
      await run("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `color=c=${color}:s=160x284`, "-frames:v", "1", path], dir);
    }
    const cases = [
      {name: "dimmed", color: "0x202020", filter: "null", reference, pass: false},
      {name: "local-overlay", color: "white", filter: "drawbox=x=20:y=80:w=40:h=50:color=black:t=fill", reference, pass: true},
      {name: "dark-source", color: "0x202020", filter: "null", reference: darkReference, pass: true},
      {name: "brief-dimming", color: "white", filter: "drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill:enable='lt(t,2)'", reference, pass: true},
    ];
    for (const item of cases) {
      const video = join(dir, `${item.name}.mp4`);
      await run("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `color=c=${item.color}:s=160x284:r=24:d=15`, "-f", "lavfi", "-i", "sine=frequency=440:duration=15", "-vf", item.filter, "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", video], dir);
      const qa = await inspectVideo(video, item.reference);
      assert.equal(qa.technicalPass, item.pass, item.name);
      assert.equal(qa.backgroundBrightness?.pass, item.pass, item.name);
      assert.equal(qa.backgroundBrightness?.samples.length, 5);
      if (!item.pass) assert.match(qa.issues.join(" "), /background.*darkened/i);
    }
    const noReference = await inspectVideo(join(dir, "dimmed.mp4"));
    assert.equal(noReference.backgroundBrightness, null);
  } finally { await rm(dir, {recursive: true, force: true}); }
});
