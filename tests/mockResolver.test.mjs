import test from "node:test";
import assert from "node:assert/strict";
import { createMockLlmResolver } from "../src/llm/mockResolver.js";
import { resolveVoiceCommand } from "../src/domain/llmFallback.js";

test("maps open expressions to the closest known primitives", async () => {
  const resolver = createMockLlmResolver();

  const cat = await resolver("帮我画一只可爱的猫");
  assert.equal(cat.commands.length, 1);
  assert.equal(cat.commands[0].type, "draw");
  assert.equal(cat.commands[0].shape, "circle");

  const unknown = await resolver("讲个笑话");
  assert.deepEqual(unknown.commands, []);
});

test("returns fresh command objects on every call", async () => {
  const resolver = createMockLlmResolver();
  const first = await resolver("画一只猫");
  first.commands[0].color = "被改坏了";
  const second = await resolver("画一只猫");
  assert.notEqual(second.commands[0].color, "被改坏了");
});

test("mock results flow through fallback normalization end to end", async () => {
  const result = await resolveVoiceCommand("画一只猫", {
    resolver: createMockLlmResolver()
  });

  assert.equal(result.source, "llm");
  assert.equal(result.commands.length, 1);
  assert.equal(result.commands[0].shape, "circle");
  // 中文颜色名经白名单校验转换为色值。
  assert.match(result.commands[0].color, /^#[0-9a-f]{6}$/);
});
