import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSpeech,
  parseVoiceCommand,
  splitCompoundCommand
} from "../src/domain/commands.js";

test("normalizes common speech punctuation and filler words", () => {
  assert.equal(normalizeSpeech("请帮我，画一个  红色的圆形。"), "画一个红色圆形");
});

test("splits compound drawing requests without losing semantic clauses", () => {
  const parts = splitCompoundCommand("画一个太阳，下面有两座山，山前面有一棵树");
  assert.deepEqual(parts, ["画一个太阳", "下面有两座山", "山前面有一棵树"]);
});

test("parses a simple red circle drawing command", () => {
  const result = parseVoiceCommand("画一个红色圆形");

  assert.equal(result.commands.length, 1);
  assert.equal(result.commands[0].type, "draw");
  assert.equal(result.commands[0].shape, "circle");
  assert.equal(result.commands[0].color, "#ef4444");
  assert.ok(result.confidence >= 0.7);
});

test("decomposes a scene request into drawable primitives", () => {
  const result = parseVoiceCommand("画一个太阳，下面有两座山，山前面有一棵树");
  const shapes = result.commands.map((command) => command.shape);

  assert.ok(shapes.includes("sun"));
  assert.equal(shapes.filter((shape) => shape === "mountain").length, 2);
  assert.ok(shapes.includes("tree"));
});

test("parses relative placement against an existing shape", () => {
  const result = parseVoiceCommand("在圆形右边画一个蓝色矩形");

  assert.equal(result.commands[0].type, "draw");
  assert.equal(result.commands[0].shape, "rectangle");
  assert.equal(result.commands[0].color, "#2563eb");
  assert.equal(result.commands[0].relation, "right-of");
  assert.equal(result.commands[0].anchorShape, "circle");
});

test("parses natural transform and canvas control commands", () => {
  const transform = parseVoiceCommand("把刚才的圆变大一点").commands[0];
  const clear = parseVoiceCommand("清空画布").commands[0];
  const background = parseVoiceCommand("把背景改成浅蓝色").commands[0];

  assert.equal(transform.type, "transform");
  assert.equal(transform.target, "last");
  assert.equal(transform.shape, "circle");
  assert.ok(transform.scale > 1);

  assert.equal(clear.type, "clear");

  assert.equal(background.type, "background");
  assert.equal(background.color, "#dbeafe");
});

test("parses richer edit commands for deletion, duplication, rotation, and absolute movement", () => {
  const deletion = parseVoiceCommand("删除刚才的圆").commands[0];
  const duplicate = parseVoiceCommand("复制刚才的矩形").commands[0];
  const rotate = parseVoiceCommand("把刚才的矩形旋转45度").commands[0];
  const moveTo = parseVoiceCommand("把刚才的圆移到左上角").commands[0];

  assert.equal(deletion.type, "delete");
  assert.equal(deletion.target, "last");
  assert.equal(deletion.shape, "circle");

  assert.equal(duplicate.type, "duplicate");
  assert.equal(duplicate.shape, "rectangle");

  assert.equal(rotate.type, "transform");
  assert.equal(rotate.rotationDelta, 45);

  assert.equal(moveTo.type, "transform");
  assert.equal(moveTo.position, "top-left");
});

test("parses parameterized wave drawing commands", () => {
  const result = parseVoiceCommand("画一条黑色波浪线");

  assert.equal(result.commands[0].type, "draw");
  assert.equal(result.commands[0].shape, "wave");
  assert.equal(result.commands[0].color, "#111827");
});

test("resolves first vs last target for edit commands", () => {
  const deleteFirst = parseVoiceCommand("删除第一个圆").commands[0];
  const deleteLast = parseVoiceCommand("删除刚才的圆").commands[0];
  const dupeFirst = parseVoiceCommand("复制最初的矩形").commands[0];

  assert.equal(deleteFirst.target, "first");
  assert.equal(deleteLast.target, "last");
  assert.equal(dupeFirst.target, "first");
});
