# Supabase Linked Advisories Report

Source:

- Command: `node scripts/supabase-security-advisors.mjs --linked`
- Workspace: `apps/web`
- Compte Supabase de référence : `drm`
- Projet Supabase cible : `supabase-vercel-codex`
- Date du document historique : `2026-05-20`

Le projet à contrôler pour CleanMyMap est celui du compte Supabase `drm`,
nommé `supabase-vercel-codex`. Le `project ref` doit être confirmé dans
`apps/web/supabase/config.toml` et dans le Dashboard avant de lancer un audit
lié. Cette information ne remplace pas une authentification CLI valide.

## État courant — preuve finale du 1er septembre 2026

Cette section est la référence courante. Les sections datées plus bas sont
conservées comme historique et ne doivent pas être interprétées comme l'état
du projet au 1er septembre 2026.

Le projet linked `supabase-vercel-codex` (`trktzkgujgpgsgkoyndn`) est à jour
sur l'arbre canonique : **128 migrations linked**, dont les lots
`profiles`, `actions`, `chat-attachments` et
`20260901012605_harden_action_rpc_execute_privileges`.

Les contrôles runtime linked/prod et les catalogues PostgreSQL confirment :

- `profiles` : les colonnes d'identité de rôle et de referral restent en
  écriture serveur ; les colonnes self-service accordées restent disponibles
  pour le parcours prévu ;
- `actions` : les 12 colonnes self-service restent accordées à l'utilisateur,
  tandis que les champs d'état et de modération restent protégés ;
- `chat-attachments` : le bucket est privé, l'accès est isolé par propriétaire
  et conversation, `service_role` conserve son accès serveur, et les URLs
  signées sont la seule forme d'accès externe attendue ;
- aucune URL publique historique `chat-attachments` n'a été trouvée dans les
  messages existants : aucune migration de données ni stratégie de
  compatibilité n'est nécessaire.

Les deux RPC de mutation d'action sont désormais **exécutables uniquement par
`service_role`** :

- `public.create_action_with_training(...)` ;
- `public.moderate_action_atomically(uuid, text, text)`.

Pour chacune, `PUBLIC`, `anon` et `authenticated` n'ont pas `EXECUTE`, tandis
que `service_role` l'a ; les fonctions restent `SECURITY INVOKER` avec
`search_path=pg_catalog`. Les RLS et les privilèges de table `actions` n'ont
pas été modifiés par ce dernier lot.

### Advisors linked finaux

- **Sécurité : 0 WARN, 0 ERROR, 2 INFO acceptés et documentés** :
  `rls_enabled_no_policy` sur `public.legal_content_reports` et
  `public.legal_content_report_decisions` uniquement ;
- **Performance : 78 INFO, 0 WARN, 0 ERROR**.

Les deux INFO sécurité sont intentionnels : ces tables server-only ont RLS
activée sans policy publique et ne sont pas lisibles par `anon` ou
`authenticated`. Ils ne constituent pas une dérive à corriger.

La preuve linked/prod est **PROUVÉE** par l'historique des migrations, les
requêtes de privilèges PostgreSQL, les contrôles RLS/Storage et les Advisors
rejoués le 1er septembre 2026. Le runtime local Docker est **NON REQUIS / NON
PROUVÉ** pour cette clôture ; aucune conclusion de panne locale ne doit être
déduite de ce document.

## Historique — verdict final du chantier Security Advisor du 29 août 2026

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

## Historique — mise à jour du 27 août 2026 — SEC-01, SEC-02 et PERF-01

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

## Historique — Summary du 20 mai 2026

- Total advisor findings: `0`
- Unique affected functions: `0`
- Severity: none

## Historique — Interpretation du 20 mai 2026

The remaining drift was caused by the linked project being behind the repository migration state.
After applying the corrective migration and rerunning the linked advisor, there are no remaining security advisories in scope for this pass.

## Historique — What was pushed

- A corrective migration was added in [apps/web/supabase/migrations/20260520200207_apply_remaining_supabase_advisory_hardening.sql](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/supabase/migrations/20260520200207_apply_remaining_supabase_advisory_hardening.sql).
- The migration re-created the trigger helpers with an explicit `search_path`.
- The migration converted the public RPC helpers back to `SECURITY INVOKER` and restricted `EXECUTE` to the intended service roles.

## Historique — Re-run command

```bash
npm -C apps/web run backend:supabase:advisors:linked
```

## Historique — vérification courante avant la clôture du 1er septembre 2026

Les paragraphes ci-dessous décrivaient l'état intermédiaire du 27 août 2026,
avant la preuve linked/prod finale. Ils sont conservés pour la traçabilité ;
la section « État courant » ci-dessus prévaut désormais.

Le 27 août 2026, depuis `apps/web` :

- `npx supabase db push --dry-run --linked` avait confirmé que la base distante
  était à jour (`upToDate: true`, aucune migration en attente) ;
- `npx supabase db lint --linked --fail-on warning` avait terminé sans erreur de
  schéma ;
- `npm run backend:supabase:advisors:linked` avait retourné trois warnings non
  critiques, mais aucun finding `rls_disabled_in_public`.

À cette date, l'application et la vérification effective de certains lots
restaient encore à exécuter avec une session Supabase autorisée. Cette limite
historique est levée par les preuves linked/prod du 1er septembre 2026
consignées plus haut.
