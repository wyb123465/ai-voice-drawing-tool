import { resolveVoiceCommand } from "./domain/llmFallback.js";
import { resolveClarificationAnswer } from "./domain/commands.js";
import { createOpenAiResolver } from "./llm/openaiResolver.js";
import { createMockLlmResolver } from "./llm/mockResolver.js";
import { parseDemoScript } from "./domain/demoScript.js";
import { scheduleDemoReplay } from "./domain/demoReplay.js";
import { getReviewDemoCommands, getReviewDemoSteps } from "./domain/reviewDemo.js";
import { applyCommands, createInitialState } from "./domain/drawingState.js";
import { renderCanvas } from "./domain/renderCanvas.js";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const searchParams = new URLSearchParams(window.location.search);
const replayMode = searchParams.has("replay");
const demoCommands = parseDemoScript(searchParams.get("demo"));
// ?llmdemo=1：无密钥演示兜底链路，使用本地模拟响应，日志会标注"云端·模拟"。
const mockResolver = createMockLlmResolver();
const queryMockResolverEnabled = searchParams.has("llmdemo");

const canvas = document.querySelector("#drawingCanvas");
const commandLog = document.querySelector("#commandLog");
const fallbackPanel = document.querySelector("#fallbackPanel");
const fallbackInput = document.querySelector("#fallbackInput");
const liveTranscript = document.querySelector("#liveTranscript");
const runFallback = document.querySelector("#runFallback");
const runReviewDemo = document.querySelector("#runReviewDemo");
const reviewDemoSteps = document.querySelector("#reviewDemoSteps");
const startVoice = document.querySelector("#startVoice");
const stopVoice = document.querySelector("#stopVoice");
const voiceStatus = document.querySelector("#voiceStatus");
const voiceStatusWrap = document.querySelector(".voice-status");
const metricObjects = document.querySelector("#metricObjects");
const metricHistory = document.querySelector("#metricHistory");
const metricSource = document.querySelector("#metricSource");
const metricLastAction = document.querySelector("#metricLastAction");
const llmMode = document.querySelector("#llmMode");
const llmDescription = document.querySelector("#llmDescription");
const runLlmExample = document.querySelector("#runLlmExample");
const clarificationStatus = document.querySelector("#clarificationStatus");

let state = createInitialState();
let recognition = null;
let listening = false;
let llmResolver = null;
let llmConfigUsed = null;
let pendingClarification = null;
// handleUtterance 是 async：不串行的话，连续两句最终识别结果会读到同一份旧 state，
// 后执行的一句会覆盖前一句的绘制结果。所有入口都必须经过这个队列。
let utteranceQueue = Promise.resolve();

renderCanvas(canvas, state);
setupSpeechRecognition();
setupControls();
setupReviewDemo();
updateMetrics();
updateLlmPanel();
announceStatus("ready", SpeechRecognition ? "待启动" : "文本回放");
if (queryMockResolverEnabled) {
  logEntry("云端兜底演示模式已开启：低置信度指令将由本地模拟响应处理，仅用于展示链路。");
}

window.voiceDrawingDemo = {
  run: enqueueUtterance,
  getState: () => structuredClone(state)
};

scheduleDemoReplay(demoCommands, enqueueUtterance);

function enqueueUtterance(text, options = {}) {
  const run = utteranceQueue.then(() => handleUtterance(text, options));
  utteranceQueue = run.catch((error) => {
    console.error("指令处理失败：", error);
  });
  return run;
}

// 每次取用时按当前 window.__VOICE_LLM__ 重新判断，允许打开页面后再在控制台注入配置。
function getLlmResolver(options = {}) {
  const config = typeof window !== "undefined" ? window.__VOICE_LLM__ : null;
  if (config && config.apiKey) {
    if (config !== llmConfigUsed) {
      llmConfigUsed = config;
      try {
        llmResolver = createOpenAiResolver(config);
      } catch (error) {
        console.warn("云端兜底初始化失败，继续使用本地规则：", error);
        llmResolver = null;
      }
    }
    return llmResolver;
  }
  llmConfigUsed = null;
  llmResolver = null;
  return options.useMockFallback || queryMockResolverEnabled ? mockResolver : null;
}

