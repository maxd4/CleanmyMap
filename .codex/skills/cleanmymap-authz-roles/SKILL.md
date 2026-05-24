---
name: cleanmymap-authz-roles
description: "Use this skill when a task touches Clerk auth, roles, permissions, protected routes, or authorization boundaries in CleanMyMap."
category: repository
risk: high
source: local
tags: "[authz, roles, clerk, permissions, protected-routes]"
date_added: "2026-05-24"
---

# CleanMyMap Authorization and Roles Skill

## Purpose

Protect role boundaries and keep privileged paths explicit.

## Use When

- Editing auth guards or protected routes
- Changing role logic or user metadata handling
- Touching admin or privileged features

## Core Rules

- Preserve the existing role model.
- Keep privileged actions server-side.
- Verify denial paths as carefully as success paths.

## Validation

- Test an authorized case and an unauthorized case.
- Confirm redirects or denials are correct.
- Re-check role-sensitive flows after edits.

## References

- `references/authz-map.md`
- `references/role-guard-patterns.md`

## Examples

- `examples/protected-route-check.md`
