# 发布准备

[English](README.md) · **中文**

准备版本：**v0.1 开发者 Alpha**，标签 `v0.1.0-alpha.1`，GitHub **Pre-release**。源码包仍为 private，不发布 npm。

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

仓库当前仍为 Private，示例真正公开需要发布时改为 Public。最后的可见性修改与发布需确认后执行。本准备文档不表示已经推送、改为公开、打标签或创建 Release。
