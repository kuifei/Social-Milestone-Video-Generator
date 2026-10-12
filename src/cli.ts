#!/usr/bin/env node
import {dirname, resolve} from "node:path";
import {randomUUID} from "node:crypto";
import {access, mkdir, readFile, writeFile} from "node:fs/promises";
import {existsSync} from "node:fs";
import {parseArgs} from "node:util";
import {loadProfile} from "./domain/profile.js";
import {parseLocale} from "./locales/index.js";
import {parsePlatform} from "./platforms/index.js";
import {createMiniMaxH3Provider} from "./providers/minimax-h3/index.js";
import {createMiniMaxH3MaxProvider} from "./providers/minimax-h3-max/index.js";
import type {ProviderId} from "./domain/types.js";
import type {VideoProvider} from "./providers/types.js";
import {createNanoBananaCharacterProvider} from "./characters/nano-banana-2.js";
import {parseCharacterMode, validateCharacterPolicy} from "./characters/policy.js";
import {createFalOpenRouterQaProvider} from "./qa/fal-openrouter.js";
import {resumePipeline, runPipeline} from "./pipeline/run.js";
import {inspectVideo} from "./pipeline/qa.js";
import {getPlatform} from "./platforms/index.js";
import {buildMilestoneScene} from "./scenes/milestone.js";
import {parseMaxAttempts} from "./domain/validation.js";
import {resolveEffect} from "./effects/index.js";

let options: Record<string, string | undefined> = {};

function option(name: string): string | undefined { return options[name]; }

function required(name: string): string {
  const value = option(name);
  if (!value || value.startsWith("--")) throw new Error(`Missing --${name}.`);
  return value;
}

function parseProvider(value: string): ProviderId {
  if (value !== "minimax-h3" && value !== "minimax-h3-max") throw new Error(`Unsupported --provider "${value}". Supported: minimax-h3, minimax-h3-max.`);
  return value;
}

