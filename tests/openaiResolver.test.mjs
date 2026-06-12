import test from "node:test";
import assert from "node:assert/strict";
import { createOpenAiResolver } from "../src/llm/openaiResolver.js";

function fakeFetch(captured, responseBody, ok = true) {
  return async (url, options) => {
    captured.url = url;
    captured.options = options;
    return {
      ok,
      status: ok ? 200 : 500,
      json: async () => responseBody
    };
  };
}

test("throws without an api key", () => {
  assert.throws(() => createOpenAiResolver({}), /apiKey/);
});

test("sends key in the Authorization header, never in the URL", async () => {
  const captured = {};
  const resolver = createOpenAiResolver({
    apiKey: "secret-123",
    endpoint: "https://example.com/v1/chat/completions",
    fetchImpl: fakeFetch(captured, {
      choices: [{ message: { content: JSON.stringify({ commands: [] }) } }]
    })
  });

  await resolver("画一个圆");

  assert.equal(captured.url, "https://example.com/v1/chat/completions");
  assert.ok(!captured.url.includes("secret-123"));
  assert.equal(captured.options.headers.Authorization, "Bearer secret-123");
  assert.equal(captured.options.method, "POST");

  const body = JSON.parse(captured.options.body);
  assert.equal(body.messages[1].content, "画一个圆");
  assert.equal(body.response_format.type, "json_object");
});

test("parses commands from a JSON string content", async () => {
  const resolver = createOpenAiResolver({
    apiKey: "k",
    fetchImpl: fakeFetch({}, {
      choices: [
        {
          message: {
            content: JSON.stringify({
              commands: [{ type: "draw", shape: "circle", color: "红色" }]
            })
          }
        }
      ]
    })
  });

  const result = await resolver("画一个红色圆形");
  assert.equal(result.commands.length, 1);
  assert.equal(result.commands[0].shape, "circle");
});

test("returns empty commands on malformed content instead of throwing", async () => {
  const resolver = createOpenAiResolver({
    apiKey: "k",
    fetchImpl: fakeFetch({}, {
      choices: [{ message: { content: "this is not json" } }]
    })
  });

  const result = await resolver("乱说一通");
  assert.deepEqual(result.commands, []);
});

test("throws on a non-ok response so the caller can fall back", async () => {
  const resolver = createOpenAiResolver({
    apiKey: "k",
    fetchImpl: fakeFetch({}, {}, false)
  });

  await assert.rejects(() => resolver("画一个圆"), /云端返回异常/);
});
