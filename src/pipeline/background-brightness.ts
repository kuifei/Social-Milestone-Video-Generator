import type {TechnicalQa} from "../domain/types.js";
import {run} from "../process.js";

async function meanLuma(path: string, timeSeconds?: number): Promise<number> {
  const output = await run("ffmpeg", [
    "-hide_banner", ...(timeSeconds === undefined ? [] : ["-ss", String(timeSeconds)]), "-i", path,
    "-vf", "scale=160:-2,signalstats,metadata=print:key=lavfi.signalstats.YAVG",
    "-frames:v", "1", "-f", "null", "-",
  ], process.cwd());
  const match = output.match(/lavfi\.signalstats\.YAVG=([\d.]+)/);
  const value = match ? Number(match[1]) : NaN;
  if (!Number.isFinite(value)) throw new Error("Background brightness could not be measured.");
  return value;
}

export async function inspectBackgroundBrightness(videoPath: string, referencePath: string, durationSeconds: number): Promise<NonNullable<TechnicalQa["backgroundBrightness"]>> {
  const referenceMeanLuma = await meanLuma(referencePath);
  const samples = [];
  for (const time of [1, 4, 7, 10, 13]) {
    const timeSeconds = Math.min(time, Math.max(0, durationSeconds - 0.1));
    const value = await meanLuma(videoPath, timeSeconds);
    // Relative comparison preserves dark screenshots; majority voting tolerates local effects.
    const darkened = referenceMeanLuma - value >= 40 && value < referenceMeanLuma * 0.65;
    samples.push({timeSeconds, meanLuma: value, darkened});
  }
  return {pass: samples.filter((item) => item.darkened).length < 3, referenceMeanLuma, samples};
}
