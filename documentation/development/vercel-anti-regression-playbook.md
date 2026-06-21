# Playbook anti-régression Vercel

Dernière mise à jour: 2026-06-12

Ce guide rassemble les erreurs de développement qui ont déjà fait monter le risque `Invocations`, `Edge Requests` ou `Origin Transfer` sur CleanMyMap, puis les patterns sûrs à réutiliser pour éviter de les reproduire.

Le but n'est pas d'interdire toute dynamique. Le but est de rendre chaque exception explicite, mesurée et testée.

## Erreurs à ne pas reproduire

| Erreur | Pourquoi c'est risqué | Pattern sûr |
| --- | --- | --- |
| Marquer une page publique `force-dynamic` sans nécessité | Chaque visite repasse par l'origine et augmente les `Invocations`. | Préférer `revalidate` quand le contenu peut être rafraîchi périodiquement. |
| Poser `revalidate = 0` par défaut | Le cache devient inutile et les pages statiques se comportent comme du SSR permanent. | Utiliser une fenêtre ISR réaliste, puis documenter le besoin de fraîcheur. |
| Ajouter `cache: "no-store"` sur un fetch par habitude | Le navigateur et Vercel ne peuvent plus amortir la charge. | Garder `no-store` seulement pour les données réellement instantanées ou privées. |
| Lire `headers()` dans une page alors qu'une simple variable d'environnement suffit | La page devient plus difficile à cacher et à optimiser. | Isoler la lecture d'en-têtes dans les helpers d'auth ou supprimer le besoin. |
| Poller toutes les 60 secondes sans distinction d'état | Le coût reste constant même quand l'utilisateur ne regarde pas le composant. | Adapter l'intervalle, couper quand l'onglet est caché et réduire la cadence quand le panneau est fermé. |
| Lancer des fetchs indépendants en série | La latence et la durée de vie des fonctions augmentent inutilement. | Démarrer les requêtes en parallèle avec `Promise.all` ou une promesse partagée. |
| Appeler des APIs externes à chaque rendu sans cache local | Le trafic sortant et les revalidations se cumulent vite. | Ajouter une revalidation ou un cache contrôlé quand la donnée n'a pas besoin d'être parfaite à la milliseconde. |
| Ajouter un import lourd dans une surface très fréquentée | Le bundle et l'hydratation gonflent, ce qui augmente le transfert client. | Isoler la dépendance dans un sous-composant ou un import dynamique ciblé. |
| Charger PostHog ou un tracker de pageviews avant le consentement analytique | Le site paie du JavaScript et des requêtes pour des visiteurs qui n'ont rien accepté. | Garder l'analytics derrière le même garde-fou de consentement et ne monter le tracker qu'après accord. |
| Monter une carte Leaflet dès le rendu initial alors qu'elle n'est pas visible | Le chunk carto et ses dépendances partent trop tôt, même si l'utilisateur ne scroll pas jusque-là. | Déclencher le chargement au moment où la zone entre dans le viewport utile. |

## Erreurs déjà corrigées dans CleanMyMap

### Page d'accueil

La page d'accueil était passée en rendu totalement dynamique. Elle a été ramenée à de l'ISR:

- [apps/web/src/app/page.tsx](../../apps/web/src/app/page.tsx)

Pattern retenu:
- `revalidate = 300`
- génération périodique au lieu d'un `force-dynamic` permanent

### Page méthodologie

La page méthodologie combinait plusieurs chargements serveur et un marquage dynamique inutile. Elle a été simplifiée:

- [apps/web/src/app/(app)/methodologie/page.tsx](../../apps/web/src/app/(app)/methodologie/page.tsx)

Pattern retenu:
- `revalidate = 3600`
- chargements lancés en parallèle
- surface publique conservée, mais plus cacheable

### Onboarding

La page onboarding n'avait pas besoin de lire les en-têtes au niveau page pour décider du mode local:

- [apps/web/src/app/onboarding/page.tsx](../../apps/web/src/app/onboarding/page.tsx)

Pattern retenu:
- utiliser `process.env.NODE_ENV !== "production"` pour les branches locales simples
- réserver `headers()` aux helpers qui en ont vraiment besoin

### Badges et notifications

Deux points de polling ont été allégés:

- [apps/web/src/app/api/gamification/badges/list/route.ts](../../apps/web/src/app/api/gamification/badges/list/route.ts)
- [apps/web/src/lib/gamification/badges/badge-list-client.ts](../../apps/web/src/lib/gamification/badges/badge-list-client.ts)
- [apps/web/src/components/navigation/notification-bell.tsx](../../apps/web/src/components/navigation/notification-bell.tsx)

