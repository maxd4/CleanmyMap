# Gouvernance locale — API web

Héritage : gouvernance racine → `apps/web/AGENTS.md` → ce périmètre API.
Ce fichier ne remplace pas les invariants globaux de sécurité et de validation.

## Contrat d'une route

- vérifier l'AuthN et l'AuthZ dans le handler, même lorsqu'un proxy ou une
  protection de route existe ;
- valider explicitement les entrées avant l'appel métier ou la persistence ;
- préserver le contrat de réponse propre à chaque domaine et à chaque route ;
  ne pas imposer une enveloppe universelle de succès ;
- utiliser les helpers d'erreur existants lorsqu'ils conviennent, notamment
  `apps/web/src/lib/http/api-errors.ts` ;
- ne jamais exposer de secrets, stack traces, payloads bruts ou détails
  internes d'un fournisseur dans la réponse client.

Le contrat API détaillé est documenté dans
`documentation/development/api-standard.md`. Toute évolution doit vérifier
les consommateurs, les tests et les intégrations de la route concernée.

## Contrôles selon le contrat

- appliquer le rate limiting pour les surfaces qui le requièrent ;
- vérifier la signature et les restrictions propres aux webhooks ;
- vérifier l'authentification et l'idempotence propres aux crons/services ;
- ne jamais contourner l'AuthZ ou RLS pour atteindre directement la base ;
- auditer les opérations admin sensibles avant et après l'effet métier selon
  `apps/web/src/lib/admin/audit/operation-audit.ts`.

Un rôle privilégié ne doit pas modifier silencieusement le parcours normal :
une dérogation admin doit être explicite, autorisée côté serveur, motivée et
tracée. Un admin qui rejoint normalement l'action d'un tiers suit la file
normale. La règle détaillée est documentée dans
`documentation/security/authz-authn-regles.md`.

## Routes API modulaires dès la conception

- `route.ts` reste prioritairement une frontière HTTP/Next et non le conteneur
  de tout le domaine ;
- une route simple peut rester dans un fichier ;
- lorsqu'une route combine plusieurs responsabilités durables parmi :
  - schema, parsing et validation ;
  - AuthN, AuthZ et contexte ;
  - accès DB ou provider ;
  - normalisation ou enrichissement ;
  - orchestration métier ;
  - pagination ;
  - plusieurs handlers `GET`, `POST`, `PATCH`, etc.,
  elle doit être structurée dès le premier développement ;
- utiliser des frontières locales telles que `route.shared.ts`,
  `route.data.ts`, `route.get.ts`, `route.post.ts` seulement lorsqu'elles
  reflètent les responsabilités réelles ;
- `route.ts` peut devenir une façade ou un réexport lorsque cela préserve
  clairement le contrat Next ;
- séparer autant que possible les fonctions pures des opérations Supabase ou
  provider ;
- ne pas construire une abstraction repository ou service générique sans besoin
  démontré ;
- préserver AuthN, AuthZ, RLS, codes HTTP, payloads, ordre des effets et
  contrats publics ;
- les tests de route continuent à couvrir le contrat HTTP public même si
  l'implémentation devient modulaire.

## Tests de frontière

Maintenir les tests AuthZ, de validation, d'erreur, de rate limiting et de
frontière API lorsqu'une route évolue. Les invariants transversaux sont
notamment couverts par :

```txt
apps/web/src/app/api/api-auth.test.ts
apps/web/src/app/api/api-boundary.test.ts
```

Validation ciblée :

```bash
npm run test -w apps/web -- src/app/api
```

Ajouter le test de la route modifiée lorsque le contrat ou la protection
change ; ne pas remplacer les tests AuthZ par une vérification UI.
