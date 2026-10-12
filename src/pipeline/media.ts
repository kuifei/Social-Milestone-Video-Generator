import type {VideoMetadata} from "../domain/types.js";
import {run} from "../process.js";

interface ProbeData {
  streams?: Array<{codec_type: string; width?: number; height?: number; avg_frame_rate?: string; r_frame_rate?: string}>;
  format?: {duration?: string};
}

export function parseFrameRate(value: string | undefined): number {
  if (!value) return 0;
  const [numerator, denominator = "1"] = value.split("/");
  const rate = Number(numerator) / Number(denominator);
  return Number.isFinite(rate) && rate > 0 ? rate : 0;
}

export function parseProbe(raw: string): VideoMetadata {
  const data = JSON.parse(raw) as ProbeData;
  const streams = data.streams ?? [];
  const video = streams.find((stream) => stream.codec_type === "video");
  return {durationSeconds: Number(data.format?.duration ?? 0), fps: parseFrameRate(video?.avg_frame_rate) || parseFrameRate(video?.r_frame_rate), width: video?.width ?? 0, height: video?.height ?? 0, hasAudio: streams.some((stream) => stream.codec_type === "audio")};
}

export async function readVideoMetadata(path: string): Promise<VideoMetadata> {
  const media = parseProbe(await run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", path], process.cwd()));
  if ([media.durationSeconds, media.fps, media.width, media.height].some((value) => !Number.isFinite(value) || value <= 0)) throw new Error("Video metadata is invalid; Remotion cannot render this file.");
  return media;
}
