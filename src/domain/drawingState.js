const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 800;

const SHAPE_SIZE = {
  circle: { width: 150, height: 150 },
  square: { width: 150, height: 150 },
  rectangle: { width: 220, height: 140 },
  triangle: { width: 180, height: 160 },
  line: { width: 240, height: 8 },
  wave: { width: 300, height: 110 },
  star: { width: 140, height: 140 },
  sun: { width: 170, height: 170 },
  mountain: { width: 300, height: 180 },
  tree: { width: 170, height: 230 },
  text: { width: 300, height: 70 }
};

export function createInitialState() {
  return {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    background: "#fffdf5",
    elements: [],
    history: [],
    future: [],
    focusId: null,
    idCounter: 1
  };
}

export function applyCommands(state, commands) {
  return commands.reduce(
    (result, command) => {
      const next = applyCommand(result.state, command);
      return {
        state: next.state,
        messages: [...result.messages, next.message].filter(Boolean),
        exportRequested: result.exportRequested || next.exportRequested || false
      };
    },
    { state, messages: [], exportRequested: false }
  );
}

export function applyCommand(state, command) {
  switch (command.type) {
    case "draw":
      return addElement(state, createElement(state, command), "已添加图形", {
        preserveFocus: command.preserveFocus
      });
    case "text":
      return addElement(state, createElement(state, { ...command, shape: "text" }), "已添加文字");
    case "background":
      return {
        state: {
          ...pushHistory(state),
          background: command.color,
          future: []
        },
        message: "已更新背景"
      };
    case "clear":
      return {
        state: {
          ...pushHistory(state),
          elements: [],
          focusId: null,
          future: []
        },
        message: "画布已清空"
      };
    case "transform":
      return transformElement(state, command);
    case "delete":
      return deleteElement(state, command);
    case "duplicate":
      return duplicateElement(state, command);
    case "undo":
      return undo(state);
    case "redo":
      return redo(state);
    case "export":
      return { state, message: "正在导出图片", exportRequested: true };
    default:
      return { state, message: "未识别的指令" };
  }
}

export function findAnchorElement(state, command) {
  if (!state.elements.length) {
    return null;
  }
  if (command.anchorShape === "focus") {
    return findFocusElement(state) || state.elements.at(-1);
  }
  if (!command.anchorShape || command.anchorShape === "last") {
    if (command.clusterId) {
      const outsideCluster = [...state.elements].reverse().find((element) => element.clusterId !== command.clusterId);
      if (outsideCluster) {
        return outsideCluster;
      }
    }
    return state.elements.at(-1);
  }
  return [...state.elements].reverse().find((element) => element.shape === command.anchorShape) || state.elements.at(-1);
}

function addElement(state, element, message, options = {}) {
  const focusId = options.preserveFocus && findFocusElement(state) ? state.focusId : element.id;
  return {
    state: {
      ...pushHistory(state),
      elements: [...state.elements, element],
      focusId,
      idCounter: state.idCounter + 1,
      future: []
    },
    message
  };
}

function createElement(state, command) {
  const size = SHAPE_SIZE[command.shape] || SHAPE_SIZE.rectangle;
  const point = resolvePoint(state, command, size);
  return {
    id: `el-${state.idCounter}`,
    shape: command.shape,
    x: point.x,
    y: point.y,
    width: size.width,
    height: size.height,
    color: command.color || "#111827",
    text: command.text || "",
    scale: command.scale || 1,
    rotation: command.rotation || 0,
    clusterId: command.clusterId || null
  };
}

function resolvePoint(state, command, size) {
  if (command.relation) {
    const anchor = findAnchorElement(state, command);
    if (anchor) {
      return applyClusterOffset(pointFromRelation(anchor, command.relation, size, state), size, command, state);
    }
  }

  const point = pointFromPosition(command.position || "center", state);
  return applyClusterOffset(point, size, command, state);
}

function applyClusterOffset(point, size, command, state) {
  const count = command.clusterCount || 1;
  const index = command.clusterIndex || 0;
  const spread = Math.max(size.width * 0.75, 110);
  return {
    x: clamp(point.x + (index - (count - 1) / 2) * spread, size.width / 2, state.width - size.width / 2),
    y: clamp(point.y, size.height / 2, state.height - size.height / 2)
  };
}

function pointFromPosition(position, state) {
  const positions = {
    center: [0.5, 0.52],
    top: [0.5, 0.22],
    bottom: [0.5, 0.74],
    left: [0.24, 0.52],
    right: [0.76, 0.52],
    "top-left": [0.24, 0.22],
    "top-right": [0.77, 0.22],
    "bottom-left": [0.26, 0.74],
    "bottom-right": [0.75, 0.74]
  };
  const [x, y] = positions[position] || positions.center;
  return { x: state.width * x, y: state.height * y };
}

function pointFromRelation(anchor, relation, size, state) {
  const anchorWidth = (anchor.width || 120) * (anchor.scale || 1);
  const anchorHeight = (anchor.height || 120) * (anchor.scale || 1);
  const gap = 56;
  const base = {
    x: anchor.x,
    y: anchor.y
  };

  if (relation === "right-of") {
    base.x = anchor.x + anchorWidth / 2 + size.width / 2 + gap;
  }
  if (relation === "left-of") {
    base.x = anchor.x - anchorWidth / 2 - size.width / 2 - gap;
  }
  if (relation === "above") {
    base.y = anchor.y - anchorHeight / 2 - size.height / 2 - gap;
  }
  if (relation === "below") {
    base.y = anchor.y + anchorHeight / 2 + size.height / 2 + gap;
  }
  if (relation === "front-of") {
    base.y = anchor.y + anchorHeight * 0.38;
  }

  return {
    x: clamp(base.x, size.width / 2, state.width - size.width / 2),
    y: clamp(base.y, size.height / 2, state.height - size.height / 2)
  };
}

