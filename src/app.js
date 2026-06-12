import { resolveVoiceCommand } from "./domain/llmFallback.js";
import { createOpenAiResolver } from "./llm/openaiResolver.js";
import { parseDemoScript } from "./domain/demoScript.js";
import { applyCommands, createInitialState } from "./domain/drawingState.js";
import { renderCanvas } from "./domain/renderCanvas.js";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const searchParams = new URLSearchParams(window.location.search);
const replayMode = searchParams.has("replay");
const demoCommands = parseDemoScript(searchParams.get("demo"));

const canvas = document.querySelector("#drawingCanvas");
const commandLog = document.querySelector("#commandLog");
const fallbackPanel = document.querySelector("#fallbackPanel");
const fallbackInput = document.querySelector("#fallbackInput");
const liveTranscript = document.querySelector("#liveTranscript");
const runFallback = document.querySelector("#runFallback");
const startVoice = document.querySelector("#startVoice");
const stopVoice = document.querySelector("#stopVoice");
const voiceStatus = document.querySelector("#voiceStatus");
const voiceStatusWrap = document.querySelector(".voice-status");

let state = createInitialState();
let recognition = null;
let listening = false;

// 云端兜底：仅当页面显式注入 window.__VOICE_LLM__ = { apiKey, endpoint?, model? } 时启用。
// 默认离线，纯本地规则解析，零成本、零数据外泄。
const llmResolver = createConfiguredResolver();

renderCanvas(canvas, state);
setupSpeechRecognition();
setupControls();
announceStatus("ready", SpeechRecognition ? "待启动" : "文本回放");

window.voiceDrawingDemo = {
  run: handleUtterance,
  getState: () => structuredClone(state)
};

if (demoCommands.length) {
  requestAnimationFrame(async () => {
    for (const command of demoCommands) {
      await handleUtterance(command);
    }
  });
}

function createConfiguredResolver() {
  const config = typeof window !== "undefined" ? window.__VOICE_LLM__ : null;
  if (!config || !config.apiKey) {
    return null;
  }
  try {
    return createOpenAiResolver(config);
  } catch (error) {
    console.warn("云端兜底初始化失败，继续使用本地规则：", error);
    return null;
  }
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
        handleUtterance(transcript);
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
      recognition.start();
      speak("语音模式已启动");
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
      handleUtterance(text);
      fallbackInput.value = "";
    }
  });
}

async function handleUtterance(text) {
  if (!text) {
    return;
  }

  liveTranscript.textContent = text;
  const parsed = await resolveVoiceCommand(text, {
    context: { lastShape: state.elements.at(-1)?.shape || null },
    resolver: llmResolver
  });

  if (!parsed.commands.length) {
    logEntry(`未执行：${text}`);
    speak(parsed.feedback || "这句还不能变成绘图动作");
    return;
  }

  const result = applyCommands(state, parsed.commands);
  state = result.state;
  renderCanvas(canvas, state);

  if (result.exportRequested) {
    exportCanvas();
  }

  const sourceTag = parsed.source === "llm" ? "云端" : "规则";
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