function setupSpeechRecognition() {
  if (!SpeechRecognition || replayMode) {
    fallbackPanel.hidden = false;
    logEntry(replayMode ? "文本回放已启用。" : "当前浏览器未提供 Web Speech API，已启用文本回放。");
  }

  if (!SpeechRecognition) {
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "zh-CN";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    listening = true;
    announceStatus("listening", "聆听中");
  };

  recognition.onend = () => {
    // Web Speech API 可能在静默或句子结束时自动停止，如果用户没主动点"暂停"，自动重启
    if (listening) {
      try {
        recognition.start();
      } catch (error) {
        if (error.name !== "InvalidStateError") {
          console.warn("自动重启语音识别失败:", error);
        }
      }
    } else {
      announceStatus("idle", "已暂停");
    }
  };

  recognition.onerror = (event) => {
    listening = false;
    announceStatus("error", "语音异常");
    fallbackPanel.hidden = false;
    logEntry(`语音识别异常：${event.error || "unknown"}`);
  };

  recognition.onresult = (event) => {
    let interim = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0]?.transcript?.trim() || "";
      if (event.results[index].isFinal) {
        enqueueUtterance(transcript);
      } else {
        interim += transcript;
      }
    }
    if (interim) {
      liveTranscript.textContent = interim;
    }
  };
}

function setupControls() {
  startVoice.addEventListener("click", () => {
    if (!recognition) {
      fallbackPanel.hidden = false;
      announceStatus("ready", "文本回放");
      return;
    }
    if (!listening) {
      try {
        recognition.start();
        speak("语音模式已启动");
      } catch (error) {
        if (error.name !== "InvalidStateError") {
          throw error;
        }
      }
    }
  });

  stopVoice.addEventListener("click", () => {
    if (recognition && listening) {
      listening = false;  // 先设为 false，这样 onend 就不会自动重启
      recognition.stop();
    }
    speak("语音模式已暂停");
  });

  runFallback.addEventListener("click", () => {
    const text = fallbackInput.value.trim();
    if (text) {
      enqueueUtterance(text);
      fallbackInput.value = "";
    }
  });

  runReviewDemo.addEventListener("click", () => {
    logEntry("评审演示开始：将按脚本依次执行命令。");
    for (const command of getReviewDemoCommands()) {
      enqueueUtterance(command, { useMockFallback: true });
    }
  });

  runLlmExample.addEventListener("click", () => {
    enqueueUtterance("画一只猫", { useMockFallback: true });
  });
}

function setupReviewDemo() {
  const fragment = document.createDocumentFragment();
  for (const step of getReviewDemoSteps()) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const label = document.createElement("span");
    const command = document.createElement("span");

    button.type = "button";
    button.className = "review-step";
    label.className = "review-step-label";
    command.className = "review-step-command";
    label.textContent = step.label;
    command.textContent = step.command;

    button.append(label, command);
    button.addEventListener("click", () => {
      enqueueUtterance(step.command, { useMockFallback: true });
    });
    item.append(button);
    fragment.append(item);
  }
  reviewDemoSteps.append(fragment);
}

async function handleUtterance(text, options = {}) {
  if (!text) {
    return;
  }

  liveTranscript.textContent = text;
  if (pendingClarification) {
    const resolved = resolveClarificationAnswer(text, pendingClarification);
    const prompt = pendingClarification.prompt;
    pendingClarification = null;

    if (resolved.status === "confirmed") {
      updateClarificationPanel("已确认，正在执行澄清后的操作。");
      await executeCommands(text, {
        commands: resolved.commands,
        source: "clarification",
        feedback: resolved.feedback
      });
      return;
    }

    const feedback = resolved.feedback || "已取消这次操作。";
    updateClarificationPanel("暂无待确认问题。");
    logEntry(`${resolved.status === "canceled" ? "已取消" : "未确认"}：${prompt}`);
    updateMetrics(resolved.status === "canceled" ? "澄清取消" : "澄清未确认", text);
    speak(feedback);
    return;
  }

  const resolver = getLlmResolver(options);
  const parsed = await resolveVoiceCommand(text, {
    context: {
      lastShape: state.elements.at(-1)?.shape || null,
      focusId: state.focusId || null,
      presentShapes: [...new Set(state.elements.map((element) => element.shape))]
    },
    resolver
  });

  if (parsed.clarification) {
    pendingClarification = parsed.clarification;
    updateClarificationPanel(parsed.clarification.prompt);
    logEntry(`澄清追问：${parsed.clarification.prompt}`);
    updateMetrics("澄清追问", parsed.clarification.prompt);
    speak(parsed.clarification.prompt);
    return;
  }

  if (!parsed.commands.length) {
    logEntry(`未执行：${text}`);
    updateMetrics("未执行", text);
    speak(parsed.feedback || "这句还不能变成绘图动作");
    return;
  }

  await executeCommands(text, parsed, resolver);
}

