# Supabase Linked Advisories Report

Source:

- Command: `node scripts/supabase-security-advisors.mjs --linked`
- Workspace: `apps/web`
- Compte Supabase de référence : `drm`
- Projet Supabase cible : `supabase-vercel-codex`
- Date: `2026-05-20`

Le projet à contrôler pour CleanMyMap est celui du compte Supabase `drm`,
nommé `supabase-vercel-codex`. Le `project ref` doit être confirmé dans
`apps/web/supabase/config.toml` et dans le Dashboard avant de lancer un audit
lié. Cette information ne remplace pas une authentification CLI valide.

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

## Vérification courante

Le résultat ci-dessus est historique et ne constitue pas une preuve de l'état
actuel de l'alerte affichée dans le Dashboard. Une nouvelle vérification doit
être lancée avec une session CLI authentifiée sur le compte `drm` et le projet
`supabase-vercel-codex`.

Le 27 août 2026, la commande a été tentée depuis le checkout mais a été
bloquée avant l'appel aux advisors par `LegacyPlatformAuthRequiredError` :
aucun `SUPABASE_ACCESS_TOKEN` n'était disponible dans la session. L'alerte ne
peut donc pas être déclarée corrigée sur la base de cette tentative.
