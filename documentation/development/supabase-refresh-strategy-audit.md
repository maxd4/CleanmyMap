# Audit de stratégie de rafraîchissement Supabase

Date de référence: 2026-06-27

Ce document résume les données qui sont rafraîchies trop souvent dans le dépôt CleanMyMap, puis propose une stratégie de cache, de snapshot ou de refresh planifié.

Objectif:

- réduire les coûts Vercel;
- réduire les coûts Supabase;
- éviter les lectures répétées au montage ou à chaque visite;
- garder le comportement produit intact quand la donnée n’a pas besoin d’être temps réel.

Base d’analyse:

- inventaire statique du code `apps/web/src` et `apps/web/scripts`;
- audit Supabase local déjà généré dans `artifacts/supabase/quota-audit/`;
- focus sur les pages servies, les hooks client, les API routes et les agrégats de synthèse.

## État d'avancement

- Phase 4: réalisée sur les vues de supervision en refresh planifié.
- Phase 1, premier lot: `dashboard` traité via cache court sur le résumé des labels utilisateurs.
- Reste de la phase 1: `reports`, `admin`, `pilotage`, `sponsor portal`, `print report`.

Références locales:

- [`documentation/database/supabase-quota-audit.md`](../database/supabase-quota-audit.md)
- [`documentation/development/supabase-query-optimization-playbook.md`](./supabase-query-optimization-playbook.md)
- [`artifacts/supabase/quota-audit/table-risk-report.md`](../../artifacts/supabase/quota-audit/table-risk-report.md)
- [`artifacts/supabase/quota-audit/repo-audit.md`](../../artifacts/supabase/quota-audit/repo-audit.md)

## Résumé exécutif

Les surfaces les plus coûteuses ne sont pas les mutations utilisateur immédiates, mais les vues de synthèse et les listes montées automatiquement:

- `profiles` lit trop large sur plusieurs chemins admin/chat/referrals;
- `event_rsvps` et `action_participants` sont chargés sur des pages et exports récurrents;
- `community_events`, `spots`, `trash_spotter_spots` et `points_ledger` alimentent des vues consultées souvent, mais pas forcément temps réel;
- plusieurs dashboards serveur recalculent des agrégats à chaque visite;
- plusieurs composants client refetchent au montage ou sur intervalle alors qu’un snapshot ou un cache court suffirait.

La règle utile pour la suite est simple:

- temps réel uniquement pour les actions utilisateur et les écritures immédiates;
- quotidien pour les agrégats de synthèse;
- hebdomadaire pour les historiques et données de référence;
- statique pour la documentation, les constantes et les référentiels.

## Classification par type de donnée

| Type de donnée | Catégorie recommandée | Fréquence actuelle estimée | Fréquence recommandée | Gain attendu | Risque fonctionnel | Solution recommandée |
|---|---|---|---|---|---|---|
| Auth, mutations immédiates, formulaires | Données critiques temps réel | Appels directs au moment de l’action | Temps réel | Faible à moyen | Faible | Garder live |
| `profiles` pour authz, handle, referrals, chat users | Critique, mais requêtes bornées seulement | À chaque visite de plusieurs écrans, avec scans non bornés détectés | Temps réel sur lookup exact, cache court ou snapshot pour synthèse | Fort | Moyen | Remplacer les scans larges par des requêtes exactes, RPC ou cache court |
| `event_rsvps`, `action_participants` | Semi-statique | À chaque visite des pages communauté / participation / export | Quotidien ou cache privé court | Fort | Moyen | Compteurs via RPC, listes bornées, invalidation sur write |
| `community_events` | Semi-statique | Chaque ouverture des pages et exports | Quotidien | Fort | Faible à moyen | Snapshot ou cache privé, POST live uniquement |
| `actions` et ses agrégats | Semi-statique | Très fréquent sur dashboard, homepage, reports, map, sponsor portal | Quotidien | Fort | Moyen | Pré-agréger les vues publiques, limiter les colonnes, garder les mutations live |
| `spots`, `trash_spotter_spots` | Semi-statique | Au montage et à chaque filtre / viewport | Quotidien à hebdomadaire | Fort | Moyen | Query bornée par zone visible, cache par zone, pas de chargement large |
| `points_ledger`, `progression_events`, `user_points`, `progression_profiles`, `user_badge_totals` | Semi-statique | Consulté sur le profil, les badges et le leaderboard | Quotidien | Fort | Faible | Snapshots et compteurs dérivés |
| `service_email_events`, `environmental_impact_snapshots`, `codex_usage_weekly_snapshots`, `supabase_storage_usage_snapshots`, `governance_monthly_reports` | Froid | Sur les panneaux admin et captures | Hebdomadaire ou mensuel | Fort | Faible | Snapshot-first, jobs planifiés, aucun recompute live au rendu |
| `weather`, géocodage, route recommendation | Semi-statique avec TTL court | Au montage ou lors des changements de critères | Cache court, souvent 1 jour | Moyen | Faible | Cache côté serveur ou SWR avec intervalle raisonnable |
| Préférences UI, checklist, identité affichée, annuaire publié | Semi-statique / local | Chargement fréquent au montage | Une fois par session ou stockage local, sync différée | Moyen | Faible | Hydrater une fois, persister localement si possible |
| Méthodologies, textes, constantes, référentiels de territoire | Totalement statique | Recalcul inutile ou transport live occasionnel | Statique / pré-généré | Moyen | Faible | Garder dans Git, Markdown ou JSON généré |

