# Suivi des 491 anomalies SonarCloud — 14 octobre 2026

> **Statut : AUDIT READ-ONLY / RECONCILIATION**. Ce document ne clôt aucune
> anomalie SonarCloud et ne remplace pas une analyse SonarCloud ultérieure.

## Périmètre et provenance

- Inventaire source fourni :
  [`CleanMyMap_SonarCloud_491_issues_2026-10-14.json`](./CleanMyMap_SonarCloud_491_issues_2026-10-14.json)
- Projet SonarCloud : `maxd4_CleanmyMap`
- Révision analysée par SonarCloud : `ed0e2659760e3bdd8d26fba0389c6a52701a8c18`
- Export : `2026-10-14T17:30:48.550Z`
- Analyse SonarCloud : `2026-10-14T17:01:01+0000`
- `main` confronté : `e03f9f7c255a1b4d51eb17f25e9b6f128d51448c` (lot 4 intégré localement)
- `origin/main` au moment du rapprochement :
  `6966ddefaa408c9cb162812e31a5a68cb5231e58`
- Inventaire détaillé généré :
  `artifacts/sonarcloud-audit/e03f9f7c255a1b4d51eb17f25e9b6f128d51448c/sonarcloud-491-tracking.json`

L’inventaire source est conservé comme transport historique. Le suivi généré
est la projection de rapprochement : chaque entrée conserve l’identifiant
SonarCloud, la règle, le chemin, le message et le statut courant.

## Méthode de rapprochement

Pour chaque anomalie :

1. l’identifiant SonarCloud est contrôlé pour l’unicité dans les 491 entrées ;
2. le préfixe de projet SonarCloud est retiré du composant afin d’obtenir le
   chemin dépôt ;
3. le chemin est recherché dans l’arbre Git de `HEAD` avec `git ls-tree`, et
   son blob courant est conservé dans l’inventaire généré ;
4. la règle et le type SonarCloud sont conservés sans requalification
   silencieuse ;
5. aucune disparition du code, modification locale ou résultat SonarCloud
   postérieur n’est transformé en preuve de correction.

Le rapprochement utilise l’arbre de `HEAD`, et non les fichiers staged ou dirty
des travaux concurrents présents dans le checkout.

## Résultat exhaustif

| Contrôle | Résultat |
| --- | ---: |
| Anomalies source | 491 |
| Identifiants Sonar uniques | 491 |
| Identifiants dupliqués | 0 |
| Règles distinctes | 44 |
| Chemins présents dans `main` | 491 |
| Chemins absents de `main` | 0 |
| Bugs | 207 |
| Vulnérabilités | 124 |
| Code smells | 160 |

Tous les chemins exportés existent encore dans l’arbre versionné de `main`.
Aucune anomalie n’est donc classée `OBSOLETE` sur le seul critère de chemin.

### Répartition des statuts

| Statut | Nombre | Règle d’attribution dans ce lot |
| --- | ---: | --- |
| `TO_FIX` | 269 | Anomalie `OPEN` dans l’export, chemin présent dans `main`, sans correction locale prouvée dans les lots traités |
| `FIXED_PENDING_SCAN` | 220 | Corrections locales vérifiées pour les lots traités ; aucun scan SonarCloud postérieur ne confirme encore la résolution |
| `BLOCKED` | 2 | Findings S8786 sur un fichier TypeScript déjà modifié par un writer concurrent, non écrasés |
| `FALSE_POSITIVE` | 0 | Aucune preuve technique et décision humaine spécifique n’a été fournie |
| `ACCEPTED_PENDING_APPROVAL` | 0 | Aucun risque accepté ni approbation explicite n’a été fourni |
| `OBSOLETE` | 0 | Aucun chemin source n’a disparu de `main` |
| `BLOCKED` | 0 | Le rapprochement identifiant/règle/chemin est complet ; le blocage du runner qualité est documenté séparément ci-dessous |

`TO_FIX` ne signifie pas que chaque finding a été reproduit indépendamment par
un moteur local. Il signifie que l’anomalie reste une anomalie SonarCloud
ouverte à traiter, rattachée à un chemin toujours présent, sans preuve de
correction ou d’obsolescence dans le lot courant. `FIXED_PENDING_SCAN` signifie
uniquement qu’une correction locale et ses tests ciblés sont documentés ; la
résolution SonarCloud reste à confirmer séparément par un scan réel.