Pattern retenu:
- cache HTTP court côté route
- suppression du `no-store` côté client quand le besoin ne l'impose pas
- polling adaptatif et suspendu quand l'onglet est caché

### Analytics consenties

Le tracker de pageviews et les charges analytics associées doivent rester derrière le consentement:

- [apps/web/src/components/ui/conditional-analytics.tsx](../../apps/web/src/components/ui/conditional-analytics.tsx)
- [apps/web/src/components/analytics/project-pageview-tracker.tsx](../../apps/web/src/components/analytics/project-pageview-tracker.tsx)

Pattern retenu:
- ne pas charger le tracker tant que le consentement analytique n'est pas donné,
- éviter d'envoyer des pageviews pour des visiteurs qui ont refusé l'analytics,
- conserver la logique de consentement dans un seul point d'entrée.

### Cartes Leaflet

Les cartes lourdes ne doivent pas être chargées au montage si leur zone n'est pas encore visible:

- [apps/web/src/components/sections/rubriques/annuaire-sidebar.tsx](../../apps/web/src/components/sections/rubriques/annuaire-sidebar.tsx)
- [apps/web/src/components/sections/rubriques/annuaire-exploration-view.tsx](../../apps/web/src/components/sections/rubriques/annuaire-exploration-view.tsx)
- [apps/web/src/components/sections/rubriques/compost-section.tsx](../../apps/web/src/components/sections/rubriques/compost-section.tsx)
- [apps/web/src/components/actions/map-feed/actions-map-feed.tsx](../../apps/web/src/components/actions/map-feed/actions-map-feed.tsx)

Pattern retenu:
- attendre que la zone passe dans le viewport utile avant de lancer le chunk Leaflet,
- garder un placeholder léger tant que la carte n'est pas nécessaire,
- réserver le bundle cartographie aux interactions réellement visibles.

### Métadonnées GitHub

Les stats GitHub de la page méthodologie sont maintenant lues avec une logique cacheable et regroupée:

- [apps/web/src/lib/github/github-repository-stats.ts](../../apps/web/src/lib/github/github-repository-stats.ts)

Pattern retenu:
- fetchs parallèles
- revalidation côté fetch quand la donnée peut vivre un certain temps

## Règles de développement à appliquer

- Si une page peut être statique ou ISR, elle ne doit pas être dynamique par défaut.
- Si un fetch peut être caché, il doit l'être jusqu'à preuve contraire.
- Si une donnée change souvent, il faut expliquer la fréquence et la granularité attendues.
- Si un polling reste nécessaire, il doit être borné, visible dans le code et documenté.
- Si une route API est ajoutée, elle doit justifier son runtime, sa fréquence et sa taille de réponse.
- Si une route API protège déjà ses droits d'accès dans son handler, ne l'ajouter au middleware que si le middleware apporte une vraie valeur supplémentaire.
- Le middleware Clerk doit rester concentré sur les pages réellement protégées et sur le proxy Clerk, pas sur les API déjà gardées au niveau route.
- Si un composant client devient lourd, le coût doit être isolé dans le plus petit sous-arbre possible.

## Comment écrire une exception volontaire

Quand un comportement coûteux est volontaire, écrire juste au-dessus du code une justification courte qui mentionne:
- le besoin produit,
- le quota Vercel impacté,
- la raison pour laquelle le cache ou l'ISR ne conviennent pas.

Exemples acceptables:

- "Polling intentional for unread notifications, but the cadence is reduced to protect Invocations."
- "The landing page can be regenerated periodically while still showing fresh counters."

## Ce qu'il faut relire avant une PR

- [Checklist Performance & Quotas Vercel](./performance-quotas-vercel-checklist.md)
- [Gouvernance des quotas Vercel](./vercel-quota-governance.md)
- [Stratégie de répartition Vercel, Supabase et navigateur](./vercel-supabase-browser-strategy.md)
- [Audit des routes les plus coûteuses](./vercel-route-cost-audit.md)
- [Rapport automatique des surfaces Vercel](./vercel-surface-report.md)

## Commandes utiles

- `npm run audit:vercel:api-routes`
- `npm run audit:vercel:dynamic-pages`
- `npm run audit:vercel:force-dynamic`
- `npm run audit:vercel:no-store`
- `npm run audit:vercel:headers`
- `npm run audit:vercel:auth`
- `npm run audit:vercel:heavy-imports`
- `npm run audit:vercel:polling`
- `npm run report:vercel-surface`

## Règle simple

Si une future fonctionnalité augmente un quota, elle doit dire lequel, pourquoi, et comment elle est bornée.
