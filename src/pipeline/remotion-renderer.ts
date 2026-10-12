import {bundle} from "@remotion/bundler";
import {openBrowser, renderMedia, selectComposition} from "@remotion/renderer";
import {cp, mkdir} from "node:fs/promises";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import type {VideoMetadata} from "../domain/types.js";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));

export async function checkRemotionEnvironment(): Promise<void> {
  try {
    const serveUrl = await bundle({entryPoint: join(projectRoot, "src/remotion/index.tsx")});
    const browser = await openBrowser("chrome");
    try {
      await selectComposition({serveUrl, id: "MilestoneVideo", inputProps: {closingText: "Preflight", durationSeconds: 15, fps: 24}, puppeteerInstance: browser});
    } finally { await browser.close({silent: true}); }
  } catch (error) {
    throw new Error(`Remotion export preflight failed; fix the local renderer/browser environment before generation: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function renderClosingOverlay(sourceVideo: string, closingText: string, outputPath: string, jobDir: string, media: VideoMetadata): Promise<void> {
  const publicDir = join(jobDir, "remotion-assets");
  await mkdir(publicDir, {recursive: true});
  await cp(sourceVideo, join(publicDir, "source.mp4"), {force: true});
  const inputProps = {closingText, durationSeconds: media.durationSeconds, fps: media.fps};
  const serveUrl = await bundle({entryPoint: join(projectRoot, "src/remotion/index.tsx"), publicDir});
  const composition = await selectComposition({serveUrl, id: "MilestoneVideo", inputProps});
  await renderMedia({composition, serveUrl, codec: "h264", outputLocation: outputPath, inputProps, overwrite: true});
}