## Hotspots de lecture côté Supabase

### `profiles`

Fichiers concernés:

- [`apps/web/src/lib/actions/group-participation.ts`](../../apps/web/src/lib/actions/group-participation.ts)
- [`apps/web/src/lib/admin/operation-audit.ts`](../../apps/web/src/lib/admin/operation-audit.ts)
- [`apps/web/src/lib/auth/sync.ts`](../../apps/web/src/lib/auth/sync.ts)
- [`apps/web/src/lib/admin/role-management.ts`](../../apps/web/src/lib/admin/role-management.ts)
- [`apps/web/src/lib/authz.ts`](../../apps/web/src/lib/authz.ts)
- [`apps/web/src/lib/gamification/referrals.ts`](../../apps/web/src/lib/gamification/referrals.ts)
- [`apps/web/src/app/api/chat/users/route.ts`](../../apps/web/src/app/api/chat/users/route.ts)
- [`apps/web/src/app/api/users/profile/display-name-mode/route.ts`](../../apps/web/src/app/api/users/profile/display-name-mode/route.ts)

Problèmes observés:

- 3 scans non bornés détectés dans l’audit;
- usage central mais parfois trop large;
- risque de surcharger une table critique pour des synthèses ou listes secondaires.

Fréquence actuelle estimée:

- plusieurs lectures par visite sur les écrans concernés;
- sur des routes admin et chat, à chaque montage ou recherche.

Fréquence recommandée:

- lookup exact pour l’identité active;
- cache court pour les vues de synthèse;
- zéro scan global dans les chemins UI.

Solution recommandée:

- utiliser des requêtes exactes par `id`, `handle` ou `referral_code`;
- s’appuyer sur des index adaptés;
- déplacer les listes vers des RPC ou des vues matérialisées;
- ne jamais faire de filtrage côté React après chargement complet.

### `event_rsvps` et `action_participants`

Fichiers concernés:

- [`apps/web/src/app/api/community/events/route.ts`](../../apps/web/src/app/api/community/events/route.ts)
- [`apps/web/src/app/api/community/events/ops/route.ts`](../../apps/web/src/app/api/community/events/ops/route.ts)
- [`apps/web/src/app/api/community/funnel.csv/route.ts`](../../apps/web/src/app/api/community/funnel.csv/route.ts)
- [`apps/web/src/lib/actions/group-participation.ts`](../../apps/web/src/lib/actions/group-participation.ts)

Problèmes observés:

- lectures répétées lors du chargement des événements et des files de groupe;
- exposition à des exports récurrents;
- données utiles, mais pas forcément à recalculer à chaque visite.

Fréquence actuelle estimée:

- à chaque ouverture des vues communauté et participation;
- à chaque export CSV et à chaque refresh manuel.

Fréquence recommandée:

- liste publique cache court;
- compteurs et synthèses quotidiens;
- mutations live uniquement.

Solution recommandée:

- garder les écritures immédiates;
- pré-calculer les compteurs utiles;
- borner systématiquement les listes et les exports.

### `community_events`

Fichiers concernés:

- [`apps/web/src/app/api/community/events/route.ts`](../../apps/web/src/app/api/community/events/route.ts)
- [`apps/web/src/app/api/community/funnel.csv/route.ts`](../../apps/web/src/app/api/community/funnel.csv/route.ts)
- [`apps/web/src/components/sections/rubriques/community/use-community-events.ts`](../../apps/web/src/components/sections/rubriques/community/use-community-events.ts)
- [`apps/web/src/components/sections/rubriques/community/use-community-highlights.ts`](../../apps/web/src/components/sections/rubriques/community/use-community-highlights.ts)

Problèmes observés:

- liste consultée fréquemment;
- combinée avec RSVP et profil organisateur;
- utilisée dans des écrans d’information, pas dans un flux critique temps réel.

