import {run} from "../process.js";
import {checkRemotionEnvironment} from "./remotion-renderer.js";

export async function checkExportEnvironment(): Promise<void> {
  for (const command of ["ffmpeg", "ffprobe"]) {
    try { await run(command, ["-version"], process.cwd()); } catch (error) {
      throw new Error(`Export preflight failed: ${command} must be installed and runnable on PATH before generation. ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  await checkRemotionEnvironment();
}
