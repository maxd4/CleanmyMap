---
name: cleanmymap-forms-validation
description: "Use this skill when a task touches forms, validation, submission flows, error messages, or public input handling in CleanMyMap."
category: repository
risk: high
source: local
tags: "[forms, validation, zod, input, errors, submission]"
date_added: "2026-05-24"
---

# CleanMyMap Forms and Validation Skill

## Purpose

Keep form handling strict, legible, and resilient to bad input.

## Use When

- Creating or changing forms
- Editing validation schemas
- Handling async submission or error states
- Working on public input endpoints

## Core Rules

- Validate early and explicitly.
- Keep client and server validation aligned.
- Show errors close to the field or action.
- Prevent duplicate or ambiguous submissions.

## Validation

- Test valid input, invalid input, and empty input.
- Verify server error mapping.
- Confirm loading and disabled states behave correctly.

## References

- `references/form-validation-map.md`
- `references/error-handling-patterns.md`

## Examples

- `examples/zod-safeparse-route.md`
