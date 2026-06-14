import { resolveVoiceCommand } from "./domain/llmFallback.js";
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

let state = createInitialState();
let recognition = null;
let listening = false;
let llmResolver = null;
let llmConfigUsed = null;
// handleUtterance 是 async：不串行的话，连续两句最终识别结果会读到同一份旧 state，
// 后执行的一句会覆盖前一句的绘制结果。所有入口都必须经过这个队列。
let utteranceQueue = Promise.resolve();

renderCanvas(canvas, state);
setupSpeechRecognition();
setupControls();
setupReviewDemo();
updateMetrics();
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
    listening = false;
    announceStatus("idle", "已暂停");
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
  const resolver = getLlmResolver(options);
  const parsed = await resolveVoiceCommand(text, {
    context: { lastShape: state.elements.at(-1)?.shape || null },
    resolver
  });

  if (!parsed.commands.length) {
    logEntry(`未执行：${text}`);
    updateMetrics("未执行", text);
    speak(parsed.feedback || "这句还不能变成绘图动作");
    return;
  }

  const result = applyCommands(state, parsed.commands);
  state = result.state;
  renderCanvas(canvas, state);

  if (result.exportRequested) {
    exportCanvas();
  }

  const sourceTag = parsed.source !== "llm" ? "规则" : resolver === mockResolver ? "云端·模拟" : "云端";
  updateMetrics(sourceTag, parsed.commands.map(describeCommand).join("，"));
  logEntry(`${text} →（${sourceTag}）${parsed.commands.map(describeCommand).join("，")}`);
  speak(result.messages.at(-1) || parsed.feedback);
}

function describeCommand(command) {
  const shapeLabels = {
    circle: "圆形",
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
