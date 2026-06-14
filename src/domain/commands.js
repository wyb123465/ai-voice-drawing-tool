const FILLER_WORDS = [
  "请",
  "请你",
  "帮我",
  "麻烦",
  "可以",
  "一下",
  "的"
];

const COLOR_ALIASES = [
  ["浅蓝色", "#dbeafe"],
  ["淡蓝色", "#dbeafe"],
  ["天蓝色", "#7dd3fc"],
  ["深蓝色", "#1d4ed8"],
  ["蓝色", "#2563eb"],
  ["兰色", "#2563eb"],
  ["红色", "#ef4444"],
  ["绿色", "#16a34a"],
  ["深绿色", "#15803d"],
  ["浅绿色", "#bbf7d0"],
  ["黄色", "#eab308"],
  ["橙色", "#f59e0b"],
  ["橘色", "#f59e0b"],
  ["桔色", "#f59e0b"],
  ["棕色", "#92400e"],
  ["咖啡色", "#92400e"],
  ["紫色", "#7c3aed"],
  ["粉色", "#ec4899"],
  ["黑色", "#111827"],
  ["白色", "#f8fafc"],
  ["灰色", "#64748b"]
];

const SHAPE_ALIASES = [
  ["square", ["正方形", "方块"]],
  ["rectangle", ["长方形", "矩形", "盒子"]],
  ["triangle", ["三角形", "三角"]],
  ["circle", ["圆形", "圆圈", "圆圆", "圆"]],
  ["mountain", ["山峰", "高山", "山"]],
  ["sun", ["太阳", "日头"]],
  ["tree", ["树木", "大树", "树"]],
  ["star", ["星星", "五角星"]],
  ["wave", ["波浪线", "波浪", "曲线"]],
  ["line", ["直线", "线条", "线"]]
];

const DEFAULT_COLORS = {
  circle: "#111827",
  square: "#111827",
  rectangle: "#111827",
  triangle: "#111827",
  line: "#111827",
  wave: "#111827",
  star: "#f59e0b",
  sun: "#f59e0b",
  mountain: "#475569",
  tree: "#16a34a",
  text: "#111827"
};

const NUMBER_WORDS = new Map([
  ["一", 1],
  ["二", 2],
  ["两", 2],
  ["三", 3],
  ["四", 4],
  ["五", 5],
  ["六", 6],
  ["七", 7],
  ["八", 8],
  ["九", 9],
  ["十", 10]
]);

const POSITION_WORDS =
  "左上角|左上|右上角|右上|左下角|左下|右下角|右下|正中央|正中|中央|中间|中心|顶部|上方|上面|底部|下方|下面|左侧|左边|右侧|右边";

export function normalizeSpeech(input) {
  let text = String(input || "").trim();
  text = text.replace(/\s+/g, "");
  for (const word of FILLER_WORDS) {
    text = text.replaceAll(word, "");
  }
  return text.replace(/[。！？!?；;：:,.，、]/g, "");
}

