import type {TechnicalQa} from "../domain/types.js";
import {run} from "../process.js";
import {inspectBackgroundBrightness} from "./background-brightness.js";
import {parseProbe} from "./media.js";
export {parseFrameRate, parseProbe} from "./media.js";

export function parseMeanVolume(raw: string): number | null {
  const match = raw.match(/mean_volume:\s*(-?(?:\d+(?:\.\d+)?|inf))\s*dB/i);
  if (!match) return null;
  return match[1] === "-inf" ? Number.NEGATIVE_INFINITY : Number(match[1]);
}

export async function inspectVideo(path: string, referencePath?: string): Promise<TechnicalQa> {
  const raw = await run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", path], process.cwd());
  const media = parseProbe(raw);
  let audioIsSilent: boolean | null = null;
  if (media.hasAudio) {
    const volumeOutput = await run("ffmpeg", ["-hide_banner", "-i", path, "-af", "volumedetect", "-f", "null", "-"], process.cwd());
    const meanVolume = parseMeanVolume(volumeOutput);
    audioIsSilent = meanVolume === null ? null : meanVolume <= -55;
  }
  const issues: string[] = [];
  if (!media.width || !media.height) issues.push("Video stream is missing.");
  if (!media.hasAudio) issues.push("Audio stream is missing.");
  if (audioIsSilent === true) issues.push("Audio is effectively silent.");
  if (media.durationSeconds < 14 || media.durationSeconds > 17) issues.push("Duration is outside 14-17 seconds.");
  if (media.width >= media.height) issues.push("Video is not portrait-oriented.");
  if (!media.fps) issues.push("Frame rate could not be determined.");
  const backgroundBrightness = referencePath && media.width && media.height && media.durationSeconds > 0 ? await inspectBackgroundBrightness(path, referencePath, media.durationSeconds) : null;
  if (backgroundBrightness?.pass === false) issues.push("Profile background was substantially darkened versus the reference in most sampled frames.");
  return {...media, audioIsSilent, backgroundBrightness, issues, technicalPass: issues.length === 0, score: Math.max(0, 100 - issues.length * 20)};
}

export function failedQa(message: string): TechnicalQa {
  return {technicalPass: false, score: 0, durationSeconds: 0, fps: 0, width: 0, height: 0, hasAudio: false, audioIsSilent: null, issues: [message]};
}

export async function createContactSheet(videoPath: string, outputPath: string): Promise<void> {
  await run("ffmpeg", ["-y", "-i", videoPath, "-vf", "fps=8/15,scale=270:-1,tile=4x2", "-frames:v", "1", outputPath], process.cwd());
}
