# Guide Codex pour développer sans gonfler les quotas Vercel

Dernière mise à jour: 2026-06-12

Objectif: aider Codex à livrer une fonctionnalité utile sans ajouter inutilement des `Invocations`, des `Edge Requests` ou du `Fast Origin Transfer`.

La règle de base de CleanMyMap reste la même:
- Vercel sert l'interface, le cache et les gardes d'accès.
- Supabase garde les données, les agrégats et les écritures persistantes.
- Le navigateur garde l'état local, personnel ou éphémère.

## Ce que Vercel coûte vraiment

Avant de coder, identifier le quota le plus susceptible de bouger.

- `Invocations`: monte quand on ajoute une route API, une page dynamique, un cron ou un export serveur.
- `Edge Requests`: monte quand une requête passe par le middleware, Clerk ou une couche de protection globale.
- `Fast Origin Transfer`: monte quand les réponses deviennent lourdes, quand le cache disparaît, ou quand une page serveur renvoie trop de données.
- `Fluid Memory`: monte quand une fonction charge beaucoup de données ou reste vivante plus longtemps que nécessaire.
- `Fast Data Transfer`: monte quand le bundle client grossit, quand on ajoute une dépendance lourde ou quand on livre beaucoup d'octets au navigateur.

## Bonnes pratiques Next.js

### Garder le server component par défaut

En App Router, le bon réflexe est de laisser la page en Server Component tant que le besoin ne justifie pas un client component.

À faire:
- récupérer les données côté serveur quand la donnée est partagée,
- transmettre seulement les props utiles au client,
- isoler les widgets interactifs dans le plus petit sous-arbre possible.

À éviter:
- basculer toute une page en client component pour un simple état local,
- multiplier les appels serveur depuis plusieurs composants clients,
- importer des bibliothèques lourdes dans le shell principal.

Exemples utiles dans le repo:
- [apps/web/src/app/onboarding/page.tsx](../../apps/web/src/app/onboarding/page.tsx)
- [apps/web/src/app/(app)/reports/page.tsx](../../apps/web/src/app/(app)/reports/page.tsx)
- [apps/web/src/components/gamification/ExplorerBadgeWrapper.tsx](../../apps/web/src/components/gamification/ExplorerBadgeWrapper.tsx)

### Réserver les surfaces dynamiques aux vrais besoins

`force-dynamic`, `revalidate = 0` et `cache: "no-store"` doivent rester exceptionnels.

Règle pratique:
- si la donnée peut tolérer une fenêtre de fraîcheur, préférer `revalidate`,
- si la donnée est stable, garder du cache ou du statique,
- si la donnée est personnelle mais non critique, la garder dans le navigateur.

À éviter:
- mettre `force-dynamic` "par défaut",
- utiliser `no-store` juste pour simplifier le debug,
- lire `headers()` ou `cookies()` dans une page publique sans nécessité.

## Cache et revalidate

Le cache est le premier levier anti-coût.

### Choisir le bon niveau

- contenu public et stable: cache fort ou ISR,
- contenu semi-frais: `revalidate` avec fenêtre bornée,
- contenu utilisateur ou volatile: client ou `no-store` si le serveur est réellement nécessaire.

### Règles simples

- préférer `revalidate` à `revalidate = 0` quand la fraîcheur n'a pas besoin d'être instantanée,
- éviter les fetchs séquentiels si les requêtes peuvent partir en parallèle,
- n'utiliser `no-store` que si le cache crée un bug fonctionnel ou de sécurité,
- documenter la raison juste au-dessus du code quand le cache est volontairement désactivé.

Exemples dans le repo:
- [apps/web/src/app/api/actions/pollution-score-references/route.ts](../../apps/web/src/app/api/actions/pollution-score-references/route.ts)
- [apps/web/src/app/api/reports/actions.csv/route.ts](../../apps/web/src/app/api/reports/actions.csv/route.ts)
- [apps/web/src/app/api/documentation/[slug]/route.ts](../../apps/web/src/app/api/documentation/[slug]/route.ts)

## Server Components

Les Server Components sont le bon endroit pour:
- la lecture de données partagées,
- les agrégats,
- les vérifications d'accès,
- la préparation de props stables.

Bon pattern:
- faire le fetch côté serveur,
- calculer le minimum utile,
- transmettre un objet léger à un composant client dédié à l'interaction.

Anti-pattern:
- fetch côté client + nouveau route handler + nouveau fetch server derrière,
- lecture répétée de la même donnée dans plusieurs sous-composants,
- passage d'objets massifs à l'hydratation.

Exemples:
- [apps/web/src/app/(app)/actions/history/page.tsx](../../apps/web/src/app/(app)/actions/history/page.tsx)
- [apps/web/src/lib/actions/http.ts](../../apps/web/src/lib/actions/http.ts) + RPC `actions_map_feed`

## Clerk

Clerk est une frontière de coût et de sécurité.

À retenir:
- `auth()` et `headers()` rendent souvent la surface plus dynamique,
- il faut les garder dans la plus petite couche possible,
- la protection globale ne doit pas devenir un traitement lourd sur toutes les requêtes.

Bonnes pratiques:
- préfèrer les helpers auth dédiés plutôt qu'un mélange de logique d'accès dans chaque page,
- garder le composant client mince quand seul l'état visuel change,
- éviter de faire passer une page publique en dynamique uniquement pour lire l'identité d'un utilisateur.

