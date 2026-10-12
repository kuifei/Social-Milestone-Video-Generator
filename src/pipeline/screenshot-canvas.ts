import {dirname} from "node:path";
import {run} from "../process.js";

export async function prepareScreenshotCanvas(source: string, output: string, width: number, height: number): Promise<void> {
  await run("ffmpeg", [
    "-y", "-i", source,
    "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=white,setsar=1`,
    "-frames:v", "1", output,
  ], dirname(output));
}
