# TypeScript strict - backlog priorisé

Source de validation standard: `npm run typecheck` dans `apps/web`

Statut: `typecheck` standard vert au moment de la dernière vérification.

## Lecture rapide

Le contrôle strict `noPropertyAccessFromIndexSignature` est maintenant vert. Ce document passe en mode archive de suivi: il ne décrit plus un backlog actif.

## État courant

- `npm run typecheck -w apps/web` passe.
- `npx tsc -p apps/web/tsconfig.json --noEmit --pretty false --skipLibCheck --noPropertyAccessFromIndexSignature` passe aussi.
- Les derniers fichiers corrigés dans cette passe sont `quiz-pedagogical-metrics`, `supabase/client.test`, `services/health.test`, `services/route.test`, `progression-data.organizers.test`, `admin/moderation/route.test`, `admin/page.tsx`, `group-join/route.test.helpers.ts`, `actions/[actionId]/route.ts`, `actions/group-join/route.test.ts`, `export-form-history.ts`, `progression-data.action-rejection.test.ts`, `progression-data.monthly-regularity.test.ts`, `auth/sync.ts`, `chat-notification-targets.ts`, `backpressure/index.ts`, `app-shell-surface.tsx`, `app-navigation-ribbon.tsx`, `actions-history-list.tsx`, `operation-audit-timeline.tsx`, `feedback-section.shared.ts`, `questionnaire-card.tsx`, `trash-spotter-components.tsx`, `chat-shell.utils.ts`, `action-moderation-edits.ts`, `admin/operation-audit.test.ts` et `community/event-rsvp-summaries.test.ts`.

## État final

- Aucun warning strict TypeScript actif au moment de cette vérification.
- Le backlog ci-dessus est clos et conservé seulement comme trace historique.

## Lot clos

- `mission-qr`
- `useGamificationRealtime`
- `github-repository-stats`
- `chat-config`
- `supabase/client`
- `authz-identity`
- `rate-limit/server`
- `quiz-pedagogical-metrics`
- `supabase/client.test`
- `services/health.test`
- `services/route.test`
- `progression-data.organizers.test`
- `admin/moderation/route.test`
- `admin/page.tsx`
- `group-join/route.test.helpers.ts`
- `actions/[actionId]/route.ts`
- `actions/group-join/route.test.ts`
- `export-form-history.ts`
- `progression-data.action-rejection.test.ts`
- `progression-data.monthly-regularity.test.ts`
- `auth/sync.ts`
- `chat-notification-targets.ts`
- `backpressure/index.ts`
- `app-shell-surface.tsx`
- `app-navigation-ribbon.tsx`
- `actions-history-list.tsx`
- `operation-audit-timeline.tsx`
- `feedback-section.shared.ts`
- `questionnaire-card.tsx`
- `trash-spotter-components.tsx`
- `chat-shell.utils.ts`
- `action-moderation-edits.ts`
- `admin/operation-audit.test.ts`
- `community/event-rsvp-summaries.test.ts`

## Prochaine action si un nouvel écart réapparaît

1. Relancer `npm run typecheck -w apps/web`.
2. Reclasser les écarts par cause racine.
3. Mettre à jour ce document avec le lot suivant réellement prioritaire.
