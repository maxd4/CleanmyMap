# Convention de nommage des fichiers

Statut : `CURRENT`

## Convention applicable

CleanMyMap conserve son historique et applique la convention aux nouveaux
fichiers suivis par Git :

| Surface | Convention actuelle |
| --- | --- |
| Fichiers applicatifs TS/TSX | `kebab-case`, avec les noms en plusieurs segments séparés par `.` conservés lorsqu’ils sont eux-mêmes en `kebab-case` (`route.shared.ts`, `feature.model.ts`) |
| Symboles React, classes et types | `PascalCase` dans le code, indépendamment du nom de fichier |
| Fonctions et variables TS | `camelCase` dans le code |
| Tests exécutables TS/TSX | `<target>.test.ts` ou `<target>.test.tsx` ; les specs Playwright historiques sont baselinées |
| Helpers, fixtures et scénarios de tests | classés séparément ; TypeScript en `kebab-case`, sans suffixe `.test` artificiel |
| Python | modules PEP 8 en `snake_case` ; les modules privés `_name.py` sont valides |
| Migrations Supabase | `YYYYMMDDHHMMSS_snake_case.sql` |
| Fichiers réservés Next.js | noms imposés (`page.tsx`, `route.ts`, `layout.tsx`, etc.), explicitement exemptés |
| Configuration et documentation | classées et auditées, mais non soumises à une normalisation cosmétique dans ce lot |
| Generated/vendor | exclus du contrôle de convention |

Un marqueur terminal `.test.*` ou `.spec.*` classe d’abord le fichier
TypeScript comme test exécutable, avant l’examen des répertoires `fixtures` ou
`support`. Un helper tel que `route.test.helpers.ts` n’a pas ce marqueur
terminal et reste donc un support de test ; un segment de chemin `fixtures` ou
`support` ne peut pas reclasser une spec exécutable.

Un token minuscule unique (`route.ts`, `config.ts`) est accepté comme forme
mono-segment de `kebab-case`. Les segments composés séparés par un point ne
sont acceptés que lorsqu’ils sont tous en `kebab-case`.

## Mesure de départ

L’audit a été exécuté sur les 5 050 chemins retournés par `git ls-files` au
SHA `732f0bc4f2dd9b25faa8e5e0bfc02e027384f48e`. Aucun fichier non suivi n’a
participé à la mesure.

| Catégorie | Distribution mesurée |
| --- | --- |
| TS/TSX applicatifs | 1 943 `kebab-case`, 13 `PascalCase`, 1 `camelCase`, 1 exception historique |
| Tests exécutables TS/TSX | 1 298 `<target>.test.ts[x]`, 17 specs Playwright historiques hors suffixe canonique |
| Helpers/fixtures/scénarios de tests | 63 fichiers TypeScript `kebab-case` et 1 fixture non-TypeScript, classés hors tests exécutables |
| Python | 52 `snake_case` PEP 8 |
| Migrations SQL | 262 timestampées Supabase conformes |
| Next reserved | 229 fichiers exemptés par contrat Next.js |
| Configuration | 86 |
| Documentation | 696 |
| Generated/vendor | 119, exclus |
| Autres fichiers suivis | 265 |

La mesure réelle confirme donc la cible préférée : `kebab-case` pour les
fichiers applicatifs et les supports de tests TypeScript, et
`<target>.test.ts[x]` pour les tests exécutables. Un segment de chemin nommé
`test` seul, comme dans `apps/web/src/app/api/email/test/route.ts`, ne suffit
pas à classer une source applicative comme test.

## Ratchet et baseline

Le contrôle `scripts/checks/check-file-naming.mjs` ne lit que `git ls-files`.
Il compare les chemins avec des séparateurs `/` sans réduire la casse, ce qui
conserve le même résultat sous Windows et Linux.

La baseline versionnée est
[`scripts/checks/file-naming-baseline.json`](../../scripts/checks/file-naming-baseline.json).
Elle contient les 15 écarts TS/TSX et 17 specs Playwright historiques observés
au SHA de mesure. Les helpers, fixtures et scénarios TypeScript conformes ne
sont plus des exceptions : ils sont validés comme supports en `kebab-case`.
`ActionStepLocation.tsx` est conservé comme exception
PascalCase explicite pour préserver ses imports existants.

Le contrôle échoue lorsqu’un chemin suivi introduit une violation absente de
la baseline. Il échoue aussi lorsqu’une entrée de baseline devient obsolète,
ou lorsqu’une exception retirée est réintroduite sans être requalifiée. Une
suppression ou un renommage historique n’est donc jamais nécessaire pour
obtenir un résultat vert.

Le check est exécuté par `checks:fast` avec une estimation de deux secondes.
Les fixtures déterministes couvrent les fichiers réservés Next, un fichier
applicatif kebab, un test canonique, `ActionStepLocation.tsx`, Python, une
migration timestampée et un fichier generated/vendor.
