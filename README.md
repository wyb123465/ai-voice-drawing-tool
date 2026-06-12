# AI 语音绘图工具

[![Tests](https://img.shields.io/badge/tests-40%20passed-success)](https://github.com/wyb123465/ai-voice-drawing-tool)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)

> 第四批次议题二作品：一款纯语音控制的浏览器绘图工具。用户完成麦克风授权后，可以只通过语音创建图形、组合场景、调整对象、撤销重做、清空画布和导出图片。

**在线 Demo**：[https://wyb123465.github.io/ai-voice-drawing-tool/](https://wyb123465.github.io/ai-voice-drawing-tool/) *(待部署)*

## ✨ 项目亮点

- 🎯 **规则优先 + LLM 兜底**：默认纯本地解析，低置信度才调云端，零成本、零隐私外泄
- 🛡️ **未知对象阻断**："把猫变大"返回明确提示，不会误操作最后对象
- 🔒 **白名单校验**：云端开放输出必须过形状/颜色/位置白名单，非法值就近回退默认
- 🎬 **演示模式**：`?llmdemo=1` 无需真密钥即可演示完整云端链路
- 🧪 **40 个测试全过**：覆盖解析、状态、兜底、网络异常等关键路径
- 📦 **零依赖**：纯前端，无运行时依赖，测试用 Node.js 内置 test runner
- 🏗️ **企业级架构**：命令解析、状态引擎、渲染器完全分离，可测试、可复现

## 🚀 快速开始

```bash
npm test
npm run serve
```

打开 [http://localhost:4173/](http://localhost:4173/)。

推荐使用 Chrome 或 Edge。浏览器需要一次点击来触发麦克风授权；进入语音模式后，绘图动作都通过语音完成。若浏览器不支持 Web Speech API，页面会显示文本回放区，便于评审复现指令解析与绘图效果。

本地自动化检查可打开 [http://localhost:4173/?replay=1](http://localhost:4173/?replay=1)，强制显示文本回放区。

也可以用 `demo` 参数自动回放一组指令，适合录制 demo 前快速铺画面：

```text
http://localhost:4173/?replay=1&demo=画一条黑色波浪线|画一个蓝色矩形|复制刚才的矩形|把刚才的矩形旋转45度|删除刚才的矩形
```

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
- 2337 行代码（含测试）
- 40 个测试用例，100% 通过
- 14 个模块，零运行时依赖

## 🎯 支持的语音指令

基础绘图：

```text
画一个红色圆形
画一个蓝色矩形
画一个黄色星星
画一条黑色波浪线
在圆形右边画一个蓝色矩形
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
src/domain/renderCanvas.js
src/domain/llmFallback.js
src/llm/openaiResolver.js
src/llm/mockResolver.js
tests/commands.test.mjs
tests/drawingState.test.mjs
tests/llmFallback.test.mjs
tests/openaiResolver.test.mjs
tests/mockResolver.test.mjs
docs/design.md
docs/superpowers/plans/2026-06-12-voice-drawing-tool.md
scripts/serve.mjs
```

## 提交材料清单

- 公开 GitHub/Gitee 仓库。
- README 文档。
- Demo 视频链接。
- 设计文档：[docs/design.md](./docs/design.md)。
- 运行和测试方式：`npm run serve`、`npm test`。
