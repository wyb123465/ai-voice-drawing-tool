# AI Voice Drawing Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based AI voice drawing tool for the XEngineer fourth-batch topic, including automated tests, a runnable demo, README, and design document.

**Architecture:** The app separates speech/DOM integration from deterministic command understanding and drawing state updates. Voice input becomes structured commands, commands mutate a serializable canvas state, and the renderer paints that state to Canvas.

**Tech Stack:** Plain HTML/CSS/JavaScript ES modules, Web Speech API, Canvas 2D, Node.js built-in test runner, Node.js static dev server.

---

## File Structure

- Create `package.json`: npm scripts for test and local serving.
- Create `index.html`: single page shell and app mount structure.
- Create `src/styles.css`: responsive tool UI, canvas frame, command log, status indicators.
- Create `src/app.js`: browser integration, speech recognition, speech synthesis, DOM events, canvas lifecycle.
- Create `src/domain/commands.js`: Chinese voice command normalization, intent parsing, compound command splitting, color/shape/position extraction.
- Create `src/domain/drawingState.js`: state model, command execution, undo/redo, relative placement, scene templates.
- Create `src/domain/renderCanvas.js`: Canvas 2D rendering for background, shapes, text, and scene primitives.
- Create `scripts/serve.mjs`: zero-dependency local static server.
- Create `tests/commands.test.mjs`: parser behavior tests.
- Create `tests/drawingState.test.mjs`: state mutation and relative placement tests.
- Create `README.md`: setup, run, demo flow, supported commands, submission checklist.
- Create `docs/design.md`: required competition design document.

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `scripts/serve.mjs`

- [ ] **Step 1: Add npm scripts**

Create `package.json` with:

```json
{
  "name": "ai-voice-drawing-tool",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "serve": "node scripts/serve.mjs"
  }
}
```

- [ ] **Step 2: Add the HTML shell**

Create `index.html` with a linked stylesheet and module script. Include a top toolbar, microphone status, transcript, canvas, and command log containers.

- [ ] **Step 3: Add the static server**

Create `scripts/serve.mjs` using `node:http`, `node:fs/promises`, and `node:path`. Serve files from the repository root on port `4173` by default, with `PORT` override.

- [ ] **Step 4: Run baseline test command**

Run: `npm test`

Expected: Node reports no matching test files or an empty suite before tests are added.

## Task 2: Command Parser Tests

**Files:**
- Create: `tests/commands.test.mjs`

- [ ] **Step 1: Write failing parser tests**

Create tests that import `parseVoiceCommand` from `src/domain/commands.js` and assert:

```js
parseVoiceCommand("画一个红色圆形").commands[0]
```

returns a `draw` command for a red circle.

```js
parseVoiceCommand("画一个太阳，下面有两座山，山前面有一棵树").commands
```

returns several commands including sun, two mountains, and tree primitives.

```js
parseVoiceCommand("把刚才的圆变大一点").commands[0]
```

returns a `transform` command with `scale > 1`.

```js
parseVoiceCommand("清空画布").commands[0]
```

returns a `clear` command.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test`

Expected: FAIL because `src/domain/commands.js` does not exist.

## Task 3: Command Parser Implementation

**Files:**
- Create: `src/domain/commands.js`

- [ ] **Step 1: Implement command parsing**

Add exported functions:

```js
export function normalizeSpeech(input) {}
export function parseVoiceCommand(input, context = {}) {}
export function parseColor(text) {}
export function parseShape(text) {}
export function splitCompoundCommand(text) {}
```

Support draw, transform, undo, redo, clear, background, text, and export intents.

- [ ] **Step 2: Run parser tests and verify GREEN**

Run: `npm test`

Expected: Parser tests pass or fail only because drawing-state tests are not present yet.

## Task 4: Drawing State Tests

**Files:**
- Create: `tests/drawingState.test.mjs`

- [ ] **Step 1: Write failing state tests**

Create tests that import `createInitialState` and `applyCommands` from `src/domain/drawingState.js` and assert:

```js
const state = applyCommands(createInitialState(), [{ type: "draw", shape: "circle", color: "#ef4444" }]).state;
```

adds a circle element.

```js
const result = applyCommands(state, [{ type: "draw", shape: "rectangle", relation: "right-of", anchorShape: "circle" }]);
```

places the rectangle to the right of the circle.

```js
applyCommands(state, [{ type: "undo" }])
```

removes the previous drawing operation.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test`

Expected: FAIL because `src/domain/drawingState.js` does not exist.

## Task 5: Drawing State Implementation

**Files:**
- Create: `src/domain/drawingState.js`

- [ ] **Step 1: Implement state operations**

Add exported functions:

```js
export function createInitialState() {}
export function applyCommands(state, commands) {}
export function applyCommand(state, command) {}
export function findAnchorElement(state, command) {}
```

Use immutable state updates, maintain `history` and `future`, and generate stable element ids.

- [ ] **Step 2: Run all tests and verify GREEN**

Run: `npm test`

Expected: All command and drawing-state tests pass.

## Task 6: Canvas Rendering and Voice UI

**Files:**
- Create: `src/domain/renderCanvas.js`
- Create: `src/app.js`
- Create: `src/styles.css`
- Modify: `index.html`

- [ ] **Step 1: Implement Canvas renderer**

Render background, circle, rectangle, triangle, line, star, mountain, sun, tree, and text elements. Keep renderer deterministic and side-effect free except for drawing to the supplied canvas context.

- [ ] **Step 2: Implement app integration**

Connect Web Speech API transcript events to `parseVoiceCommand`, then `applyCommands`, then canvas render. Add speech synthesis responses and a fallback manual transcript field only for browsers without speech recognition.

- [ ] **Step 3: Implement UI styling**

Create a dense tool interface with a large canvas, status rail, transcript panel, command log, and accessible focus states. Keep the first screen the actual drawing tool.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: All tests pass.

## Task 7: Documentation

**Files:**
- Create: `README.md`
- Create: `docs/design.md`

- [ ] **Step 1: Write README**

Include run commands, browser permission notes, supported voice commands, demo script, dependency list, and competition submission checklist.

- [ ] **Step 2: Write design document**

Include:

- planned command capabilities
- actually implemented capabilities
- unfinished items and reasons
- latency strategy
- error tolerance strategy
- privacy and cost-control notes

- [ ] **Step 3: Review requirements coverage**

Check that the design doc answers the topic requirement: planned capabilities, implemented capabilities, and reasons for unfinished work.

## Task 8: Verification

**Files:**
- No new files expected.

- [ ] **Step 1: Run automated tests**

Run: `npm test`

Expected: All tests pass.

- [ ] **Step 2: Start local server**

Run: `npm run serve`

Expected: Server starts on `http://localhost:4173/`.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:4173/`, confirm the app renders, canvas is non-blank, command parsing can be exercised through the fallback transcript input, and no console errors appear.

- [ ] **Step 4: Final checklist**

Confirm files exist: app, README, design doc, tests, and server script.
