# Lauren V6 example

**English** · [中文](README.zh-CN.md)

The selected public example is the final Lauren V6 test generated on October 12, 2026: **15.125 seconds, 1080×1920, 24 fps, with audio**. The source profile is lauren (`@poteto`) with **181.9K Followers**.

[![Preview of the Lauren V6 export](preview.jpg)](video.mp4)

[Download / view the video](video.mp4) · [Input screenshot](screenshot.png) · [Character reference](character.png) · [Profile](profile.json)

## Media permissions

These media files are **only permitted for repository display and download**. Original copyright is retained; they are **excluded from MIT**. Commercial use, modification, republication, redistribution, and rehosting are not granted. See [MEDIA_LICENSE.txt](MEDIA_LICENSE.txt) for the maintainer's stated permission scope. The code license and `rightsConfirmed` flag do not expand media rights or imply endorsement.

## Reproduce the configuration

After cloning, installing dependencies, and setting `FAL_KEY` as described in the [main README](../../README.md), run from the repository root:

```bash
npm run dev -- generate \
  --profile examples/lauren/profile.json \
  --screenshot examples/lauren/screenshot.png \
  --character examples/lauren/character.png \
  --provider minimax-h3-max \
  --locale en \
  --platform twitter \
  --prompt-file examples/peace-sign-v6.zh-CN.txt \
  --max-attempts 1 \
  --max-estimated-cost-usd 1.50 \
  --out runs/lauren-v6-reproduction
```

This makes one **new paid video request** and uploads the screenshot and character reference to fal. The known estimate is US$1.20 plus possible reference-usage charges; actual billing is unknown. It reuses the supplied character. The permission described above does not grant a general right to generate or redistribute new derivatives: use this command only within separately obtained media permissions.

The released example used the **original Chinese V6 custom prompt** and an **English closing caption**, `Thank you for 181.9K followers`. The current built-in V6 is its English translation, so using the default without `--prompt-file` is not the exact tested configuration. Model generation is stochastic; the command reproduces settings, not identical frames.

[generation.json](generation.json) contains the frozen rendered prompt, settings, input/output SHA-256 hashes, and known limitations. It excludes local paths, fal request IDs, private service URLs, and credentials. Files match the selected local V6 export without re-encoding the video.

## Known Alpha defects

The avatar becomes an empty black circle and the embedded post image remains visible in inspected frames. The page still darkens, the cake still has a platter, and foot shadows and localized lighting remain. The final character closes its eyes, and minor UI/text drift can occur. These limitations are shown rather than hidden. `completed` means export finished, not quality-approved.
