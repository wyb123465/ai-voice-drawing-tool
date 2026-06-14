# Review Experience Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the app's first-screen review experience with a curated demo script, live metrics, and a more polished control rail.

**Architecture:** Add a small tested domain module for the review demo script. Wire the module into `app.js` and render the controls in `index.html`. Extend the existing CSS tokens and layout without adding dependencies.

**Tech Stack:** Static HTML/CSS/ES modules, Canvas 2D, Node.js built-in test runner.

---

### Task 1: Demo Script Data

**Files:**
- Create: `src/domain/reviewDemo.js`
- Create: `tests/reviewDemo.test.mjs`

- [x] Add failing tests that assert the review demo script has stable ids, non-empty labels, and commands covering scene, text, ordinal selection, LLM fallback simulation, undo/redo, and export.
- [x] Run `npm test -- tests/reviewDemo.test.mjs` and confirm the module import fails.
- [x] Implement `getReviewDemoSteps()` and `getReviewDemoCommands()`.
- [x] Run `npm test -- tests/reviewDemo.test.mjs` and confirm it passes.

### Task 2: UI Wiring

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`

- [x] Add semantic review controls: run demo button, command step list, live metrics, and labeled fallback textarea.
- [x] Import review demo commands in `app.js`.
- [x] Wire the run demo button and individual step buttons through the existing `enqueueUtterance()` queue.
- [x] Update metrics after every command application.

### Task 3: Visual Polish

**Files:**
- Modify: `src/styles.css`

- [x] Add compact token aliases for spacing, radius, and subtle status surfaces.
- [x] Make the right rail scannable with grouped controls, stable command step buttons, and responsive wrapping.
- [x] Preserve mobile layout without text overlap.
- [x] Respect `prefers-reduced-motion`.

### Task 4: Documentation And Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/submission.md`

- [x] Mention the review demo controls and automatic replay path.
- [x] Run `npm test`.
- [x] Run `git diff --check`.
- [x] Verify `http://localhost:4173/` returns 200.
- [x] Capture desktop and mobile screenshots and inspect for layout fit.
