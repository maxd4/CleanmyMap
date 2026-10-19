# Lot 09 — Issues Sonar liées aux tests et aux retours intentionnels

État du registre : `AUDIT READ-ONLY / RECONCILIATION LOCALE`.

Le seul inventaire Sonar disponible dans le checkout est le snapshot du
14 octobre 2026, analysé sur `ed0e2659760e3bdd8d26fba0389c6a52701a8c18`.
Il ne constitue pas l’état Sonar courant. Aucun nouveau scan SonarCloud n’a
été lancé dans ce lot : le statut Sonar reste donc distinct de la décision
technique locale.

## Décisions par ID

| ID | Règle / emplacement | Preuve locale du contrat | Décision technique | Statut Sonar du lot |
| --- | --- | --- | --- | --- |
| `AaE3K8BRzHjHEPBoeQ84` | `typescript:S7739` — `apps/web/src/lib/gamification/progression-data.test.helpers.ts:148` | Le builder de test conserve `select → eq → order → limit` et expose `then` pour reproduire l’await du builder Supabase. Le `then` résout le même résultat `{ data, error }` que le contrat consommé. | Aucun changement : retirer `then` casserait l’await du mock. | `CONFIRMED_FALSE_POSITIVE_REVIEW_REQUIRED` |
| `AaE3K8IPzHjHEPBoeQ9e` | `typescript:S7739` — `apps/web/src/app/api/actions/group-join/route.test.helpers.ts:195` | Le mock de la table `actions` est fluent et thenable ; les routes consomment les chaînes par `await` après leurs filtres. | Aucun changement : `then` est une partie intentionnelle du contrat de mock. | `CONFIRMED_FALSE_POSITIVE_REVIEW_REQUIRED` |
| `AaE3K8IPzHjHEPBoeQ9f` | `typescript:S7739` — `apps/web/src/app/api/actions/group-join/route.test.helpers.ts:392` | Le mock `participants` conserve les opérations de sélection, mutation et compte, puis résout le résultat filtré via `then`, comme le builder Supabase réel. | Aucun changement : suppression ou conversion en Promise simple perdrait le chaînage testé. | `CONFIRMED_FALSE_POSITIVE_REVIEW_REQUIRED` |
| `AaE3K8H4zHjHEPBoeQ9b` | `typescript:S7739` — `apps/web/src/app/api/actions/[actionId]/group-join/route.test.helpers.ts:540` | Le mock des participants expose le résultat de comptage et les erreurs simulées après un chaînage fluent ; `then` permet l’await du terminal Supabase. | Aucun changement : le comportement de test serait déformé par la suppression de `then`. | `CONFIRMED_FALSE_POSITIVE_REVIEW_REQUIRED` |
| `AaE3K8H4zHjHEPBoeQ9c` | `typescript:S7739` — `apps/web/src/app/api/actions/[actionId]/group-join/route.test.helpers.ts:635` | Le mock des profils accepte les filtres puis résout les lignes filtrées par un thenable, ce qui couvre le même usage awaitable que le client Supabase. | Aucun changement : helper thenable intentionnel. | `CONFIRMED_FALSE_POSITIVE_REVIEW_REQUIRED` |
| `AaE3K77-zHjHEPBoeQ8Y` | `typescript:S3516` — `apps/web/src/lib/actions/participation/organizers.ts:335` | `syncActionManualParticipants` retourne volontairement la résolution inchangée lorsque des comptes sont introuvables ; la persistance n’est appelée qu’après résolution complète. Les tests vérifient l’absence de RPC dans le cas incomplet. | Aucun changement : remplacer le retour modifierait le signal d’incomplétude et pourrait interpréter une résolution partielle comme une suppression. | `CONFIRMED_FALSE_POSITIVE_REVIEW_REQUIRED` |
| `AaE3K8JLzHjHEPBoeQ9i` | `typescript:S3516` — `apps/web/src/app/api/chat/route.post-persistence.ts:92` | `persistChatPostAndNotify` retourne volontairement le message persisté après un échec de fan-out notification ; la notification est best-effort et ne doit pas transformer une persistance réussie en erreur HTTP. Le test vérifie le statut `201` lorsque la notification échoue. | Aucun changement : le même objet est le résultat métier canonique de la persistance. | `CONFIRMED_FALSE_POSITIVE_REVIEW_REQUIRED` |
| `AaE3K8InzHjHEPBoeQ9h` | `typescript:S2187` — `apps/web/src/app/api/admin/moderation/route.test.ts` | Le fichier agrège les scénarios importés et appelle les fonctions `register...Scenarios`; le fichier contient les hooks Vitest et enregistre les vrais scénarios. La suite du fichier passe. | Aucun changement : ne pas supprimer l’agrégateur ni ajouter un test factice. | `CONFIRMED_FALSE_POSITIVE_REVIEW_REQUIRED` |
| `AaE7ZAYrkxkMFlGl5f3D` | `typescript:S2187` — `scripts/checks/fixtures/architecture-import-boundary/web/src/components/fixture.test.ts` | La fixture fournit une entrée de graphe type-only (`fixtureContract`) au harness `architecture-import-boundary.test.mjs`. L’exclusion Sonar est précise sur ce chemin exact dans `sonar-project.properties`; elle n’est pas élargie. | Aucun changement : la fixture statique reste nécessaire au test d’architecture. | `CONFIRMED_FALSE_POSITIVE_REVIEW_REQUIRED` |
| `AaE3K79MzHjHEPBoeQ8e` | `typescript:S5332` — `apps/web/src/lib/actions/exports/gpx-serializer.ts:44` | La [documentation officielle du schéma GPX 1.1](https://www.topografix.com/GPX/1/1/) déclare cette valeur comme `Target Namespace` et namespace par défaut. Le sérialiseur la réutilise dans `xmlns` et `xsi:schemaLocation`, sans l’utiliser comme destination de transport ; les tests vérifient le XML bien formé et le namespace exact. | Aucun changement : remplacer l’identifiant normatif par HTTPS invaliderait la fidélité GPX 1.1. | `CONFIRMED_FALSE_POSITIVE_REVIEW_REQUIRED` |

Aucun finding de ce lot n’est `RESOLVED_BY_CODE` : aucune correction de code
n’était justifiée. Aucun finding n’est `BLOCKED` au niveau de la preuve locale.
La confirmation ou le rejet dans SonarCloud reste une revue humaine à faire
sur une analyse fraîche.

## Validations exécutées

- `PASS` — tests Web ciblés : 9 fichiers, `107/107` tests passés pour les
  fichiers hors `route.get.test.ts`, couvrant les builders thenables,
  organisateurs, chat best-effort, modération et GPX ;
- `PASS` — `node --test scripts/checks/architecture-import-boundary.test.mjs
  scripts/ci/sonar-tracking.test.mjs` : `14/14` ;
- `PASS` — la cohérence du suivi historique confirme l’exclusion exacte de la
  fixture et l’inventaire Sonar de 491 IDs ;
- `FAIL préexistant / hors lot` — les 4 scénarios concernés de
  `apps/web/src/app/api/actions/[actionId]/group-join/route.get.test.ts`
  échouent avec `query.order(...).order(...).range is not a function` dans le
  mock de route. Cette lacune `.range()` n’est pas causée par le lot 09 et n’a
  pas été modifiée ; les autres scénarios du même périmètre passent ;
- `NOT_RUN` — nouveau scan SonarCloud, scanner local et statut distant frais.

## Limite de statut

`CONFIRMED_FALSE_POSITIVE_REVIEW_REQUIRED` décrit la décision technique locale
et non une résolution Sonar. Le snapshot source conserve les 10 findings en
`OPEN`; aucun statut `FIXED`, dismiss ou exclusion globale n’a été fabriqué.
