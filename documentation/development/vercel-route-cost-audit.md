# Audit des routes les plus coûteuses de CleanMyMap

Dernière vérification: 2026-07-13

Ce document liste les routes qui concentrent le plus de coût potentiel sur Vercel.
Il complète [la gouvernance Vercel](./vercel-quota-governance.md) avec une lecture route par route.
Il reprend aussi la synthèse opérationnelle utile de l'ancien backlog Vercel, désormais archivé.

Méthode:
- croisement du code runtime,
- lecture des routes marquées dynamiques ou `no-store`,
- repérage des exports, crons et fetchs externes,
- priorité donnée aux routes qui chargent beaucoup de données ou qui sont appelées souvent.

## Routes les plus coûteuses

| Route | Pourquoi elle existe | Données chargées | Impact potentiel sur Vercel |
| --- | --- | --- | --- |
| [`/`](../../apps/web/src/app/page.tsx) | Accueil public et point d'entrée du produit. | Contenu d'accueil, navigation, données de pilotage utilisées par la home. | Page en ISR avec `revalidate = 300`: chaque visite ne consomme plus une exécution serveur permanente, mais la génération périodique reste un coût à surveiller. |
| [`/reports`](../../apps/web/src/app/(app)/reports/page.tsx) | Vue d'impact et de synthèse pour le pilotage. | Supabase (`loadPilotageOverview`, `fetchUnifiedActionContracts`, `loadCachedReportCommunityEvents`) et météo externe. | Plusieurs sources chargées en parallèle + météo en `revalidate = 900`: coût élevé en invocations et en transfert origine, mais sans `no-store` sur le flux météo. |
| [`/api/actions`](../../apps/web/src/app/api/actions/route.ts) | Liste publique/privée des actions et création d'actions. | Contrats d'actions unifiés, filtres de statut, coordonnées, métadonnées et écriture action/spot; le GET n'expanse plus les contrats au-delà de `2x` le `limit` demandé. | Route très fréquentée, `dynamic = "force-dynamic"`, lecture + écriture, risque élevé sur `Invocations` et `Fast Origin Transfer`. |
| Carte des actions (`actions_map_feed`) | Alimente la carte des actions sans passer par une route Vercel dédiée. | Vue bornée par viewport, filtres de période, d'impact et de qualité appliqués côté client, avec lecture directe Supabase. | Le risque se déplace vers Supabase et le bundle client, mais on supprime les invocations Vercel du proxy carte. |
| [`/api/actions/[actionId]/group-join`](../../apps/web/src/app/api/actions/[actionId]/group-join/route.ts) | Active ou désactive le formulaire de groupe pour une action donnée. | Action cible, métadonnées de notes, organisateurs, état d'approbation. | Route dynamique avec lecture + écriture Supabase; chaque interaction déclenche une exécution serveur. |
| [`/api/actions/group-join`](../../apps/web/src/app/api/actions/group-join/route.ts) | Liste et jonction des actions groupées. | Actions rejoignables, contexte utilisateur, écriture d'adhésion et recalcul de progression. | Appelée à la navigation et à l'action utilisateur; le POST ajoute de la charge calcul + écriture. |
| [`/api/reports/actions.csv`](../../apps/web/src/app/api/reports/actions.csv/route.ts) | Export admin des actions au format CSV. | Contrats d'actions filtrés, géométrie, notes, métadonnées et colonnes d'export. | Génère encore un gros payload téléchargeable, mais la route sert maintenant un artefact cache-first avec redirection signée quand le fichier existe déjà. |
| [`/api/reports/actions.json`](../../apps/web/src/app/api/reports/actions.json/route.ts) | Export admin des actions au format JSON. | Même base de données que le CSV, avec enveloppe JSON enrichie. | Très coûteux si les bornes de requête augmentent, mais le cache court et l'artefact pré-généré réduisent les reconstructions répétées. |
| [`/api/route/recommend`](../../apps/web/src/app/api/route/recommend/route.ts) | Propose un itinéraire d'actions optimisé selon des contraintes terrain. | Contrats d'actions, pression événementielle, préférence de localisation, scoring et calcul de distance. | POST lourd: charge plusieurs sources et calcule un itinéraire; sensible à la taille des résultats et à la fréquence d'usage. |
| [`/api/pilotage/overview`](../../apps/web/src/app/api/pilotage/overview/route.ts) | Donne une vue de pilotage consolidée. | Vue d'ensemble pilotage avec fenêtre temporelle et plafond de résultats. | Route de synthèse potentiellement coûteuse si `days` ou `limit` augmentent: lectures larges et agrégations côté serveur. |
| [`/api/geo/address-suggestions`](../../apps/web/src/app/api/geo/address-suggestions/route.ts) | Suggestions d'adresse pendant la saisie. | Index local Greater Paris puis géocodage externe Geoplateforme si nécessaire. | Très bon UX, mais sensible aux frappes répétées: beaucoup de petites invocations et trafic sortant externe. |
| [`/api/geo/reverse-location`](../../apps/web/src/app/api/geo/reverse-location/route.ts) | Résolution inverse au clic sur la carte. | Coordonnées lat/lon + géocodage inverse Geoplateforme. | Peut générer beaucoup d'appels courts si l'utilisateur déplace souvent le marqueur ou la carte. |
| [`/api/gamification/analytics/funnel`](../../apps/web/src/app/api/gamification/analytics/funnel/route.ts) | Mesure la conversion de la gamification. | `user_points` avec plusieurs filtres et agrégats de comptage. | `revalidate = 300` limite la dérive, mais la route reste sensible aux dashboards fréquents. |
| [`/api/gamification/badges/list`](../../apps/web/src/app/api/gamification/badges/list/route.ts) | Charge l'état des badges pour l'utilisateur connecté. | Badges utilisateur + progression via Supabase. | Le handler est simple, mais le client appelle la route en `no-store`: coût accentué par les rechargements fréquents. |
| [`/api/documentation/[slug]`](../../apps/web/src/app/api/documentation/[slug]/route.ts) | Sert quelques documents Markdown de référence en téléchargement. | Fichiers Markdown du dossier `documentation/plans`. | Route désormais cacheable côté CDN (`s-maxage=86400`): beaucoup moins d'allers-retours vers l'origine pour des fichiers statiques. |
| Assets statiques de marque et textures | Remplacent les anciens handlers `brand/[...asset]` et `images/textures/[...asset]`. | SVG statiques sous `apps/web/public/brand/` et `apps/web/public/images/textures/`. | Zéro invocation serveur pour ces assets; le coût se limite au transfert CDN et au rendu client. |