export function splitCompoundCommand(input) {
  const withLightCleanup = String(input || "")
    .trim()
    .replace(/\s+/g, "")
    .replaceAll("请帮我", "")
    .replaceAll("请你", "")
    .replaceAll("请", "")
    .replaceAll("帮我", "");

  return withLightCleanup
    .replace(/(然后|接着|并且|同时)/g, "，")
    .replace(/再(?=(画|加|来|把|删除|删掉|移除|擦掉|复制|克隆|写|添加文字|加文字|文字|文本|标注|清空|撤销|重做|导出|保存|下载|向|往|变大|放大|变小|缩小|移动|移到|放到|挪|旋转|转|换成|改成|变成))/g, "，")
    .split(/[，。；;、]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseColor(text) {
  const normalized = normalizeSpeech(text);
  const match = COLOR_ALIASES.find(([name]) => normalized.includes(name));
  return match?.[1] || null;
}

export function parseShape(text, preference = "first") {
  const normalized = normalizeSpeech(text);
  if (/(波浪线|波浪|曲线)/.test(normalized)) {
    return "wave";
  }
  const matches = findShapeMatches(normalized);
  if (!matches.length) {
    return null;
  }
  return preference === "last" ? matches.at(-1).shape : matches[0].shape;
}

export function parseVoiceCommand(input, context = {}) {
  const parts = splitCompoundCommand(input);
  let allowFallback = true;
  let blockedFeedback = "";
  let clarification = null;
  const commands = [];

  for (const [index, part] of parts.entries()) {
    for (const command of parseSingleClause(part, index, context)) {
      if (command.type === "__blocked") {
        allowFallback = false;
        blockedFeedback ||= command.feedback;
      } else if (command.type === "__clarify") {
        allowFallback = false;
        clarification ||= command.clarification;
      } else {
        commands.push(command);
      }
    }
  }

  const confidence = commands.length ? average(commands.map((command) => command.confidence || 0.8)) : 0.2;

  return {
    normalized: normalizeSpeech(input),
    commands: commands.map(({ confidence, ...command }) => command),
    allowFallback,
    confidence,
    clarification,
    feedback: commands.length
      ? `解析出 ${commands.length} 个操作`
      : clarification?.prompt ||
        blockedFeedback ||
        "没有识别到可执行的绘图指令。试试：画一个红色圆形、把刚才的图形变大、清空画布"
  };
}

function parseSingleClause(clause, index, context) {
  const text = normalizeSpeech(clause);
  if (!text) {
    return [];
  }

  if (/(撤销|回退|上一步|退一步)/.test(text)) {
    return [{ type: "undo", confidence: 0.95 }];
  }

  if (/(重做|恢复|下一步)/.test(text)) {
    return [{ type: "redo", confidence: 0.95 }];
  }

  if (/(清空|清除全部|擦掉全部|重来|重新开始)/.test(text)) {
    return [{ type: "clear", confidence: 0.95 }];
  }

  if (/(导出|保存|下载)/.test(text)) {
    return [{ type: "export", confidence: 0.9 }];
  }

  if (/(删除|删掉|移除|擦掉)/.test(text) && !/(全部|画布)/.test(text)) {
    const command = parseObjectCommand("delete", text, 0.9);
    return [blockIfAmbiguousEdit(text, command)];
  }

  // splitCompoundCommand 会把"再"切成分句符，所以"再来一个"到这里只剩"来一个"，
  // 用整句匹配避免把"来一个红色圆形"这类绘制意图误判成复制。
  if (/(复制|克隆|画一个一样)/.test(text) || /^再?来一个$/.test(text)) {
    const command = parseObjectCommand("duplicate", text, 0.86);
    return [blockIfAmbiguousEdit(text, command)];
  }

  if (/(背景|底色)/.test(text)) {
    return [
      {
        type: "background",
        color: parseColor(text) || "#f8fafc",
        confidence: 0.9
      }
    ];
  }

  if (/(变大|放大|变小|缩小|移动|移到|放到|挪|旋转|转|换成|改成|变成)/.test(text) && !/(背景|底色)/.test(text)) {
    const command = parseTransform(text);
    return [blockIfAmbiguousEdit(text, command)];
  }

  if (/(写|文字|文本|标注)/.test(text)) {
    return [
      {
        type: "text",
        text: extractLabelText(clause),
        color: parseColor(text) || DEFAULT_COLORS.text,
        position: parsePosition(text) || "center",
        confidence: 0.78
      }
    ];
  }

  const clarification = parseClarificationCandidate(text, context);
  if (clarification) {
    return [{ type: "__clarify", clarification, confidence: 0.4 }];
  }

  const drawShape = parseDrawShape(text);
  if (!drawShape) {
    return [];
  }

  const count = parseCount(text, drawShape);
  const relation = parseRelation(text);
  const anchorShape = parseAnchorShape(text, relation, context);
  const color = parseColor(text) || DEFAULT_COLORS[drawShape] || "#111827";
  const position = parsePosition(text) || defaultPositionFor(drawShape, index);
  const preserveFocus = anchorShape === "focus";

  return Array.from({ length: count }, (_, offsetIndex) => ({
    type: "draw",
    shape: drawShape,
    color,
    position,
    relation,
    anchorShape,
    preserveFocus,
    clusterIndex: offsetIndex,
    clusterCount: count,
    clusterId: `clause-${index}`,
    confidence: relation || text.includes("画") || text.includes("有") ? 0.86 : 0.7
  }));
}

function parseDrawShape(text) {
  const drawIndex = Math.max(text.lastIndexOf("画"), text.lastIndexOf("加"));
  const hasIndex = text.lastIndexOf("有");
  const start = Math.max(drawIndex, hasIndex);
  if (start >= 0) {
    const afterVerb = text.slice(start + 1);
    return parseShape(afterVerb, "last") || parseShape(text, "last");
  }
  return parseShape(text, "last");
}

function parseTransform(text) {
  const target = resolveTarget(text);
  const command = {
    type: "transform",
    target,
    shape: parseShape(text, "last"),
    confidence: 0.82
  };
  if (target === "nth") {
    command.targetIndex = parseTargetIndex(text);
  }

  if (/(变大|放大)/.test(text)) {
    command.scale = /一点|一些/.test(text) ? 1.25 : 1.5;
  }
  if (/(变小|缩小)/.test(text)) {
    command.scale = /一点|一些/.test(text) ? 0.82 : 0.65;
  }
  // "把蓝色的圆改成红色"：标记词之前的颜色是选择条件，之后的才是新颜色。
  const changeMarker = text.search(/换成|改成|变成/);
  if (changeMarker >= 0) {
    const newColor = parseColor(text.slice(changeMarker));
    if (newColor) {
      command.color = newColor;
    }
    const filterColor = parseColor(text.slice(0, changeMarker));
    if (filterColor) {
      command.colorFilter = filterColor;
    }
  } else {
    const filterColor = parseColor(text);
    if (filterColor) {
      command.colorFilter = filterColor;
    }
  }
  const move = parseMove(text);
  if (move) {
    command.move = move;
  }
  const rotationDelta = parseRotation(text);
  if (rotationDelta !== null) {
    command.rotationDelta = rotationDelta;
  }
  const position = parsePosition(text);
  if (/(移到|放到|挪到)/.test(text) && position) {
    command.position = position;
  }

  return command;
}

function parseObjectCommand(type, text, confidence) {
  const target = resolveTarget(text);
  const command = {
    type,
    target,
    shape: parseShape(text, "last"),
    confidence
  };
  if (target === "nth") {
    command.targetIndex = parseTargetIndex(text);
  }
  const colorFilter = parseColor(text);
  if (colorFilter) {
    command.colorFilter = colorFilter;
  }
  return command;
}

function blockIfAmbiguousEdit(text, command) {
  if (!isAmbiguousEditTarget(text, command)) {
    return command;
  }
  return {
    type: "__blocked",
    confidence: 0.95,
    feedback: "无法确定要操作哪个图形。请说“刚才的图形”，或使用圆形、矩形、树等已支持的图形名。"
  };
}

function isAmbiguousEditTarget(text, command) {
  if (command.shape || command.colorFilter || isBareDuplicatePhrase(text)) {
    return false;
  }
  const target = extractEditTargetText(text);
  return Boolean(target && !isGenericTargetText(target));
}

function isBareDuplicatePhrase(text) {
  return /^再?来一个$/.test(text) || /^再?画一个一样$/.test(text);
}

function extractEditTargetText(text) {
  // 匹配"把...变大"形式。
  const transformMatch = text.match(/^把(.+?)(变大|放大|变小|缩小|移动|移到|放到|挪到|挪|旋转|转|换成|改成|变成)/);
  if (transformMatch) {
    return cleanTargetText(transformMatch[1]);
  }
  // 匹配"让...变大"或"猫变大"（无"把"/"让"前缀），但排除方向词开头的情况。
  if (!/^(向|往|朝|到)/.test(text)) {
    const causativeOrBareName = text.match(/^(让)?(.+?)(变大|放大|变小|缩小|移动|移到|放到|挪到|挪|旋转|转|换成|改成|变成)/);
    if (causativeOrBareName) {
      return cleanTargetText(causativeOrBareName[2]);
    }
  }
  // 匹配"删除/复制..."形式。
  const objectMatch = text.match(/^(删除|删掉|移除|擦掉|复制|克隆)(.+)$/);
  if (objectMatch) {
    return cleanTargetText(objectMatch[2]);
  }
  // 匹配"把...删除/复制"形式。
  const trailingAction = text.match(/^把(.+?)(删除|删掉|移除|擦掉|复制|克隆)$/);
  if (trailingAction) {
    return cleanTargetText(trailingAction[1]);
  }
  // 匹配"小猫删除/小猫复制"这类无"把"的口语倒装。
  const bareTrailingAction = text.match(/^(.+?)(删除|删掉|移除|擦掉|复制|克隆)$/);
  if (bareTrailingAction) {
    return cleanTargetText(bareTrailingAction[1]);
  }
  return "";
}

function cleanTargetText(text) {
  let target = String(text || "");
  for (const [name] of COLOR_ALIASES) {
    target = target.replaceAll(name, "");
  }
  return target
    .replace(/(向右|往右|朝右|右移|向左|往左|朝左|左移|向上|往上|朝上|上移|向下|往下|朝下|下移|一点|一些|稍微|微微)/g, "")
    .replace(/[的个只条座棵颗朵一二两三四五六七八九十\d]/g, "")
    .trim();
}

function isGenericTargetText(text) {
  return !text || /^(图形|对象|元素|它|这|那|这个|那个|刚才|上一个|最后|最近|第一个|最初|最早|最先|开头那个|一开始)+$/.test(text);
}

function resolveTarget(text) {
  const targetIndex = parseTargetIndex(text);
  if (targetIndex === 1) {
    return "first";
  }
  if (targetIndex > 1) {
    return "nth";
  }
  if (/(第一个|最初|最早|最先|开头那个|一开始)/.test(text)) {
    return "first";
  }
  if (/(它|这个|那个|这一个|那一个)/.test(text)) {
    return "focus";
  }
  return "last";
}

function parseTargetIndex(text) {
  const match = String(text || "").match(/第([一二两三四五六七八九十]|\d+)(?:个|只|条|座|棵|颗|朵)?/);
  if (!match) {
    return null;
  }
  const value = /^\d+$/.test(match[1]) ? Number.parseInt(match[1], 10) : NUMBER_WORDS.get(match[1]);
  if (!Number.isInteger(value) || value < 1) {
    return null;
  }
  return Math.min(value, 20);
}

function parseRotation(text) {
  if (!/(旋转|转)/.test(text)) {
    return null;
  }
  const match = text.match(/(\d+)\s*度?/);
  const amount = match ? Number.parseInt(match[1], 10) : 45;
  return /逆时针|反方向/.test(text) ? -amount : amount;
}

function parseMove(text) {
  if (/(向右|往右|右移)/.test(text)) {
    return { dx: 80, dy: 0 };
  }
  if (/(向左|往左|左移)/.test(text)) {
    return { dx: -80, dy: 0 };
  }
  if (/(向上|往上|上移)/.test(text)) {
    return { dx: 0, dy: -70 };
  }
  if (/(向下|往下|下移)/.test(text)) {
    return { dx: 0, dy: 70 };
  }
  return null;
}

function parseClarificationCandidate(text, context = {}) {
  if (/(画|加|有|写|删除|删掉|移除|复制|克隆|背景|底色|导出|保存|清空|撤销|重做)/.test(text)) {
    return null;
  }
  const parsedShape = parseShape(text, "last");
  const move = parseLooseMove(text);
  const usesFocusedPronoun = !parsedShape && hasFocusReference(text) && context.focusId;
  if ((!parsedShape && !usesFocusedPronoun) || !move) {
    return null;
  }
  const direction = describeMove(move);
  const shapeLabel = usesFocusedPronoun ? "当前图形" : describeShape(parsedShape);
  return {
    kind: "confirm-command",
    prompt: `请确认：你是想把${shapeLabel}${direction}吗？请说“对”确认，或说“取消”。`,
    commands: [
      {
        type: "transform",
        target: usesFocusedPronoun ? "focus" : "last",
        shape: usesFocusedPronoun ? null : parsedShape,
        move
      }
    ]
  };
}

function parseLooseMove(text) {
  if (/(上去|上来|往上去|向上一点|往上一点|上挪|上移一点)/.test(text)) {
    return { dx: 0, dy: -70 };
  }
  if (/(下去|下来|往下去|向下一点|往下一点|下挪|下移一点)/.test(text)) {
    return { dx: 0, dy: 70 };
  }
  if (/(左一点|往左一点|向左一点|左挪|左移一点)/.test(text)) {
    return { dx: -80, dy: 0 };
  }
  if (/(右一点|往右一点|向右一点|右挪|右移一点)/.test(text)) {
    return { dx: 80, dy: 0 };
  }
  return null;
}

function describeMove(move) {
  if (move.dy < 0) {
    return "向上移动";
  }
  if (move.dy > 0) {
    return "向下移动";
  }
  if (move.dx < 0) {
    return "向左移动";
  }
  return "向右移动";
}

function describeShape(shape) {
  const labels = {
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
  return labels[shape] || shape;
}

function parseRelation(text) {
  if (/(右边|右侧|右面|旁边右)/.test(text)) {
    return "right-of";
  }
  if (/(左边|左侧|左面|旁边左)/.test(text)) {
    return "left-of";
  }
  if (/(上面|上方|顶部)/.test(text)) {
    return "above";
  }
  if (/(下面|下方|底部)/.test(text)) {
    return "below";
  }
  if (/(前面|前方)/.test(text)) {
    return "front-of";
  }
  return null;
}

function parseAnchorShape(text, relation, context) {
  if (!relation) {
    return null;
  }
  const relationWords = {
    "right-of": ["右边", "右侧", "右面"],
    "left-of": ["左边", "左侧", "左面"],
    above: ["上面", "上方", "顶部"],
    below: ["下面", "下方", "底部"],
    "front-of": ["前面", "前方"]
  };
  const marker = relationWords[relation].find((word) => text.includes(word));
  const beforeRelation = marker ? text.slice(0, text.indexOf(marker)) : "";
  const anchor = parseShape(beforeRelation, "last");
  if (anchor) {
    return anchor;
  }
  if (hasFocusReference(beforeRelation)) {
    return "focus";
  }
  return context.lastShape || "last";
}

function hasFocusReference(text) {
  return /(它|这个|那个|这一个|那一个)/.test(text);
}

function parsePosition(text) {
  if (/(左上角|左上)/.test(text)) {
    return "top-left";
  }
  if (/(右上角|右上)/.test(text)) {
    return "top-right";
  }
  if (/(左下角|左下)/.test(text)) {
    return "bottom-left";
  }
  if (/(右下角|右下)/.test(text)) {
    return "bottom-right";
  }
  if (/(中间|中央|正中|中心)/.test(text)) {
    return "center";
  }
  if (/(顶部|上方|上面)/.test(text)) {
    return "top";
  }
  if (/(底部|下方|下面)/.test(text)) {
    return "bottom";
  }
  if (/(左侧|左边)/.test(text)) {
    return "left";
  }
  if (/(右侧|右边)/.test(text)) {
    return "right";
  }
  return null;
}

function parseCount(text, shape) {
  const shapeTerms = SHAPE_ALIASES.find(([name]) => name === shape)?.[1] || [];
  const asrTerms = shape === "circle" ? ["园", "元"] : [];
  const shapePattern = [...shapeTerms, ...asrTerms].map(escapeRegex).join("|");
  const match = text.match(new RegExp(`([一二两三四五六七八九十\\d]+)[个座棵颗条只朵]?(${shapePattern})`));
  if (!match) {
    return 1;
  }
  if (/^\d+$/.test(match[1])) {
    return Math.max(1, Math.min(8, Number.parseInt(match[1], 10)));
  }
  return Math.max(1, Math.min(8, NUMBER_WORDS.get(match[1]) || 1));
}

function findShapeMatches(text) {
  const matches = [];
  for (const [shape, aliases] of SHAPE_ALIASES) {
    for (const alias of aliases) {
      const index = text.indexOf(alias);
      if (index >= 0) {
        matches.push({ shape, alias, index });
      }
    }
  }
  matches.push(...findAsrCircleMatches(text));
  return matches.sort((a, b) => a.index - b.index || b.alias.length - a.alias.length);
}

function findAsrCircleMatches(text) {
  const matches = [];
  const pattern = /(^|画|加|来|有|把|让|在|第|个|只|条|座|棵|颗|朵|一|二|两|三|四|五|六|七|八|九|十|\d)(园|元)(?=$|形|圈|右|左|上|下|前|后|旁|边|变|改|换|删|移|挪|旋|转|放|缩|大|小|复|克)/g;
  let match = pattern.exec(text);
  while (match) {
    matches.push({
      shape: "circle",
      alias: match[2],
      index: match.index + match[1].length
    });
    match = pattern.exec(text);
  }
  return matches;
}

function extractLabelText(clause) {
  const quoted = String(clause).match(/[“"']([^”"']+)[”"']/);
  if (quoted) {
    return quoted[1].trim();
  }
  // 口述没有引号："在左上角写上你好七牛"。先剥离首尾的位置短语，再剥离动词，
  // 否则位置词会被当成文字内容画到画布上。
  return normalizeSpeech(clause)
    .replace(new RegExp(`^在?(${POSITION_WORDS})`), "")
    .replace(/^(写上|写|添加文字|加文字|文字|文本|标注)/, "")
    .replace(new RegExp(`在?(${POSITION_WORDS})$`), "")
    .replace(/(在.*?位置|到.*)$/g, "")
    .trim() || "文字";
}

function defaultPositionFor(shape, index) {
  const defaults = {
    sun: "top-right",
    mountain: "bottom",
    tree: "bottom-left",
    text: "center"
  };
  return defaults[shape] || (index % 2 === 0 ? "center" : "right");
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function resolveClarificationAnswer(input, clarification) {
  if (!clarification?.commands?.length) {
    return { status: "none", commands: [], feedback: "" };
  }
  const answer = normalizeSpeech(input);
  if (/(取消|不用|不要|算了|否|不是|先别)/.test(answer)) {
    return { status: "canceled", commands: [], feedback: "已取消这次操作。" };
  }
  if (/(对|是|是的|确认|可以|没错|好|执行|移动)/.test(answer)) {
    return {
      status: "confirmed",
      commands: cloneCommands(clarification.commands),
      feedback: "已确认，正在执行。"
    };
  }
  return { status: "unclear", commands: [], feedback: "没有听到明确确认，已取消这次操作。" };
}

function cloneCommands(commands) {
  return commands.map((command) => {
    const copy = { ...command };
    if (command.move) {
      copy.move = { ...command.move };
    }
    return copy;
  });
}

export const KNOWN_SHAPES = SHAPE_ALIASES.map(([shape]) => shape);

export const SHAPE_DEFAULT_COLORS = DEFAULT_COLORS;

const COLOR_VALUE_SET = new Set(COLOR_ALIASES.map(([, value]) => value));

export function resolveColorValue(input) {
  if (!input) {
    return null;
  }
  const value = String(input).trim();
  if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(value)) {
    return value.toLowerCase();
  }
  const named = parseColor(value);
  if (named) {
    return named;
  }
  return COLOR_VALUE_SET.has(value) ? value : null;
}