## Lot 2A — tris déterministes et précédence des expressions régulières

Ce lot est borné aux scripts de gouvernance et de rapport suivants :

- comparateurs explicites pour les tris de chaînes dans
  `scripts/checks/check-agent-skill-mirrors.mjs`,
  `scripts/checks/check-architecture-import-boundary.mjs` et
  `scripts/checks/check-complexity-policy.mjs` ;
- groupement explicite des alternatives regex dans
  `scripts/checks/check-public-e2e-artifact.mjs`,
  `scripts/checks/complexity-policy.mjs`,
  `scripts/checks/top-heavy-measurement.mjs` et
  `scripts/reports/repository-growth.mjs`.

Les 9 identifiants traités sont :

| Règle | Identifiants SonarCloud | Statut local |
| --- | --- | --- |
| `javascript:S2871` | `AaE3K8nLzHjHEPBoeRAx`, `AaE3K8nLzHjHEPBoeRAy`, `AaE3K8nLzHjHEPBoeRAz`, `AaE7ZAcJkxkMFlGl5f3E`, `AaE3K8qgzHjHEPBoeRBi` | `FIXED_PENDING_SCAN` |
| `javascript:S5850` | `AaE3K8m2zHjHEPBoeRAu`, `AaE3K8nBzHjHEPBoeRAw`, `AaE7ZAm5kxkMFlGl5f3F`, `AaE3K8khzHjHEPBoeRAN` | `FIXED_PENDING_SCAN` |

Pour `stableJson`, le comparateur conserve explicitement l’ordre UTF-16
historique des clés afin de ne pas modifier les rapports JSON canoniques. Les
alternatives regex sont uniquement parenthésées ; leurs correspondances ne
sont pas élargies ni restreintes. Les 40 autres anomalies `javascript:S2871`
restent `TO_FIX` ; le reliquat global est mis à jour dans la répartition des
statuts et dans l’inventaire généré.

Preuves locales du lot : les suites ciblées totalisent 31/31 succès et les
trois tests de régression ciblés de complexité passent. Le fichier complet
`check-complexity-policy.test.mjs` conserve deux échecs préexistants sur les
attentes de `complexity-baseline.json` (786 entrées actuelles contre 699
attendues) ; aucune baseline n’a été modifiée. La confirmation SonarCloud est
`NOT_CONFIRMED` pour les 9 identifiants.

## Lot 2B — tris TypeScript déterministes dans `apps/web`

Ce lot traite les 36 anomalies `typescript:S2871` recensées dans `apps/web`,
par ensembles fonctionnels : routes et hooks d’actions, clés/fingerprints et
exports, gamification, géographie, quiz, pilotage et SPOGOMI.

Les comparateurs appliqués suivent le contrat de chaque donnée :

- comparateur code-unit explicite pour les identifiants, fingerprints, clés de
  cache, SHA et listes persistées, afin de conserver l’ordre historique de
  `Array.prototype.sort()` et les preuves déterministes ;
- comparateur numérique pour les années de filtre SPOGOMI ;
- comparateur lexical explicite pour les dates ISO, dont l’ordre est
  chronologique par construction.

Les 36 identifiants traités sont :

