---
name: cleanmymap-release-ci
description: "Use this skill when a task touches GitHub Actions, PR workflows, checks, Vercel previews, deployment safety, or release guardrails."
category: repository
risk: medium
source: local
tags: "[github, ci, cd, vercel, pull-request, release]"
date_added: "2026-05-24"
---

# CleanMyMap Release and CI Skill

## Purpose

Keep delivery safe by validating the code path, CI path, and deployment path together.

## Use When

- Updating GitHub Actions or release scripts
- Debugging failing checks or flaky pipelines
- Preparing a PR for review
- Verifying a Vercel preview or deployment-related behavior

## Core Rules

- Keep the smallest possible release surface.
- Do not weaken checks unless there is a documented reason.
- Prefer explicit guardrails over hidden assumptions.
- Verify the deployment impact of config changes.

## Validation

- Run the relevant checks locally first.
- Confirm the PR diff is scoped correctly.
- Verify the preview or build output when deployment behavior changed.

## References

- `references/release-safety.md`
- `references/ci-patterns.md`

## Examples

- `examples/pr-release-checklist.md`
