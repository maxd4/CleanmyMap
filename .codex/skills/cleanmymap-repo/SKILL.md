---
name: cleanmymap-repo
description: "Use this skill when working in the CleanMyMap repository and you need project-specific rules, architecture context, documentation guidance, or validation steps."
category: repository
risk: safe
source: local
tags: "[nextjs, typescript, tailwind, supabase, clerk, vercel, testing]"
date_added: "2026-05-24"
---

# CleanMyMap Repository Skill

## Purpose

This skill captures the repo-specific rules that must stay consistent while working on CleanMyMap. It complements the global Codex capabilities by encoding the project conventions, guarded areas, preferred tooling, documentation sources, and validation workflow.

## When To Use

Use this skill for any task that touches the CleanMyMap codebase, documentation, UI, backend routes, tests, deployment workflow, or repository conventions.

## Project Context

- App router Next.js 15 in `apps/web`
- TypeScript and Tailwind CSS 4
- Clerk for auth
- Supabase for persistence and storage
- Vercel for deployment
- Playwright for local UI verification
- Figma, Notion, GitHub, Stripe, and Canva when the task touches those domains
- Documentation is a first-class source of truth, especially for architecture, security, product, and release decisions.

## Non-Negotiable Rules

- Do not change the homepage or its associated components unless the user explicitly asks for it.
- Preserve the distinction between `Role`, `SessionRole`, and `Parcours`.
- Avoid raw SQL and use the Supabase clients and server helpers already in the repo.
- Keep client components thin and prefer server-side data access, SWR, or server actions.
- Use dynamic import with `ssr: false` for Leaflet-based map components.
- Preserve module boundaries and folder conventions already established in the repo.
- Keep server and client responsibilities separated instead of collapsing them together.
- Keep public-facing text in French unless the content is explicitly localized.
- Avoid creating root-level files unless the user explicitly asks for them.
- Do not create parallel worktrees or duplicate repositories.
- When a task changes repo rules, update the canonical documentation instead of duplicating guidance in multiple skills.

## Preferred Workflow

1. Inspect the affected route, component, or service.
2. Read the relevant documentation before editing.
3. Identify the correct MCP tools for the task.
4. Apply the smallest safe change.
5. Validate with lint, typecheck, tests, or browser checks.
6. Report the result with concrete file references.

## Validation Baseline

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run checks`

## References

- `references/governance.md`
- `references/validation.md`

## Examples

- `examples/change-flow.md`

## Relevant Documentation

- `AGENTS.md`
- `.cursorrules`
- `README.md`
- `documentation/README.md`
- `documentation/architecture/README.md`
- `documentation/security/README.md`
- `documentation/development/README.md`
