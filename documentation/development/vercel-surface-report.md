# Rapport automatique de surface Vercel

Ce rapport est généré à partir de l'arbre courant du dépôt. Il sert à visualiser les surfaces qui influencent le coût Vercel et à prioriser la revue avant merge.

## Résumé

| Surface | Entrées | Invocations | Edge Requests | Origin Transfer |
| --- | --- | --- | --- | --- |
| API routes | 70 | élevé | faible | moyen |
| Pages dynamiques | 22 | moyen | faible | faible |
| Middleware / proxy | 1 | élevé | élevé | faible |
| Clerk | 80 | élevé | moyen | faible |
| Supabase | 118 | élevé | faible | moyen |
| PostHog | 8 | moyen | faible | moyen |
| Sentry | 4 | faible | faible | faible |
| Leaflet | 12 | faible | faible | élevé |

## Lecture du risque

- `Invocations` mesure le volume potentiel de fonctions serveurs, pages dynamiques et routes API.
- `Edge Requests` monte quand le proxy/middleware ou les protections auth interceptent davantage de requêtes.
- `Origin Transfer` monte avec les bundles lourds, les exports, les pages qui chargent beaucoup de données et les composants cartographiques.

## Routes API

Risque estimé: Invocations **élevé** / Edge Requests **faible** / Origin Transfer **moyen**.

Chaque route API peut déclencher une invocation Vercel. Les exports, les routes auth et les endpoints no-store augmentent surtout la fréquence d'appels et le coût d'origine.

### Inventaire

- `apps/web/src/app/api/account/profile-role/route.ts` — auth
- `apps/web/src/app/api/actions/[actionId]/group-join/route.ts` — auth, force-dynamic
- `apps/web/src/app/api/actions/group-join/route.ts` — auth, force-dynamic
- `apps/web/src/app/api/actions/import/route.ts`
- `apps/web/src/app/api/actions/prefill/route.ts` — auth
- `apps/web/src/app/api/actions/route.ts` — auth, force-dynamic
- `apps/web/src/app/api/admin/codex-usage/route.ts`
- `apps/web/src/app/api/admin/creator-inbox/route.ts`
- `apps/web/src/app/api/admin/environmental-impact/route.ts`
- `apps/web/src/app/api/admin/free-plan-services/route.ts`
- `apps/web/src/app/api/admin/moderation/route.ts`
- `apps/web/src/app/api/admin/operations/route.ts`
- `apps/web/src/app/api/admin/partners/published-directory/route.ts`
- `apps/web/src/app/api/admin/promotion-requests/route.ts`
- `apps/web/src/app/api/admin/referrals.csv/route.ts`
- `apps/web/src/app/api/admin/role-accounts/route.ts`
- `apps/web/src/app/api/admin/storage-usage/route.ts`
- `apps/web/src/app/api/analytics/funnel/route.ts` — auth
- `apps/web/src/app/api/chat/route.ts` — auth
- `apps/web/src/app/api/chat/users/route.ts` — auth
- `apps/web/src/app/api/community/bug-reports/route.ts` — auth
- `apps/web/src/app/api/community/events/ops/route.ts` — auth
- `apps/web/src/app/api/community/events/route.ts` — auth
- `apps/web/src/app/api/community/funnel.csv/route.ts` — no-store
- `apps/web/src/app/api/community/promotion-requests/route.ts` — auth
- `apps/web/src/app/api/community/rsvps/route.ts` — auth
- `apps/web/src/app/api/contact/route.ts` — auth
- `apps/web/src/app/api/cron/environmental-impact/route.ts`
- `apps/web/src/app/api/cron/storage-usage/route.ts`
- `apps/web/src/app/api/documentation/[slug]/route.ts`
- `apps/web/src/app/api/email/test/route.ts`
- `apps/web/src/app/api/environmental-impact/route.ts` — auth
- `apps/web/src/app/api/gamification/analytics/funnel/route.ts`
- `apps/web/src/app/api/gamification/analytics/points/route.ts` — auth
- `apps/web/src/app/api/gamification/badges/[userId]/increment/route.ts` — auth
- `apps/web/src/app/api/gamification/badges/[userId]/route.ts` — auth
- `apps/web/src/app/api/gamification/badges/list/route.ts` — auth
- `apps/web/src/app/api/gamification/leaderboard/route.ts` — auth
- `apps/web/src/app/api/gamification/me/route.ts` — auth
- `apps/web/src/app/api/gamification/points/add/route.ts` — auth
- `apps/web/src/app/api/gamification/points/history/route.ts` — auth
- `apps/web/src/app/api/gamification/points/me/route.ts` — auth
- `apps/web/src/app/api/gamification/quiz/progress/route.ts` — auth
- `apps/web/src/app/api/gamification/referrals/route.ts` — auth
- `apps/web/src/app/api/gamification/xp_audit/admin/route.ts`
- `apps/web/src/app/api/gamification/xp_audit/me/route.ts` — auth
- `apps/web/src/app/api/geo/address-suggestions/route.ts`
- `apps/web/src/app/api/geo/reverse-location/route.ts`
- `apps/web/src/app/api/health/route.ts`
- `apps/web/src/app/api/manifest/route.ts`
- `apps/web/src/app/api/newsletter/subscribe/route.ts`
- `apps/web/src/app/api/partners/onboarding-requests/route.ts` — auth
- `apps/web/src/app/api/partners/published-directory/route.ts`
- `apps/web/src/app/api/pilotage/overview/route.ts` — auth
- `apps/web/src/app/api/recycling/breakdown/route.ts`
- `apps/web/src/app/api/reports/actions.csv/route.ts`
- `apps/web/src/app/api/reports/actions.json/route.ts`
- `apps/web/src/app/api/reports/elus-dossier/route.ts`
- `apps/web/src/app/api/reports/governance-monthly/route.ts`
- `apps/web/src/app/api/route/recommend/route.ts` — auth
- `apps/web/src/app/api/sandbox/runbook-checks/route.ts`
- `apps/web/src/app/api/send/route.ts` — auth
- `apps/web/src/app/api/services/route.ts`
- `apps/web/src/app/api/spots/route.ts` — auth
- `apps/web/src/app/api/stripe/webhook/route.ts` — headers
- `apps/web/src/app/api/system/backpressure/route.ts`
- `apps/web/src/app/api/uptime/route.ts`
- `apps/web/src/app/api/users/checklist-progress/route.ts` — auth
- `apps/web/src/app/api/users/profile/display-name-mode/route.ts`
- `apps/web/src/app/api/users/profile/handle/route.ts` — auth

