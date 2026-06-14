# Voice Drawing Precision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve voice-command precision by supporting ordinal object targets and preserving text that contains "再".

**Architecture:** Keep the existing parser/state split. `commands.js` should emit structured ordinal targets, and `drawingState.js` should resolve the Nth matching element during edits. Compound splitting should treat "再" as a connector only when it introduces another command, not inside label text such as "再见".

**Tech Stack:** Plain ES modules, Canvas 2D state engine, Node.js built-in test runner.

---

### Task 1: Add Failing Tests

**Files:**
- Modify: `tests/commands.test.mjs`
- Modify: `tests/drawingState.test.mjs`

- [x] Add parser assertions for `删除第二个圆`, `把第三个蓝色圆变大`, and `写上再见`.
- [x] Add state assertions proving `删除第二个圆` deletes the second matching circle instead of the last one.
- [x] Run `npm test` and confirm the new tests fail for the current behavior.

### Task 2: Implement Ordinal Targets

**Files:**
- Modify: `src/domain/commands.js`
- Modify: `src/domain/drawingState.js`

- [x] Parse Chinese and numeric ordinals into `target: "nth"` and `targetIndex`.
- [x] Preserve existing `first` and `last` behavior.
- [x] Resolve the Nth matching element in `findTargetIndex`.
- [x] Run `npm test` and confirm ordinal tests pass.

### Task 3: Fix Text Splitting

**Files:**
- Modify: `src/domain/commands.js`

- [x] Change compound splitting so `再` only splits before command starters.
- [x] Ensure `写上再见` keeps `再见` as label text.
- [x] Preserve `画一个圆，再画一个矩形` and `再来一个`.
- [x] Run `npm test`.

### Task 4: Documentation And Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/design.md`
- Create: `src/domain/demoReplay.js`
- Test: `tests/demoReplay.test.mjs`

- [x] Document ordinal target examples in supported commands.
- [x] Update the design document's multi-object selection status.
- [x] Replace `requestAnimationFrame` demo playback with timer-friendly scheduling for background browser tabs.
- [x] Run `npm test`, `git diff --check`, and a browser replay URL with ordinal/text examples.