async function executeCommands(text, parsed, resolver = null) {
  const result = applyCommands(state, parsed.commands);
  state = result.state;
  renderCanvas(canvas, state);

  if (result.exportRequested) {
    exportCanvas();
  }

  const sourceTag =
    parsed.source === "llm"
      ? resolver === mockResolver
        ? "云端·模拟"
        : "云端"
      : parsed.source === "clarification"
        ? "澄清确认"
        : "规则";
  if (sourceTag === "云端·模拟") {
    showMockLlmMode();
  } else if (sourceTag === "云端") {
    updateLlmPanel();
  }
  updateMetrics(sourceTag, parsed.commands.map(describeCommand).join("，"));
  logEntry(`${text} →（${sourceTag}）${parsed.commands.map(describeCommand).join("，")}`);
  speak(result.messages.at(-1) || parsed.feedback);
}

function describeCommand(command) {
  const shapeLabels = {
    circle: "圆形",
    square: "正方形",
    rectangle: "矩形",
    triangle: "三角形",
    line: "直线",
    wave: "波浪线",
    star: "星星",
    sun: "太阳",
    mountain: "山",
    tree: "树",
    text: "文字"
  };
  if (command.type === "draw") {
    return `绘制${shapeLabels[command.shape] || command.shape}`;
  }
  if (command.type === "text") {
    return `文字 ${command.text}`;
  }
  if (command.type === "background") {
    return "背景";
  }
  const labels = {
    transform: "调整图形",
    delete: "删除图形",
    duplicate: "复制图形",
    undo: "撤销",
    redo: "重做",
    clear: "清空画布",
    export: "导出图片"
  };
  return labels[command.type] || command.type;
}

function logEntry(text) {
  const item = document.createElement("li");
  item.textContent = text;
  commandLog.prepend(item);
  while (commandLog.children.length > 8) {
    commandLog.lastElementChild?.remove();
  }
}

function announceStatus(stateName, label) {
  voiceStatus.textContent = label;
  voiceStatusWrap.dataset.state = stateName;
}

function updateMetrics(source = "待执行", lastAction = "等待指令") {
  metricObjects.textContent = String(state.elements.length);
  metricHistory.textContent = String(state.history.length);
  metricSource.textContent = source;
  metricLastAction.textContent = lastAction;
}

function updateClarificationPanel(text = "暂无待确认问题。") {
  clarificationStatus.textContent = text;
}

function updateLlmPanel() {
  const config = typeof window !== "undefined" ? window.__VOICE_LLM__ : null;
  if (config?.apiKey) {
    llmMode.textContent = `真实接口 · ${config.model || "OpenAI 兼容模型"}`;
    llmDescription.textContent = "检测到 window.__VOICE_LLM__ 配置。低置信度指令会请求云端解析，结果仍会先经过白名单校验。";
    return;
  }
  if (queryMockResolverEnabled) {
    llmMode.textContent = "模拟兜底 · 不发网络请求";
    llmDescription.textContent = "当前 URL 启用了 llmdemo=1，会用本地模拟响应展示 LLM 兜底链路。";
    return;
  }
  llmMode.textContent = "规则优先 · 默认离线";
  llmDescription.textContent = "常见指令由本地规则解析；点击下方示例可用本地模拟响应展示 LLM 兜底效果。";
}

function showMockLlmMode() {
  llmMode.textContent = "模拟兜底 · 本次由 AI 链路处理";
  llmDescription.textContent = "这次开放表达没有走普通规则，而是通过本地模拟 resolver 展示 LLM 兜底，再经白名单校验后绘制。";
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 1.02;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function exportCanvas() {
  const link = document.createElement("a");
  link.download = `voice-drawing-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
