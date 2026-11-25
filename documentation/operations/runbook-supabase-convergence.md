# Runbook CURRENT — convergence Supabase par CLI liée

La **CLI Supabase liée** (`npx supabase db push --linked --yes`) est l'unique
voie canonique d'application des migrations de `apps/web/supabase/migrations/`
vers le projet cible `trktzkgujgpgsgkoyndn`.

Le workflow `.github/workflows/supabase-convergence.yml` est un mécanisme de
**surveillance strictement read-only** (`workflow_dispatch` et `schedule`
quotidien). Il n'applique jamais de migration sur la base distante et ne dépend
d'aucun `workflow_run` ni d'aucune égalité entre un SHA testé et le `HEAD`
courant de `main`.

Les workflows `.github/workflows/supabase-sql-proof.yml`
(`supabase-sql-proof-ephemeral`), `.github/workflows/e2e-supabase.yml`
(`e2e-supabase-ephemeral`) et
`.github/workflows/supabase-backup-restore-proof.yml` restent des lanes
indépendantes de validation (replay PostgreSQL éphémère, pgTAP, E2E applicatif
et backup/restore).

## 1. Procédure canonique d'application par CLI liée

Après publication des migrations sur `main`, Codex applique la file selon cette
séquence sérialisée :

1. **Identité et projet cible** : vérifier `CLI_AUTH` (`npx supabase projects list`)
   et la visibilité du projet cible `trktzkgujgpgsgkoyndn` ainsi que la cible liée.
   Rapporter `CLI_AUTH_SOURCE`. En cas d'échec d'accès ou d'organisation,
   classer `CLI_AUTH_BLOCKED` sans contourner ni basculer sur Docker/WSL.
2. **Lecture et réconciliation des historiques** : exécuter
   `npx supabase migration list --linked` et vérifier que l'historique distant
   forme un préfixe exact de l'arbre canonique `apps/web/supabase/migrations/`.
3. **Préflight canonique de toute la file** : exécuter
   `npm run supabase:migration:preflight -- --dry-run`. Vérifier le statut
   (`ALIGNED`, `READY_TO_APPLY`, `BLOCKED`, `DIVERGED`), les dépendances SQL,
   les mutations exécutées vs DML dans les corps de fonctions, RLS, grants,
   contrats SQL consommés et Advisors `BEFORE`.
4. **Analyse des risques et des preuves nécessaires** :
   - Les **migrations ordinaires compatibles** (additives, sans mutation de
     données non approuvée ni risque critique) peuvent être appliquées après
     leurs contrôles proportionnés (`audit:supabase-migration-trees`,
     validation syntaxique, tests de contrats statiques/applicatifs) et un
     préflight `READY_TO_APPLY`. Elles ne sont pas bloquées par l'attente d'un
     replay intégral ni par des commits indépendants sur `main`.
   - Les **migrations sensibles** (DML/backfill approuvé dans
     `scripts/ci/supabase-migration-approvals.json`, RLS critique,
     concurrence, triggers/transitions sensibles) exigent préalablement leurs
     preuves PostgreSQL, pgTAP, RLS, transactionnelles ou de concurrence
     pertinentes. Leur validité est vérifiée par les **empreintes exactes
     (SHA-256)** des migrations, tests, dépendances et contrats SQL concernés
     (`validateEphemeralEvidence` dans `scripts/ci/supabase-convergence-gate.mjs`) :
     un commit indépendant qui laisse toutes ces entrées identiques n'invalide
     pas une preuve acquise.
   - Ne jamais appliquer une file contenant une erreur SQL connue non résolue
     ou un risque critique.
5. **Backup vérifié selon le risque** : avant toute file sensible ou comportant
   une évolution structurelle notable, vérifier la disponibilité d'une
   sauvegarde récente récupérable selon le runbook backup/restore.
6. **Application sérialisée** : depuis `apps/web`, exécuter :

   ```text
   npx supabase db push --linked --yes
   ```

7. **Postflight, historique et Advisors** : relancer
   `npm run supabase:migration:preflight -- --dry-run` et exiger `ALIGNED`
   (`PENDING_MIGRATIONS: 0`), relire `npx supabase migration list --linked` et
   comparer les Advisors security/performance `BEFORE`/`AFTER`.

## 2. Surveillance GitHub Actions (read-only)

`.github/workflows/supabase-convergence.yml` conserve :

- `permissions: {}` au niveau workflow et `contents: read` au niveau job ;
- `concurrency: group: supabase-production-migrations, cancel-in-progress: false` ;
- `environment: supabase-production` avec uniquement `SUPABASE_ACCESS_TOKEN`
  et `SUPABASE_DB_PASSWORD` ;
- aucun déclencheur `pull_request`, `push` ou `workflow_run` ;
- exécution read-only de `npm run supabase:migration:preflight -- --dry-run`,
  résumé du nombre de migrations en attente et de l'ancienneté de la plus
  ancienne, contrôle `supabase-convergence-postflight.mjs` (acceptant `ALIGNED`
  et `READY_TO_APPLY` en mode read-only, bloquant `BLOCKED` et `DIVERGED`),
  `audit:supabase-migration-trees` et tests statiques critiques.

## 3. Interdictions permanentes

- Aucun `supabase migration repair`, `supabase db reset` distant, DDL manuelle
  en production ou réécriture d'une migration déjà appliquée.
- Aucun Docker, WSL ou runtime Supabase local sur le poste utilisateur.
- Le plugin/MCP Supabase reste en lecture seule (`list_migrations`,
  `get_advisors`, etc.) et ne remplace jamais la CLI pour appliquer une
  migration.
- La publication Git reste indépendante de l'application Production.

## 4. Diagnostic de la lane SQL éphémère (`supabase-sql-proof-ephemeral`)

La lane `.github/workflows/supabase-sql-proof.yml` reste disponible pour le
replay complet PostgreSQL + seed + pgTAP + concurrence sur runner éphémère,
ainsi que son mode `workflow_dispatch` `isolate-replay` (read-only) pour
isoler une migration défaillante par dichotomie sans exposer de journaux
privés.

Validations locales du contrat de convergence :

```text
node --test scripts/ci/supabase-convergence-workflow.test.mjs scripts/ci/supabase-migration-preflight.test.mjs
npm run check:github-actions
```