| Règle | Identifiants SonarCloud | Statut local |
| --- | --- | --- |
| `typescript:S2871` | `AaE3K8HqzHjHEPBoeQ9a`, `AaE3K8IezHjHEPBoeQ9g`, `AaE3K8PnzHjHEPBoeQ-N`, `AaE3K8aAzHjHEPBoeQ_J`, `AaE3K793zHjHEPBoeQ8j`, `AaE3K7-kzHjHEPBoeQ8l`, `AaE3K78MzHjHEPBoeQ8Z`, `AaE3K79mzHjHEPBoeQ8h`, `AaE3K79mzHjHEPBoeQ8i`, `AaE3K8GIzHjHEPBoeQ9V`, `AaE3K8AazHjHEPBoeQ80`, `AaE3K8AazHjHEPBoeQ81`, `AaE3K8AkzHjHEPBoeQ82`, `AaE3K8AHzHjHEPBoeQ8v`, `AaE3K8AHzHjHEPBoeQ8w`, `AaE3K8AHzHjHEPBoeQ8x`, `AaE3K8AHzHjHEPBoeQ8y`, `AaE3K8AHzHjHEPBoeQ8z`, `AaE3K8BkzHjHEPBoeQ85`, `AaE3K8BkzHjHEPBoeQ86`, `AaE3K8BkzHjHEPBoeQ87`, `AaE3K8BkzHjHEPBoeQ88`, `AaE3K8BkzHjHEPBoeQ89`, `AaE3K8BszHjHEPBoeQ8-`, `AaE3K8BszHjHEPBoeQ8_`, `AaE3K7_TzHjHEPBoeQ8p`, `AaE3K7_hzHjHEPBoeQ8r`, `AaE3K8CYzHjHEPBoeQ9C`, `AaE3K8CYzHjHEPBoeQ9D`, `AaE3K8F3zHjHEPBoeQ9S`, `AaE3K8F_zHjHEPBoeQ9T`, `AaE3K8F_zHjHEPBoeQ9U`, `AaE3K77NzHjHEPBoeQ8T`, `AaE3K8CIzHjHEPBoeQ9B`, `AaE3K8GyzHjHEPBoeQ9X`, `AaE3K8ELzHjHEPBoeQ9I` | `FIXED_PENDING_SCAN` |

Preuves locales du lot : 19 fichiers de tests Vitest, 155 tests réussis ;
`npm run typecheck -w apps/web` réussi ; `npm run lint -w apps/web` réussi.
Les tests couvrent notamment les dates égales et bornes de seuil, le tri
numérique des années affichées, l’ordre canonique des clés de cache et les
cardinalités limites des réponses multi-sélection. Aucun ordre de donnée
persistée ou fingerprint n’a été volontairement modifié. La confirmation
SonarCloud reste `NOT_CONFIRMED` pour les 36 identifiants.

## Lot 3 — sécurisation des invocations Git (`javascript:S4036`)

Ce lot est borné aux 48 alertes `javascript:S4036` portant sur de véritables
invocations Git dans `scripts/ci/` et `scripts/checks/`. Un résolveur partagé,
`scripts/ci/git-executable.mjs`, sélectionne uniquement les emplacements
système fixes connus pour Windows et POSIX ; il ne consulte pas `PATH` et
échoue explicitement si Git n’est pas présent dans ces emplacements. Les
arguments restent transmis sans shell. Le shim de validation dynamique réutilise
le même chemin résolu tout en conservant ses variables de candidat et ses
protections de provenance.

Les décisions sont locales et par identifiant :

