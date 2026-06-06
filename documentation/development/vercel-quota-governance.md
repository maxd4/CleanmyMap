# Gouvernance des quotas Vercel de CleanMyMap

Dernière vérification: 2026-06-05

Objectif: repérer tôt les régressions de coût Vercel avant qu'une fonctionnalité ne fasse grimper les quotas sans alerte.

Ce guide se concentre sur les surfaces Vercel que CleanMyMap utilise réellement:
- `Invocations`
- `Edge Requests`
- `Fast Origin Transfer`
- `Fluid Memory` / mémoire provisionnée des fonctions
- `Fast Data Transfer`

## Ce que mesure chaque quota

| Quota | Ce que Vercel mesure | Pourquoi cela compte dans CleanMyMap |
| --- | --- | --- |
| `Invocations` | Le nombre d'exécutions de fonctions Vercel | Toute route API, page dynamique, export ou cron ajoute des exécutions. |
| `Edge Requests` | Les requêtes traitées par le CDN / l'edge | Chaque visite ou appel vers Vercel passe par l'edge, même si la réponse est ensuite cachée. |
| `Fast Origin Transfer` | Les données transférées entre l'edge et l'origine compute | Les réponses JSON/CSV lourdes, les pages SSR fréquentes et les revalidations augmentent vite ce volume. |
| `Fluid Memory` | La mémoire provisionnée pendant l'exécution d'une fonction | Les routes qui chargent beaucoup de données ou gardent une réponse longue vivent plus longtemps et consomment plus. |
| `Fast Data Transfer` | Les octets transférés entre l'edge et le visiteur | Les bundles client lourds, les gros assets et les exports téléchargeables font monter ce compteur. |