## Pages dynamiques

Risque estimé: Invocations **faible** / Edge Requests **faible** / Origin Transfer **faible**.

Les pages dynamiques font remonter les recalculs côté serveur ; elles deviennent sensibles quand elles chargent des métriques temps réel ou des données protégées.

### Pages détectées

- `apps/web/src/app/(app)/actions/history/page.tsx` — auth, cookies, headers
- `apps/web/src/app/(app)/actions/new/page.tsx` — auth, cookies, headers
- `apps/web/src/app/(app)/admin/godmode/page.tsx` — auth, cookies, headers
- `apps/web/src/app/(app)/admin/page.tsx` — auth, cookies, headers
- `apps/web/src/app/(app)/dashboard/page.tsx` — auth, cookies, headers
- `apps/web/src/app/(app)/explorer/page.tsx` — auth, cookies, headers
- `apps/web/src/app/(app)/parcours/page.tsx` — auth, cookies, headers
- `apps/web/src/app/(app)/partners/dashboard/page.tsx` — auth, cookies, headers
- `apps/web/src/app/(app)/partners/onboarding/page.tsx` — auth, cookies, headers
- `apps/web/src/app/(app)/pilotage/page.tsx` — auth, cookies, headers
- `apps/web/src/app/(app)/profil/[profile]/page.tsx` — auth, cookies, headers
- `apps/web/src/app/(app)/profil/page.tsx` — auth, cookies, headers
- `apps/web/src/app/(app)/reports/page.tsx` — auth, cookies, headers
- `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` — auth, cookies, headers
- `apps/web/src/app/(app)/signalement/page.tsx` — auth, cookies, headers
- `apps/web/src/app/(app)/sponsor-portal/page.tsx` — auth, cookies, headers
- `apps/web/src/app/admin/gamification/xp-audit/page.tsx` — auth
- `apps/web/src/app/learn/bonnes-pratiques/page.tsx` — cookies
- `apps/web/src/app/learn/comprendre/page.tsx` — cookies
- `apps/web/src/app/learn/sentrainer/page.tsx` — cookies
- `apps/web/src/app/onboarding/page.tsx` — auth, cookies, headers
- `apps/web/src/app/reglages/page.tsx` — auth, cookies, headers

