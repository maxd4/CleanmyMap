# Backlog de correction - validation globale

Date de référence: 2026-07-06

Ce backlog ordonne les corrections à faire après les vérifications globales `lint`, `typecheck`, `test` et `build`.

## Résumé des contrôles

- `npm run lint` : passe, avec 141 warnings connus.
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

## P3 - Dette lint non bloquante

1. Corriger le warning React dans [`apps/web/src/components/actions/map-feed/use-actions-map-viewport.ts`](../../apps/web/src/components/actions/map-feed/use-actions-map-viewport.ts).
   - Symptôme: `setState` synchronisé dans un effect.
   - Action: déplacer la mise à jour dans un flux plus sûr ou dans un callback asynchrone.

2. Nettoyer les avertissements de texte non échappé dans [`apps/web/src/components/missions/mission-qr.tsx`](../../apps/web/src/components/missions/mission-qr.tsx).
   - Action: remplacer les apostrophes par des entités HTML ou du texte formaté.

3. Purger les imports inutilisés dans les fichiers data/rubriques signalés par ESLint.
   - Exemples: [`apps/web/src/components/sections/rubriques/free-plan-services-methodology-visual.data.ts`](../../apps/web/src/components/sections/rubriques/free-plan-services-methodology-visual.data.ts), [`apps/web/src/components/sections/rubriques/recycling-assistant/recycling-assistant-data.ts`](../../apps/web/src/components/sections/rubriques/recycling-assistant/recycling-assistant-data.ts), [`apps/web/src/components/sections/rubriques/recycling-assistant/recycling-assistant.utils.ts`](../../apps/web/src/components/sections/rubriques/recycling-assistant/recycling-assistant.utils.ts).

4. Réduire la dette de complexité et de taille dans les familles les plus lourdes.
   - Familles concernées: `environmental-impact-estimator`, `pdf-export`, `supabase`, `learning`, `pilotage`, `admin`, `ui`.
   - Action: fractionner les helpers les plus longs ou les plus cyclomatiques après les blocages P0/P1.

## Ordre de traitement recommandé

1. P2 - signal runtime.
2. P3 - dette lint et refactors de confort.