Fréquence actuelle estimée:

- à chaque visite des pages ou composants qui affichent les événements.

Fréquence recommandée:

- cache privé court ou snapshot quotidien;
- POST live, GET servi depuis une couche cache.

### `actions`

Fichiers concernés:

- [`apps/web/src/components/sections/rubriques/homepage-stats-widget.tsx`](../../apps/web/src/components/sections/rubriques/homepage-stats-widget.tsx)
- [`apps/web/src/components/sections/rubriques/actors-section.tsx`](../../apps/web/src/components/sections/rubriques/actors-section.tsx)
- [`apps/web/src/components/dashboard/business-alerts-panel.tsx`](../../apps/web/src/components/dashboard/business-alerts-panel.tsx)
- [`apps/web/src/components/sections/rubriques/recycling-section.tsx`](../../apps/web/src/components/sections/rubriques/recycling-section.tsx)
- [`apps/web/src/components/sections/rubriques/use-trash-spotter.ts`](../../apps/web/src/components/sections/rubriques/use-trash-spotter.ts)
- [`apps/web/src/components/actions/map-feed/use-map-feed-data.ts`](../../apps/web/src/components/actions/map-feed/use-map-feed-data.ts)
- [`apps/web/src/app/(app)/dashboard/page.tsx`](../../apps/web/src/app/(app)/dashboard/page.tsx)
- [`apps/web/src/app/(app)/reports/page.tsx`](../../apps/web/src/app/(app)/reports/page.tsx)
- [`apps/web/src/app/(app)/pilotage/page.tsx`](../../apps/web/src/app/(app)/pilotage/page.tsx)

Problèmes observés:

- agrégats et listes d’actions montés sur plusieurs surfaces;
- la même base sert au dashboard, aux rapports, à la cartographie et aux widgets publics;
- certaines vues lisent trop large pour une simple synthèse.

Fréquence actuelle estimée:

- élevée sur le public;
- élevée sur les dashboards;
- faible justifierait déjà mieux un snapshot que du live pur.

Fréquence recommandée:

- quotidien pour les synthèses;
- live uniquement pour la création, la modération et les écrans d’édition.

Solution recommandée:

- matérialiser les agrégats;
- garder les flux d’écriture live;
- séparer les listes d’édition et les cartes publiques.

### `spots` et `trash_spotter_spots`

Fichiers concernés:

- [`apps/web/src/lib/gamification/badges/listing.ts`](../../apps/web/src/lib/gamification/badges/listing.ts)
- [`apps/web/src/components/sections/rubriques/use-trash-spotter.ts`](../../apps/web/src/components/sections/rubriques/use-trash-spotter.ts)

Problèmes observés:

- lectures non bornées détectées;
- zone cartographique à risque de surcharge;
- usage consultatif, pas critique en temps réel.

Fréquence actuelle estimée:

- au montage des vues et lors des filtres.

Fréquence recommandée:

- quotidien ou hebdomadaire selon la fraîcheur utile;
- jamais une table entière sur un écran carte.

Solution recommandée:

- filtrer par viewport, zone ou plage;
- réutiliser des couches simplifiées;
- garder une limite stricte.

### `points_ledger` et la gamification dérivée

Fichiers concernés:

- [`apps/web/src/app/api/gamification/analytics/points/route.ts`](../../apps/web/src/app/api/gamification/analytics/points/route.ts)
- [`apps/web/src/lib/gamification/counters.ts`](../../apps/web/src/lib/gamification/counters.ts)
- [`apps/web/src/lib/gamification/progression-data.ts`](../../apps/web/src/lib/gamification/progression-data.ts)

Problèmes observés:

- lecture utile pour l’analytics, mais coûteuse si refaite souvent;
- la valeur produit vient de l’agrégation, pas du ledger brut.

Fréquence actuelle estimée:

- répétée dans les dashboards et les routes analytics.

Fréquence recommandée:

- quotidien pour les KPIs;
- hebdomadaire pour les historiques plus larges.

Solution recommandée:

- passer par des RPC / agrégats;
- éviter le recalcul complet du ledger à chaque visite.

## Hotspots côté rendu page et composants client

### Pages serveur à priorité haute

Ces pages recalculent encore des agrégats au rendu:

