import assert from "node:assert/strict";
import test from "node:test";

import { createSpeechLoop, isRecoverableSpeechError } from "../src/domain/speechLoop.js";

function createHarness(options = {}) {
  const starts = [];
  const stops = [];
  const statuses = [];
  const logs = [];
  const timers = [];
  let fallbackShown = false;
  const recognition = {
    start() {
      starts.push("start");
    },
    stop() {
      stops.push("stop");
    }
  };
  const loop = createSpeechLoop({
    recognition,
    announceStatus: (state, label) => statuses.push({ state, label }),
    logEntry: (message) => logs.push(message),
    showFallback: () => {
      fallbackShown = true;
    },
    setTimeoutFn: (callback) => {
      timers.push(callback);
      return timers.length;
    },
    clearTimeoutFn: () => {},
    restartDelayMs: 1,
    ...options
  });

  return {
    loop,
    starts,
    stops,
    statuses,
    logs,
    timers,
    get fallbackShown() {
      return fallbackShown;
    }
  };
}

test("restarts recognition when the browser ends while voice mode is requested", () => {
  const harness = createHarness();

  harness.loop.start();
  harness.loop.handleStart();
  harness.loop.handleEnd();

  assert.equal(harness.starts.length, 1);
  assert.equal(harness.statuses.at(-1).label, "重新连接中");
  assert.equal(harness.timers.length, 1);

  harness.timers[0]();
  assert.equal(harness.starts.length, 2);
});

test("does not restart recognition after the user stops voice mode", () => {
  const harness = createHarness();

  harness.loop.start();
  harness.loop.handleStart();
  harness.loop.stop();
  harness.loop.handleEnd();

  assert.equal(harness.stops.length, 1);
  assert.equal(harness.timers.length, 0);
  assert.equal(harness.statuses.at(-1).label, "已暂停");
});

test("retries recoverable speech errors without leaving voice mode", () => {
  const harness = createHarness();

  harness.loop.start();
  harness.loop.handleStart();
  harness.loop.handleError({ error: "no-speech" });

  assert.equal(harness.fallbackShown, false);
  assert.match(harness.logs.at(-1), /no-speech/);
  assert.equal(harness.statuses.at(-1).label, "重新连接中");
  assert.equal(harness.timers.length, 1);
});

test("does not double-schedule restart when an error is immediately followed by end", () => {
  const harness = createHarness();

  harness.loop.start();
  harness.loop.handleStart();
  harness.loop.handleError({ error: "network" });
  harness.loop.handleEnd();

  assert.equal(harness.timers.length, 1);
  assert.equal(harness.statuses.filter((status) => status.label === "重新连接中").length, 1);
});

test("retries again when a scheduled restart fires before the browser is ready", () => {
  const timers = [];
  const starts = [];
  const recognition = {
    start() {
      starts.push("start");
      if (starts.length === 2) {
        const error = new Error("already started");
        error.name = "InvalidStateError";
        throw error;
      }
    },
    stop() {}
  };
  const loop = createSpeechLoop({
    recognition,
    announceStatus: () => {},
    logEntry: () => {},
    showFallback: () => {},
    setTimeoutFn: (callback) => {
      timers.push(callback);
      return timers.length;
    },
    clearTimeoutFn: () => {},
    restartDelayMs: 1
  });

  loop.start();
  loop.handleStart();
  loop.handleEnd();
  timers.shift()();

  assert.equal(starts.length, 2);
  assert.equal(timers.length, 1);

  timers.shift()();
  assert.equal(starts.length, 3);
});

test("pauses recognition during spoken feedback and resumes afterward", () => {
  const harness = createHarness();

  harness.loop.start();
  harness.loop.handleStart();

  assert.equal(harness.loop.pauseForOutput(), true);
  assert.equal(harness.stops.length, 1);

  harness.loop.handleEnd();
  assert.equal(harness.timers.length, 0);
  assert.equal(harness.statuses.at(-1).label, "反馈中");

  harness.loop.resumeAfterOutput();
  assert.equal(harness.statuses.at(-1).label, "重新连接中");
  assert.equal(harness.timers.length, 1);
});

test("ignores recoverable speech errors caused by pausing for spoken feedback", () => {
  const harness = createHarness();

  harness.loop.start();
  harness.loop.handleStart();
  harness.loop.pauseForOutput();
  harness.loop.handleError({ error: "aborted" });

  assert.equal(harness.logs.length, 0);
  assert.equal(harness.fallbackShown, false);
  assert.equal(harness.timers.length, 0);
});

test("stops on permission errors because the browser cannot recover automatically", () => {
  const harness = createHarness();

  harness.loop.start();
  harness.loop.handleError({ error: "not-allowed" });

  assert.equal(harness.fallbackShown, true);
  assert.equal(harness.timers.length, 0);
  assert.equal(harness.statuses.at(-1).label, "语音异常");
});

test("classifies speech recognition errors by whether retrying can help", () => {
  assert.equal(isRecoverableSpeechError("no-speech"), true);
  assert.equal(isRecoverableSpeechError("aborted"), true);
  assert.equal(isRecoverableSpeechError("network"), true);
  assert.equal(isRecoverableSpeechError("not-allowed"), false);
  assert.equal(isRecoverableSpeechError("service-not-allowed"), false);
});
