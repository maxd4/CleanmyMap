---
name: cleanmymap-ui-testing
description: "Use this skill when a task requires Playwright checks, UI regression testing, screenshots, or local browser verification in CleanMyMap."
category: repository
risk: safe
source: local
tags: "[playwright, browser-testing, screenshots, regression, ui]"
date_added: "2026-05-24"
---

# CleanMyMap UI Testing Skill

## Purpose

Verify visible behavior locally before a change is considered done.

## Use When

- Checking a new or edited page in the browser
- Capturing screenshots for comparison
- Reproducing or preventing a UI regression
- Validating responsive behavior or interaction flows

## Core Rules

- Test the exact route that changed.
- Verify the happy path and at least one edge case.
- Capture screenshots when visual changes matter.
- Prefer deterministic selectors and avoid fragile timing hacks.

## Validation

- Open the local app in the browser.
- Confirm the UI loads without console errors.
- Verify the main interaction path.
- Re-test after fixes.

## References

- `references/browser-verification.md`
- `references/screenshot-patterns.md`

## Examples

- `examples/local-smoke-check.md`