Exemples:
- [apps/web/src/lib/auth/safe-session.ts](../../apps/web/src/lib/auth/safe-session.ts)
- [apps/web/src/app/api/users/profile/handle/route.ts](../../apps/web/src/app/api/users/profile/handle/route.ts)
- [apps/web/src/app/api/account/display-mode/route.ts](../../apps/web/src/app/api/account/display-mode/route.ts)

## Supabase

Supabase doit absorber la charge data-centric.

Bonnes pratiques:
- sélectionner seulement les colonnes utiles,
- paginer ou borner les lectures,
- préférer les RPC et les agrégats quand plusieurs écrans consomment la même logique,
- utiliser le navigateur quand la donnée est personnelle et ne nécessite pas de contrôle serveur fort.

À éviter:
- créer une route Vercel intermédiaire pour un simple compteur,
- recalculer la même agrégation dans plusieurs handlers,
- transférer de grosses listes quand un résumé suffit.

Exemples:
- [apps/web/src/components/gamification/ExplorerBadgeWrapper.tsx](../../apps/web/src/components/gamification/ExplorerBadgeWrapper.tsx)
- [apps/web/src/lib/gamification/badges/listing.ts](../../apps/web/src/lib/gamification/badges/listing.ts)
- [apps/web/src/lib/supabase/server.ts](../../apps/web/src/lib/supabase/server.ts)

## Leaflet

Leaflet est une surface lourde côté bundle.

Règle:
- charger `react-leaflet` avec `next/dynamic` et `ssr: false`,
- isoler la carte dans un composant dédié,
- ne pas faire porter au shell de page le poids de toute la carte.

Bonnes pratiques:
- un wrapper client minuscule,
- des couches et marqueurs séparés,
- des fetchs bornés avant l'affichage,
- pas de logique navigateur dans le SSR.

Exemples:
- [apps/web/src/components/actions/actions-map-canvas.tsx](../../apps/web/src/components/actions/actions-map-canvas.tsx)
- [apps/web/src/components/sections/rubriques/annuaire-map-canvas.tsx](../../apps/web/src/components/sections/rubriques/annuaire-map-canvas.tsx)
- [apps/web/src/components/actions/map/map-layers.tsx](../../apps/web/src/components/actions/map/map-layers.tsx)

## Rapports PDF

Les rapports PDF sont souvent la surface la plus coûteuse pour `Fast Origin Transfer` et `Fluid Memory`.

À privilégier:
- génération côté navigateur si le PDF est simple,
- stockage dans Supabase Storage si le livrable doit être réutilisé,
- génération serveur seulement si le document est trop sensible, trop lourd ou dépend d'un accès back-office.

Règles:
- éviter les libs PDF lourdes dans un chemin fréquent,
- borner la taille de sortie,
- documenter le besoin produit si la génération reste serveur,
- ne pas faire transiter plusieurs fois les mêmes données entre Vercel et le client.

Exemples:
- [apps/web/src/components/ui/pdf-export/use-pdf-export.ts](../../apps/web/src/components/ui/pdf-export/use-pdf-export.ts)
- [apps/web/src/lib/pdf-export/simple-pdf.ts](../../apps/web/src/lib/pdf-export/simple-pdf.ts)
- [apps/web/src/app/api/reports/actions.json/route.ts](../../apps/web/src/app/api/reports/actions.json/route.ts)

## Arbre de décision rapide

Avant d'ajouter une fonctionnalité, se poser ces questions:

1. La donnée doit-elle être exacte à la milliseconde?
2. Est-ce une donnée publique, partagée ou personnelle?
3. Un cache ou une fenêtre `revalidate` suffisent-ils?
4. Supabase peut-il porter l'agrégat ou l'écriture?
5. Le navigateur peut-il garder l'état sans risque métier?
6. La feature ajoute-t-elle une route API ou une page dynamique inutile?

Si la réponse à 3 ou 5 est oui, éviter de créer une nouvelle surface Vercel.
Si la réponse à 1 ou 2 impose le serveur, borner la charge et documenter le quota impacté.

## Checklist Codex avant implémentation

- la feature augmente-t-elle une surface Vercel existante ou en crée-t-elle une nouvelle?
- peut-on garder la page statique ou ISR?
- le fetch peut-il être cacheable?
- un Server Component peut-il porter la logique à la place d'un client component?
- Clerk est-il vraiment nécessaire à cet endroit?
- Supabase peut-il absorber la donnée au lieu d'un route handler Vercel?
- Leaflet ou PDF peuvent-ils être isolés dans un wrapper client ou un traitement hors chemin critique?
- une justification courte est-elle écrite si la surface doit rester coûteuse?

## Outils à lancer avant une PR

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
- `npm run audit:vercel:external-fetches`
- `npm run report:vercel-surface`

Lectures associées:
- [Gouvernance des quotas Vercel](./vercel-quota-governance.md)
- [Checklist Performance & Quotas Vercel](./performance-quotas-vercel-checklist.md)
- [Playbook anti-régression Vercel](./vercel-anti-regression-playbook.md)
- [Stratégie de répartition Vercel, Supabase et navigateur](./vercel-supabase-browser-strategy.md)
- [Audit des routes les plus coûteuses](./vercel-route-cost-audit.md)
