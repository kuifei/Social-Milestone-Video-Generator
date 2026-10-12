<div align="center">

# Milestone Video

Turn an X profile screenshot into a 15-second animated follower celebration.

**English** · [中文](README.zh-CN.md)

**v0.1 Developer Alpha** · TypeScript CLI · fal + MiniMax · Remotion · [MIT](LICENSE)

</div>

Milestone Video creates an illustrated character from a profile avatar, animates it leaving the avatar and celebrating the follower count with a cake, and exports a 1080×1920 video with exact closing text. English is the default output language; Simplified Chinese is also supported.

This is a developer Alpha. The workflow is **one generation → direct export → user review**. `completed` means the file was exported, not that the visuals, profile data, or media permissions passed verification. The repository is used by cloning and running locally; a standalone npm release is not available.

## Public example

[![Lauren V6 preview](examples/lauren/preview.jpg)](examples/lauren/video.mp4)

[Lauren V6 example and reproduction command](examples/lauren/README.md) · [Download video](examples/lauren/video.mp4)

This is the selected final V6 export, generated with the original Chinese prompt and an English closing caption. Its screenshot, reference, profile, exact settings, and limitations are included. Media is **repository display/download only, excluded from MIT**; see the [media notice](examples/lauren/MEDIA_LICENSE.txt).

## Quick start

Requirements: Node.js 22+, FFmpeg and FFprobe on `PATH`, and a fal API key. Chinese output also needs a CJK font installed (for example, Noto Sans CJK SC on Linux; macOS and Windows use system fallbacks).

```bash
git clone https://github.com/kuifei/Social-Milestone-Video-Generator.git
cd Social-Milestone-Video-Generator
npm ci
cp .env.example .env
```

Set `FAL_KEY` in the root `.env` file or the process environment. Character and video generation use the same fal key. Keep credentials out of commits and logs.

Copy `examples/profile.json` to `profiles/creator.json` (create the directory first). Edit the name, handle, follower count, avatar category, and rights record to match your screenshot. Then run:

```bash
npm run dev -- generate \
  --profile profiles/creator.json \
  --screenshot /absolute/path/x-profile.png \
  --out runs/creator-v1
```

The default is English, X/Twitter, MiniMax H3 Max, 768P, 15 seconds, and the V6 `peace-sign` effect. Without `--character`, Nano Banana 2 generates a character sheet first. The result is `runs/creator-v1/final.mp4`.

For a Chinese closing caption:

```bash
npm run dev -- generate \
  --profile profiles/creator.json \
  --screenshot /absolute/path/x-profile.png \
  --locale zh-CN \
  --out runs/creator-zh
```

`--locale en` produces `Thank you for 47.8K followers`; `--locale zh-CN` produces `感谢 47.8K 位粉丝的支持`. `zh` is an alias for `zh-CN`. The visible count keeps its exact format. The locale changes the closing caption; CLI diagnostics remain English, the screenshot keeps its original language, and built-in model instructions use English in both locales.

Before paid generation, the CLI checks FFmpeg, FFprobe, Remotion bundling, browser startup, and composition loading. The first check may download Chrome Headless Shell and requires internet and local HTTP server access. This checks export readiness, not visual quality.

## Default V6 effect

The built-in prompt version is `follower-drop-peace-sign-v6`. Its English template is [peace-sign-v6.txt](examples/peace-sign-v6.txt); the original Chinese template used in the Lauren test is [peace-sign-v6.zh-CN.txt](examples/peace-sign-v6.zh-CN.txt).

The prompt requests:

1. A brief preparation, hands on the avatar rim, feet stepping out, a short hop, knee compression, and a natural settling motion.
2. An empty black circle inside the departed main avatar, with the rest of the page and embedded thumbnails fixed at their original brightness.
3. A gesture toward Followers, followed by a cake and an aligned copy of the exact count becoming matte colored number-candles.
4. Lit candles, a V gesture, and gentle paper confetti, with the original page visible below the feet and cake.
5. No generated captions. Remotion adds the localized closing text during the last three seconds.

These are prompt requests, not pixel guarantees. The Chinese V6 Lauren test retained the embedded post image and emptied the avatar, but still dimmed the page, added a cake platter and foot shadows, and closed the character's eyes in the final pose. The English translation has passed local checks and has not had a separate paid comparison. A default setting does not imply these defects are fixed.

The first-frame screenshot is fitted proportionally onto a white 1080×1920 canvas without cropping or stretching. H3 Max uses it as `image_url`, with the character sheet as its only reference. Optional H3 uses two ordered references. Remotion follows the source duration/fps, keeps the audio, uses `contain`, and adds a local light caption panel.

## Profiles and characters

You can edit the profile JSON yourself or request one paid extraction:

```bash
npm run dev -- profile --screenshot /absolute/path/x-profile.png --out profiles/draft.json
```

Extraction uses Gemini 2.5 Flash through fal OpenRouter. Uncertain handle/count data is not written, and existing files are not overwritten. Check Followers versus Following yourself. Extraction sets `rightsConfirmed: false`; public visibility alone does not confirm rights. Generation trusts your profile and does not run another verification request.

| Option | Behavior |
| --- | --- |
| `avatarKind: "person"` | Creates an illustrated character; unconfirmed rights produce a non-blocking warning |
| `avatarKind: "non-person"` | Turns the visible animal, object, or logo into a mascot |
| `avatarKind: "unknown"` | Must be resolved before generation |
| `--character-mode generic` | Creates an original mascot rather than copying the avatar |
| `--character /path/turnaround.png` | Reuses a character sheet and skips the character-generation fee |