- [`apps/web/src/app/(app)/dashboard/page.tsx`](../../apps/web/src/app/(app)/dashboard/page.tsx)
- [`apps/web/src/app/(app)/reports/page.tsx`](../../apps/web/src/app/(app)/reports/page.tsx)
- [`apps/web/src/app/(app)/pilotage/page.tsx`](../../apps/web/src/app/(app)/pilotage/page.tsx)
- [`apps/web/src/app/(app)/sponsor-portal/page.tsx`](../../apps/web/src/app/(app)/sponsor-portal/page.tsx)
- [`apps/web/src/app/(app)/prints/report/page.tsx`](../../apps/web/src/app/(app)/prints/report/page.tsx)
- [`apps/web/src/app/(app)/admin/page.tsx`](../../apps/web/src/app/(app)/admin/page.tsx)

Stratégie recommandée:

- découper shell UI et données;
- servir un snapshot ou un payload matérialisé;
- ne garder que les writes en live;
- éviter les recomputations de plusieurs tables à chaque visite.

### Hooks client qui refetchent trop

Priorité de revue:

- [`apps/web/src/components/sections/rubriques/use-weather-data.ts`](../../apps/web/src/components/sections/rubriques/use-weather-data.ts)
- [`apps/web/src/components/chat/hooks/use-chat-data.ts`](../../apps/web/src/components/chat/hooks/use-chat-data.ts)
- [`apps/web/src/components/actions/map-feed/use-map-feed-data.ts`](../../apps/web/src/components/actions/map-feed/use-map-feed-data.ts)
- [`apps/web/src/components/sections/rubriques/community/use-community-events.ts`](../../apps/web/src/components/sections/rubriques/community/use-community-events.ts)
- [`apps/web/src/components/sections/rubriques/community/use-community-highlights.ts`](../../apps/web/src/components/sections/rubriques/community/use-community-highlights.ts)
- [`apps/web/src/components/sections/rubriques/recycling-section.tsx`](../../apps/web/src/components/sections/rubriques/recycling-section.tsx)
- [`apps/web/src/components/dashboard/business-alerts-panel.tsx`](../../apps/web/src/components/dashboard/business-alerts-panel.tsx)
- [`apps/web/src/components/sections/rubriques/elus-section.tsx`](../../apps/web/src/components/sections/rubriques/elus-section.tsx)
- [`apps/web/src/components/sections/rubriques/homepage-stats-widget.tsx`](../../apps/web/src/components/sections/rubriques/homepage-stats-widget.tsx)
- [`apps/web/src/components/sections/rubriques/actors-section.tsx`](../../apps/web/src/components/sections/rubriques/actors-section.tsx)
- [`apps/web/src/components/sections/rubriques/use-trash-spotter.ts`](../../apps/web/src/components/sections/rubriques/use-trash-spotter.ts)
- [`apps/web/src/components/sections/rubriques/use-kit-data.ts`](../../apps/web/src/components/sections/rubriques/use-kit-data.ts)
- [`apps/web/src/components/sections/rubriques/guide-section.tsx`](../../apps/web/src/components/sections/rubriques/guide-section.tsx)

Patterns à surveiller:

- `useSWR` sans cache adapté;
- `refreshInterval` trop agressif;
- `cache: "no-store"` sur des données qui pourraient être servies depuis un cache;
- `fetch()` au montage sans besoin produit clair;
- `mutate()` appelé comme un refresh systématique plutôt que comme une invalidation après write.

## Données totalement statiques

Ces données ne devraient pas revenir de Supabase:

- méthodologies;
- textes de documentation;
- constantes métier;
- référentiels de territoire;
- contenus pédagogiques;
- tables de seed ou de configuration qui changent rarement.

Exemples de traitement recommandé:

- Markdown versionné;
- JSON généré;
- module TypeScript statique;
- ISR si la page publique doit rester serviable sans live data.

## Plan de correction progressif

### Phase 1

Réduire le coût des vues à fort trafic, sans effet visible:

- dashboard;
- reports;
- admin;
- pilotage;
- sponsor portal;
- print report.

### Phase 2

Remplacer les listes ou agrégats publics par des snapshots:

- homepage stats;
- business alerts;
- community highlights;
- recycling;
- map feed;
- funnel / analytics.

### Phase 3

Nettoyer les tables centrales mais mal bornées:

- `profiles`;
- `event_rsvps`;
- `action_participants`;
- `community_events`.

### Phase 4

Passer les données de supervision en refresh planifié:

- storage usage;
- free plan services;
- environmental impact;
- codex usage;
- governance reports.

## Règles de travail à réutiliser

- ne pas charger une table entière pour une vue;
- déplacer le filtre dans la base;
- garder les colonnes sélectionnées minimales;
- préférer un snapshot ou un cache si la donnée n’est pas critique;
- garder les mutations live;
- ne pas artificiellement simplifier une table pour faire baisser les warnings;
- conserver une table centrale si son usage est légitime, mais borner ses requêtes.