## Middleware / proxy

Dans ce repo, l'entrée middleware côté Next est `apps/web/src/proxy.ts`.

Risque estimé: Invocations **élevé** / Edge Requests **élevé** / Origin Transfer **faible**.

Le proxy Next agit sur toutes les requêtes correspondantes. Le rate limit et la protection Clerk y font monter directement les Edge Requests.
Dans CleanMyMap, la règle cible est plus stricte: le middleware ne doit couvrir que les pages réellement protégées, le proxy Clerk et quelques endpoints publics qui ont un vrai besoin de rate limit. Les API déjà gardées dans leur handler ne doivent pas être ajoutées au matcher par réflexe, sinon on paie une seconde fois le coût Edge sans gain de sécurité.

### Fichiers

- `apps/web/src/proxy.ts`

## Usages Clerk

Risque estimé: Invocations **élevé** / Edge Requests **moyen** / Origin Transfer **faible**.

Clerk se trouve à la frontière auth. Les usages serveur et middleware augmentent les invocations et ajoutent du travail sur les requêtes protégées.

### Fichiers

- `apps/web/src/app/(app)/actions/history/page.tsx` — Clerk gate
- `apps/web/src/app/(app)/admin/page.tsx` — Clerk gate
- `apps/web/src/app/(app)/admin/services/page.tsx` — Clerk gate
- `apps/web/src/app/(app)/dashboard/page.tsx` — Clerk gate
- `apps/web/src/app/(app)/parcours/[profile]/page.tsx` — Clerk gate
- `apps/web/src/app/(app)/parcours/page.tsx` — Clerk gate
- `apps/web/src/app/(app)/partners/dashboard/page.tsx` — Clerk gate
- `apps/web/src/app/(app)/partners/onboarding/page.tsx` — Clerk gate
- `apps/web/src/app/(app)/prints/report/page.tsx` — Clerk gate
- `apps/web/src/app/(app)/profil/[profile]/page.tsx` — Clerk gate
- `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` — Clerk gate
- `apps/web/src/app/(app)/signalement/page.tsx` — Clerk gate
- `apps/web/src/app/(app)/sponsor-portal/page.tsx` — Clerk gate
- `apps/web/src/app/api/account/profile-role/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/actions/[actionId]/group-join/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/actions/group-join/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/actions/prefill/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/actions/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/admin/promotion-requests/route.ts` — Clerk server
- `apps/web/src/app/api/admin/role-accounts/route.ts` — Clerk server
- `apps/web/src/app/api/analytics/funnel/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/chat/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/chat/users/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/community/bug-reports/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/community/events/ops/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/community/events/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/community/promotion-requests/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/community/rsvps/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/contact/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/environmental-impact/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/gamification/analytics/points/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/gamification/badges/[userId]/increment/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/gamification/badges/[userId]/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/gamification/badges/list/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/gamification/leaderboard/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/gamification/me/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/gamification/points/add/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/gamification/points/history/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/gamification/points/me/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/gamification/quiz/progress/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/gamification/referrals/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/gamification/xp_audit/me/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/partners/onboarding-requests/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/pilotage/overview/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/route/recommend/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/send/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/spots/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/users/checklist-progress/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/api/users/profile/display-name-mode/route.ts` — Clerk server
- `apps/web/src/app/api/users/profile/handle/route.ts` — Clerk auth, Clerk server
- `apps/web/src/app/sign-in/[[...sign-in]]/page.tsx` — Clerk client
- `apps/web/src/app/sign-up/[[...sign-up]]/page.tsx` — Clerk client
- `apps/web/src/components/account/account-setup-form.tsx` — Clerk client
- `apps/web/src/components/account/user-location-onboarding-form.tsx` — Clerk client
- `apps/web/src/components/actions/actions-history-list.tsx` — Clerk client
- `apps/web/src/components/auth/clerk-localization-provider.tsx` — Clerk client, Clerk provider
- `apps/web/src/components/chat/chat-shell.tsx` — Clerk client, Clerk hook
- `apps/web/src/components/chat/chat-shell.utils.ts` — Clerk client
- `apps/web/src/components/chat/hooks/use-chat-submit.ts` — Clerk client
- `apps/web/src/components/gamification/ExplorerBadgeWrapper.tsx` — Clerk client, Clerk hook
- `apps/web/src/components/learn/environmental-quiz.tsx` — Clerk client, Clerk hook
- `apps/web/src/components/navigation/app-navigation-ribbon.tsx` — Clerk client
- `apps/web/src/components/navigation/notification-bell.tsx` — Clerk client, Clerk hook
- `apps/web/src/components/partners/onboarding/use-partner-onboarding.ts` — Clerk client
- `apps/web/src/components/profil/impact-profile-page.tsx` — Clerk gate
- `apps/web/src/components/sections/rubriques/feedback-section.tsx` — Clerk client
- `apps/web/src/components/sections/rubriques/feedback/questionnaire-card.tsx` — Clerk client
- `apps/web/src/components/sections/rubriques/use-annuaire-logic.ts` — Clerk client
- `apps/web/src/components/ui/clerk-required-gate.tsx` — Clerk gate
- `apps/web/src/lib/actions/organizers.ts` — Clerk server
- `apps/web/src/lib/admin/access.ts` — Clerk auth, Clerk server
- `apps/web/src/lib/auth/account-setup.ts` — Clerk auth, Clerk server
- `apps/web/src/lib/auth/display-mode.ts` — Clerk auth, Clerk server
- `apps/web/src/lib/auth/safe-session.ts` — Clerk auth, Clerk server
- `apps/web/src/lib/auth/sync.ts` — Clerk server
- `apps/web/src/lib/auth/user-location.ts` — Clerk auth, Clerk server
- `apps/web/src/lib/authz.ts` — Clerk auth, Clerk server
- `apps/web/src/lib/services/clerk.ts` — Clerk server
- `apps/web/src/lib/supabase/clerk-rls.ts` — Clerk auth, Clerk server
- `apps/web/src/proxy.ts` — Clerk middleware, Clerk server

