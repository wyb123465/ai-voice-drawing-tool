import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveVoiceCommand,
  shouldUseFallback,
  normalizeLlmCommands
} from "../src/domain/llmFallback.js";

test("uses local rules and never calls resolver for a clear command", async () => {
  let called = false;
  const resolver = async () => {
    called = true;
    return { commands: [] };
  };

  const result = await resolveVoiceCommand("画一个红色圆形", { resolver });

  assert.equal(result.source, "rule");
  assert.equal(called, false);
  assert.equal(result.commands[0].shape, "circle");
});

test("falls back to the cloud resolver when local parsing finds nothing", async () => {
  const resolver = async (text) => {
    assert.equal(text, "帮我整一只可爱的猫咪");
    return { commands: [{ type: "draw", shape: "circle", color: "灰色", position: "center" }] };
  };

  const result = await resolveVoiceCommand("帮我整一只可爱的猫咪", { resolver });

  assert.equal(result.source, "llm");
  assert.equal(result.commands.length, 1);
  assert.equal(result.commands[0].shape, "circle");
  assert.equal(result.commands[0].color, "#64748b");
});

test("recovers to local rules when the resolver throws", async () => {
  const resolver = async () => {
    throw new Error("network down");
  };

  const result = await resolveVoiceCommand("画一个abcdefg", { resolver });

  assert.equal(result.source, "rule");
  assert.match(result.feedback, /回退本地规则/);
});

test("shouldUseFallback triggers on empty or low-confidence local results", () => {
  assert.equal(shouldUseFallback({ commands: [], confidence: 0.2 }), true);
  assert.equal(shouldUseFallback({ commands: [{ type: "draw" }], confidence: 0.3 }), true);
  assert.equal(shouldUseFallback({ commands: [{ type: "draw" }], confidence: 0.86 }), false);
});

test("normalizeLlmCommands drops unknown types and unsafe fields", () => {
  const commands = normalizeLlmCommands([
    { type: "draw", shape: "circle", color: "红色", position: "top-left" },
    { type: "draw", shape: "spaceship", color: "红色" },
    { type: "delete", shape: "circle" },
    { type: "background", color: "不存在的颜色" },
    { type: "text", text: "  你好\n七牛  ", position: "weird-spot" }
  ]);

  assert.equal(commands.length, 3);

  const draw = commands.find((command) => command.type === "draw");
  assert.equal(draw.shape, "circle");
  assert.equal(draw.color, "#ef4444");
  assert.equal(draw.position, "top-left");

  const background = commands.find((command) => command.type === "background");
  assert.equal(background.color, "#f8fafc");

  const text = commands.find((command) => command.type === "text");
  assert.equal(text.text, "你好 七牛");
  assert.equal(text.position, "center");

  assert.ok(!commands.some((command) => command.type === "delete"));
});

test("normalizeLlmCommands accepts hex colors and ignores non-array input", () => {
  const commands = normalizeLlmCommands([
    { type: "draw", shape: "star", color: "#FFAA00", position: "center" }
  ]);
  assert.equal(commands[0].color, "#ffaa00");
  assert.deepEqual(normalizeLlmCommands(null), []);
  assert.deepEqual(normalizeLlmCommands("nope"), []);
});
