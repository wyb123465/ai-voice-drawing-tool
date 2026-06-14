# Delivery Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the project easier to submit, review, deploy, and demo for the XEngineer internship camp.

**Architecture:** Keep the app code unchanged except for package metadata or deployment-adjacent configuration if needed. Add a submission guide under `docs/` and align README, design doc, and package metadata so reviewers see one coherent entry point.

**Tech Stack:** Static HTML/CSS/ES modules, GitHub Pages Actions, Node.js built-in test runner.

---

### Task 1: Submission Guide

**Files:**
- Create: `docs/submission.md`

- [x] Add project identity, topic, repository/demo/design links, local run commands, automated replay URLs, demo video script, scoring highlights, and pre-submit checklist.

### Task 2: README Review Entry

**Files:**
- Modify: `README.md`
- Modify: `package.json`

- [x] Replace the stale online-demo placeholder with a deploy-ready GitHub Pages description.
- [x] Add direct links to the submission guide, design doc, and useful replay URLs.
- [x] Point package homepage at the GitHub Pages URL.

### Task 3: Deployment Notes

**Files:**
- Modify: `README.md`
- Modify: `.github/workflows/deploy.yml` if verification before deploy is missing.

- [x] Document that pushes to `main` publish through GitHub Pages Actions.
- [x] Ensure the deploy workflow runs tests before publishing.

### Task 4: Verification

**Files:**
- Read: `README.md`
- Read: `docs/submission.md`
- Read: `.github/workflows/deploy.yml`

- [x] Run `npm test`.
- [x] Run `git diff --check`.
- [x] Verify no stale online-demo placeholder wording remains.