## Usages Supabase

Risque estimé: Invocations **élevé** / Edge Requests **faible** / Origin Transfer **moyen**.

Supabase concentre les lectures serveur, les exports et les clients RLS. Le risque principal reste l'effet cumulé des requêtes et des exports de données.

### Fichiers

- `apps/web/scripts/backfill-action-gamification.mjs` — Supabase client
- `apps/web/scripts/backfill-derived-geometry.mjs` — Supabase client
- `apps/web/scripts/backfill-route-style.mjs` — Supabase client
- `apps/web/scripts/cleanup-supabase-retention.mjs` — Supabase client
- `apps/web/scripts/db-cleanup-suspect-runtime-records.mjs` — Supabase client
- `apps/web/scripts/export-actions-backup.mjs` — Supabase client
- `apps/web/scripts/export-supabase-archive.mjs` — Supabase client
- `apps/web/scripts/import-actions-backup.mjs` — Supabase client
- `apps/web/scripts/sync-google-sheet-to-supabase.mjs` — Supabase client historique (flux désactivé)
- `apps/web/scripts/sync-validated-local-store.mjs` — Supabase client
- `apps/web/src/app/(app)/admin/page.tsx` — Server client
- `apps/web/src/app/(app)/dashboard/page.tsx` — Server client
- `apps/web/src/app/(app)/missions/[id]/page.tsx` — Server client
- `apps/web/src/app/(app)/pilotage/page.tsx` — Server client
- `apps/web/src/app/(app)/prints/report/page.tsx` — Server client
- `apps/web/src/app/(app)/profil/[profile]/page.tsx` — Server client
- `apps/web/src/app/(app)/reports/page.tsx` — Server client
- `apps/web/src/app/(app)/sponsor-portal/page.tsx` — Server client
- `apps/web/src/app/admin/gamification/xp-audit/page.tsx` — Server client
- `apps/web/src/app/api/actions/[actionId]/group-join/route.ts` — Server client
- `apps/web/src/app/api/actions/group-join/route.ts` — Server client
- `apps/web/src/app/api/actions/import/route.ts` — Server client
- `apps/web/src/app/api/actions/prefill/route.ts` — Server client
- `apps/web/src/app/api/actions/route.ts` — Server client
- `apps/web/src/app/api/admin/moderation/route.ts` — Admin client, Server client
- `apps/web/src/app/api/admin/referrals.csv/route.ts` — Server client
- `apps/web/src/app/api/chat/route.ts` — Clerk RLS client, Server client
- `apps/web/src/app/api/chat/users/route.ts` — Clerk RLS client
- `apps/web/src/app/api/community/bug-reports/route.ts` — Server client
- `apps/web/src/app/api/community/events/ops/route.ts` — Server client
- `apps/web/src/app/api/community/events/route.ts` — Server client
- `apps/web/src/app/api/community/funnel.csv/route.ts` — Server client
- `apps/web/src/app/api/community/rsvps/route.ts` — Server client
- `apps/web/src/app/api/gamification/analytics/funnel/route.ts` — Server client
- `apps/web/src/app/api/gamification/analytics/points/route.ts` — Server client
- `apps/web/src/app/api/gamification/badges/[userId]/increment/route.ts` — Server client
- `apps/web/src/app/api/gamification/badges/[userId]/route.ts` — Server client
- `apps/web/src/app/api/gamification/badges/list/route.ts` — Server client
- `apps/web/src/app/api/gamification/leaderboard/route.ts` — Server client
- `apps/web/src/app/api/gamification/me/route.ts` — Server client
- `apps/web/src/app/api/gamification/points/add/route.ts` — Server client
- `apps/web/src/app/api/gamification/points/history/route.ts` — Server client
- `apps/web/src/app/api/gamification/points/me/route.ts` — Server client
- `apps/web/src/app/api/gamification/quiz/progress/route.ts` — Server client
- `apps/web/src/app/api/gamification/referrals/route.ts` — Server client
- `apps/web/src/app/api/gamification/xp_audit/admin/route.ts` — Server client
- `apps/web/src/app/api/gamification/xp_audit/me/route.ts` — Server client
- `apps/web/src/app/api/health/route.ts` — Server client
- `apps/web/src/app/api/newsletter/subscribe/route.ts` — Server client
- `apps/web/src/app/api/pilotage/overview/route.ts` — Server client
- `apps/web/src/app/api/recycling/breakdown/route.ts` — Server client
- `apps/web/src/app/api/reports/actions.csv/route.ts` — Server client
- `apps/web/src/app/api/reports/actions.json/route.ts` — Server client
- `apps/web/src/app/api/reports/elus-dossier/route.ts` — Server client
- `apps/web/src/app/api/route/recommend/route.ts` — Server client
- `apps/web/src/app/api/spots/route.ts` — Server client
- `apps/web/src/app/api/users/profile/handle/route.ts` — Clerk RLS client
- `apps/web/src/app/onboarding/page.tsx` — Server client
- `apps/web/src/components/chat/chat-shell.tsx` — Supabase client
- `apps/web/src/components/chat/hooks/use-chat-data.ts` — Supabase client
- `apps/web/src/components/chat/hooks/use-chat-submit.ts` — Supabase client
- `apps/web/src/components/chat/ui/chat-feed-states.tsx` — Supabase client
- `apps/web/src/lib/accueil/data.ts` — Server client
- `apps/web/src/lib/actions/group-participation.ts` — Supabase client
- `apps/web/src/lib/actions/organizers.ts` — Supabase client
- `apps/web/src/lib/actions/pollution-score-references.ts` — Supabase client
- `apps/web/src/lib/actions/query.ts` — Supabase client
- `apps/web/src/lib/actions/store.ts` — Supabase client
- `apps/web/src/lib/actions/training.ts` — Supabase client
- `apps/web/src/lib/actions/unified-source.ts` — Supabase client
- `apps/web/src/lib/admin/access.ts` — Server client
- `apps/web/src/lib/admin/action-moderation-edits.ts` — Server client
- `apps/web/src/lib/admin/operation-audit.ts` — Server client
- `apps/web/src/lib/admin/promotion-requests-store.ts` — Supabase mirror
- `apps/web/src/lib/admin/role-management.ts` — Server client, Supabase client
- `apps/web/src/lib/analytics/funnel-store.ts` — Server client
- `apps/web/src/lib/auth/sync.ts` — Admin client
- `apps/web/src/lib/authz.ts` — Server client
- `apps/web/src/lib/chat/chat-notifications.ts` — Supabase client
- `apps/web/src/lib/community/bug-reports-store.ts` — Supabase mirror
- `apps/web/src/lib/community/creator-inbox-loader.ts` — Server client
- `apps/web/src/lib/community/discussion-rate-limit.ts` — Supabase client
- `apps/web/src/lib/contact/contact-requests-store.ts` — Supabase mirror
- `apps/web/src/lib/data/local-sync.ts` — Supabase client
- `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts` — Server client
- `apps/web/src/lib/environmental-impact-estimator/dashboard-capture.ts` — Server client
- `apps/web/src/lib/environmental-impact-estimator/project-signals.ts` — Supabase client
- `apps/web/src/lib/environmental-impact-estimator/service-email-events-store.ts` — Server client
- `apps/web/src/lib/environmental-impact-estimator/snapshot-store.ts` — Server client
- `apps/web/src/lib/events/handlers.ts` — Server client
- `apps/web/src/lib/gamification/action-balance.ts` — Supabase client
- `apps/web/src/lib/gamification/announcements.ts` — Supabase client
- `apps/web/src/lib/gamification/annual-reset.ts` — Supabase client
- `apps/web/src/lib/gamification/badges/listing.ts` — Supabase client
- `apps/web/src/lib/gamification/infinite-badges-server.ts` — Server client
- `apps/web/src/lib/gamification/points/system.ts` — Supabase client
- `apps/web/src/lib/gamification/progression-backfill.ts` — Supabase client
- `apps/web/src/lib/gamification/progression-data.ts` — Supabase client
- `apps/web/src/lib/gamification/progression-leaderboard.ts` — Supabase client
- `apps/web/src/lib/gamification/progression-tracking.ts` — Supabase client
- `apps/web/src/lib/gamification/quiz-balance-progress.ts` — Supabase client
- `apps/web/src/lib/gamification/quiz-progress.ts` — Supabase client
- `apps/web/src/lib/gamification/referral-lineage.ts` — Supabase client
- `apps/web/src/lib/gamification/referrals.ts` — Supabase client
- `apps/web/src/lib/gamification/sensitive-zone-badge.ts` — Supabase client
- `apps/web/src/lib/governance/governance-monthly-report-store.ts` — Server client
- `apps/web/src/lib/notifications/client.ts` — Supabase client
- `apps/web/src/lib/partners/onboarding-requests-store.ts` — Supabase mirror
- `apps/web/src/lib/photo-upload.ts` — Supabase client
- `apps/web/src/lib/pilotage/overview.ts` — Supabase client
- `apps/web/src/lib/route/recommendation-assistant.ts` — Supabase client
- `apps/web/src/lib/sections/checklist-progress-store.ts` — Server client
- `apps/web/src/lib/sections/runbook-checks-store.ts` — Server client
- `apps/web/src/lib/supabase/clerk-rls.ts` — Clerk RLS client, Supabase client
- `apps/web/src/lib/supabase/client.ts` — Supabase client
- `apps/web/src/lib/supabase/mirror.ts` — Server client, Supabase client, Supabase mirror
- `apps/web/src/lib/supabase/server.ts` — Admin client, Server client, Supabase client
- `apps/web/src/lib/supabase/storage-usage-service.ts` — Server client

