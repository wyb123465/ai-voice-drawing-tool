import test from "node:test";
import assert from "node:assert/strict";
import { renderCanvas } from "../src/domain/renderCanvas.js";

function createMockCanvas() {
  const calls = [];
  const context = {
    calls,
    clearRect: (...args) => calls.push(["clearRect", ...args]),
    fillRect: (...args) => calls.push(["fillRect", ...args]),
    save: () => calls.push(["save"]),
    restore: () => calls.push(["restore"]),
    translate: (...args) => calls.push(["translate", ...args]),
    rotate: (...args) => calls.push(["rotate", ...args]),
    scale: (...args) => calls.push(["scale", ...args]),
    beginPath: () => calls.push(["beginPath"]),
    arc: (...args) => calls.push(["arc", ...args]),
    fill: () => calls.push(["fill"]),
    stroke: () => calls.push(["stroke"]),
    moveTo: (...args) => calls.push(["moveTo", ...args]),
    lineTo: (...args) => calls.push(["lineTo", ...args]),
    closePath: () => calls.push(["closePath"]),
    quadraticCurveTo: (...args) => calls.push(["quadraticCurveTo", ...args]),
    fillText: (...args) => calls.push(["fillText", ...args]),
    setLineDash: (...args) => calls.push(["setLineDash", ...args])
  };

  return {
    canvas: {
      width: 1280,
      height: 800,
      getContext: () => context
    },
    context
  };
}

test("renders square shapes as filled rounded rectangles", () => {
  const { canvas, context } = createMockCanvas();

  renderCanvas(canvas, {
    background: "#fffdf5",
    focusId: null,
    elements: [
      {
        id: "el-1",
        shape: "square",
        x: 640,
        y: 400,
        width: 150,
        height: 150,
        color: "#111827",
        scale: 1,
        rotation: 0
      }
    ]
  });

  assert.ok(context.calls.some(([name]) => name === "quadraticCurveTo"));
});

test("draws a focus ring around the focused element", () => {
  const { canvas, context } = createMockCanvas();

  renderCanvas(canvas, {
    background: "#fffdf5",
    focusId: "el-1",
    elements: [
      {
        id: "el-1",
        shape: "circle",
        x: 640,
        y: 400,
        width: 150,
        height: 150,
        color: "#111827",
        scale: 1,
        rotation: 0
      }
    ]
  });

  assert.ok(context.calls.some(([name]) => name === "setLineDash"));
});
