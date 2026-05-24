# Rubrique Placement Guide

## Why this guide exists

The repo mixes standalone pages, section rubriques, registry metadata, and domain services.

This guide tells a developer where a new piece of code should live without guessing.

## Short rule

Ask these questions in order:

1. Is it a route, redirect, or page boundary? -> `apps/web/src/app/`
2. Is it section metadata, canonical navigation, or access rules? -> `apps/web/src/lib/sections-registry/`
3. Is it visual UI, interaction logic, or local section state? -> `apps/web/src/components/sections/rubriques/`
4. Is it domain logic shared by several features, APIs, or services? -> `apps/web/src/lib/<domain>/`

## Decision table

| What you are building | Put it in | Example |
| --- | --- | --- |
| Standalone page | `apps/web/src/app/(app)/.../page.tsx` | `apps/web/src/app/(app)/dashboard/page.tsx` |
| Section route entry | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` | the generic section page |
| Section metadata | `apps/web/src/lib/sections-registry/config.ts` | labels, aliases, access flags |
| Section lookup helpers | `apps/web/src/lib/sections-registry/helpers.ts` | visible sections by category |
| Shared domain service | `apps/web/src/lib/community/`, `apps/web/src/lib/gamification/` | API-driven business rules |
| Simple rubrique UI | `apps/web/src/components/sections/rubriques/<name>-section.tsx` | `feedback-section.tsx` |
| Complex rubrique UI | `apps/web/src/components/sections/rubriques/<name>/index.tsx` | `community/index.tsx` |
| Local rubrique internals | `apps/web/src/components/sections/rubriques/<name>/*.ts(x)` | hooks, cards, helper views |
| UI assembly layer | `apps/web/src/components/sections/rubriques/section-renderer.tsx` | maps `sectionId` to UI |

## What belongs in each layer

### `apps/web/src/app/`

Use this layer for:

- routes
- page boundaries
- redirects
- auth gating
- top-level composition

Do not put section metadata or feature internals here.

### `apps/web/src/lib/sections-registry/`

Use this layer for:

- canonical section ids
- labels and descriptions
- aliases and redirects
- access flags
- ordering
- lookup helpers

Do not import React or UI components here.

### `apps/web/src/components/sections/rubriques/`

Use this layer for:

- visual composition
- local state
- hooks for the rubrique only
- subcomponents for cards, charts, and panels
- UI shell and section renderer

If a rubrique grows, split it into a folder and expose one public `index.tsx` entrypoint.

### `apps/web/src/lib/<domain>/`

Use this layer for domain logic that is reused across routes or rubriques.

Examples from the repo:

- `apps/web/src/lib/community/`
- `apps/web/src/lib/gamification/`
- `apps/web/src/lib/actions/`
- `apps/web/src/lib/route/`

## Practical examples

### Example 1: Adding a standalone page

If the request is “create `/accessibilite`”:

- create `apps/web/src/app/(app)/accessibilite/page.tsx`
- reuse shared UI from `components/` if needed
- do not add anything to `sections-registry`

### Example 2: Adding a new rubrique

If the request is “add a rubrique for partner tracking”:

- add the section entry in `apps/web/src/lib/sections-registry/config.ts`
- add the UI in `apps/web/src/components/sections/rubriques/`
- if it is complex, create `apps/web/src/components/sections/rubriques/partner-tracking/index.tsx`
- wire it in `section-renderer.tsx`

### Example 3: Adding shared logic for a rubrique

If the logic is reused by several rubriques or APIs:

- place it in `apps/web/src/lib/<domain>/`
- keep the rubrique component thin
- call the service from the UI or route boundary

## Anti-patterns

- putting routing logic inside a rubrique component
- putting React components inside `lib/sections-registry`
- creating a page under `components/` instead of `app/`
- duplicating section labels outside the registry
- mixing domain logic and UI in the same file when the file is already large

## Quick test before committing

- Can the file be imported without pulling React into the registry?
- Does the route still resolve from `app/`?
- Is the section still visible in the registry if it should be?
- Is the public entrypoint of a complex rubrique unique?

