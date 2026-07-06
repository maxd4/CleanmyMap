# Backlog de correction - validation globale

Date de référence: 2026-07-06

Ce backlog ordonne les corrections à faire après les vérifications globales `lint`, `typecheck`, `test` et `build`.

## Résumé des contrôles

- `npm run lint` : passe, avec 141 warnings.
- `npm run typecheck` : passe.
- `npm run test` : échec sur 4 fichiers, 5 tests.
- `npm run build` : passe, mais remonte un avertissement runtime lié aux données.

## P0 - Bloquant typecheck (résolu)

1. Corriger [`apps/web/src/lib/actions/group-participation.test.ts`](../../apps/web/src/lib/actions/group-participation.test.ts) ligne 155.
   - Symptôme: `null` est passé à un champ typé `string | undefined`.
   - Action: aligner le fixture ou élargir le typage si `null` est réellement attendu.
   - Statut: résolu le 2026-07-06 en remplaçant `null` par `undefined` dans le fixture de test.

## P1 - Tests de régression

1. Stabiliser [`apps/web/src/app/api/community/rsvps/route.test.ts`](../../apps/web/src/app/api/community/rsvps/route.test.ts).
   - Symptôme: timeout sur le cas "SQLi-like event identifiers".
   - Action: vérifier le mock Supabase / la promesse de route et supprimer l’attente bloquante.

2. Stabiliser [`apps/web/src/app/api/gamification/badges/[userId]/route.test.ts`](../../apps/web/src/app/api/gamification/badges/[userId]/route.test.ts).
   - Symptôme: timeout sur le cas 401 non authentifié.
   - Action: isoler l’import de route et la résolution des mocks auth.

3. Corriger [`apps/web/src/lib/admin/operation-audit.test.ts`](../../apps/web/src/lib/admin/operation-audit.test.ts).
   - Symptôme: le mock Supabase ne fournit pas `.limit()`.
   - Action: aligner le mock sur la chaîne de requête réelle ou simplifier le chargement.

4. Régler [`apps/web/src/lib/vercel-regression-gates.test.ts`](../../apps/web/src/lib/vercel-regression-gates.test.ts).
   - Symptôme: la baseline des API routes a changé et une route `force-dynamic` manque de commentaire justificatif.
   - Action: confirmer si le nouvel état est attendu, puis mettre à jour la baseline et la justification.

## P2 - Signal runtime à investiguer

1. Investiguer l’erreur build-time `column actions.action_phase does not exist`.
   - Signal observé pendant `next build`, sans échec final du build.
   - Action: localiser la requête ou le helper de lecture d’actions qui référence cette colonne, puis synchroniser le schéma ou la projection.

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

1. P1 - tests de régression.
2. P2 - signal runtime.
3. P3 - dette lint et refactors de confort.