## Lecture utile pour la revue de PR

Avant de modifier une route de cette liste, vérifier:
- si le besoin impose vraiment une exécution serveur à chaque hit,
- si la taille de réponse est bornée,
- si une page ou un cache pourrait absorber une partie du trafic,
- si la documentation de route doit être mise à jour avec la nouvelle charge.

## Routes à surveiller en second plan

Ces routes ne sont pas forcément les plus lourdes individuellement, mais elles peuvent monter rapidement si leur fréquence augmente:
- `/api/health`
- `/api/uptime`
- `/api/cron/storage-usage`
- `/api/partners/onboarding-requests`
- `/api/community/events`
- `/api/sandbox/runbook-checks`
- `/api/services`

## Déclencheurs invisibles à relier à ces routes

Même sans visite humaine, plusieurs surfaces du dépôt peuvent générer des hits récurrents:

- `apps/web/src/app/api/health/route.ts` effectue une lecture Supabase à chaque appel de supervision;
- `apps/web/src/app/api/uptime/route.ts` est une cible de healthcheck légère mais régulière;
- `apps/web/vercel.json` planifie le cron `/api/cron/storage-usage`, donc un coût existe même sans utilisateur;
- `apps/web/src/components/navigation/notification-bell.tsx` relance le chargement des notifications toutes les 2 ou 10 minutes;
- `apps/web/src/lib/swr-config.ts` garde certains écrans vivants avec `refreshInterval: 120_000`;
- `apps/web/src/components/sections/rubriques/elus-section.tsx` rafraîchit le dashboard de pilotage toutes les 10 minutes;
- `apps/web/src/components/actions/map-feed/use-actions-map-viewport.ts` déclenche un fallback réseau au montage;
- `apps/web/proxy.ts` reste comptabilisé dès qu'une route protégée est touchée par un robot ou un monitor.

Mesures de réduction du bruit déjà en place:

- les endpoints de supervision (`/api/health`, `/api/uptime`) sont maintenant cacheables par le CDN;
- le centre de notifications rafraîchit moins souvent quand il est fermé;
- le refresh du dashboard de pilotage est plus espacé;
- les cadences SWR des feeds les plus visibles ont été allongées.

## Mise à jour

Régénérer cette lecture après:
- l'ajout d'une route API importante,
- une nouvelle page dynamique,
- une modification des limites de pagination,
- une modification du cache ou d'un export.
