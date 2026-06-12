import {
  parseVoiceCommand,
  KNOWN_SHAPES,
  SHAPE_DEFAULT_COLORS,
  resolveColorValue
} from "./commands.js";

const FALLBACK_CONFIDENCE_THRESHOLD = 0.5;
const KNOWN_POSITIONS = new Set([
  "center",
  "top",
  "bottom",
  "left",
  "right",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right"
]);
const ALLOWED_TYPES = new Set(["draw", "text", "background", "clear"]);

/**
 * 规则优先、低置信度才调用云端大模型的统一解析入口。
 *
 * 设计原则：
 * - 默认离线：未注入 resolver 时永远只走本地规则，零成本、零隐私外泄。
 * - 渐进增强：仅当本地解析失败或置信度低于阈值时，才把整句交给 LLM。
 * - 安全收敛：LLM 的开放输出必须经 normalizeLlmCommands 清洗校验，
 *   未通过校验的字段被丢弃，无法越权产生未知指令类型。
 *
 * @param {string} input 原始语音文本
 * @param {object} [options]
 * @param {object} [options.context] 传给本地解析器的上下文，如 { lastShape }
 * @param {(text: string, ctx: object) => Promise<{commands: any[]}>} [options.resolver]
 *        注入的云端解析器；缺省即纯本地。
 * @param {number} [options.threshold] 触发兜底的置信度阈值。
 * @returns {Promise<{commands: any[], source: string, confidence: number, normalized: string, feedback: string}>}
 */
export async function resolveVoiceCommand(input, options = {}) {
  const {
    context = {},
    resolver = null,
    threshold = FALLBACK_CONFIDENCE_THRESHOLD
  } = options;

  const local = parseVoiceCommand(input, context);

  if (!resolver || !shouldUseFallback(local, threshold)) {
    return { ...local, source: "rule" };
  }

  try {
    const remote = await resolver(input, context);
    const commands = normalizeLlmCommands(remote?.commands, context);
    if (commands.length) {
      return {
        normalized: local.normalized,
        commands,
        confidence: Math.max(local.confidence, 0.6),
        feedback: `云端理解出 ${commands.length} 个操作`,
        source: "llm"
      };
    }
  } catch (error) {
    return {
      ...local,
      source: "rule",
      feedback: `云端解析失败，已回退本地规则（${describeError(error)}）`
    };
  }

  // 云端也没给出可用结果时，沿用本地结果，调用方据 commands 是否为空决定反馈。
  return { ...local, source: "rule" };
}

/**
 * 判断是否需要触发云端兜底：本地没解析出命令，或整体置信度偏低。
 */
export function shouldUseFallback(localResult, threshold = FALLBACK_CONFIDENCE_THRESHOLD) {
  if (!localResult || !Array.isArray(localResult.commands)) {
    return true;
  }
  if (localResult.commands.length === 0) {
    return true;
  }
  return (localResult.confidence ?? 0) < threshold;
}

/**
 * 清洗 LLM 返回的开放命令：只保留白名单类型，逐字段校验颜色 / 形状 / 位置，
 * 非法值就近回退到安全默认，整条不合法则丢弃。
 */
export function normalizeLlmCommands(rawCommands, context = {}) {
  if (!Array.isArray(rawCommands)) {
    return [];
  }

  return rawCommands
    .map((command) => normalizeOne(command, context))
    .filter(Boolean);
}

function normalizeOne(command, context) {
  if (!command || typeof command !== "object") {
    return null;
  }
  const type = String(command.type || "").trim();
  if (!ALLOWED_TYPES.has(type)) {
    return null;
  }

  if (type === "clear") {
    return { type: "clear" };
  }

  if (type === "background") {
    const color = resolveColorValue(command.color) || "#f8fafc";
    return { type: "background", color };
  }

  if (type === "text") {
    const text = sanitizeText(command.text);
    if (!text) {
      return null;
    }
    return {
      type: "text",
      text,
      color: resolveColorValue(command.color) || SHAPE_DEFAULT_COLORS.text,
      position: KNOWN_POSITIONS.has(command.position) ? command.position : "center"
    };
  }

  // type === "draw"
  if (!KNOWN_SHAPES.includes(command.shape)) {
    return null;
  }
  return {
    type: "draw",
    shape: command.shape,
    color: resolveColorValue(command.color) || SHAPE_DEFAULT_COLORS[command.shape] || "#111827",
    position: KNOWN_POSITIONS.has(command.position) ? command.position : "center",
    relation: null,
    anchorShape: context.lastShape || null
  };
}

function sanitizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).replace(/[\r\n]+/g, " ").trim().slice(0, 40);
}

function describeError(error) {
  if (!error) {
    return "unknown";
  }
  return String(error.message || error).slice(0, 80);
}