Les définitions ci-dessus suivent la logique documentée par Vercel au 2026-06-05:
- [Vercel Pricing](https://vercel.com/pricing)
- [Calculating usage of resources](https://vercel.com/docs/pricing/how-does-vercel-calculate-usage-of-resources)
- [CDN pricing and usage](https://vercel.com/docs/manage-cdn-usage)
- [Monitoring Reference](https://vercel.com/docs/query/monitoring/monitoring-reference)

## Mécanismes qui font grimper les quotas

### Rendu dynamique et cache faible

Les pages ou routes marquées `force-dynamic`, `revalidate = 0` ou des fetchs `cache: "no-store"` se rapprochent d'un comportement "tout passe par l'origine".

Effets typiques:
- plus d'invocations,
- plus de requêtes edge,
- plus de transfert origine,
- plus de mémoire provisionnée si le rendu agrège beaucoup de données.

### Routes API fréquentes

Les route handlers sont des fonctions Vercel. Chaque hit compte, même si la route ne fait qu'assembler des données ou proxyfier un service tiers.

Effets typiques:
- invocation à chaque appel,
- transfert origine si la réponse est volumineuse,
- consommation mémoire plus élevée si la route charge plusieurs sources en parallèle.

### Exports et téléchargements

Les exports CSV, JSON ou PDF sont très sensibles au volume:
- la réponse est souvent plus grosse qu'un affichage UI,
- les téléchargements répétés augmentent le `Fast Data Transfer`,
- les exports admin peuvent déclencher des agrégations coûteuses côté serveur.

### Crons et tâches planifiées

Un cron Vercel compte même sans utilisateur connecté. Si la tâche appelle une route lourde, le coût devient invisible côté produit mais réel côté quota.

### Bundles client et composants dynamiques

Les composants chargés en `dynamic(..., { ssr: false })` protègent parfois le SSR, mais ils déplacent le coût vers:
- la taille du bundle,
- le temps d'hydratation,
- le `Fast Data Transfer`.

## Exemples concrets dans CleanMyMap

| Fichier | Pourquoi c'est sensible | Lecture pratique |
| --- | --- | --- |
| [apps/web/src/app/page.tsx](../../apps/web/src/app/page.tsx) | `dynamic = "force-dynamic"` et `revalidate = 0` rendent la page d'accueil entièrement dynamique. | Toute visite passe par du rendu server-side et ne profite pas d'un cache durable. |
| [apps/web/src/app/(app)/reports/page.tsx](../../apps/web/src/app/(app)/reports/page.tsx) | La page agrège Supabase + météo externe avec `cache: "no-store"`. | Chaque rendu déclenche des lectures serveur et une requête externe non cachée. |
| [apps/web/src/app/api/actions/map/route.ts](../../apps/web/src/app/api/actions/map/route.ts) | Route dynamique qui retourne jusqu'à 300 éléments filtrés pour la carte. | Les rafraîchissements fréquents de la carte augmentent les invocations et le transfert origine. |
| [apps/web/src/app/api/actions/[actionId]/group-join/route.ts](../../apps/web/src/app/api/actions/[actionId]/group-join/route.ts) | Route dynamique de rapprochement d'actions groupées. | Chaque adhésion ou synchronisation déclenche une exécution serveur supplémentaire. |
| [apps/web/src/app/api/actions/route.ts](../../apps/web/src/app/api/actions/route.ts) | GET dynamique pour la vue liste + POST de création avec rate limit. | C'est une surface de forte activité: lecture, écriture et déclencheurs d'événements. |
| [apps/web/src/app/api/reports/actions.csv/route.ts](../../apps/web/src/app/api/reports/actions.csv/route.ts) | Export CSV admin avec payload potentiellement lourd. | Chaque téléchargement ajoute du `Fast Data Transfer` et peut consommer de la mémoire serveur. |
| [apps/web/src/app/api/reports/actions.json/route.ts](../../apps/web/src/app/api/reports/actions.json/route.ts) | Export JSON admin avec réponse sérialisée complète. | Le format JSON est pratique mais coûteux si les filtres et les bornes ne restent pas serrés. |
| [apps/web/src/app/api/geo/address-suggestions/route.ts](../../apps/web/src/app/api/geo/address-suggestions/route.ts) | Appel de géocodage à la demande pendant la saisie. | Les appels répétitifs sur la frappe peuvent produire beaucoup d'invocations très courtes. |
| [apps/web/src/app/api/geo/reverse-location/route.ts](../../apps/web/src/app/api/geo/reverse-location/route.ts) | Reverse geocoding au clic / déplacement de carte. | Très utile UX, mais sensible au volume de clics et de drag sur la carte. |
| [apps/web/src/app/api/documentation/[slug]/route.ts](../../apps/web/src/app/api/documentation/[slug]/route.ts) | Téléchargement de documents Markdown avec cache CDN. | Les fichiers restent statiques, donc le cache Vercel absorbe la majorité des téléchargements et réduit l’origine. |
| [apps/web/src/app/api/gamification/analytics/funnel/route.ts](../../apps/web/src/app/api/gamification/analytics/funnel/route.ts) | Route analytique avec `revalidate = 300`. | Coût plus contrôlé qu'un `no-store`, mais toujours à surveiller si le trafic grimpe. |
| [apps/web/src/lib/gamification/badges/badge-list-client.ts](../../apps/web/src/lib/gamification/badges/badge-list-client.ts) | Client de badges qui fetch `/api/gamification/badges/list` en `cache: "no-store"`. | La liste est simple, mais l'appel côté client ajoute des hits Vercel répétés si la page se recharge souvent. |
| [apps/web/vercel.json](../../apps/web/vercel.json) | Deux crons Vercel appellent `/api/cron/storage-usage` et `/api/cron/environmental-impact`. | Chaque exécution planifiée crée des invocations sans trafic utilisateur. |

## Garde-fous mis en place

Le dépôt inclut maintenant un audit statique dédié:

- script: `scripts/audit-vercel-quota.mjs`
- baseline: `scripts/vercel-quota-audit-baseline.json`
- commande: `npm run audit:vercel-quota`
- audit par route: `documentation/development/vercel-route-cost-audit.md`

Ce script:
- inventorie les routes API et pages dynamiques,
- signale les fetchs `no-store`,
- repère les fetchs externes directs,
- remonte les exports CSV / JSON,
- relit les crons présents dans `apps/web/vercel.json`,
- compare le résultat au baseline pour détecter les nouveaux hotspots.

Si un changement volontaire augmente le coût attendu, il faut:
1. documenter la raison,
2. mesurer le nouveau profil,
3. mettre à jour le baseline avec `npm run audit:vercel-quota -- --write-baseline`.

## Checklist avant merge

- aucune nouvelle page ou route dynamique sans justification de coût,
- aucun `cache: "no-store"` ajouté sans besoin produit réel,
- aucun export CSV / JSON lourd sans borne stricte et sans garde-fou d'accès,
- aucun cron ajouté sans propriétaire clair et sans estimation du volume mensuel,
- aucun gros bundle client ajouté sans revue de l'impact `Fast Data Transfer`,
- tout changement de quota dispose d'un point de contact de suivi.

## Règle simple

Si une fonctionnalité ne peut pas expliquer quel quota elle augmente, elle n'est pas encore assez cadrée.

## Commandes d'audit

- `npm run audit:vercel:api-routes`
- `npm run audit:vercel:dynamic-pages`
- `npm run audit:vercel:force-dynamic`
- `npm run audit:vercel:revalidate-zero`
- `npm run audit:vercel:no-store`
- `npm run audit:vercel:cookies`
- `npm run audit:vercel:headers`
- `npm run audit:vercel:auth`
- `npm run audit:vercel:heavy-imports`
- `npm run audit:vercel:polling`
- `npm run report:vercel-surface`

Ces commandes s’appuient sur [`scripts/vercel-audit-core.mjs`](../../scripts/vercel-audit-core.mjs), [`scripts/generate-vercel-surface-report.mjs`](../../scripts/generate-vercel-surface-report.mjs) et la baseline [`scripts/vercel-api-routes-baseline.json`](../../scripts/vercel-api-routes-baseline.json).