| Fichier | Identifiants SonarCloud couverts | Qualification | Statut local |
| --- | --- | --- | --- |
| `scripts/checks/check-canonical-workspaces.mjs` | `AaE3K8ohzHjHEPBoeRBA` | Git de lecture du candidat via chemin fixe | `FIXED_PENDING_SCAN` |
| `scripts/checks/check-complexity-policy.mjs` | `AaE3K8qgzHjHEPBoeRBe`, `AaE3K8qgzHjHEPBoeRBf`, `AaE3K8qgzHjHEPBoeRBg`, `AaE3K8qgzHjHEPBoeRBj` | résolution fixe, arguments séparés, provenance de baseline préservée | `FIXED_PENDING_SCAN` |
| `scripts/checks/check-cycles.mjs` | `AaE3K8mWzHjHEPBoeRAm`, `AaE3K8mWzHjHEPBoeRAo`, `AaE3K8mWzHjHEPBoeRAp` | lecture de révision et vérification d’ascendance sans shell | `FIXED_PENDING_SCAN` |
| `scripts/checks/check-duplication.mjs` | `AaE3K8pKzHjHEPBoeRBH`, `AaE3K8pKzHjHEPBoeRBI`, `AaE3K8pKzHjHEPBoeRBJ`, `AaE3K8pKzHjHEPBoeRBK` | Git de baseline et runner injecté avec exécutable fixe | `FIXED_PENDING_SCAN` |
| `scripts/checks/check-gitnexus-hygiene.mjs` | `AaE3K8nWzHjHEPBoeRA0` | `spawnSync` sans shell et binaire résolu hors `PATH` | `FIXED_PENDING_SCAN` |
| `scripts/checks/check-readable-typography.mjs` | `AaE3K8rXzHjHEPBoeRBq` | lecture de diff avec arguments séparés | `FIXED_PENDING_SCAN` |
| `scripts/checks/check-root-file-hygiene.mjs` | `AaE3K8p-zHjHEPBoeRBW` | énumération versionnée via chemin fixe | `FIXED_PENDING_SCAN` |
| `scripts/checks/check-utf8-fr-files.mjs` | `AaE3K8oXzHjHEPBoeRA_` | énumération Git sans shell | `FIXED_PENDING_SCAN` |
| `scripts/checks/coverage-evidence.mjs` | `AaE3K8nhzHjHEPBoeRA2` | SHA exact de l’évidence de couverture | `FIXED_PENDING_SCAN` |
| `scripts/checks/coverage-policy.mjs` | `AaE3K8n4zHjHEPBoeRA6`, `AaE3K8n4zHjHEPBoeRA7`, `AaE3K8n4zHjHEPBoeRA8` | résolution de HEAD et validation d’ascendance | `FIXED_PENDING_SCAN` |
| `scripts/checks/dead-code-policy.mjs` | `AaE3K8qKzHjHEPBoeRBX`, `AaE3K8qKzHjHEPBoeRBY` | validation de source de baseline | `FIXED_PENDING_SCAN` |
| `scripts/checks/mutation-policy.mjs` | `AaE3K8mrzHjHEPBoeRAr`, `AaE3K8mrzHjHEPBoeRAs`, `AaE3K8mrzHjHEPBoeRAt` | SHA et ascendance de baseline | `FIXED_PENDING_SCAN` |
| `scripts/checks/quality-evidence.mjs` | `AaE3K8pUzHjHEPBoeRBL`, `AaE3K8pUzHjHEPBoeRBM`, `AaE3K8pUzHjHEPBoeRBN` | résolution de candidat et runner Git explicite | `FIXED_PENDING_SCAN` |
| `scripts/checks/secret-audit.mjs` | `AaE3K8rCzHjHEPBoeRBm`, `AaE3K8rCzHjHEPBoeRBo` | lecture de tree/blob pour audit de secrets | `FIXED_PENDING_SCAN` |
| `scripts/ci/audit-github-release.mjs` | `AaE3K8wVzHjHEPBoeRCl`, `AaE3K8wVzHjHEPBoeRCm` | lecture du remote et de HEAD, sans shell | `FIXED_PENDING_SCAN` |
| `scripts/ci/detect-scope.mjs` | `AaE3K8xAzHjHEPBoeRCw`, `AaE3K8xAzHjHEPBoeRCx` | vérification de SHA et diff de portée | `FIXED_PENDING_SCAN` |
| `scripts/ci/release-gate.mjs` | `AaE3K8w2zHjHEPBoeRCu`, `AaE3K8w2zHjHEPBoeRCv`, `AaE7ZBVmkxkMFlGl5f3N`, `AaE7ZBVmkxkMFlGl5f3O`, `AaE7ZBVmkxkMFlGl5f3P` | gate exact SHA, état, remote et branche | `FIXED_PENDING_SCAN` |
| `scripts/ci/run-dynamic-candidate-check.mjs` | `AaE3K8u0zHjHEPBoeRCa`, `AaE3K8u0zHjHEPBoeRCb`, `AaE3K8u0zHjHEPBoeRCc` | candidat, tree/blob et shim avec chemin Git fixe | `FIXED_PENDING_SCAN` |
| `scripts/ci/run-static-candidate-check.mjs` | `AaE3K8wfzHjHEPBoeRCn`, `AaE3K8wfzHjHEPBoeRCo`, `AaE3K8wfzHjHEPBoeRCp` | candidat, tree/blob et SHA exact | `FIXED_PENDING_SCAN` |
| `scripts/ci/validation-evidence.mjs` | `AaE3K8v3zHjHEPBoeRCe`, `AaE3K8v3zHjHEPBoeRCf`, `AaE3K8v3zHjHEPBoeRCg` | lecture de HEAD, index et preuves | `FIXED_PENDING_SCAN` |

