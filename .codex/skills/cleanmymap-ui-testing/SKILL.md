---
name: cleanmymap-ui-testing
description: "Use this skill when a task requires Playwright checks, UI regression testing, screenshots, or local browser verification in CleanMyMap."
category: repository
risk: safe
source: local
tags: "[playwright, browser-testing, screenshots, regression, ui]"
date_added: "2026-05-24"
---

# CleanMyMap UI Testing Skill

## Purpose

Verify visible behavior locally before a change is considered done.

## Use When

- Checking a new or edited page in the browser
- Capturing screenshots for comparison
- Reproducing or preventing a UI regression
- Validating responsive behavior or interaction flows

## Core Rules

- Test the exact route that changed.
- Verify the happy path and at least one edge case.
- Capture screenshots when visual changes matter.
- Prefer deterministic selectors and avoid fragile timing hacks.

## Mandatory auth and browser preflight

Before any browser validation, classify the surface:

- `PUBLIC`: no AuthN; use the integrated browser or public Playwright as
  needed, without a bypass.
- `PROTECTED_SERVER_ONLY`: AuthN/AuthZ is server-only; use the canonical local
  launcher with `CMM_DEV_AUTH_BYPASS=1` and the minimum role. Port 3000 is
  preferred, but fallback is allowed; use the URL actually announced by the
  launcher.
- `PROTECTED_CLERK_CLIENT`: the route or consumer uses `useUser`, `useAuth`,
  Clerk UI, `SignedIn`/`SignedOut`, or requires a real browser Clerk session.
  A server bypass is not sufficient: use the official Clerk Development
  Playwright harness with strict `127.0.0.1:3000`,
  `CMM_DISABLE_DEV_AUTH_BYPASS=1`, and the `storageState`/session from global
  setup. `/onboarding` is an explicit example.
- `PROD_SMOKE`: use a real Clerk Production session according to the playbook;
  never use a local bypass.

Mutable-Supabase E2E belongs only to a dedicated ephemeral CI lane; never
start Docker or local Supabase on the workstation. Never use Clerk Production
keys on localhost.

Announce these fields before the test:

```text
AUTH_SURFACE: PUBLIC | PROTECTED_SERVER_ONLY | PROTECTED_CLERK_CLIENT
BROWSER_HARNESS: INTEGRATED_BROWSER | PLAYWRIGHT_CLERK
AUTH_MODE: NONE | DEV_BYPASS | CLERK_DEVELOPMENT
HOST_URL: actual URL used
ROLE: actual/simulated role
PERSISTENCE: NONE | REMOTE_READONLY | CI_EPHEMERAL
```

The canonical bypass roles are `benevole`, `coordinateur`, `scientifique`,
`entreprise`, `elu`, `admin`, and `max`. Playwright Clerk must use port 3000
strictly, with the old server stopped if necessary; it must never target a
bypass server or assume `localhost:3000` after a fallback.

## Validation

- Open the local app in the browser.
- Confirm the UI loads without console errors.
- Verify the main interaction path.
- Re-test after fixes.

## References

- `references/browser-verification.md`
- `references/screenshot-patterns.md`

## Examples

- `examples/local-smoke-check.md`
