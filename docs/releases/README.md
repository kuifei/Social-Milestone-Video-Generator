# Release preparation

**English** · [中文](README.zh-CN.md)

Prepared release: **v0.1 Developer Alpha**, tag `v0.1.0-alpha.1`, GitHub **Pre-release**. The current source package is private and is not being published to npm.

## Remote history and authentication

On October 12, 2026, GitHub CLI authentication was verified for `kuifei`, with HTTPS Git access and administrator permission on `kuifei/Social-Milestone-Video-Generator`. The repository was **Private**, with one initial commit (`eafa5210c3b05d6fc48aaa61329f6869e43f0aee`), containing `.gitignore` and `LICENSE`, and no releases.

Authenticate Git through your preferred existing GitHub mechanism. Do not paste tokens into chat or embed them in the remote URL. Once authenticated, fetch and inspect the current remote history again before committing. Do not force-push over the initial commit or create an unrelated root history.

The initial commit was fetched and set as the local base while preserving working files. Continue that history with a normal commit and push. The source release retains the original Quincy copyright notice and the existing `.env*.local` and `*.pem` exclusions, adds project data/build exclusions, and explicitly excludes Lauren media from MIT.

## Final checks

```bash
npm ci
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

Review the complete Git candidate set for credentials and unintended local data. Only curated `examples/lauren/` media belongs in the release; `.env`, `inputs/`, `profiles/`, and `runs/` remain excluded. The Lauren files are excluded from npm packaging because their permission is limited to repository display/download.

## Publish

After source and example review, push a commit continuing the remote history. Create the `v0.1.0-alpha.1` release from that reviewed commit, set the title to **v0.1 Developer Alpha**, use [the release notes](v0.1.0-alpha.1.md), and check **Set as a pre-release**. Resolve relative links to repository URLs when copying these notes into a GitHub release body. Keeping the media in the repository avoids duplicating it as unrelated release attachments.

The repository currently remains Private. A public example requires a separate visibility change to Public at publication time. Confirm that final visibility change and release before applying it. This preparation document does not claim that a push, visibility change, tag, or release has occurred.
