---
name: cleanmymap-security
description: "Use this skill when a task touches XSS, URL validation, secrets, auth boundaries, or hardening rules in CleanMyMap."
category: repository
risk: high
source: local
tags: "[security, xss, secrets, validation, hardening, auth]"
date_added: "2026-05-24"
---

# CleanMyMap Security Skill

## Purpose

Apply defensive checks that keep user input, secrets, and privileged paths safe.

## Use When

- Validating URLs, markdown, or user-provided text
- Reviewing auth, role checks, or server-only code
- Handling secrets, tokens, or environment variables
- Auditing dangerous patterns or potential injection vectors

## Core Rules

- Prefer `new URL()`-based validation over string prefix checks.
- Do not render unsafe HTML from user input.
- Keep secrets out of client code and committed files.
- Reuse the repo security helpers and validation patterns.
- Treat privilege and data-access changes as high risk.

## Validation

- Search for the risky pattern before editing.
- Fix the root cause, not the symptom.
- Re-test the affected flow and error path.

## References

- `references/hardening-checklist.md`
- `references/input-validation.md`

## Examples

- `examples/url-and-secret-check.md`
