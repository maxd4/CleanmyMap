# Supabase Linked Advisories Report

Source:

- Command: `node scripts/supabase-security-advisors.mjs --linked`
- Workspace: `apps/web`
- Date: `2026-05-20`

Status:

- After pushing the corrective migrations, the linked project no longer returns security advisories for this repo state.
- The wrapper now returns an empty result set on the linked project.

## Summary

- Total advisor findings: `0`
- Unique affected functions: `0`
- Severity: none

## Interpretation

The remaining drift was caused by the linked project being behind the repository migration state.
After applying the corrective migration and rerunning the linked advisor, there are no remaining security advisories in scope for this pass.

## What was pushed

- A corrective migration was added in [apps/web/supabase/migrations/20260520200207_apply_remaining_supabase_advisory_hardening.sql](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/supabase/migrations/20260520200207_apply_remaining_supabase_advisory_hardening.sql).
- The migration re-created the trigger helpers with an explicit `search_path`.
- The migration converted the public RPC helpers back to `SECURITY INVOKER` and restricted `EXECUTE` to the intended service roles.

## Re-run command

```bash
npm -C apps/web run backend:supabase:advisors:linked
```

