# Inventaire technique CleanMyMap

Cet inventaire décrit les composants techniques durables du monorepo tel qu'il
existe dans le dépôt. Il ne constitue ni une roadmap ni une proposition de
refonte. Les contrats détaillés restent documentés dans leur source canonique.

## Applications et runtime

- Le dépôt est un monorepo npm avec workspaces `apps/web` et `apps/mobile`.
- L'application web utilise Next.js 16.3.1, React 19.2.8, TypeScript `^7` et
  l'App Router. Les manifestes et le lockfile racine font foi pour les
  versions exactes.
- L'application web est structurée autour de `apps/web/src/app` pour les
  pages, layouts, metadata et routes API, `apps/web/src/components` pour les
  composants réutilisables, `apps/web/src/lib` pour la logique métier et les
  services, et `apps/web/src/hooks` pour les hooks ciblés.
- `maintenance/python/` reste hors du runtime déployable.

## Frontend et outillage web

- Le build web repose sur `next build`, avec Tailwind CSS v4 et PostCSS.
- Les modules JavaScript utilisent les modules ES (`type: module`).
- Les primitives et conventions UI sont maintenues dans
  `apps/web/src/components/ui` et documentées dans
  [`../design-system/README.md`](../design-system/README.md).
- Les animations utilisent `framer-motion` et les icônes `lucide-react`.
- Le cache de vues s'appuie sur SWR ; les préférences d'interface passent par
  `SitePreferencesProvider` et les stockages UI existants.

## Données, identité et services

- Supabase fournit l'intégration données/backend via les clients
  `apps/web/src/lib/supabase/server.ts` et
  `apps/web/src/lib/supabase/client.ts`, complétée par les routes API Next.js.
- Clerk est l'identité canonique. Les points d'ancrage sont
  `apps/web/src/lib/clerk-session-config.ts`, `apps/web/src/lib/authz.ts` et
  `apps/web/src/proxy.ts`.
- PostHog fournit l'analytics client et serveur ; Vercel Analytics et Speed
  Insights sont intégrés au layout web.
- Sentry assure le monitoring via `apps/web/sentry.server.config.ts`,
  `apps/web/sentry.edge.config.ts` et la configuration Next.js.
- Resend gère les emails transactionnels via
  `apps/web/src/lib/services/resend.ts` et la couche unifiée
  `apps/web/src/lib/services/email.ts`.
- Stripe, Pinecone et Upstash sont intégrés derrière les services et routes
  correspondants de `apps/web/src/lib/services/` et `apps/web/src/app/api/`.

## Organisation du dépôt

- `apps/web/data/raw` contient les imports de données brutes et
  `apps/web/data/local-db` les snapshots locaux associés.
- `apps/web/scripts` regroupe les scripts d'import, de synchronisation,
  d'export, de diagnostic et de bootstrap propres à l'application web.
- `scripts/` contient les checks et outils de maintenance du monorepo.
- `legacy/` contient l'ancien outillage Python archivé.
- `backups/` et `artifacts/` sont des sorties historiques ou de validation et
  ne constituent pas les sources de vérité du produit.

## Validation et captures

- Les tests web utilisent Vitest, avec la configuration dans
  `apps/web/vitest.config.ts`.
- Les captures de pages utilisent Playwright et Sharp via
  `documentation/pages_site/screen/capture-pages.mjs`.
- Les règles de test, de publication et de sélection documentaire sont
  centralisées dans [`../development/TESTING.md`](../development/TESTING.md),
  [`../development/DOCUMENTATION_POLICY.md`](../development/DOCUMENTATION_POLICY.md)
  et les README spécialisés.

## Sources complémentaires

- [Architecture globale](./master-architecture.md)
- [Vue système](./system-overview.md)
- [Services web](../operations/services-stack.md)
- [Documentation du design system](../design-system/README.md)
