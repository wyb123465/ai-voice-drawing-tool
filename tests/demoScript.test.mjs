import test from "node:test";
import assert from "node:assert/strict";
import { parseDemoScript } from "../src/domain/demoScript.js";

test("parses pipe-separated demo scripts for browser replay", () => {
  assert.deepEqual(parseDemoScript("画一个圆|复制刚才的圆|删除刚才的圆"), [
    "画一个圆",
    "复制刚才的圆",
    "删除刚才的圆"
  ]);
});

test("ignores empty demo script entries", () => {
  assert.deepEqual(parseDemoScript(" 画一个圆 | | 把背景改成浅蓝色 "), [
    "画一个圆",
    "把背景改成浅蓝色"
  ]);
});
