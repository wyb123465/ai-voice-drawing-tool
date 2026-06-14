import test from "node:test";
import assert from "node:assert/strict";
import { scheduleDemoReplay } from "../src/domain/demoReplay.js";

test("schedules demo replay with a timer-friendly scheduler", () => {
  const scheduled = [];
  const executed = [];
  const scheduler = (callback) => {
    scheduled.push(callback);
  };

  const started = scheduleDemoReplay(["画一个圆", "写上再见"], (command) => {
    executed.push(command);
  }, scheduler);

  assert.equal(started, true);
  assert.equal(scheduled.length, 1);
  assert.deepEqual(executed, []);

  scheduled[0]();

  assert.deepEqual(executed, ["画一个圆", "写上再见"]);
});

test("does not schedule an empty demo replay", () => {
  const scheduled = [];

  const started = scheduleDemoReplay([], () => {}, (callback) => {
    scheduled.push(callback);
  });

  assert.equal(started, false);
  assert.deepEqual(scheduled, []);
});
