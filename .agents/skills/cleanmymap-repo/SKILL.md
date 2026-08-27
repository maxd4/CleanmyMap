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
- TypeScript 7;
- Tailwind CSS 4;
- Clerk;
- Supabase/PostgreSQL;
- Vercel;
- Expo/React Native for `apps/mobile`.

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
- Do not modify `documentation/pepite/` without explicit user approval.

### Safe cleanup of untracked artifacts

Never mass-delete `untracked`, non-canonical, or generated files only because
Git does not track them or no runtime import is visible. Before deleting a
significant set, establish its provenance, creating command/tool, role
(runtime, development, documentation, or configuration), regenerability, and
expected location.

Be especially cautious with `.agents`, `.codex`, `skills-lock.json`, Vercel
integrations, and development-tool artifacts. When uncertain, keep the files
and record a proof-backed verdict `KEEP / MOVE / REINSTALL_ELSEWHERE / DELETE`.
Never perform destructive cleanup on a parallel chantier. The detailed rule is
canonical in `AGENTS.md`.

## Supabase

The active workspace CLI configuration is under:

```txt
apps/web/supabase/
```

The only editable and canonical migration tree is:

```txt
apps/web/supabase/migrations/
```

Inspect and modify only this tree. Do not maintain or synchronize a second
root-level migration tree.

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

`.agents/skills/` is the canonical repository skill catalogue consumed by the
Agents runtime. `.codex/skills/` is the governed Codex mirror for the
`cleanmymap-*` subset; the two runtimes need both paths, but only the canonical
tree is edited directly.

The recursive mirror check covers every skill directory under `.codex/skills/`
and compares all files, not only `SKILL.md`:

```bash
npm run check:agent-skills
node scripts/checks/check-agent-skill-mirrors.mjs --sync
```

Use `--sync` only after reviewing the canonical `.agents/skills/` tree. Do not
maintain a second hand-edited copy in `.codex/skills/`.

### Third-party skill installations

CleanMyMap-owned, intentionally versioned skills stay only in the repository
roots `.agents/skills/` (canonical source) and `.codex/skills/` (governed Codex
mirror). Never install a third-party skill from Vercel, Upstash, or another
provider with the repository or one of its subdirectories as the destination.

The installed `skills` CLI officially supports
`npx skills add <package> --global`; on this machine its global listing places
third-party skills under `%USERPROFILE%\.agents\skills` and marks them
`scope: global` for Codex. Use that user-level location after checking the
destination of any Vercel or integration command that could invoke
`npx skills add` automatically.

Only an explicit user decision to version a third-party skill as project
documentation may place it in the repository's root `.agents/skills/`. Never
hide accidental nested installations with `.gitignore`; the repository guard
must detect them, including untracked paths.
