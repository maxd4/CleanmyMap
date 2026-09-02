# Audit Edge Requests: proxy / matcher

## Contexte

- Le site a très peu d'utilisateurs réels.
- Pourtant plusieurs dizaines de milliers d'`Edge Requests` ont déjà été consommées.
- Le `proxy.ts` est déjà resserré sur quelques routes protégées, et le frontend API Clerk est maintenant servi par un route handler dédié; le gros levier n'est plus d'élargir ou de réécrire le middleware, mais de réduire tout ce qui le sollicite autour.

## Priorités réelles

1. Réduire les préchargements automatiques des `Link` visibles dans la navigation globale.
2. Limiter les allers-retours Clerk via `/__clerk` et garder les widgets auth au strict nécessaire.
3. Batcher ou sampler les pageviews envoyées vers `/api/analytics/funnel`.
4. Rendre le chat et les panneaux communauté plus paresseux au chargement, avec moins de polling.
5. Garder les URLs protégées hors du sitemap et des surfaces publiques indexables.
6. Ne pas perdre du temps sur Leaflet, PostHog, Sentry ou les assets statiques pour la facture `Edge Requests`: ce n'est pas le bon levier.

## Ce qui est confirmé aujourd'hui

| Rang | Cause probable | Probabilité | Fichiers / routes concernés | Mécanisme exact | Impact | Action recommandée | État |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Préchargement automatique des `Link` protégés | Élevée | `apps/web/src/components/navigation/app-navigation-ribbon.tsx`, `apps/web/src/components/navigation/app-navigation-tree-menu.tsx`, `apps/web/src/components/navigation/app-navigation-block-dropdown.tsx`, `apps/web/src/components/accueil/accueil-footer.tsx`, `apps/web/src/components/ui/cmm-button.tsx` | `next/link` précharge les cibles visibles. Si ces cibles passent par le `matcher`, chaque préfetch consomme une `Edge Request` avant même le clic. | Très élevé | Mettre `prefetch={false}` sur les cibles sensibles et réduire les liens protégés visibles par défaut. | À faire |
| 2 | Bootstrap Clerk et proxy frontend `/__clerk` | Élevée | `apps/web/src/app/layout.tsx`, `apps/web/src/components/auth/clerk-localization-provider.tsx`, `apps/web/src/components/navigation/app-navigation-ribbon.tsx`, `apps/web/src/proxy.ts`, `apps/web/src/app/api/%5F%5Fclerk/[[...path]]/route.ts` | Les widgets Clerk ne montent que sur les surfaces auth/protégées, et le proxy frontend `/__clerk` est maintenant servi par un route handler dédié au lieu du middleware. | Élevé | Garder les widgets auth hors du shell public, éviter les sync inutiles sur chaque page, et maintenir le proxy frontend hors du matcher. | Partiellement traité |
| 3 | Tracker de pageviews | Élevée | `apps/web/src/components/ui/conditional-analytics.tsx`, `apps/web/src/components/analytics/project-pageview-tracker.tsx`, `apps/web/src/lib/analytics/funnel-client.ts`, `apps/web/src/app/api/analytics/funnel/route.ts` | Chaque navigation consentie envoyait un `POST` vers `/api/analytics/funnel`, qui restait dans le chemin Edge. | Élevé | Batcher, sampler ou réduire la fréquence d'envoi. | Traité: batch côté client + cooldown global côté tracker + payload batch accepté par l'API |
| 4 | Chat et panneaux communauté avec polling / auto-fetch | Moyenne | `apps/web/src/components/chat/hooks/use-chat-data.ts`, `apps/web/src/components/chat/chat-shell.tsx`, `apps/web/src/components/sections/rubriques/community/use-community-events.ts`, `apps/web/src/components/sections/rubriques/community/use-community-actions.ts`, `apps/web/src/app/api/chat/route.ts`, `apps/web/src/app/api/chat/users/route.ts` | Les composants montent des fetchs automatiques et des revalidations régulières, ce qui transforme les onglets ouverts en générateurs d'Edge Requests. | Moyen | Charger à l'intention utilisateur et allonger les intervalles de revalidation. | À faire |
| 5 | Crawlers, robots et sitemap | Moyenne à faible | `apps/web/src/app/robots.ts`, `apps/web/src/app/sitemap.ts`, `apps/web/src/lib/seo/indexability.ts` | Le sitemap et les liens publics exposent des routes qui tombent ensuite dans le `matcher` si elles sont protégées. | Moyen | Garder les URLs privées hors sitemap et ne pas exposer de liens protégés depuis des surfaces publiques. | À surveiller |
| 6 | Routes cartographiques adjacentes | Faible | `apps/web/src/app/(app)/actions/map/page.tsx`, `apps/web/src/components/actions/actions-map-canvas.tsx`, `apps/web/src/components/actions/map-feed/actions-map-feed.tsx`, `apps/web/src/components/actions/map-feed/use-map-feed-data.ts` | Le coût principal est côté client et origine. Ce n'est pas une source majeure d'`Edge Requests` tant que la route ne rentre pas dans le `matcher`. | Faible | Garder le chargement paresseux et ne pas réintroduire de proxy inutile. | Bas priorité |
| 7 | Observabilité externe | Très faible | `apps/web/src/components/posthog-provider.tsx`, `apps/web/src/components/ui/conditional-analytics.tsx`, `apps/web/src/app/error.tsx`, `apps/web/src/app/global-error.tsx`, `apps/web/src/lib/observability/sentry.ts` | Les événements partent surtout vers des services tiers. L'impact Vercel est indirect. | Très faible | Conserver le consent gating et le chargement lazy, sans chercher le gain principal ici. | À laisser de côté |

## Conclusion

Le proxy est déjà dans un état raisonnable. Les gains restants viennent surtout de la navigation, du bootstrap auth et des fetchs automatiques. En pratique, l'ordre de travail utile est:

1. Couper le préfetch sur les liens protégés visibles.
2. Réduire la pression Clerk sur `/__clerk`.
3. Diminuer la fréquence des pageviews analytics.
4. Rendre les panneaux live réellement à la demande.
5. Verrouiller la propreté du sitemap et des liens publics.