Les 25 autres `javascript:S4036` ne sont pas absorbées par ce lot : 22 sont
hors des deux répertoires ciblés, tandis que trois signalements du périmètre
large concernent `taskkill`, `npx` et `npm`, et non Git. Ils restent
`TO_FIX` pour un lot distinct ; aucun n’est classé faux positif ou risque
accepté sans preuve technique et approbation explicite.

Preuves locales du lot : le test du résolveur passe 3/3, le test de l’audit
secret passe 11/11, le test des workspaces/candidat passe 6/6 et le garde
`pre-commit:guard` passe sur le candidat de 24 fichiers. La confirmation
SonarCloud reste `NOT_CONFIRMED` pour les 48 identifiants.

## Lot 4 — sécurité des workflows GitHub Actions

Ce lot est borné aux 30 anomalies `githubactions:S6505`,
`githubactions:S8543` et `githubactions:S8541` de l’inventaire. Les
identifiants ci-dessous sont conservés individuellement ; ils sont tous
`FIXED_PENDING_SCAN`, car les preuves locales ne constituent pas une
confirmation SonarCloud.

| Règle | Fichier et lignes | Identifiants SonarCloud | Statut local |
| --- | --- | --- | --- |
| `githubactions:S6505` | `.github/workflows/ci.yml:138,207,280,357,398,417,489,538,576,608,649` | `AaE3K8zqzHjHEPBoeRDG`, `AaE3K8zqzHjHEPBoeRDH`, `AaE3K8zqzHjHEPBoeRDI`, `AaE3K8zqzHjHEPBoeRDK`, `AaE3K8zqzHjHEPBoeRDM`, `AaE3K8zqzHjHEPBoeRDN`, `AaE3K8zqzHjHEPBoeRDO`, `AaE3K8zqzHjHEPBoeRDP`, `AaE3K8zqzHjHEPBoeRDQ`, `AaE3K8zqzHjHEPBoeRDR`, `AaE3K8zqzHjHEPBoeRDS` | `FIXED_PENDING_SCAN` |
| `githubactions:S6505` | `.github/workflows/e2e-supabase.yml:69,87,103,120,183,186,201,228` | `AaE3K8z1zHjHEPBoeRDU`, `AaE7ZBl1kxkMFlGl5f3R`, `AaE3K8z1zHjHEPBoeRDX`, `AaE3K8z1zHjHEPBoeRDZ`, `AaE3K8z1zHjHEPBoeRDb`, `AaE3K8z1zHjHEPBoeRDd`, `AaE3K8z1zHjHEPBoeRDf`, `AaE3K8z1zHjHEPBoeRDh` | `FIXED_PENDING_SCAN` |
| `githubactions:S6505` | `.github/workflows/sonarqube-manual.yml:39` | `AaE7ZBjpkxkMFlGl5f3Q` | `FIXED_PENDING_SCAN` |
| `githubactions:S8541` | `.github/workflows/ci.yml:283,360,653` | `AaE3K8zqzHjHEPBoeRDJ`, `AaE3K8zqzHjHEPBoeRDL`, `AaE3K8zqzHjHEPBoeRDT` | `FIXED_PENDING_SCAN` |
| `githubactions:S8543` | `.github/workflows/e2e-supabase.yml:87,103,120,183,186,201,228` | `AaE7ZBl1kxkMFlGl5f3S`, `AaE3K8z1zHjHEPBoeRDY`, `AaE3K8z1zHjHEPBoeRDa`, `AaE3K8z1zHjHEPBoeRDc`, `AaE3K8z1zHjHEPBoeRDe`, `AaE3K8z1zHjHEPBoeRDg`, `AaE3K8z1zHjHEPBoeRDi` | `FIXED_PENDING_SCAN` |

Les changements sont limités aux workflows et à leur test de contrat :

- les `npm ci` concernés et l’installation globale GitNexus utilisent
  `--ignore-scripts` au niveau de l’étape, sans configuration npm globale ni
  désactivation générale des scripts de cycle de vie ;
- les sept commandes `npx` Supabase/Playwright utilisent les exécutables
  locaux issus du lockfile ; `supabase` est résolu en `2.117.0` et
  Playwright/`@playwright/test` en `1.64.0` ;
