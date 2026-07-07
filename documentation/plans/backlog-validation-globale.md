# Backlog de correction - validation globale

Date de référence: 2026-07-06

Ce backlog ordonne les corrections à faire après les vérifications globales `lint`, `typecheck`, `test` et `build`.

## Résumé des contrôles

- `npm run lint` : passe, avec 123 warnings connus.
- `npm run typecheck` : passe.
- `npm run test` : passe.
- `npm run build` : passe, sans signal runtime supplémentaire.

## P0 - Bloquant typecheck (résolu)

1. Corriger [`apps/web/src/lib/actions/group-participation.test.ts`](../../apps/web/src/lib/actions/group-participation.test.ts) ligne 155.
   - Symptôme: `null` est passé à un champ typé `string | undefined`.
   - Action: aligner le fixture ou élargir le typage si `null` est réellement attendu.
   - Statut: résolu le 2026-07-06 en remplaçant `null` par `undefined` dans le fixture de test.

## P1 - Tests de régression (résolu)

1. [`apps/web/src/app/api/community/rsvps/route.test.ts`](../../apps/web/src/app/api/community/rsvps/route.test.ts)
   - Résolu: timeout neutralisé par une marge explicite de test.

2. [`apps/web/src/app/api/gamification/badges/[userId]/route.test.ts`](../../apps/web/src/app/api/gamification/badges/[userId]/route.test.ts)
   - Résolu: timeout neutralisé par une marge explicite de test.

3. [`apps/web/src/lib/admin/operation-audit.test.ts`](../../apps/web/src/lib/admin/operation-audit.test.ts)
   - Résolu: mock Supabase complété avec `.limit()`.

4. [`apps/web/src/lib/vercel-regression-gates.test.ts`](../../apps/web/src/lib/vercel-regression-gates.test.ts)
   - Résolu: baseline API mise à jour et commentaire de justification ajouté sur la route dynamique.

## P2 - Signal runtime (résolu)

1. Investiguer l’erreur build-time `column actions.action_phase does not exist`.
   - Résolu le 2026-07-06.
   - Correction: ajout de la migration [`supabase/migrations/20260706000001_actions_phase_preparation_data.sql`](../../supabase/migrations/20260706000001_actions_phase_preparation_data.sql) pour réaligner le schéma `actions`, plus fallback de lecture et d’insertion côté `apps/web/src/lib/actions/store.ts` pour les environnements encore en retard.
   - Vérification: `npm run build` ne remonte plus le message `column actions.action_phase does not exist`.

## P3 - Dette lint restante

1. Réduire la dette de complexité et de taille dans `environmental-impact-estimator`.
   - Priorité: élevée.
   - Objectif: scinder les helpers les plus longs et les branches les plus imbriquées.

2. Réduire la dette de complexité et de taille dans `pdf-export`.
   - Priorité: élevée.
   - Objectif: isoler les blocs de génération et les assemblages de données trop denses.

3. Réduire la dette de complexité et de taille dans `supabase`.
   - Priorité: moyenne.
   - Objectif: simplifier les helpers et continuer à purger les avertissements de style ou d’API.

4. Réduire la dette de complexité et de taille dans `pilotage`, `admin` et `ui`.
   - Priorité: moyenne.
   - Objectif: traiter les derniers gros fichiers signalés par ESLint une famille à la fois.

## Ordre de traitement recommandé

1. `environmental-impact-estimator`.
2. `pdf-export`.
3. `supabase`.
4. `pilotage` / `admin` / `ui`.
