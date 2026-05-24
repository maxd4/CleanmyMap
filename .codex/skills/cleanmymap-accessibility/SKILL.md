---
name: cleanmymap-accessibility
description: "Use this skill when a task affects keyboard navigation, semantics, contrast, focus, or assistive technology behavior in CleanMyMap."
category: repository
risk: medium
source: local
tags: "[accessibility, a11y, wcag, keyboard, contrast]"
date_added: "2026-05-24"
---

# CleanMyMap Accessibility Skill

## Purpose

Prevent regressions in keyboard support, semantics, readability, and contrast.

## Use When

- Changing interactive UI
- Editing forms, dialogs, menus, or cards
- Reviewing contrast, labels, or focus states

## Core Rules

- Preserve semantic HTML where possible.
- Ensure focus remains visible and usable.
- Avoid color-only meaning.
- Keep labels, hints, and errors understandable.

## Validation

- Test keyboard-only navigation.
- Check focus order and visible focus.
- Verify contrast on the modified surface.