function transformElement(state, command) {
  const index = findTargetIndex(state, command);
  if (index < 0) {
    return { state, message: "没有可调整的图形" };
  }
  const elements = state.elements.map((element, elementIndex) => {
    if (elementIndex !== index) {
      return element;
    }
    return {
      ...element,
      color: command.color || element.color,
      scale: command.scale ? round((element.scale || 1) * command.scale, 3) : element.scale || 1,
      rotation: command.rotationDelta ? (element.rotation || 0) + command.rotationDelta : element.rotation || 0,
      x: resolveTransformedX(state, element, command),
      y: resolveTransformedY(state, element, command)
    };
  });

  return {
    state: {
      ...pushHistory(state),
      elements,
      focusId: elements[index].id,
      future: []
    },
    message: "已调整图形"
  };
}

function deleteElement(state, command) {
  const index = findTargetIndex(state, command);
  if (index < 0) {
    return { state, message: "没有可删除的图形" };
  }
  const elements = state.elements.filter((_, elementIndex) => elementIndex !== index);

  return {
    state: {
      ...pushHistory(state),
      elements,
      focusId: resolveFocusAfterDelete(state, index, elements),
      future: []
    },
    message: "已删除图形"
  };
}

function duplicateElement(state, command) {
  const index = findTargetIndex(state, command);
  if (index < 0) {
    return { state, message: "没有可复制的图形" };
  }
  const source = state.elements[index];
  const clone = {
    ...source,
    id: `el-${state.idCounter}`,
    x: clamp(source.x + 74, (source.width || 120) / 2, state.width - (source.width || 120) / 2),
    y: clamp(source.y + 46, (source.height || 120) / 2, state.height - (source.height || 120) / 2)
  };

  return {
    state: {
      ...pushHistory(state),
      elements: [...state.elements, clone],
      focusId: clone.id,
      idCounter: state.idCounter + 1,
      future: []
    },
    message: "已复制图形"
  };
}

function resolveTransformedX(state, element, command) {
  if (command.position) {
    const point = pointFromPosition(command.position, state);
    return clamp(point.x, (element.width || 120) / 2, state.width - (element.width || 120) / 2);
  }
  return command.move ? clamp(element.x + command.move.dx, 0, state.width) : element.x;
}

function resolveTransformedY(state, element, command) {
  if (command.position) {
    const point = pointFromPosition(command.position, state);
    return clamp(point.y, (element.height || 120) / 2, state.height - (element.height || 120) / 2);
  }
  return command.move ? clamp(element.y + command.move.dy, 0, state.height) : element.y;
}

function findTargetIndex(state, command) {
  const matches = (index) => {
    const element = state.elements[index];
    if (command.shape && element.shape !== command.shape) {
      return false;
    }
    if (command.colorFilter && element.color !== command.colorFilter) {
      return false;
    }
    return true;
  };

  if (command.target === "first") {
    for (let index = 0; index < state.elements.length; index += 1) {
      if (matches(index)) {
        return index;
      }
    }
    return -1;
  }

  if (command.target === "nth") {
    let matchCount = 0;
    for (let index = 0; index < state.elements.length; index += 1) {
      if (matches(index)) {
        matchCount += 1;
      }
      if (matchCount === command.targetIndex) {
        return index;
      }
    }
    return -1;
  }

  if (command.target === "focus") {
    const focusIndex = state.elements.findIndex((element) => element.id === state.focusId);
    if (focusIndex >= 0 && matches(focusIndex)) {
      return focusIndex;
    }
  }

  for (let index = state.elements.length - 1; index >= 0; index -= 1) {
    if (matches(index)) {
      return index;
    }
  }
  return -1;
}

function undo(state) {
  if (!state.history.length) {
    return { state, message: "没有可撤销的操作" };
  }
  const previous = state.history.at(-1);
  return {
    state: {
      ...state,
      ...previous,
      history: state.history.slice(0, -1),
      future: [snapshot(state), ...state.future]
    },
    message: "已撤销"
  };
}

function redo(state) {
  if (!state.future.length) {
    return { state, message: "没有可恢复的操作" };
  }
  const [next, ...future] = state.future;
  return {
    state: {
      ...state,
      ...next,
      history: [...state.history, snapshot(state)],
      future
    },
    message: "已恢复"
  };
}

function pushHistory(state) {
  return {
    ...state,
    history: [...state.history, snapshot(state)]
  };
}

function snapshot(state) {
  return {
    background: state.background,
    elements: state.elements.map((element) => ({ ...element })),
    focusId: state.focusId || null,
    idCounter: state.idCounter
  };
}

function findFocusElement(state) {
  return state.elements.find((element) => element.id === state.focusId) || null;
}

function resolveFocusAfterDelete(state, deletedIndex, elements) {
  const deletedElement = state.elements[deletedIndex];
  if (!deletedElement || deletedElement.id !== state.focusId) {
    return findFocusElement({ ...state, elements })?.id || null;
  }
  return elements[Math.min(deletedIndex, elements.length - 1)]?.id || elements.at(-1)?.id || null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
