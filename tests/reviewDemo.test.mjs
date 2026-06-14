import test from "node:test";
import assert from "node:assert/strict";
import { getReviewDemoCommands, getReviewDemoSteps } from "../src/domain/reviewDemo.js";

test("review demo steps are stable and judge-ready", () => {
  const steps = getReviewDemoSteps();

  assert.equal(steps.length >= 8, true);
  assert.equal(new Set(steps.map((step) => step.id)).size, steps.length);

  for (const step of steps) {
    assert.equal(typeof step.id, "string");
    assert.equal(step.id.length > 0, true);
    assert.equal(typeof step.label, "string");
    assert.equal(step.label.length > 0, true);
    assert.equal(typeof step.command, "string");
    assert.equal(step.command.length > 0, true);
  }
});

test("review demo commands cover the strongest scoring paths", () => {
  const commands = getReviewDemoCommands();
  const joined = commands.join("|");

  assert.deepEqual(commands, getReviewDemoSteps().map((step) => step.command));
  assert.match(joined, /太阳.*山.*树/);
  assert.match(joined, /左上角写上XEngineer/);
  assert.match(joined, /背景.*浅蓝/);
  assert.match(joined, /删除第二个圆/);
  assert.match(joined, /画一只猫/);
  assert.match(joined, /撤销/);
  assert.match(joined, /重做/);
  assert.match(joined, /导出图片/);
});

test("review demo data is returned as fresh objects", () => {
  const first = getReviewDemoSteps();
  const second = getReviewDemoSteps();

  first[0].command = "被修改";

  assert.notEqual(first[0].command, second[0].command);
});