- les trois installations Python utilisent `--only-binary=:all:`. La
  résolution `--dry-run` passe avec Python 3.14, version du runner CI ;
- les permissions, secrets, attestations, caches et jobs existants n’ont pas
  été supprimés ou élargis.

Preuves locales du lot : le test de contrat GitHub Actions passe 1/1,
`npm run check:github-actions` audite 7 workflows avec succès,
`npm ci --ignore-scripts --dry-run` passe, les binaires locaux Supabase et
Playwright répondent aux versions verrouillées, et les deux résolutions pip
avec `--only-binary=:all:` passent en Python 3.14. Aucun faux positif ni risque
accepté n’est enregistré pour ce lot ; la confirmation SonarCloud reste
`NOT_CONFIRMED` pour les 30 identifiants.

## Lot 5 — prévention du backtracking regex (`S8786`)

Ce lot traite les 92 alertes S8786 de l’inventaire : 27 TypeScript, 64
JavaScript et 1 Python. Les expressions ont été classées par usage réel
(validation, parsing, recherche, transformation ou traitement de contenu), puis
remplacées localement par des scanners bornés, des recherches déterministes ou
des boucles de trim. Les contrats d’entrée et de sortie ont été conservés ;
aucun parseur universel ni aucune limite d’API n’a été ajouté.

Les identifiants sont suivis individuellement. `FIXED_PENDING_SCAN` signifie
que la correction locale et les tests sont vérifiés, sans prétendre à une
confirmation SonarCloud. Les deux identifiants `public-service.ts` restent
`BLOCKED` car le fichier contenait déjà un diff Spogomi d’un autre writer ; ce
lot n’a pas écrasé ni fusionné silencieusement ce changement.

