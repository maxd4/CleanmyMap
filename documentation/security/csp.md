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

## Collecte réelle des violations

La policy contient aussi `report-uri` lorsque
`NEXT_PUBLIC_SENTRY_DSN` contient un DSN public valide. L'endpoint est dérivé
des composants publics du DSN vers le endpoint CSP-report officiel de Sentry,
de la forme `/api/<project>/csp-report/?sentry_key=<public-key>` ([référence
API Sentry](https://docs.sentry.io/api/organizations/list-an-organizations-client-keys/)).
Le navigateur envoie donc directement les rapports à Sentry ; aucun endpoint
CleanMyMap public n'est créé.

La dérivation refuse un DSN qui contient un mot de passe. Aucun `SENTRY_DSN`,
`SENTRY_AUTH_TOKEN`, secret Sentry ou token privé n'est lu pour cette collecte.
Le DSN public existant reste l'unique configuration nécessaire. Aucun
`report-sample` n'est ajouté.

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
les navigateurs ou toutes les configurations Vercel.

## EXIT CONDITION — sortie du Report-Only

Le header ne doit pas être remplacé par `Content-Security-Policy` en dehors
d'un lot séparé. L'enforcement ne pourra être proposé qu'après les conditions
conjointes suivantes :

1. une période d'observation réelle en Production d'au moins 14 jours
   calendaires, avec les parcours principaux effectivement utilisés ;
2. une revue des rapports reçus dans Sentry sur cette période ;
3. l'absence de violation légitime bloquante sur les parcours principaux
   (accueil, Clerk, carte/actions, contact et documentation), ou la correction
   documentée de chaque violation avant la décision ;
4. un lot ultérieur séparé, relu comme changement de mode de sécurité, qui
   remplace explicitement `Content-Security-Policy-Report-Only` par
   `Content-Security-Policy` et conserve les tests de non-régression.

Une alerte ZAP ou une violation isolée ne doit pas être masquée par une
allowlist globale ou par la suppression d'une source CSP. Toute exception
restante doit être attribuée à une origine précise, justifiée dans l'owner
`csp.ts` et couverte par un test.