## Usages PostHog

Risque estimé: Invocations **moyen** / Edge Requests **faible** / Origin Transfer **moyen**.

PostHog ajoute du JavaScript client et des appels analytics. Le coût monte surtout via le bundle et les captures répétées.
La réduction la plus rentable est de garder le tracker pageview et le client PostHog derrière le consentement analytique, plutôt que de les charger sur tout le shell.

### Fichiers

- `apps/web/src/app/api/actions/route.ts` — Server tracking
- `apps/web/src/app/api/spots/route.ts` — Server tracking
- `apps/web/src/app/layout.tsx` — Provider
- `apps/web/src/components/analytics/project-pageview-tracker.tsx` — Client tracking
- `apps/web/src/components/ui/conditional-analytics.tsx` — Consent gate, analytics host
- `apps/web/src/components/posthog-provider.tsx` — Client init, Provider
- `apps/web/src/lib/analytics.server.ts` — Server client, Server tracking
- `apps/web/src/lib/analytics/navigation-client.ts` — Client init
- `apps/web/src/lib/posthog/client.ts` — Client init, PostHog browser
- `apps/web/src/lib/posthog/server.ts` — PostHog node, Server client, Server tracking

## Usages Sentry

Risque estimé: Invocations **faible** / Edge Requests **faible** / Origin Transfer **faible**.

