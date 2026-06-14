import test from "node:test";
import assert from "node:assert/strict";
import {
  applyCommands,
  createInitialState
} from "../src/domain/drawingState.js";

test("adds a drawn circle to the canvas state", () => {
  const { state } = applyCommands(createInitialState(), [
    { type: "draw", shape: "circle", color: "#ef4444", position: "center" }
  ]);

  assert.equal(state.elements.length, 1);
  assert.equal(state.elements[0].shape, "circle");
  assert.equal(state.elements[0].color, "#ef4444");
  assert.equal(state.history.length, 1);
});

test("places a new shape to the right of an anchor shape", () => {
  const first = applyCommands(createInitialState(), [
    { type: "draw", shape: "circle", color: "#ef4444", position: "center" }
  ]).state;

  const { state } = applyCommands(first, [
    {
      type: "draw",
      shape: "rectangle",
      color: "#2563eb",
      relation: "right-of",
      anchorShape: "circle"
    }
  ]);

  const circle = state.elements.find((element) => element.shape === "circle");
  const rectangle = state.elements.find((element) => element.shape === "rectangle");

  assert.ok(rectangle.x > circle.x);
});

test("supports undo and redo across drawing operations", () => {
  const withTwoShapes = applyCommands(createInitialState(), [
    { type: "draw", shape: "circle", color: "#ef4444" },
    { type: "draw", shape: "rectangle", color: "#2563eb" }
  ]).state;

  const afterUndo = applyCommands(withTwoShapes, [{ type: "undo" }]).state;
  const afterRedo = applyCommands(afterUndo, [{ type: "redo" }]).state;

  assert.equal(afterUndo.elements.length, 1);
  assert.equal(afterRedo.elements.length, 2);
});

test("expands scene-like commands and transforms the latest matching shape", () => {
  const scene = applyCommands(createInitialState(), [
    { type: "draw", shape: "sun", color: "#f59e0b", position: "top-right" },
    { type: "draw", shape: "tree", color: "#16a34a", position: "bottom-left" },
    { type: "transform", target: "last", shape: "tree", scale: 1.25 }
  ]).state;

  const tree = scene.elements.find((element) => element.shape === "tree");

  assert.equal(scene.elements.length, 2);
  assert.equal(tree.scale, 1.25);
});

test("keeps repeated relative shapes anchored to the same previous element", () => {
  const { state } = applyCommands(createInitialState(), [
    { type: "draw", shape: "sun", color: "#f59e0b", position: "top-right" },
    {
      type: "draw",
      shape: "mountain",
      color: "#475569",
      relation: "below",
      anchorShape: "last",
      clusterId: "clause-1",
      clusterIndex: 0,
      clusterCount: 2
    },
    {
      type: "draw",
      shape: "mountain",
      color: "#475569",
      relation: "below",
      anchorShape: "last",
      clusterId: "clause-1",
      clusterIndex: 1,
      clusterCount: 2
    }
  ]);

  const mountains = state.elements.filter((element) => element.shape === "mountain");

  assert.equal(mountains.length, 2);
  assert.equal(mountains[0].y, mountains[1].y);
  assert.notEqual(mountains[0].x, mountains[1].x);
});

test("deletes and duplicates the latest matching element", () => {
  const initial = applyCommands(createInitialState(), [
    { type: "draw", shape: "circle", color: "#ef4444" },
    { type: "draw", shape: "rectangle", color: "#2563eb" }
  ]).state;

  const duplicated = applyCommands(initial, [
    { type: "duplicate", target: "last", shape: "rectangle" }
  ]).state;
  const deleted = applyCommands(duplicated, [
    { type: "delete", target: "last", shape: "rectangle" }
  ]).state;

  assert.equal(duplicated.elements.filter((element) => element.shape === "rectangle").length, 2);
  assert.equal(deleted.elements.filter((element) => element.shape === "rectangle").length, 1);
});

test("rotates and moves the latest matching element to an absolute position", () => {
  const initial = applyCommands(createInitialState(), [
    { type: "draw", shape: "rectangle", color: "#2563eb", position: "center" }
  ]).state;

  const { state } = applyCommands(initial, [
    { type: "transform", target: "last", shape: "rectangle", rotationDelta: 45, position: "top-left" }
  ]);

  const rectangle = state.elements[0];

  assert.equal(rectangle.rotation, 45);
  assert.ok(rectangle.x < initial.width / 2);
  assert.ok(rectangle.y < initial.height / 2);
});

test("deletes the first matching element when target is first", () => {
  const initial = applyCommands(createInitialState(), [
    { type: "draw", shape: "circle", color: "#ef4444", position: "left" },
    { type: "draw", shape: "circle", color: "#2563eb", position: "right" }
  ]).state;

  const { state } = applyCommands(initial, [
    { type: "delete", target: "first", shape: "circle" }
  ]);

  assert.equal(state.elements.length, 1);
  // 删掉的应是第一个（红色），保留的是后画的蓝色。
  assert.equal(state.elements[0].color, "#2563eb");
});

test("edits the nth matching element when target is nth", () => {
  const initial = applyCommands(createInitialState(), [
    { type: "draw", shape: "circle", color: "#ef4444", position: "left" },
    { type: "draw", shape: "circle", color: "#2563eb", position: "center" },
    { type: "draw", shape: "circle", color: "#16a34a", position: "right" },
    { type: "draw", shape: "rectangle", color: "#111827", position: "top" }
  ]).state;

  const deleted = applyCommands(initial, [
    { type: "delete", target: "nth", targetIndex: 2, shape: "circle" }
  ]).state;

  assert.deepEqual(deleted.elements.map((element) => element.color), ["#ef4444", "#16a34a", "#111827"]);

  const transformed = applyCommands(initial, [
    { type: "transform", target: "nth", targetIndex: 3, shape: "circle", scale: 1.25 }
  ]).state;

  assert.equal(transformed.elements[0].scale, 1);
  assert.equal(transformed.elements[1].scale, 1);
  assert.equal(transformed.elements[2].scale, 1.25);
});

test("edits only the element matching the color filter", () => {
  const initial = applyCommands(createInitialState(), [
    { type: "draw", shape: "circle", color: "#ef4444", position: "left" },
    { type: "draw", shape: "circle", color: "#2563eb", position: "right" }
  ]).state;

  const deleted = applyCommands(initial, [
    { type: "delete", target: "last", shape: "circle", colorFilter: "#ef4444" }
  ]).state;

  assert.equal(deleted.elements.length, 1);
  assert.equal(deleted.elements[0].color, "#2563eb");

  const recolored = applyCommands(initial, [
    { type: "transform", target: "last", shape: "circle", colorFilter: "#ef4444", color: "#16a34a" }
  ]).state;

  assert.equal(recolored.elements[0].color, "#16a34a");
  assert.equal(recolored.elements[1].color, "#2563eb");
});
