import {mkdir} from "node:fs/promises";
import {join} from "node:path";
import type {ImageRegion, ProfileVerification, QaEvidence, TechnicalQa} from "../domain/types.js";
import {run} from "../process.js";
import {parseProbe} from "./qa.js";

export interface EvidenceInput {
  screenshotPath: string;
  regions?: ProfileVerification["regions"];
  media: TechnicalQa;
}

export function mapScreenshotRegion(box: ImageRegion, screenshot: {width: number; height: number}, video: {width: number; height: number}): ImageRegion {
  const scale = Math.min(1080 / screenshot.width, 1920 / screenshot.height);
  const pageWidth = screenshot.width * scale;
  const pageHeight = screenshot.height * scale;
  const x = ((1080 - pageWidth) / 2 + box.x * pageWidth) * video.width / 1080;
  const y = ((1920 - pageHeight) / 2 + box.y * pageHeight) * video.height / 1920;
  const width = box.width * pageWidth * video.width / 1080;
  const height = box.height * pageHeight * video.height / 1920;
  // Retain surrounding context because the generated page may drift from the reference.
  const left = Math.max(0, Math.floor(x - width * 0.6));
  const top = Math.max(0, Math.floor(y - height * 0.75));
  return {x: left, y: top, width: Math.min(video.width - left, Math.ceil(width * 2.2)), height: Math.min(video.height - top, Math.ceil(height * 2.5))};
}

export async function createQaEvidence(source: string, outputDir: string, input: EvidenceInput): Promise<QaEvidence[]> {
  await mkdir(outputDir, {recursive: true});
  const screenshot = parseProbe(await run("ffprobe", ["-v", "error", "-show_streams", "-of", "json", input.screenshotPath], outputDir));
  const evidence: QaEvidence[] = [];
  const groups: Array<{name: "avatar" | "followers" | "celebration"; times: number[]; box?: ImageRegion}> = [
    {name: "avatar", times: [0.5, 1.5, 3], box: input.regions?.avatar},
    {name: "followers", times: [0, 5, 7], box: input.regions?.followers},
    {name: "celebration", times: [8, 9.5, 10.5, 12, 14]},
  ];
  for (const group of groups) {
    const box = group.box ? mapScreenshotRegion(group.box, screenshot, input.media) : undefined;
    const times = group.times.map((time) => Math.min(time, Math.max(0, input.media.durationSeconds - 0.1)));
    for (const [index, time] of times.entries()) {
      const filter = `${box ? `crop=${box.width}:${box.height}:${box.x}:${box.y},` : ""}scale=${box ? 480 : Math.min(768, input.media.width)}:-1`;
      await run("ffmpeg", ["-y", "-ss", String(time), "-i", source, "-vf", filter, "-frames:v", "1", join(outputDir, `${group.name}-${String(index + 1).padStart(2, "0")}.png`)], outputDir);
    }
    const path = join(outputDir, `${group.name}.jpg`);
    await run("ffmpeg", ["-y", "-framerate", "1", "-i", join(outputDir, `${group.name}-%02d.png`), "-vf", `tile=3x${Math.ceil(times.length / 3)}`, "-frames:v", "1", path], outputDir);
    evidence.push({path, region: box ? group.name : group.name === "celebration" ? "celebration" : "full", times});
  }
  return evidence;
}
