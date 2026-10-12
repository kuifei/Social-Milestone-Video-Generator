<div align="center">

# Milestone Video

将 X 主页截图变成一段 15 秒的粉丝里程碑庆祝动画。

[English](README.md) · **中文**

**v0.1 开发者 Alpha** · TypeScript CLI · fal + MiniMax · Remotion · [MIT](LICENSE)

</div>

Milestone Video 从主页头像生成插画角色，让角色走出头像，用蛋糕庆祝粉丝数字，最后导出带准确收尾字幕的 1080×1920 视频。默认使用英文收尾字幕，也支持简体中文。

这是开发者 Alpha，流程为 **生成一次 → 直接导出 → 用户观看判断**。`completed` 仅表示文件导出完成，不代表画面、档案数据或媒体授权通过核验。可以使用独立 CLI，也可以克隆源码运行。

## 公开示例

[![Lauren V6 预览](https://raw.githubusercontent.com/kuifei/Social-Milestone-Video-Generator/main/examples/lauren/preview.jpg)](https://github.com/kuifei/Social-Milestone-Video-Generator/blob/main/examples/lauren/video.mp4)

[Lauren V6 示例与复现命令](https://github.com/kuifei/Social-Milestone-Video-Generator/blob/main/examples/lauren/README.zh-CN.md) · [下载视频](https://github.com/kuifei/Social-Milestone-Video-Generator/blob/main/examples/lauren/video.mp4)

采用最后一版 V6 成片，使用中文原始提示词和英文收尾字幕。包含截图、角色参考图、档案、原始参数及已知限制。媒体**仅允许仓库展示和下载，不适用 MIT**；详见[媒体说明](https://github.com/kuifei/Social-Milestone-Video-Generator/blob/main/examples/lauren/MEDIA_LICENSE.txt)。

## 快速开始

需要 Node.js 22+、`PATH` 中的 FFmpeg 和 FFprobe，以及 fal API 密钥。中文字幕还需要系统安装中文字体，例如 Linux 上的 Noto Sans CJK SC；macOS 和 Windows 使用系统后备字体。

### 独立 CLI（npm）

```bash
npm install -g milestone-video@alpha
milestone-video --help
milestone-video --version
```

也可以免全局安装运行：`npx milestone-video@alpha --help`。

在自己的工作目录使用，在该目录的 `.env` 或进程环境中设置 `FAL_KEY`。可以手填包含 `displayName`、`handle`、`followers`、`avatarKind`（`person` 或 `non-person`）和 `rightsConfirmed` 的 profile JSON，也可以付费提取：

```bash
milestone-video profile --screenshot /absolute/path/x-profile.png --out profiles/draft.json
# 核对提取字段和头像类别后再生成。
milestone-video generate --profile profiles/draft.json \
  --screenshot /absolute/path/x-profile.png --out runs/creator-v1
```

npm 包包含编译后的程序和文本/JSON 模板，安装后无需 TypeScript 构建，不包含 Lauren 媒体。使用独立 CLI 时，将下文源码示例中的 `npm run dev --` 替换为 `milestone-video`（或 `npx milestone-video@alpha`），输入素材和自定义提示词使用自己的文件路径。

### 克隆源码运行

```bash
git clone https://github.com/kuifei/Social-Milestone-Video-Generator.git
cd Social-Milestone-Video-Generator
npm ci
cp .env.example .env
```

在项目根目录 `.env` 或进程环境中设置 `FAL_KEY`。角色和视频生成使用同一密钥。不要将凭据提交到仓库或写入日志。

先创建 `profiles/`，将 `examples/profile.json` 复制为 `profiles/creator.json`。按截图填写名称、账号、粉丝数、头像类别和权利确认记录，然后运行：

```bash
npm run dev -- generate \
  --profile profiles/creator.json \
  --screenshot /absolute/path/x-profile.png \
  --out runs/creator-v1
```

默认使用英文、X/Twitter、MiniMax H3 Max、768P、15 秒以及 V6 `peace-sign` 效果。未传入 `--character` 时，先用 Nano Banana 2 生成角色三视图。结果保存在 `runs/creator-v1/final.mp4`。

中文收尾字幕用：

```bash
npm run dev -- generate \
  --profile profiles/creator.json \
  --screenshot /absolute/path/x-profile.png \
  --locale zh-CN \
  --out runs/creator-zh
```

`--locale en` 输出 `Thank you for 47.8K followers`；`--locale zh-CN` 输出 `感谢 47.8K 位粉丝的支持`。`zh` 是 `zh-CN` 的别名。数字格式保持原样。语言选项只控制收尾字幕：CLI 诊断信息仍为英文，截图保留原语言，两种语言使用相同的英文内置模型提示词。

付费生成前，CLI 检查 FFmpeg、FFprobe、Remotion 打包、浏览器启动和合成加载。第一次可能下载 Chrome Headless Shell，需要网络和本地 HTTP 服务权限。这些检查确认本地导出准备情况，不判断画面质量。

## 默认 V6 效果

内置提示词版本为 `follower-drop-peace-sign-v6`。英文模板是 [peace-sign-v6.txt](examples/peace-sign-v6.txt)，Lauren 测试使用的中文原文是 [peace-sign-v6.zh-CN.txt](examples/peace-sign-v6.zh-CN.txt)。

提示词要求：

1. 角色先准备，再扶头像圆框、跨出、小跳、屈膝缓冲并自然收住动作。
2. 角色离开后主头像圆内留空黑圆，其余页面和帖子缩略图保持原状态及亮度。
3. 指向 Followers，蛋糕出现后，一整组准确数字副本落下变成哑光彩色数字蜡烛。
4. 蜡烛持续燃烧，人物比 V，少量彩纸落下；人物和蛋糕下方仍显示原页面。
5. 模型不生成字幕，Remotion 在最后三秒添加对应语言的准确收尾文字。

这些是提示词要求，不是像素级保证。中文 V6 的 Lauren 测试保留了帖子图片、正确清空了头像，但仍出现页面变暗、蛋糕托盘、脚下阴影和最后闭眼。英文译本通过了本地检查，尚未单独付费对比。设为默认不表示这些缺陷已经解决。

截图按比例放进白底 1080×1920 首帧画布，不裁切、不拉伸。H3 Max 将它作为 `image_url`，角色三视图作为唯一参考图；可选 H3 使用两张有序参考图。Remotion 跟随原片时长和帧率，保留音轨，使用 `contain`，并添加局部浅色字幕面板。

## 档案和角色

可以手工填写 JSON，也可以付费提取一次：

```bash
npm run dev -- profile --screenshot /absolute/path/x-profile.png --out profiles/draft.json
```

提取使用 fal OpenRouter 上的 Gemini 2.5 Flash。不确定的账号或数字不会写入，已有文件不覆盖。请自行核对 Followers 与 Following。提取将 `rightsConfirmed` 写为 `false`；公开可见不代表拥有使用授权。生成使用你的档案，不会再次调用模型核验。

| 选项 | 行为 |
| --- | --- |
| `avatarKind: "person"` | 生成插画角色；权利未确认时给出不阻断的提醒 |
| `avatarKind: "non-person"` | 将可见动物、物品或标志转为吉祥物 |
| `avatarKind: "unknown"` | 生成前必须明确类别 |
| `--character-mode generic` | 生成原创吉祥物，不复制头像身份 |
| `--character /path/turnaround.png` | 复用角色图，省去角色生成费用 |

权利记录保留原值，不自动赋予公开分发或将媒体按 MIT 再授权的权利。

## 其他效果和模型

```bash
# 之前的吹蜡烛动作
npm run dev -- generate --profile profiles/creator.json \
  --screenshot /absolute/path/x-profile.png --effect blow-out --out runs/blow-out

# 自定义 UTF-8 动作提示词
npm run dev -- generate --profile profiles/creator.json \
  --screenshot /absolute/path/x-profile.png \
  --prompt-file examples/custom-effect.txt --out runs/custom
```

`--prompt-file` 自动选择 `custom`，也可显式指定 `--effect custom`；与内置效果同时使用会在本地报错。支持 `{{followers}}`、`{{displayName}}`、`{{handle}}`、`{{platform}}`。未知单词占位符在付费前拒绝，替换不会执行代码。

自定义文本描述动作；模型适配器控制参考图编号、时长、分辨率和 API 参数，并追加保留页面、音频与字幕要求。模板原文、SHA-256、完整提示词和参数冻结在任务计划中。历史 V4/V5 模板保留供显式对比。

`--provider minimax-h3` 选择可选 H3，默认是 `minimax-h3-max`。当前仅实现 X/Twitter。中文字幕不会增加中文社交平台支持，也不会翻译截图界面。

## 费用和再次生成

代码的静态估算为一段 15 秒 H3 Max 视频 US$1.20，新增角色 US$0.08，合计 US$1.28。参考素材用量可能另计；实际费用未知时记录为 `null`。档案提取是单独付费请求。

默认 `--max-estimated-cost-usd 3` 只限制已知角色和视频估算，不是完整账单上限。支持 `--name value` 和 `--name=value`；未知、重复选项、缺失值和意外位置参数在本地拒绝。`--max-attempts` 只接受 `1`，不会因质量问题自动重试。

再生成请使用新的输出目录，复用角色可节省角色费用：

```bash
npm run dev -- generate --profile profiles/creator.json \
  --screenshot /absolute/path/x-profile.png \
  --character runs/creator-v1/input/character.png --out runs/creator-v2
```

这会提交新的付费视频请求。已有任务目录不覆盖。

## 恢复和诊断

```bash
npm run dev -- resume --job runs/creator-v1
npm run dev -- qa --video /absolute/path/video.mp4
```

`resume` 使用已保存的请求 ID 或已下载原片，以及冻结的提示词和参数。它恢复原任务，包括使用旧默认提示词的任务，不升级为 V6、不生成新的质量候选。完成的任务直接返回原记录。有 ID 的轮询、下载异常可以恢复；元数据或渲染异常复用原片。无 ID 的未知提交、安全拒绝和无效终态需与服务商核对，不能盲目再提交。

| 状态 | 含义 |
| --- | --- |
| `completed` | 已导出 `final.mp4` |
| `failed` | 角色、元数据读取或渲染失败，请查看原因 |
| `needs_review` | 不确定、中断或终态的服务商结果需要恢复或核对 |

本地可选 `qa` 不上传媒体、不改变任务状态、不提交生成。加 `--reference /path/screenshot.png` 可诊断相对亮度。生成和恢复均不会自动质检、候选打分或要求批准；历史 QA 记录保留。

## 目录结构

```text
README.md / README.zh-CN.md       英文 / 中文说明
docs/                            架构图和历史发现
examples/                        模板和另有授权说明的 Lauren 精选媒体
src/
  cli.ts                         命令与英文优先默认值
  locales/                       en / zh-CN 收尾字幕
  effects/                       V6 peace-sign、其他效果和自定义替换
  platforms/                     X/Twitter 标签和布局语义
  characters/                    角色策略和 Nano Banana 适配器
  providers/                     fal 请求和 MiniMax 适配器
  pipeline/                      输入快照、恢复、元数据和导出
  remotion/                      视频合成和准确收尾文字
test/                            本地回归测试
inputs/ / profiles/ / runs/       忽略的本地数据
```

任务保存输入快照、`plan.json`、`attempts/01/raw.mp4`、`final.mp4`、`result.json` 和渲染工作文件。自定义任务还保存 `input/custom-prompt.txt`。结果记录请求 ID、模型及提示词版本、费用、元数据、路径和 `qualityGate: "disabled"`。JSON 原子写入及本地任务锁保护恢复记录。新任务不会自动创建抽帧图或审核报告。

查看离线 [English architecture map](https://github.com/kuifei/Social-Milestone-Video-Generator/blob/main/docs/architecture-flow.html) 或 [中文架构图](https://github.com/kuifei/Social-Milestone-Video-Generator/blob/main/docs/architecture-flow.zh-CN.html)。免费模板渲染、手写叠加、数字滚动、绿幕合成和其他平台尚未实现。

## 开发检查

```bash
npm run typecheck
npm test
npm run build
```

测试覆盖提示词和数字、语言字幕、严格 CLI 参数、一次生成导出、冻结任务恢复、费用去重及诊断工具。本地测试不证明模型画面质量，不需要付费请求。

## 许可证和媒体

代码采用 [MIT](LICENSE)，版权声明为 2026 Milestone Video contributors。依赖和托管服务保留各自条款，包括 [Remotion 许可证](https://www.remotion.dev/license)。项目的 MIT 不赋予第三方截图、头像或其生成衍生作品的使用权。

`.env`、`inputs/`、`profiles/` 和 `runs/` 从 Git 和 npm 打包排除。公开示例应专门筛选并明确授权；第三方媒体权利独立于代码许可证。精选 Lauren 媒体仅放入 examples/lauren/ 并附独立授权说明，从 npm 打包排除；其他本地输入和运行记录仍不纳入。

发布说明：[v0.1.0-alpha.1](https://github.com/kuifei/Social-Milestone-Video-Generator/blob/main/docs/releases/v0.1.0-alpha.1.zh-CN.md)。
