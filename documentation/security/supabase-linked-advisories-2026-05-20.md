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

## Verdict final du chantier Security Advisor — 29 août 2026

La vérification distante finale distingue les niveaux de sévérité et accepte
explicitement les deux informations liées aux tables server-only :

- **WARN : 0** ;
- **ERROR : 0** ;
- **INFO accepté : 2** :
  - `rls_enabled_no_policy` sur `public.legal_content_reports` ;
  - `rls_enabled_no_policy` sur `public.legal_content_report_decisions`.

Ces deux INFO sont intentionnels. Les deux tables ont RLS activée, aucun
privilège de table `SELECT` pour `anon` ou `authenticated`, et des privilèges
réservés à `service_role` pour les opérations serveur. L’absence de policy est
donc la frontière d’accès attendue, et non une policy manquante à compléter.

Ne pas créer de policy artificielle pour faire disparaître ces INFO. Toute
évolution du modèle d’accès doit d’abord établir un besoin fonctionnel et
repasser par une migration versionnée, une revue RLS/grants et un nouvel audit.

Le résultat attendu et accepté pour ce chantier est donc : **0 WARN, 0 ERROR,
2 INFO documentés**.

## Mise à jour du 27 août 2026 — SEC-01, SEC-02 et PERF-01

La mention des fonctions `compute_mission_distance` et
`get_my_chat_poll_vote_summaries` comme warnings actifs ci-dessous est
historique. Les lots suivants sont maintenant présents sur `main` :

- **SEC-01**, commit
  `8c1701f7950ac7160d767bc9cdf53cca36eeddfb` : la finalisation des missions
  passe par le trigger `SECURITY INVOKER`
  `20260827100000_clerk_mission_completion_metrics_trigger.sql`. La RPC
  authentifiée `compute_mission_distance(uuid)` n'est plus la surface de
  finalisation ; le client mobile conserve le flush GPS avant l'UPDATE
  `completed` et reçoit la ligne finalisée.
- **SEC-02**, commit
  `24405dbb309c305e180a1d048b29498b3e3e20d8` :
  `get_my_chat_poll_vote_summaries(uuid[], text)` est `SECURITY INVOKER`,
  exécutable uniquement par `service_role`, et les routes déterminent
  `userId` via Clerk avant l'agrégation privilégiée. Les lectures de
  visibilité et l'upsert/delete RLS des votes restent côté client Clerk-RLS.
- **PERF-01**, commit
  `1ba4339fb1579e844831ee952e78f8c723ed9144` : les policies signalées
  utilisent les helpers Auth sous forme d'init-plan et les deux index
  explicitement dupliqués ont été traités. Aucun index signalé uniquement
  comme `unused_index` n'a été supprimé dans ce lot.

Les tests statiques ciblés des migrations et des permissions ont été exécutés
sur le checkout de cette séquence. La vérification Advisor live complète
postérieure à ces lots n'est pas consignée ici comme preuve indépendante ;
elle doit rester distinguée de la présence des migrations dans Git.

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

La migration `20260827000002_close_legacy_table_rls_advisories.sql` ferme
également les findings `rls_enabled_no_policy` des tables
`public.forms`, `public.legacy_spot_migrations` et `public.spots` : RLS reste
activée, les rôles `anon` et `authenticated` n'ont plus de privilèges de table,
et `service_role` conserve uniquement `SELECT` avec une policy explicite
service-only. `forms` reste donc lisible par le chemin serveur de progression,
et les deux tables legacy restent réservées à l'export d'archive technique.
La migration est préparée dans le dépôt ; son dry-run, son application et la
vérification de la disparition effective des trois findings restent à exécuter
avec une session CLI disposant des droits sur le projet `drm`.

Le garde-fou `backend:supabase:advisors:linked` interroge désormais les
advisors SECURITY au niveau `info` en JSON. Il filtre explicitement les
violations RLS (`rls_disabled_in_public`, `rls_enabled_no_policy`,
`policy_exists_rls_disabled` et équivalents clairement identifiables) et échoue
sur ces catégories uniquement ; les findings INFO indépendants ne sont pas
transformés globalement en erreurs.

L'alerte « Table publiquement accessible » visible dans la capture fournie
correspond donc à un finding qui n'est plus retourné par le contrôle lié
actuel. La référence historique aux deux RPC `SECURITY DEFINER` n'est plus
valide après SEC-01 et SEC-02 : leurs migrations correctives retirent la
surface `authenticated` et conservent les contrôles Clerk/RLS ou
`service_role` nécessaires. La présence effective de ces corrections en
production doit être vérifiée avec une session Supabase autorisée ; elle ne se
déduit pas d'un simple scan Git.

Le lint local reste non exécuté faute d'instance Postgres locale disponible
sur `127.0.0.1:54322` ; il nécessite Docker et `supabase start`.
