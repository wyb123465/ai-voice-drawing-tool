const MOCK_RULES = [
  { pattern: /(猫|小猫|猫咪|狗|小狗)/, commands: [{ type: "draw", shape: "circle", color: "灰色", position: "center" }] },
  { pattern: /(房子|房屋|小屋)/, commands: [{ type: "draw", shape: "rectangle", color: "棕色", position: "bottom" }] },
  { pattern: /(汽车|车子|小车)/, commands: [{ type: "draw", shape: "rectangle", color: "蓝色", position: "bottom" }] },
  { pattern: /(月亮|月球)/, commands: [{ type: "draw", shape: "circle", color: "黄色", position: "top-right" }] },
  { pattern: /(云朵|白云|云)/, commands: [{ type: "draw", shape: "circle", color: "白色", position: "top" }] },
  { pattern: /(花朵|花)/, commands: [{ type: "draw", shape: "star", color: "粉色", position: "bottom-right" }] },
  { pattern: /(草地|草坪|草)/, commands: [{ type: "draw", shape: "rectangle", color: "绿色", position: "bottom" }] }
];

/**
 * 演示用的"模拟云端"解析器：不发任何网络请求，把常见开放词映射到最接近的图元。
 *
 * 用途是让评审在不配置密钥的情况下，完整看到"本地低置信度 → 云端兜底 →
 * 白名单校验 → 绘制"这条链路。它不是真实大模型：UI 日志会标注"云端·模拟"，
 * 接真实服务请配置 window.__VOICE_LLM__（见 README）。
 *
 * 返回值形状与 createOpenAiResolver 一致，因此可直接注入 resolveVoiceCommand。
 */
export function createMockLlmResolver() {
  return async function resolve(text) {
    const input = String(text || "");
    const hit = MOCK_RULES.find((rule) => rule.pattern.test(input));
    return {
      commands: hit ? hit.commands.map((command) => ({ ...command })) : []
    };
  };
}
