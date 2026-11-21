# Décisions humaines — Quality Structure

> Statut : `CURRENT` — registre documentaire des décisions humaines par
> dossier. Ce document qualifie des signalements `REVIEW_STRUCTURE` ; il ne
> remplace ni le rapport machine, ni ses mesures, ni le registre des décisions
> de modularisation par fichier.

## Contrat du registre

Une entrée décrit une décision de conservation observable, son classement, le
SHA de la revue et la condition qui impose de la réexaminer. Elle ne modifie
aucun seuil, aucune exclusion, aucun gate, aucune baseline et aucun calcul de
`quality:structure`.

Les décisions ci-dessous portent sur le rapport `all` du SHA de revue
`d441602d7e9c210e4f6d6d456fed4fdb678f7570`. Les métriques sont des éléments de
preuve de la revue, pas des seuils de maintien et pas des compteurs à
réconcilier manuellement dans le rapport suivant.

## Décisions acquises

### `apps/mobile/tests`

- **Justification observable** : 48 fichiers directs et 53 récursifs, avec des
  tests de contrôleurs, écrans, services, stockage, GPS, identité et contrats
  mobiles. Les 67 relations sortantes couvrent les owners applicatifs mobiles
  (`features`, `navigation`, `shared`, `tasks`, `App.tsx` et scripts) ; la
  diversité décrit une centralisation de la preuve de test de l'application,
  pas un mélange de responsabilités runtime dans un même module.
- **Classification** : `KEEP_COLOCATED_TESTS` — centralisation des tests
  applicatifs ; aucun split automatique.
- **SHA de revue** : `d441602d7e9c210e4f6d6d456fed4fdb678f7570` (`all`).
- **Condition de réexamen** : créer une frontière seulement si une famille de
  tests acquiert un owner indépendant, un lifecycle distinct ou une surface
  d'exécution différente ; le nombre de fichiers seul ne suffit pas.

### `apps/web/src/__tests__/support`

- **Justification observable** : 15 helpers directs reçoivent 75 relations
  entrantes et servent plusieurs familles de tests (`action`, `chat`,
  `group`, `joinable` et `reports`). Les 16 relations sortantes ciblent les
  routes, fixtures et contrats effectivement testés ; cette réutilisation
  explique la faible part interne et ne constitue pas une faible cohésion du
  dossier de support.
- **Classification** : `KEEP_SHARED_TEST_SUPPORT` — helpers partagés ; les
  imports vers les contrats testés sont attendus.
- **SHA de revue** : `d441602d7e9c210e4f6d6d456fed4fdb678f7570` (`all`).
- **Condition de réexamen** : réexaminer si un helper absorbe de la logique
  produit, un effet runtime ou une préparation propre à un seul domaine ; une
  séparation doit alors suivre l'owner du contrat et non le volume d'imports.

### `apps/web/src/lib/security`

- **Justification observable** : 8 fichiers directs regroupent CSP, échappement
  HTML, validation, invariants d'indexation et `security.txt`, avec leurs tests
  colocalisés. Les 36 relations entrantes proviennent de consommateurs
  applicatifs et d'exports PDF qui utilisent ces contrats de sécurité ; les 4
  relations sortantes restent limitées aux owners Web nécessaires.
- **Classification** : `KEEP_COHESIVE_SECURITY_OWNER` — responsabilité sécurité
  cohérente, tests colocalisés.
- **SHA de revue** : `d441602d7e9c210e4f6d6d456fed4fdb678f7570` (`all`).
- **Condition de réexamen** : réexaminer si une frontière de sécurité autonome
  apparaît avec un owner, des effets ou un lifecycle distincts, par exemple un
  sous-domaine qui ne partagerait plus le même contrat de validation ; les
  imports entrants ordinaires ne sont pas une preuve suffisante.

### `apps/web/src/lib/rate-limit`

- **Justification observable** : 13 fichiers directs couvrent l'adaptateur API,
  middleware, serveur, store, types, utilitaires et observabilité, avec les
  tests correspondants. Les 73 relations entrantes sont des usages attendus
  par les routes et services Web ; la part interne mesurée est de `0,809524`,
  ce qui confirme des relations internes fortes malgré la réutilisation
  transverse.
- **Classification** : `KEEP_COHESIVE_RATE_LIMIT_OWNER` — responsabilité de
  rate limiting cohérente, tests colocalisés.
- **SHA de revue** : `d441602d7e9c210e4f6d6d456fed4fdb678f7570` (`all`).
- **Condition de réexamen** : réexaminer uniquement si la politique, le
  transport, la persistance ou l'observabilité acquièrent des owners et des
  contrats indépendants ; ni le nombre de fichiers ni les imports entrants de
  consommateurs ne déclenchent un split à eux seuls.

## Candidats non tranchés

`components/ui`, `apps/web/src/lib/community`, `apps/web/src/lib/actions` et
tous les autres dossiers signalés par `quality:structure` restent des
candidats `NON_TRANCHÉS`. Leur absence de ce registre ne confirme ni défaut ni
cohésion, ne supprime aucune mesure et ne crée aucune exclusion automatique.
Une nouvelle entrée exige une revue humaine observable, un SHA explicite et
une condition de réexamen.

## Frontière avec les autres registres

Ce registre qualifie des **dossiers** signalés par `quality:structure`. Le
registre [`modularity-decisions.md`](../architecture/modularity-decisions.md)
conserve les décisions humaines par **fichier** du radar de modularisation.
Les deux documents ne se substituent pas, ne partagent pas de compteur manuel
et ne servent pas de mécanisme de filtrage du rapport machine.
