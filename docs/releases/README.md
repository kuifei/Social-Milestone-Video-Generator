# Release preparation

**English** · [中文](README.zh-CN.md)

Published GitHub release: **v0.1 Developer Alpha**, tag `v0.1.0-alpha.1`, **Pre-release**. The repository is Public. The standalone npm package was published on October 12, 2026 as [`milestone-video@0.1.0-alpha.2`](https://www.npmjs.com/package/milestone-video/v/0.1.0-alpha.2), under the `alpha` distribution tag. Its registry integrity matches the tested tarball; production-only installation and English/Chinese video exports passed.

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

The repository visibility and Alpha.1 GitHub release were confirmed and published on October 12, 2026, from `a7421e08416f3d354970eb0bcb85d3a64b9b221f`. Keep that tag unchanged.

For the npm release, authenticate separately with `npm login`, then run `npm pack` and install the resulting tarball in a fresh directory. Verify the installed CLI and Remotion export with production dependencies only. Publish the reviewed tarball with `npm publish <tarball> --access public --tag alpha`, then verify its registry version and `npx milestone-video@alpha --version`. Do not include `.env`, local data, source tests, or Lauren media in the tarball.
