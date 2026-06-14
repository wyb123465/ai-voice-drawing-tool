# Review Experience Design

## Goal

Make the first screen communicate a polished, judge-friendly voice drawing experience without turning the app into a marketing page.

## Scope

- Keep the canvas and voice workspace as the primary experience.
- Add a compact review panel with a curated demo script, one-click replay, and live execution metrics.
- Preserve the existing light, neutral, teal-accent visual language.
- Keep the project zero-dependency and static-host friendly.

## User Experience

When a reviewer opens the app, the canvas remains the main focal point. The right rail should show an obvious way to start voice mode, run the curated demo, and inspect what happened. The reviewer should be able to understand the system through actual state: object count, history count, command source, and latest action.

The demo script should exercise the strongest project capabilities:

- Compound scene parsing.
- Text placement.
- Background change.
- Ordinal object selection.
- LLM fallback simulation.
- Undo/redo and export.

## Architecture

Create a small domain module for the review demo script so it can be tested independently and reused by the UI. `app.js` owns UI wiring and state metrics. `index.html` adds semantic controls and display regions. `styles.css` extends the existing token system rather than introducing a new design language.

## Accessibility

- Use native buttons for script commands and demo replay.
- Add labels for textareas and status regions.
- Keep focus-visible styling and 44px touch targets.
- Use `aria-live="polite"` for metrics and log updates.

## Verification

- Unit-test the demo script module.
- Run `npm test`.
- Run `git diff --check`.
- Verify the local app returns HTTP 200.
- Capture a browser screenshot for desktop and mobile widths to check layout fit.

