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

### Accès Supabase privilégié

`getSupabaseServerClient(true)`, `getSupabaseAdminClient()` et une RPC dont
l'exécution est réservée à `service_role` sont des mécanismes techniques
serveur. Ils ne définissent ni la catégorie d'accès HTTP ni une surface
admin-only. La qualification canonique est définie dans
`documentation/security/authz-authn-regles.md`.

Avant de créer ou d'utiliser un client privilégié depuis un handler, vérifier
dans cet ordre :

1. le contrat HTTP réel : public, authentifié, owner/scoped,
   admin/modérateur, service ou webhook ;
2. la projection réellement exposée : individuelle, inter-utilisateurs,
   sensible, agrégée ou explicitement publique ;
3. la capacité rendue possible : lecture interne, mutation métier,
   snapshot/cache, modification utilisateur ou opération administrative ;
4. les paramètres contrôlés par le client et leur validation serveur ;
5. le garde adapté : AuthN/AuthZ, ownership/scope, signature, idempotence,
   rate limiting, BotID ou autre contrôle requis par le contrat.

Ne jamais ajouter `requireAdminAccess()` uniquement parce qu'un accès
`service_role` est utilisé. Une façade publique peut employer ce moyen pour
produire une projection bornée ou écrire un cache/snapshot serveur ; cette
écriture technique ne devient pas une mutation administrative par défaut.
À l'inverse, toute capacité HTTP réellement réservée doit être autorisée côté
serveur avant la création ou l'utilisation du client privilégié.

Les tests de frontière doivent prouver à la fois le contrat d'accès, la
projection et l'absence d'accès privilégié sur les chemins refusés. Qualifier
les écarts avec les statuts `MISSING_AUTHZ`, `PUBLIC_SAFE`,
`INPUT_INTEGRITY`, `ABUSE_RESILIENCE`, `DATA_EXPOSURE` ou `NO_FINDING` ; ne
pas transformer automatiquement un usage technique privilégié en finding
d'AuthZ.

## Atomicité des mutations par lots

Toute route ou orchestration HTTP qui écrit plusieurs enregistrements ou
ressources doit déclarer le contrat `ATOMIC` ou `PARTIAL_ALLOWED`.

- `ATOMIC` : aucun sous-effet métier ne subsiste après un échec ; la
  transaction ou la RPC propriétaire doit porter cette garantie ;
- `PARTIAL_ALLOWED` : compter les éléments réellement écrits, identifier le
  point d'échec, définir la reprise, la déduplication ou l'idempotence et
  auditer l'état partiel ; le comportement ne doit jamais émerger d'une simple
  boucle.

Une route HTTP reste une frontière de transport : lecture, validation d'entrée,
AuthN/AuthZ, appel de l'orchestrateur et conversion en réponse. La
normalisation métier, les calculs, le dry-run/confirmation, l'orchestration de
mutations multiples, l'audit et la reprise ont un owner dédié lorsqu'ils
deviennent substantiels. Une modification de `route.ts` ne doit pas ajouter
silencieusement une de ces responsabilités durables.

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

## Invariants des domaines Actions et Chat

- les routes Actions réutilisent les propriétaires de
  `apps/web/src/lib/actions` pour les contrats de données, permissions,
  stockage, validation, participation, modération et géométrie ; elles ne
  dupliquent pas cette sémantique dans les handlers ;
- préserver les flux Actions publics et l'ordre des effets associés aux
  participants, organisateurs, audits de modération, métadonnées et
  persistance, avec leurs scopes, validations et réponses HTTP propres ;
- les routes Chat conservent l'AuthN/AuthZ par canal et conversation pour les
  lectures, écritures, recherches, inbox et votes, sans élargir la visibilité
  par défaut ;
- préserver les contrats Chat de pagination, recherche, sondages, pièces
  jointes, notifications, curseurs, déduplication, filtres et ciblage, en
  réutilisant les propriétaires canoniques de `apps/web/src/lib/chat`.
