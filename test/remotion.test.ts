import assert from "node:assert/strict";
import test from "node:test";
import {calculateMilestoneMetadata} from "../src/remotion/index.js";

test("Remotion duration follows source metadata", async () => {
  const metadata = await calculateMilestoneMetadata({props: {closingText: "Thanks", durationSeconds: 15.125, fps: 24}, defaultProps: {closingText: "Thanks", durationSeconds: 15, fps: 24}, compositionId: "MilestoneVideo", abortSignal: new AbortController().signal, isRendering: true});
  assert.equal(metadata.durationInFrames, 363);
  assert.equal(metadata.fps, 24);
});
