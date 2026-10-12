# Example templates

**English** · [中文](README.zh-CN.md)

These files are input schemas and prompt templates. The curated Lauren directory includes the selected public screenshot and video under separate media permissions; other private tests and credentials are excluded.

| File | Purpose |
| --- | --- |
| `lauren/` | Selected V6 screenshot, video, reference, reproduction settings, and media notice |
| `profile.json` | Edit the identity, count, avatar category, and rights record before use |
| `peace-sign-v6.txt` | English V6, matching the built-in default |
| `peace-sign-v6.zh-CN.txt` | Original Chinese V6 used for the Lauren test; choose explicitly with `--prompt-file` to reproduce its language |
| `peace-sign-v4.txt`, `peace-sign-v5.txt` | Historical experiments, not defaults |
| `custom-effect.txt` | Small custom-choreography example |

`--locale` controls the exact closing caption, independently of the model prompt's language. A template never establishes visual quality or rights to third-party media. See the [main README](../README.md) for known V6 defects, commands, and costs.
