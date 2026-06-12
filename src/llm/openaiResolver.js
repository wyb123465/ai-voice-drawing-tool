import { KNOWN_SHAPES } from "../domain/commands.js";

const DEFAULT_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = [
  "你是一个语音绘图助手的指令解析器。",
  "把用户的一句中文绘图语音，翻译成结构化命令数组。",
  "只能输出 JSON，形如 {\"commands\":[...]}，不要任何解释或多余文字。",
  "每个命令是下面几种之一：",
  '- {"type":"draw","shape":<形状>,"color":<颜色>,"position":<位置>}',
  '- {"type":"text","text":<要写的字>,"color":<颜色>,"position":<位置>}',
  '- {"type":"background","color":<颜色>}',
  '- {"type":"clear"}',
  `形状只能取：${KNOWN_SHAPES.join("、")}。遇到不在列表里的物体，选最接近的一个。`,
  "颜色用中文（如红色、浅蓝色）或 #RRGGBB。",
  "位置只能取：center、top、bottom、left、right、top-left、top-right、bottom-left、bottom-right。",
  "无法理解时返回 {\"commands\":[]}。"
].join("\n");

/**
 * 构造一个 OpenAI 兼容的云端解析器（resolver），用于 llmFallback 的低置信度兜底。
 *
 * 注意：
 * - 该工厂只负责"把一句话翻译成候选命令"，真正的安全校验在 normalizeLlmCommands。
 * - apiKey 通过 Authorization 头传递，绝不拼进 URL 或查询串。
 * - fetchImpl 可注入，便于在无网络的测试环境中验证请求构造与响应解析。
 *
 * @param {object} config
 * @param {string} config.apiKey 必填，云端密钥。
 * @param {string} [config.endpoint] OpenAI 兼容的 chat completions 地址。
 * @param {string} [config.model]
 * @param {typeof fetch} [config.fetchImpl] 注入的 fetch 实现，默认全局 fetch。
 * @param {number} [config.timeoutMs] 请求超时，默认 8000ms。
 * @returns {(text: string) => Promise<{commands: any[]}>}
 */
export function createOpenAiResolver(config = {}) {
  const {
    apiKey,
    endpoint = DEFAULT_ENDPOINT,
    model = DEFAULT_MODEL,
    fetchImpl,
    timeoutMs = 8000
  } = config;

  if (!apiKey) {
    throw new Error("createOpenAiResolver 需要 apiKey");
  }
  const doFetch = fetchImpl || globalThis.fetch;
  if (typeof doFetch !== "function") {
    throw new Error("当前环境没有可用的 fetch，请注入 fetchImpl");
  }

  return async function resolve(text) {
    const body = {
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: String(text || "") }
      ]
    };

    const controller = createAbortController(timeoutMs);
    let response;
    try {
      response = await doFetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body),
        signal: controller?.signal
      });
    } finally {
      controller?.clear();
    }

    if (!response || !response.ok) {
      throw new Error(`云端返回异常：${response ? response.status : "no response"}`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    return { commands: extractCommands(content) };
  };
}

function extractCommands(content) {
  if (!content) {
    return [];
  }
  let parsed;
  try {
    parsed = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    return [];
  }
  if (Array.isArray(parsed)) {
    return parsed;
  }
  return Array.isArray(parsed?.commands) ? parsed.commands : [];
}

function createAbortController(timeoutMs) {
  if (typeof AbortController !== "function" || !timeoutMs) {
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (typeof timer?.unref === "function") {
    timer.unref();
  }
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer)
  };
}