Sentry reste surtout un coût de diagnostic et de build, avec peu d'impact runtime direct dans le code métier.

### Fichiers

- `apps/web/src/app/error.tsx` — Capture exception, Sentry enabled, Sentry SDK
- `apps/web/src/app/global-error.tsx` — Capture exception, Sentry enabled, Sentry SDK
- `apps/web/src/lib/http/api-errors.ts` — Capture exception, Sentry enabled, Sentry SDK
- `apps/web/src/lib/observability/sentry.ts` — Sentry config, Sentry enabled

## Usages Leaflet

Risque estimé: Invocations **faible** / Edge Requests **faible** / Origin Transfer **élevé**.

Leaflet et react-leaflet gonflent le bundle client. Le coût principal est le transfert d'origine et le temps de chargement des cartes.
La bonne pratique dans CleanMyMap est de ne déclencher le chunk Leaflet que quand la zone cartographique devient utile à l'écran, avec un placeholder léger avant cela.

### Fichiers

- `apps/web/src/components/actions/action-drawing-map.tsx` — Leaflet, Leaflet Draw, React Leaflet
- `apps/web/src/components/actions/actions-map-canvas.tsx` — Leaflet, React Leaflet
- `apps/web/src/components/actions/actions-map-canvas.utils.ts` — Leaflet
- `apps/web/src/components/actions/map/actions-map-geometry.utils.ts` — Leaflet
- `apps/web/src/components/actions/map/map-controls.tsx` — Leaflet, React Leaflet
- `apps/web/src/components/actions/map/map-layers.tsx` — Leaflet, Leaflet cluster, React Leaflet
- `apps/web/src/components/actions/smart-routing-map.tsx` — Leaflet, React Leaflet
- `apps/web/src/components/maps/territory-map-comparison-cards.tsx` — Leaflet, React Leaflet
- `apps/web/src/components/missions/mission-map.tsx` — Leaflet, React Leaflet
- `apps/web/src/components/ui/use-in-view-once.ts` — viewport gating for heavy client chunks
- `apps/web/src/components/sections/rubriques/annuaire-map-canvas.tsx` — Leaflet, React Leaflet
- `apps/web/src/components/sections/rubriques/compost-map-canvas.tsx` — Leaflet, React Leaflet
- `apps/web/src/types/leaflet-draw.d.ts` — Leaflet, Leaflet Draw

## Lecture prioritaire

- `proxy.ts` reste la surface la plus sensible pour `Edge Requests`.
- Les routes d'export et les pages cache-bypassées dominent le risque `Invocations`.
- Les composants Leaflet et PostHog sont les premiers contributeurs au `Origin Transfer` côté client, mais ils doivent désormais être chargés seulement quand le consentement ou la visibilité les justifient.
