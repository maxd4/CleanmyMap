# CSP — contrat `CURRENT` en Report-Only

## Responsabilité

La source canonique de la policy est
[`apps/web/src/lib/security/csp.ts`](../../apps/web/src/lib/security/csp.ts).
`apps/web/next.config.ts` l'attache au mécanisme de headers existant sous le
nom `Content-Security-Policy-Report-Only`.

Ce lot n'active pas `Content-Security-Policy` en enforcement. Il n'introduit
ni nonce par requête, ni lecture de requête dans le layout, ni `force-dynamic`.
La policy reste donc calculée au build/configuration et ne dégrade pas le
cache par construction.

## Contract actuel

La policy contient au minimum `default-src`, `script-src`, `style-src`,
`connect-src`, `img-src`, `font-src`, `frame-src`, `object-src 'none'`,
`base-uri 'self'`, `frame-ancestors 'none'` et `form-action 'self'`.
Les sources générales `https:`, `http:`, `wss:` et `*` sont interdites.

`script-src` et `style-src` conservent provisoirement `'unsafe-inline'` en
Report-Only : le layout contient deux initialiseurs inline nécessaires au
premier rendu (`display-mode` et `capture-mode`), et aucun mécanisme de nonce ou
de hash n'est introduit dans ce lot. Cette exception ne vaut pas autorisation
pour passer directement en enforcement ; une future convergence devra mesurer
les violations et remplacer cette tolérance par des hashes/nonces adaptés.

## Origines justifiées par le runtime

L'inventaire a été réalisé à partir du code d'appel et des versions installées,
pas à partir d'une allowlist générique :

- Clerk : hôte du domaine/clé publishable configuré, proxy absolu éventuel,
  domaines de tenant Clerk et les origines de protection, télémetrie,
  Cloudflare et Stripe déclarées par `@clerk/nextjs` ;
- Supabase : `NEXT_PUBLIC_SUPABASE_URL`, avec l'origine `wss` correspondante
  pour Realtime et la même origine pour les images Storage ;
- Sentry : origine extraite de `NEXT_PUBLIC_SENTRY_DSN` ;
- PostHog : `NEXT_PUBLIC_POSTHOG_HOST` ou la région EU/US du contrat existant,
  plus l'hôte d'assets régional utilisé par `posthog-js` ;
- Vercel Analytics et Speed Insights : `https://va.vercel-scripts.com` pour
  les scripts ; leurs endpoints `/_vercel/...` restent same-origin ;
- Stripe : `js.stripe.com`/origines Stripe nécessaires aux composants Clerk,
  tandis que le checkout de financement est une redirection vers l'URL
  hébergée renvoyée par le serveur et ne constitue ni un formulaire externe ni
  un iframe dans l'application actuelle ;
- APIs consommées par le navigateur : GitHub, Open-Meteo, `geo.api.gouv.fr`,
  Nominatim, routage OpenStreetMap ;
- images et cartes : hôtes configurés dans `next.config.ts`, images de contenu
  explicitement utilisées et tuiles OpenStreetMap/CARTO.

Les URLs externes saisies ou persistées par les utilisateurs ne sont pas
ajoutées dynamiquement à la policy. Elles restent soumises à la validation et
aux contrats d'affichage de leur surface.

## Maintenance et limites de preuve

Toute nouvelle requête navigateur vers une origine externe doit d'abord être
ajoutée dans l'owner `csp.ts`, avec un test ciblé et une justification dans ce
document. Les tests prouvent la forme de la policy et ses dérivations
build-time ; ils ne prouvent pas à eux seuls l'absence de violation dans tous
les navigateurs ou toutes les configurations Vercel. Une étape ultérieure devra
collecter les rapports réels avant toute décision d'enforcement.
