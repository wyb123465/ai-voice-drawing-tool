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
  const deleteSecond = parseVoiceCommand("删除第二个圆").commands[0];
  const growThirdBlue = parseVoiceCommand("把第三个蓝色圆变大").commands[0];
  const deleteLast = parseVoiceCommand("删除刚才的圆").commands[0];
  const dupeFirst = parseVoiceCommand("复制最初的矩形").commands[0];

  assert.equal(deleteFirst.target, "first");
  assert.equal(deleteSecond.target, "nth");
  assert.equal(deleteSecond.targetIndex, 2);
  assert.equal(growThirdBlue.target, "nth");
  assert.equal(growThirdBlue.targetIndex, 3);
  assert.equal(growThirdBlue.colorFilter, "#2563eb");
  assert.equal(deleteLast.target, "last");
  assert.equal(dupeFirst.target, "first");
});

test("extracts label text from unquoted position-prefixed text commands", () => {
  const lead = parseVoiceCommand("在左上角写上你好七牛").commands[0];
  const trail = parseVoiceCommand("写上你好七牛在左上角").commands[0];
  const containsConnectorWord = parseVoiceCommand("写上再见").commands[0];

  assert.equal(lead.type, "text");
  assert.equal(lead.text, "你好七牛");
  assert.equal(lead.position, "top-left");

  assert.equal(trail.text, "你好七牛");
  assert.equal(trail.position, "top-left");

  assert.equal(containsConnectorWord.type, "text");
  assert.equal(containsConnectorWord.text, "再见");
});

test("splits connector-like 再 only before a new command", () => {
  const drawSequence = parseVoiceCommand("画一个红色圆再画一个蓝色矩形");
  const text = parseVoiceCommand("写上再见");

  assert.deepEqual(drawSequence.commands.map((command) => command.shape), ["circle", "rectangle"]);
  assert.equal(text.commands.length, 1);
  assert.equal(text.commands[0].text, "再见");
});

test("parses color filters for edits and after-marker colors for recoloring", () => {
  const deletion = parseVoiceCommand("删除红色的圆").commands[0];
  const grow = parseVoiceCommand("把蓝色的圆变大一点").commands[0];
  const recolor = parseVoiceCommand("把蓝色的圆改成红色").commands[0];
  const recolorLast = parseVoiceCommand("把刚才的圆改成蓝色").commands[0];

  assert.equal(deletion.type, "delete");
  assert.equal(deletion.colorFilter, "#ef4444");

  assert.equal(grow.type, "transform");
  assert.equal(grow.colorFilter, "#2563eb");
  assert.ok(grow.scale > 1);

  assert.equal(recolor.color, "#ef4444");
  assert.equal(recolor.colorFilter, "#2563eb");

  assert.equal(recolorLast.color, "#2563eb");
  assert.equal(recolorLast.colorFilter, undefined);
});

test("treats bare duplication phrases as duplicate and keeps draw intents intact", () => {
  assert.equal(parseVoiceCommand("再来一个").commands[0].type, "duplicate");
  assert.equal(parseVoiceCommand("再画一个一样的").commands[0].type, "duplicate");

  const draw = parseVoiceCommand("来一个红色圆形").commands[0];
  assert.equal(draw.type, "draw");
  assert.equal(draw.shape, "circle");
  assert.equal(draw.color, "#ef4444");
});

test("blocks ambiguous edits for unknown semantic objects", () => {
  const unknownTransform = parseVoiceCommand("把猫变大");
  const unknownLeadingTransform = parseVoiceCommand("猫变大一点");
  const unknownCausativeTransform = parseVoiceCommand("让猫变大一点");
  const unknownDelete = parseVoiceCommand("删除小猫");
  const unknownBareTrailingDelete = parseVoiceCommand("小猫删除");
  const unknownTrailingDelete = parseVoiceCommand("把小猫删除");
  const unknownTrailingDuplicate = parseVoiceCommand("把小猫复制");
  const unknownDemonstrativeDelete = parseVoiceCommand("把那个小猫删除");
  const unknownDemonstrativeTransform = parseVoiceCommand("把这个小猫变大");
  const directionOnlyMove = parseVoiceCommand("向右移动");
  const pronounDelete = parseVoiceCommand("把它删除");
  const demonstrativeGenericDelete = parseVoiceCommand("把那个图形删除");
  const explicitLast = parseVoiceCommand("把刚才的图形变大一点");

  assert.equal(unknownTransform.commands.length, 0);
  assert.equal(unknownTransform.allowFallback, false);
  assert.match(unknownTransform.feedback, /无法确定/);

  assert.equal(unknownLeadingTransform.commands.length, 0);
  assert.equal(unknownLeadingTransform.allowFallback, false);

  assert.equal(unknownCausativeTransform.commands.length, 0);
  assert.equal(unknownCausativeTransform.allowFallback, false);

  assert.equal(unknownDelete.commands.length, 0);
  assert.equal(unknownDelete.allowFallback, false);

  assert.equal(unknownBareTrailingDelete.commands.length, 0);
  assert.equal(unknownBareTrailingDelete.allowFallback, false);

  assert.equal(unknownTrailingDelete.commands.length, 0);
  assert.equal(unknownTrailingDelete.allowFallback, false);

  assert.equal(unknownTrailingDuplicate.commands.length, 0);
  assert.equal(unknownTrailingDuplicate.allowFallback, false);

  assert.equal(unknownDemonstrativeDelete.commands.length, 0);
  assert.equal(unknownDemonstrativeDelete.allowFallback, false);

  assert.equal(unknownDemonstrativeTransform.commands.length, 0);
  assert.equal(unknownDemonstrativeTransform.allowFallback, false);

  assert.equal(directionOnlyMove.commands[0].type, "transform");
  assert.equal(directionOnlyMove.commands[0].move.dx, 80);

  assert.equal(pronounDelete.commands[0].type, "delete");
  assert.equal(pronounDelete.commands[0].target, "last");

  assert.equal(demonstrativeGenericDelete.commands[0].type, "delete");
  assert.equal(demonstrativeGenericDelete.commands[0].target, "last");

  assert.equal(explicitLast.commands[0].type, "transform");
  assert.equal(explicitLast.commands[0].target, "last");
});