| Règle | Identifiants SonarCloud | Statut local |
| --- | --- | --- |
| `typescript:S8786` | `AaE3K8K5zHjHEPBoeQ9o`, `AaE3K8PezHjHEPBoeQ-M`, `AaE3K8a3zHjHEPBoeQ_W`, `AaE3K8D4zHjHEPBoeQ9H`, `AaE3K7_GzHjHEPBoeQ8o`, `AaE3K780zHjHEPBoeQ8c`, `AaE3K79MzHjHEPBoeQ8f`, `AaE3K77kzHjHEPBoeQ8U`, `AaE3K77kzHjHEPBoeQ8V`, `AaE3K77kzHjHEPBoeQ8W`, `AaE3K7-vzHjHEPBoeQ8m`, `AaE3K8FWzHjHEPBoeQ9Q`, `AaE3K8C4zHjHEPBoeQ9E`, `AaE3K8FuzHjHEPBoeQ9R`, `AaE3K7_szHjHEPBoeQ8s`, `AaE3K8HDzHjHEPBoeQ9Y`, `AaE3K8DMzHjHEPBoeQ9F`, `AaE3K76HzHjHEPBoeQ8S`, `AaE3K74MzHjHEPBoeQ8R`, `AaE3K8EYzHjHEPBoeQ9K`, `AaE3K8EYzHjHEPBoeQ9L`, `AaE3K8EYzHjHEPBoeQ9M`, `AaE3K8yRzHjHEPBoeRC6`, `AaE3K8ybzHjHEPBoeRC7`, `AaE3K8xMzHjHEPBoeRCy` | `FIXED_PENDING_SCAN` |
| `typescript:S8786` | `AaE3K8EjzHjHEPBoeQ9N`, `AaE3K8EjzHjHEPBoeQ9O` — `apps/web/src/lib/spogomi/public-service.ts:67,69` | `BLOCKED` |
| `javascript:S8786` | `AaE3K8eTzHjHEPBoeQ_b`, `AaE3K8eTzHjHEPBoeQ_c`, `AaE3K8eTzHjHEPBoeQ_d`, `AaE3K8enzHjHEPBoeQ_f`, `AaE3K8dzzHjHEPBoeQ_X`, `AaE3K8fVzHjHEPBoeQ_k`, `AaE3K8gmzHjHEPBoeQ_v`, `AaE3K8y0zHjHEPBoeRC9`, `AaE3K8irzHjHEPBoeRAI`, `AaE3K8irzHjHEPBoeRAJ`, `AaE3K8irzHjHEPBoeRAK`, `AaE3K8ifzHjHEPBoeQ_7`, `AaE3K8ifzHjHEPBoeQ_8`, `AaE3K8ifzHjHEPBoeQ_9`, `AaE3K8ifzHjHEPBoeQ_-`, `AaE3K8ifzHjHEPBoeQ__`, `AaE3K8ifzHjHEPBoeRAA`, `AaE3K8ifzHjHEPBoeRAB`, `AaE3K8ifzHjHEPBoeRAC`, `AaE3K8ifzHjHEPBoeRAD`, `AaE3K8ifzHjHEPBoeRAE`, `AaE3K8ifzHjHEPBoeRAF`, `AaE3K8oNzHjHEPBoeRA-`, `AaE7ZAtHkxkMFlGl5f3G`, `AaE3K8p0zHjHEPBoeRBS`, `AaE3K8p0zHjHEPBoeRBT`, `AaE3K8p0zHjHEPBoeRBU`, `AaE3K8p0zHjHEPBoeRBV`, `AaE3K8nWzHjHEPBoeRA1`, `AaE3K8pezHjHEPBoeRBO`, `AaE3K8pezHjHEPBoeRBP`, `AaE3K8q2zHjHEPBoeRBl`, `AaE3K8oDzHjHEPBoeRA9`, `AaE3K8rizHjHEPBoeRBr`, `AaE3K8rizHjHEPBoeRBs`, `AaE3K8qUzHjHEPBoeRBa`, `AaE3K8ppzHjHEPBoeRBQ`, `AaE3K8ppzHjHEPBoeRBR`, `AaE3K8otzHjHEPBoeRBB`, `AaE3K8otzHjHEPBoeRBC`, `AaE3K8otzHjHEPBoeRBD`, `AaE7ZA1_kxkMFlGl5f3K`, `AaE3K8rCzHjHEPBoeRBn`, `AaE3K8t3zHjHEPBoeRCJ`, `AaE3K8t3zHjHEPBoeRCK`, `AaE3K8uVzHjHEPBoeRCP`, `AaE3K8uVzHjHEPBoeRCQ`, `AaE3K8xjzHjHEPBoeRC1`, `AaE3K8s1zHjHEPBoeRB4`, `AaE7ZAMDkxkMFlGl5f2_`, `AaE3K8kuzHjHEPBoeRAO`, `AaE3K8lYzHjHEPBoeRAV`, `AaE3K8lYzHjHEPBoeRAW`, `AaE3K8lYzHjHEPBoeRAX`, `AaE3K8lYzHjHEPBoeRAY`, `AaE3K8lYzHjHEPBoeRAZ`, `AaE3K8lYzHjHEPBoeRAa`, `AaE3K8lYzHjHEPBoeRAb`, `AaE3K8lYzHjHEPBoeRAc`, `AaE3K8k5zHjHEPBoeRAP`, `AaE3K8k5zHjHEPBoeRAS`, `AaE3K8xuzHjHEPBoeRC2`, `AaE3K8xuzHjHEPBoeRC3`, `AaE3K8xuzHjHEPBoeRC4` | `FIXED_PENDING_SCAN` |
| `python:S8786` | `AaE3K8yAzHjHEPBoeRC5` — `maintenance/python/scripts/import_sheet.py:40` | `FIXED_PENDING_SCAN` |

Les fixtures S2187, assertions S8784 et autres code smells ne sont pas
absorbés par ce lot et restent dans le suivi exhaustif pour des lots distincts.

## Lot 6 — branches conditionnelles identiques (`S3923`)

Ce lot traite la première famille du chantier S3923 dans le domaine Actions.
Le snapshot SonarCloud source contient 82 anomalies S3923 (80 TypeScript et 2
JavaScript). Le fichier demandé comme point de départ,
`apps/web/src/components/navigation/app-navigation-ribbon-theme.ts`, ne porte
aucun S3923 dans cet inventaire ; ses 12 findings locaux sont des S7773 et
restent donc hors de ce lot.

Les sept expressions ci-dessous ont été confrontées à leurs consommateurs et
contrats locaux. Chaque condition retournait exactement la même valeur dans
ses deux branches ; la simplification conserve les textes, les variantes UI,
les tokens, le routage et la géométrie SVG. Aucun nouveau comportement n’a été
inventé et aucun test de régression métier n’était requis pour ces
simplifications sémantiques.

