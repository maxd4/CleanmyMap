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

Le résultat du 20 mai 2026 reste historique. La vérification courante doit
être exécutée avec une session CLI authentifiée sur le compte `drm` et le
projet `supabase-vercel-codex`.

Le 27 août 2026, depuis `apps/web` :

- `npx supabase db push --dry-run --linked` a confirmé que la base distante est
  à jour (`upToDate: true`, aucune migration en attente) ;
- `npx supabase db lint --linked --fail-on warning` a terminé sans erreur de
  schéma ;
- `npm run backend:supabase:advisors:linked` a retourné trois warnings non
  critiques, mais aucun finding `rls_disabled_in_public`.

L'alerte « Table publiquement accessible » visible dans la capture fournie
correspond donc à un finding qui n'est plus retourné par le contrôle lié
actuel. Les warnings restants concernent `pg_trgm` installé dans `public` et
les fonctions `public.compute_mission_distance` et
`public.get_my_chat_poll_vote_summaries` exécutables par le rôle
`authenticated` en `SECURITY DEFINER` ; ils sont distincts de cette alerte.

Le lint local reste non exécuté faute d'instance Postgres locale disponible
sur `127.0.0.1:54322` ; il nécessite Docker et `supabase start`.
