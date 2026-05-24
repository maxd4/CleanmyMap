---
name: cleanmymap-supabase
description: "Use this skill when a task touches Supabase schema, RLS, storage, edge functions, server clients, or database migrations in CleanMyMap."
category: repository
risk: medium
source: local
tags: "[supabase, database, rls, storage, edge-functions, nextjs]"
date_added: "2026-05-24"
---

# CleanMyMap Supabase Skill

## Purpose

Keep Supabase changes safe, scoped, and aligned with the repo architecture.

## Use When

- Editing migrations or schema-related code
- Touching RLS, storage buckets, or Edge Functions
- Changing server-side Supabase clients or admin helpers
- Investigating data access, drift, or permission issues

## Core Rules

- Prefer the existing Supabase client helpers in `apps/web/src/lib/supabase/`.
- Avoid raw SQL in application code.
- Keep server-only keys and logic on the server.
- Preserve RLS and role boundaries unless the task explicitly changes them.
- Validate any schema or policy change against the affected routes and tests.

## Validation

- Check the related migration or SQL file.
- Run the relevant tests.
- Verify the impacted page or API route if behavior changed.

## References

- `references/data-governance.md`
- `references/server-client-patterns.md`

## Examples

- `examples/server-route-pattern.md`