| Identifiant SonarCloud | Fichier et ligne | Décision locale | Statut |
| --- | --- | --- | --- |
| `AaE3K8QCzHjHEPBoeQ-O` | `apps/web/src/components/actions/action-creation-shell-sections.tsx:37` | Supprimer `fr ? "Date" : "Date"` ; libellé invariant | `FIXED_PENDING_SCAN` |
| `AaE3K8PBzHjHEPBoeQ-J` | `apps/web/src/components/actions/action-declaration/steps/ActionStepReview.tsx:285` | Supprimer le conditionnel ; titre invariant | `FIXED_PENDING_SCAN` |
| `AaE3K8PBzHjHEPBoeQ-K` | `apps/web/src/components/actions/action-declaration/steps/ActionStepReview.tsx:309` | Supprimer le conditionnel ; libellé invariant | `FIXED_PENDING_SCAN` |
| `AaE3K8QXzHjHEPBoeQ-Q` | `apps/web/src/components/actions/operation-audit-timeline.tsx:83` | Conserver la distinction succès/erreur, simplifier uniquement le `"OK"` invariant | `FIXED_PENDING_SCAN` |
| `AaE3K8QXzHjHEPBoeQ-R` | `apps/web/src/components/actions/operation-audit-timeline.tsx:94` | Supprimer `fr ? "Admin" : "Admin"` ; libellé invariant | `FIXED_PENDING_SCAN` |
| `AaE3K7-6zHjHEPBoeQ8n` | `apps/web/src/lib/actions/action-creation-routes.ts:147` | Supprimer le test `actionId` ; les deux chemins retournaient `"prepare"` | `FIXED_PENDING_SCAN` |
| `AaE3K79BzHjHEPBoeQ8d` | `apps/web/src/lib/actions/exports/export-form-media-svg.ts:217` | Fixer `y` à `290` ; les deux branches étaient identiques | `FIXED_PENDING_SCAN` |

Le reliquat S3923 du snapshot est de 75 identifiants, à traiter par domaines
cohérents. Les anomalies S3923 non modifiées restent `TO_FIX` jusqu’à leur
qualification et correction ; `FIXED_PENDING_SCAN` ne signifie pas qu’un scan
SonarCloud ultérieur a confirmé la résolution.

Preuves locales : syntaxe Node/Python, 15 suites Node ciblées, 10 fichiers
Vitest / 70 tests applicatifs, dont les entrées adverses longues. Le contrôle
de couverture SonarCloud externe reste `NOT_CONFIRMED`.

## Décisions humaines et faux positifs

Aucune décision humaine de type `FALSE_POSITIVE` ou
`ACCEPTED_PENDING_APPROVAL` n’est enregistrée dans ce suivi. En conséquence :

- aucune règle Sonar n’a été affaiblie ;
- aucun seuil, baseline, exclusion ou grâce n’a été modifié ;
- aucun risque n’est déclaré accepté ;
- aucune approbation n’est présumée ;
- aucun finding n’est clôturé par disparition supposée, changement de ligne ou
  différence entre deux révisions.

Les décisions humaines futures devront être ajoutées dans un audit daté avec
la preuve technique, le périmètre, la justification, le propriétaire et
l’approbation explicite correspondante. Elles devront aussi être répercutées
dans l’inventaire généré suivant, sans réutiliser ce snapshot comme source
`CURRENT`.

## Mécanismes d’audit exécutés

Le runner qualité canonique a été appelé :

```text
npm run audit:quality -- all
```

Résultat : `BLOCKED` avant génération, car son contrat exige un worktree propre
et `HEAD == origin/main`, alors que des changements SPOGOMI concurrents sont
présents dans l’index et le worktree. Cette garde n’a pas été contournée. Le
suivi Sonar a donc été généré par rapprochement read-only contre l’arbre Git de
`HEAD`, avec l’intégrité 491/491 contrôlée explicitement.

La procédure canonique de qualité existante couvre déjà la séparation entre
finding SonarCloud, preuve locale et confirmation externe ; aucune modification
de cette procédure n’était nécessaire dans ce lot.
