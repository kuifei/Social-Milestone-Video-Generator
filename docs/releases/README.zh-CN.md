# 发布准备

[English](README.md) · **中文**

已发布 GitHub 版本：**v0.1 开发者 Alpha**，标签 `v0.1.0-alpha.1`，**Pre-release**，仓库已公开。独立 npm 包准备为 `milestone-video@0.1.0-alpha.2`，使用 `alpha` 分发标签。

## 远端历史与认证

2026 年 10 月 12 日已验证 GitHub CLI 登录账号为 `kuifei`，HTTPS Git 可访问仓库，且拥有 `kuifei/Social-Milestone-Video-Generator` 管理员权限。核验时仓库为 **Private**，远端只有初始提交 `eafa5210c3b05d6fc48aaa61329f6869e43f0aee`，包含 `.gitignore` 和 `LICENSE`，没有发布版本。

通过你选定的 GitHub 方式配置 Git 认证，不要把 token 发到聊天或写入远端 URL。认证后重新 fetch 并核对远端历史；不要强推覆盖初始提交，也不要创建不相关的根历史。

已抓取并核对初始提交，将其设为本地基线，同时保留工作文件。后续沿该历史正常提交和推送。源码版本保留原有 Quincy 版权声明及 `.env*.local`、`*.pem` 排除规则，新增项目数据和构建目录排除，并明确 Lauren 媒体不适用 MIT。

## 最终检查

```bash
npm ci
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

检查全部 Git 候选文件中的凭据和意外本地数据。仅 `examples/lauren/` 精选媒体进入版本，`.env`、`inputs/`、`profiles/` 和 `runs/` 保持排除。Lauren 只获仓库展示和下载授权，因此从 npm 打包排除。

## 发布

审核代码和示例后，沿远端历史提交并推送。以审核后的提交创建 `v0.1.0-alpha.1`，标题 **v0.1 Developer Alpha**，使用[发布说明](v0.1.0-alpha.1.zh-CN.md)，勾选 **Set as a pre-release**。复制说明到 GitHub Release 正文时，将相对链接改成对应仓库地址。媒体保留在仓库，不另行复制到发布附件。

仓库公开与 Alpha.1 GitHub 发布已于 2026 年 10 月 12 日确认并完成，基于 `a7421e08416f3d354970eb0bcb85d3a64b9b221f`。保持该标签不变。

npm 发布需单独执行 `npm login`。运行 `npm pack` 后，在全新目录安装生成的 tarball，仅使用生产依赖验证 CLI 与 Remotion 导出。随后执行 `npm publish <tarball> --access public --tag alpha` 发布已审核的包，并核对注册表版本及 `npx milestone-video@alpha --version`。包中不得包含 `.env`、本地数据、源码测试或 Lauren 媒体。
