---
name: cleanmymap-repo
description: "Use this skill for any task targeting the CleanMyMap repository. It enforces GitHub source-of-truth checks, repository boundaries, security rules, documentation routing, and validation."
category: repository
risk: safe
source: local
tags: "[nextjs, typescript, tailwind, supabase, clerk, vercel, testing]"
date_added: "2026-05-24"
---

# CleanMyMap Repository Skill

## Purpose

Use this skill for any task touching CleanMyMap code, documentation, UI, backend routes, tests, data, security, deployment or repository conventions.

`AGENTS.md` remains the canonical detailed rule source.

## Source of truth

Before changing a specific file:

1. inspect the current file on GitHub `maxd4/CleanmyMap`;
2. inspect the directly relevant dependencies;
3. do not trust an old plan, conversation or local copy over the current repository;
4. report conflicts between code, docs and configuration.

## Current stack

Read exact versions from `apps/web/package.json`.

Current major baselines:

- Next.js 16 App Router;
- React 19;
- TypeScript 6;
- Tailwind CSS 4;
- Clerk;
- Supabase/PostgreSQL;
- Vercel;
- Expo/React Native for `companion-app`.

## Non-negotiable rules

- Do not change the homepage or its associated components unless explicitly requested.
- Do not change the global header or footer unless explicitly requested.
- Preserve the distinction between `Role`, `SessionRole`, and `Parcours`.
- Never expose Supabase `service_role` to web or mobile clients.
- Never disable RLS to unblock a feature.
- Avoid raw SQL in application runtime code; use versioned migrations for SQL changes.
- Keep Client Components thin.
- Keep server/client boundaries explicit.
- Load Leaflet through dynamic import with `ssr: false`.
- Keep public-facing text in French unless explicitly localized.
- Do not create root-level files without justification.
- Do not create worktrees, sibling copies or parallel repositories without explicit user approval.
- Do not modify `documentation/pepite/` or `documentation/gpt-context/` without explicit user approval.

## Supabase

The active workspace CLI configuration is under:

```txt
apps/web/supabase/
```

Before changing migrations, inspect both existing migration trees until ADR-006 is fully applied:

```txt
apps/web/supabase/migrations/
supabase/migrations/
```

Never update only one tree blindly.

## Documentation routing

Use:

- `documentation/pages_site/` for page-level functional/UX context;
- `documentation/architecture/` for system decisions and boundaries;
- `documentation/security/` for security doctrine and audits;
- `documentation/development/` for engineering workflow and tests;
- `documentation/product/` for product vision and priorities.

Do not duplicate the same rule across multiple documents. Link to the canonical source.

## Preferred workflow

1. Inspect the real target.
2. Read the relevant canonical docs.
3. Identify the smallest safe scope.
4. Apply the change.
5. Run targeted validation.
6. Run broader checks when shared core, configuration, routes, security or release behavior changed.
7. Report exact files and exact checks.

## Validation

Targeted:

```bash
npm run checks:changed
```

Complete:

```bash
npm run checks
```

Useful focused commands:

```bash
npm run typecheck
npm run lint
npm run test
npm run test:security
npm run test:regression-gates
npm run build
npm run security:secrets
```

E2E remains explicit:

```bash
npm run test:e2e
```

Never claim a check was executed when it was not.

## Mirror governance

This skill is consumed from two paths:

```txt
.codex/skills/cleanmymap-repo/SKILL.md
.agents/skills/cleanmymap-repo/SKILL.md
```

They must remain byte-identical and are checked by:

```bash
npm run check:agent-skills
```
