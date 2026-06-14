# AI 语音绘图工具

[![Tests](https://img.shields.io/badge/tests-62%20passed-success)](https://github.com/wyb123465/ai-voice-drawing-tool)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)

> 第四批次议题二作品：一款纯语音控制的浏览器绘图工具。用户完成麦克风授权后，可以只通过语音创建图形、组合场景、调整对象、撤销重做、清空画布和导出图片。

**部署地址**：[https://wyb123465.github.io/ai-voice-drawing-tool/](https://wyb123465.github.io/ai-voice-drawing-tool/)（推送到 `main` 且 GitHub Pages Actions 成功后可访问）

**评审材料**：[提交说明](./docs/submission.md) · [设计文档](./docs/design.md) · [文本回放](https://wyb123465.github.io/ai-voice-drawing-tool/?replay=1)

**Demo 视频**：待录制后替换为 B 站或云盘链接（提交前必须补齐）。

## 用户价值

这个工具面向不方便使用鼠标键盘、想快速表达画面想法，或需要在演示场景中快速生成草图的用户。传统绘图工具需要先学工具栏和快捷键，本项目把核心交互压缩成自然语言：说出“画一个太阳，下面有两座山，山前面有一棵树”，系统会拆解指令、定位对象并更新画布。

项目的重点不是做一个复杂画图软件，而是验证“纯语音 + 结构化绘图”的可用链路：本地规则保证低延迟和低成本，LLM 兜底处理开放表达，白名单校验避免模型输出越权，文本回放和 demo 参数保证评审在无麦克风环境也能复现。

## ✨ 项目亮点

- 🎯 **规则优先 + LLM 兜底**：默认纯本地解析，低置信度才调云端，零成本、零隐私外泄
- 🛡️ **未知对象阻断**："把猫变大"返回明确提示，不会误操作最后对象
- 🧭 **焦点指代**："它/这个/那个"会优先指向当前焦点对象，画布上有描边提示
- 🎙️ **ASR 容错**：支持“园/元→圆”“兰色→蓝色”“桔色/橘色→橙色”等高频识别偏差
- 🗣️ **澄清追问**：对“整个三角形上去”“把它上去”“把这个圆上去”这类低置信表达先反问，听到“对”后再执行
- 🔒 **白名单校验**：云端开放输出必须过形状/颜色/位置白名单，非法值就近回退默认
- 🎬 **演示模式**：`?llmdemo=1` 无需真密钥即可演示完整云端链路
- 🧪 **62 个测试全过**：覆盖解析、状态、渲染、兜底、澄清追问、网络异常等关键路径
- 📦 **零依赖**：纯前端，无运行时依赖，测试用 Node.js 内置 test runner
- 🏗️ **企业级架构**：命令解析、状态引擎、渲染器完全分离，可测试、可复现

## 🚀 快速开始

```bash
npm test
npm run serve
```

打开 [http://localhost:4173/](http://localhost:4173/)。

推荐使用 Chrome 或 Edge。浏览器需要一次点击来触发麦克风授权；进入语音模式后，绘图动作都通过语音完成。若浏览器不支持 Web Speech API，页面会显示文本回放区，便于评审复现指令解析与绘图效果。

页面右侧提供“运行评审演示”和逐步脚本按钮，可直接执行复合场景、文字定位、背景控制、澄清追问、序号选择、云端兜底模拟、撤销重做和导出链路。运行看板会实时显示对象数、历史步数、解析来源和最近动作。

右侧 **AI 兜底** 面板会显示当前 LLM 状态。默认是“规则优先 · 默认离线”；点击“试试：画一只猫”可用本地模拟响应展示 LLM 兜底链路，不会发起网络请求。

本地自动化检查可打开 [http://localhost:4173/?replay=1](http://localhost:4173/?replay=1)，强制显示文本回放区。

也可以用 `demo` 参数自动回放一组指令，适合录制 demo 前快速铺画面：

```text
http://localhost:4173/?replay=1&demo=画一条黑色波浪线|画一个蓝色矩形|复制刚才的矩形|把刚才的矩形旋转45度|删除刚才的矩形
```

在线自动回放示例：

[https://wyb123465.github.io/ai-voice-drawing-tool/?replay=1&demo=画一个太阳，下面有两座山，山前面有一棵树|在左上角写上XEngineer|画一个红色圆|画一个蓝色圆|画一个绿色圆|删除第二个圆|写上再见](https://wyb123465.github.io/ai-voice-drawing-tool/?replay=1&demo=画一个太阳，下面有两座山，山前面有一棵树|在左上角写上XEngineer|画一个红色圆|画一个蓝色圆|画一个绿色圆|删除第二个圆|写上再见)

## 📸 功能演示

### 基础绘图
```text
语音："画一个太阳，下面有两座山，山前面有一棵树"
效果：自动拆解为太阳、两座山、一棵树，按相对位置排列
```

### 对象编辑
```text
语音："把刚才的树变大一点"
效果：最后绘制的树放大 1.25 倍
```

### 云端兜底
```text
语音："帮我画一只猫"（打开 ?llmdemo=1 演示模式）
效果：本地规则无法解析，触发云端兜底，映射到最接近的圆形
日志：→（云端·模拟）绘制圆形
```

## 🛠️ 技术栈

**核心技术**
- 语音识别：Web Speech API（浏览器原生）
- 渲染引擎：Canvas 2D
- 状态管理：不可变状态 + history/future 撤销重做
- 测试框架：Node.js built-in test runner

**AI 能力**
- 本地规则：中文归一化、别名匹配、复合指令拆解、相对位置解析
- 云端兜底：OpenAI 兼容接口（可选，支持 gpt-4o-mini / DeepSeek 等）
- 安全校验：白名单过滤、输入校验、密钥隔离

**项目规模**
- 约 2600 行代码（含测试）
- 62 个测试用例，100% 通过
- 16 个模块，零运行时依赖

## 🎯 支持的语音指令

基础绘图：

```text
画一个红色圆形
画一个蓝色矩形
画一个正方形
画个园
画一个兰色圆
画一个黄色星星
画一条黑色波浪线
在圆形右边画一个蓝色矩形
画一个圆，在它右边画一个正方形，然后把它改成红色
在左上角写上“你好七牛”
把背景改成浅蓝色
```

复杂场景：

```text
画一个太阳，下面有两座山，山前面有一棵树
```

编辑控制：

```text
把刚才的圆变大一点
把刚才的树向右移动
把刚才的矩形旋转45度
把刚才的圆移到左上角
把蓝色的圆改成红色
复制刚才的矩形
再来一个
删除刚才的圆
删除红色的圆
删除第一个圆
删除第二个圆
把第三个蓝色圆变大
撤销上一步
重做
清空画布
导出图片
```

## Demo 建议流程

1. 启动页面并点击“启动语音”完成麦克风授权。
2. 说“画一个太阳，下面有两座山，山前面有一棵树”。
3. 说“在左上角写上 XEngineer”。
4. 说“把背景改成浅蓝色”。
5. 说“撤销上一步”，再说“重做”。
6. 说“画一条黑色波浪线”。
7. 说“复制刚才的矩形”“把刚才的矩形旋转45度”“删除刚才的矩形”。
8. 说“导出图片”。

更完整的提交与录屏脚本见 [docs/submission.md](./docs/submission.md)。

## 技术实现

- 语音识别：浏览器 Web Speech API。
- 指令理解：本地中文语音归一化、别名匹配、复合指令拆解、相对位置解析。
- 云端兜底（可选）：本地置信度低或解析失败时，按"规则优先、低置信度才调云端"策略调用 OpenAI 兼容大模型，返回结果经白名单校验后才执行。默认离线，不配置密钥即纯本地运行。
- 绘图引擎：Canvas 2D。
- 状态管理：不可变状态更新，内置 history/future 支持撤销重做。
- 测试：Node.js built-in test runner，无第三方依赖。

## 启用云端兜底（可选）

默认不启用，纯本地规则即可完成 README 列出的全部指令。若想让"画一只猫""帮我整个汽车"这类开放表达也能落到最接近的图形，可在打开页面前于控制台或自定义脚本中注入配置：

```js
window.__VOICE_LLM__ = {
  apiKey: "<你的密钥>",        // 仅通过 Authorization 头发送，不进 URL
  endpoint: "https://api.openai.com/v1/chat/completions", // 可换成任意 OpenAI 兼容网关
  model: "gpt-4o-mini"
};
```

约束：密钥不会写入页面 URL 或日志；云端只在本地低置信度时触发；云端返回的命令必须通过形状/颜色/位置白名单校验，非法字段就近回退默认，无法越权产生未知指令。解析结果日志会标注来源（规则 / 云端）。

不配置密钥也可以演示这条链路：打开 `http://localhost:4173/?replay=1&llmdemo=1`，输入"画一只猫""画一座房子"等开放表达。此模式使用本地模拟响应（不发任何网络请求），日志会明确标注"云端·模拟"，仅用于展示"低置信度 → 兜底 → 白名单校验 → 绘制"的完整链路。

## 项目结构

```text
index.html
src/app.js
src/styles.css
src/domain/commands.js
src/domain/drawingState.js
src/domain/demoReplay.js
src/domain/reviewDemo.js
src/domain/renderCanvas.js
src/domain/llmFallback.js
src/llm/openaiResolver.js
src/llm/mockResolver.js
tests/commands.test.mjs
tests/drawingState.test.mjs
tests/llmFallback.test.mjs
tests/openaiResolver.test.mjs
tests/mockResolver.test.mjs
tests/reviewDemo.test.mjs
docs/design.md
docs/submission.md
docs/superpowers/plans/2026-06-12-voice-drawing-tool.md
scripts/serve.mjs
```

## GitHub Pages 部署

仓库已包含 `.github/workflows/deploy.yml`。推送到 `main` 后，GitHub Actions 会运行测试并发布静态站点到 GitHub Pages。

首次部署前需要在 GitHub 仓库设置中启用 Pages，并将 Source 设为 **GitHub Actions**。

如果部署地址返回 404，优先检查：本地修改是否已经推送到 `main`、Actions 是否成功、Pages Source 是否为 **GitHub Actions**。

## 提交材料清单

- 公开 GitHub/Gitee 仓库。
- README 文档。
- Demo 视频链接：录制完成后替换本 README 顶部占位文本，并填写到提交平台。
- 设计文档：[docs/design.md](./docs/design.md)。
- 提交说明：[docs/submission.md](./docs/submission.md)。
- 运行和测试方式：`npm run serve`、`npm test`。

## 评审前必须确认

- GitHub 仓库已设为 Public，匿名窗口可以打开。
- GitHub Pages Source 已设为 **GitHub Actions**，部署地址不再返回 404。
- Demo 视频已上传，README 和提交平台里的链接都可以匿名访问。
- 所有最终改动已经通过 PR 合并到 `main`，且 PR 描述包含功能、思路和测试结果。