Rights records are retained as supplied. They do not automatically grant public distribution or MIT licensing for media.

## Other effects and providers

```bash
# Previous blow-out choreography
npm run dev -- generate --profile profiles/creator.json \
  --screenshot /absolute/path/x-profile.png --effect blow-out --out runs/blow-out

# Custom UTF-8 choreography
npm run dev -- generate --profile profiles/creator.json \
  --screenshot /absolute/path/x-profile.png \
  --prompt-file examples/custom-effect.txt --out runs/custom
```

`--prompt-file` selects `custom` automatically. Explicit `--effect custom` also works; combining a prompt file with a built-in effect fails locally. Supported placeholders: `{{followers}}`, `{{displayName}}`, `{{handle}}`, `{{platform}}`. Unknown word placeholders fail before spending. Substitution never evaluates code.

Custom text controls the choreography. The provider owns reference notation, duration, resolution, and API parameters, and adds preservation/audio/caption instructions. The raw template, SHA-256 hash, rendered prompt, and settings are frozen in the job plan. Historical V4/V5 templates remain available for explicit comparisons.

`--provider minimax-h3` selects the optional H3 provider; `minimax-h3-max` is the default. X/Twitter is the only implemented platform. Chinese closing captions do not add support for Chinese social platforms or translate the source UI.

## Costs and regeneration

Static estimates in the code are US$1.20 for a 15-second H3 Max video and US$0.08 for a new character (US$1.28 combined). Reference-usage charges may be additional; actual charges remain `null` when unknown. Profile extraction is a separate paid request.

`--max-estimated-cost-usd 3` is the default guard for known character/video estimates, not an all-inclusive billing cap. Options accept `--name value` and `--name=value`; unknown/duplicate options, missing values, and unexpected positional arguments fail locally. `--max-attempts` accepts only `1`. There are no automatic quality retries.

To generate again, choose a new output directory. Reusing a character avoids another character fee:

```bash
npm run dev -- generate --profile profiles/creator.json \
  --screenshot /absolute/path/x-profile.png \
  --character runs/creator-v1/input/character.png --out runs/creator-v2
```

This submits a new paid video request. Existing job directories are never overwritten.

## Recovery and diagnostics

```bash
npm run dev -- resume --job runs/creator-v1
npm run dev -- qa --video /absolute/path/video.mp4
```

`resume` uses the saved request ID or downloaded footage and the frozen prompt/settings. It recovers the existing job, including jobs created with older default prompts. It does not update them to V6 or create a quality candidate. Completed jobs are returned unchanged. Known-ID polling/download failures can recover; metadata/render failures reuse the raw clip. Unknown submissions without an ID, safety refusals, and invalid terminal responses require provider reconciliation rather than blind resubmission.

| Status | Meaning |
| --- | --- |
| `completed` | `final.mp4` was exported |
| `failed` | Character generation, metadata reading, or rendering failed; inspect the reason |
| `needs_review` | An uncertain/interrupted/terminal provider outcome needs recovery or reconciliation |

The optional local `qa` command does not upload media, change job status, or submit generation. `--reference /path/screenshot.png` enables reference-based brightness diagnostics. Generation/resume never run automatic quality checks, candidate scoring, or an approval command. Historical QA records are retained.

## Project layout

```text
README.md / README.zh-CN.md       English / Chinese documentation
docs/                            Architecture maps and historical findings
examples/                        Templates and curated Lauren media with separate permissions
src/
  cli.ts                         Commands and English-first defaults
  locales/                       en / zh-CN closing captions
  effects/                       V6 peace-sign, alternatives, custom substitution
  platforms/                     X/Twitter labels and layout semantics
  characters/                    Character policy and Nano Banana provider
  providers/                     fal transport and MiniMax adapters
  pipeline/                      Snapshots, recovery, metadata, and export
  remotion/                      Video composition and exact closing caption
test/                            Local regression tests
inputs/ / profiles/ / runs/       Ignored local data
```

A job saves input snapshots, `plan.json`, `attempts/01/raw.mp4`, `final.mp4`, `result.json`, and renderer working files. Custom jobs also save `input/custom-prompt.txt`. The result records request IDs, model/prompt version, costs, media metadata, paths, and `qualityGate: "disabled"`. Atomic JSON writes and a local job lock protect recovery records. New jobs do not automatically create contact sheets or review reports.

Explore the offline [English architecture map](docs/architecture-flow.html) or [中文架构图](docs/architecture-flow.zh-CN.html). Free template rendering, handwriting overlays, number rolling, green-screen compositing, and other platforms are not implemented.

## Development

```bash
npm run typecheck
npm test
npm run build
```

Tests cover prompt/count handling, locale captions, strict CLI validation, one-request export, frozen-job recovery, cost deduplication, and diagnostic helpers. They do not establish generated visual quality. No paid request is needed to run the local suite.

## License and media

Code is licensed under [MIT](LICENSE), copyright 2026 Milestone Video contributors. Dependencies and hosted services retain their own licenses and terms, including [Remotion's license](https://www.remotion.dev/license). Project MIT licensing grants no rights to screenshots, avatars, or generated derivatives of third-party media.

`.env`, `inputs/`, `profiles/`, and `runs/` are excluded from Git and npm packaging. Publish only deliberately selected examples with clear media permissions; existing third-party media rights are separate from the code license. The selected Lauren media is included only under examples/lauren/ with its separate permission notice, and is excluded from npm packaging. Other local test inputs and run records remain excluded.

Release notes: [v0.1.0-alpha.1](docs/releases/v0.1.0-alpha.1.md).