function createVideoProvider(id: ProviderId, apiKey: string): VideoProvider {
  return id === "minimax-h3-max" ? createMiniMaxH3MaxProvider(apiKey) : createMiniMaxH3Provider(apiKey);
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command === "--help" || command === "-h") {
    console.log(`Usage: milestone-video <command> [options]

Commands:
  profile   --screenshot <image> --out <profile.json>
  generate  --profile <profile.json> --screenshot <image> [--out <directory>]
  resume    --job <directory>
  qa        --video <video> [--reference <image>]

Generate options:
  --character <image>          Reuse a character reference
  --locale <en|zh-CN>          Closing caption language (default: en)
  --platform <twitter>        Social platform (default: twitter)
  --provider <minimax-h3-max|minimax-h3>
  --character-mode <avatar|generic>
  --effect <peace-sign|blow-out|custom>
  --prompt-file <text>         Custom UTF-8 choreography
  --max-attempts <1>          One paid generation per job
  --max-estimated-cost-usd <number> (default: 3)

Requires Node.js 22+, FFmpeg and FFprobe on PATH.
Set FAL_KEY in the current directory's .env or process environment for paid commands.
Documentation: https://github.com/kuifei/Social-Milestone-Video-Generator#readme`);
    return;
  }
  if (command === "--version" || command === "-v") {
    const {version} = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {version: string};
    console.log(version);
    return;
  }
  const commandOptions: Record<string, string[]> = {
    profile: ["screenshot", "out"],
    generate: ["profile", "screenshot", "character", "locale", "platform", "provider", "character-mode", "max-attempts", "effect", "prompt-file", "max-estimated-cost-usd", "out"],
    resume: ["job"],
    qa: ["video", "reference"],
  };
  if (!command || !Object.hasOwn(commandOptions, command)) {
    throw new Error("Usage: milestone-video <profile|generate|resume|qa>. Automatic QA and review approval have been removed; see README.md.");
  }
  const parsed = parseArgs({args: process.argv.slice(3), options: Object.fromEntries(commandOptions[command].map((name) => [name, {type: "string" as const}])), strict: true, tokens: true});
  const seen = new Set<string>();
  for (const token of parsed.tokens) {
    if (token.kind !== "option") continue;
    if (seen.has(token.name)) throw new Error(`Duplicate option --${token.name}.`);
    if (!token.value) throw new Error(`Missing --${token.name}.`);
    seen.add(token.name);
  }
  options = parsed.values;
  if (existsSync(".env")) process.loadEnvFile(".env");
  if (command === "qa") {
    console.log(JSON.stringify(await inspectVideo(resolve(required("video")), option("reference") ? resolve(required("reference")) : undefined), null, 2));
    return;
  }
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) throw new Error("Set FAL_KEY in .env or the server environment.");
  if (command === "profile") {
    const screenshotPath = resolve(required("screenshot"));
    const outputPath = resolve(required("out"));
    await access(screenshotPath);
    if (existsSync(outputPath)) throw new Error("Profile output already exists; choose a new --out path.");
    const extraction = await createFalOpenRouterQaProvider(apiKey).extractProfile({screenshotPath});
    if (extraction.status !== "extracted" || !extraction.profile) {
      console.log(JSON.stringify(extraction, null, 2));
      throw new Error("Profile extraction was uncertain; no profile file was written.");
    }
    await mkdir(dirname(outputPath), {recursive: true});
    await writeFile(outputPath, `${JSON.stringify(extraction.profile, null, 2)}\n`, {flag: "wx"});
    console.log(JSON.stringify({outputPath, profile: extraction.profile, confidence: extraction.confidence, issues: extraction.issues, cost: extraction.cost}, null, 2));
    return;
  }
  if (command === "resume") {
    const outputDir = resolve(required("job"));
    const plan = JSON.parse(await readFile(resolve(outputDir, "plan.json"), "utf8")) as {provider: string};
    const dependencies = {
      videoProvider: createVideoProvider(parseProvider(plan.provider), apiKey),
      characterProvider: createNanoBananaCharacterProvider(apiKey),
    };
    const result = await resumePipeline(outputDir, dependencies);
    console.log(JSON.stringify({outputDir, result}, null, 2));
    if (result.status !== "completed") process.exitCode = 1;
    return;
  }
  const profilePath = resolve(required("profile"));
  const screenshotPath = resolve(required("screenshot"));
  const characterPath = option("character") ? resolve(required("character")) : undefined;
  await Promise.all([access(profilePath), access(screenshotPath), ...(characterPath ? [access(characterPath)] : [])]);
  const profile = await loadProfile(profilePath);
  validateCharacterPolicy(profile);
  const locale = parseLocale(option("locale") ?? "en");
  const platform = parsePlatform(option("platform") ?? "twitter");
  const videoProvider = createVideoProvider(parseProvider(option("provider") ?? "minimax-h3-max"), apiKey);
  const characterMode = parseCharacterMode(option("character-mode") ?? "avatar");
  const maxAttempts = parseMaxAttempts(option("max-attempts") ?? 1);
  const effect = resolveEffect(option("effect"), option("prompt-file") ? await readFile(resolve(required("prompt-file")), "utf8") : undefined);
  const prepared = videoProvider.prepare({scene: buildMilestoneScene(profile, getPlatform(platform)), screenshotPath, characterPath: characterPath ?? screenshotPath, effect});
  const estimatedGenerationCost = maxAttempts * (prepared.estimatedCost.estimatedUsd ?? 0) + (characterPath ? 0 : 0.08);
  const maxEstimatedCost = Number(option("max-estimated-cost-usd") ?? 3);
  if (!Number.isFinite(maxEstimatedCost) || maxEstimatedCost <= 0) throw new Error("--max-estimated-cost-usd must be a positive number.");
  if (estimatedGenerationCost > maxEstimatedCost) throw new Error(`Known generation estimate $${estimatedGenerationCost.toFixed(2)} exceeds the $${maxEstimatedCost.toFixed(2)} limit. Reference-usage surcharges may be additional.`);
  const outputDir = resolve(option("out") ?? `runs/${randomUUID()}`);
  const dependencies = {videoProvider, characterProvider: createNanoBananaCharacterProvider(apiKey)};
  const result = await runPipeline({
    outputDir,
    profile,
    profilePath,
    screenshotPath,
    characterPath,
    characterMode,
    locale,
    platform,
    maxAttempts,
    effect,
  }, dependencies);
  console.log(JSON.stringify({outputDir, result}, null, 2));
  if (result.status !== "completed") process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
