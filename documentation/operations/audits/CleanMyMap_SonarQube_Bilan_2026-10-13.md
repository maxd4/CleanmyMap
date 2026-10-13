# CleanMyMap : baseline SonarQube Cloud et revue critique initiale

> **Statut : SNAPSHOT / AUDIT READ-ONLY**. Analyse SonarQube exportée le 13 octobre 2026 à 21:48:53 UTC.
>
> **Commit analysé :** `87415b54d2c1cb15edbeabda08e4e26114bca902` (analyse à 21:31:32 UTC).
> **Projet :** [SonarQube Cloud `maxd4_CleanmyMap`](https://sonarcloud.io/project/overview?id=maxd4_CleanmyMap).
>
> **Note de fraîcheur :** ce n'est pas un rapport sur le `main` ultérieur. Le commit GitHub `c934cefee9aaba1caceeab5e25a5ee3f032a395b` a été consulté pour une vérification ponctuelle du code. Aucune CI, aucun test et aucune analyse distante n'a été exécuté par ChatGPT.

## Bilan chiffré

| Mesure | SonarQube |
|---|---:|
| Fichiers analysés | 4,061 |
| Lignes de code (`ncloc`) | 500,782 |
| Total issues | 466 |
| Bugs | 192 |
| Vulnerabilities | 118 |
| Code smells | 156 |
| Blocker / Critical / Major / Minor | 21 / 83 / 266 / 96 |
| Fiabilité / sécurité / maintenabilité | E / D / A |
| Dette de maintenabilité (`sqale_index`) | 2058 minutes, soit 34 h 18 |
| Taux de duplication | 4.9 % |
| Lignes dupliquées | 27,409 |
| Blocs dupliqués | 1,477 |
| Complexité cyclomatique agrégée | 76,636 |
| Complexité cognitive agrégée | 41,222 |
| Couverture web/mobile | NON MESURÉE (aucune mesure couverture transmise dans l'export) |
| Quality Gate | OK sur le **nouveau code** entre 21:21 et 21:31 UTC |

`34 h 18` est une estimation conventionnelle de remédiation de maintenabilité : ce n'est pas le coût des 466 anomalies ni une estimation de calendrier. Le `sqale_debt_ratio` arrondi à `0.0` n'invalide pas les 2 058 minutes.

### Qualité et exhaustivité de l'export

- `issues.total=466`, `issues.exported=466`, `issues.complete=true`.
- `files.total=4061`, `files.exported=4061`, `files.complete=true`.
- `hotspots.total=0`, `hotspots.complete=true`.
- `errors=[]`.
- Le tableau `qualityGate` comporte **4 conditions**, toutes sur le **nouveau code**. En l'absence de couverture et avec une période limitée à deux analyses espacées de dix minutes, il ne reflète pas la qualité globale de l'historique.
- Les notes fiabilité E et sécurité D s'appliquent au code global, malgré le Quality Gate OK.

## Périmètre et concentration

| Domaine | Fichiers | NCLOC | Issues | Vulnerabilities |
|---|---:|---:|---:|---:|
| Web runtime/tests | 3,341 | 403,866 | 198 | 12 |
| Root tooling scripts | 241 | 38,258 | 195 | 70 |
| SQL migrations | 259 | 26,608 | 0 | 0 |
| Web tooling scripts | 49 | 8,601 | 25 | 5 |
| Mobile | 68 | 6,817 | 6 | 2 |
| Maintenance | 52 | 5,100 | 1 | 0 |
| Documentation | 8 | 4,575 | 10 | 0 |
| E2E | 23 | 3,571 | 2 | 0 |
| Other | 14 | 2,418 | 0 | 0 |
| GitHub config | 6 | 968 | 29 | 29 |

**104 vulnérabilités sur 118** sont signalées dans les scripts racine, scripts web ou configurations GitHub (70+5+29). Ce comptage décrit les chemins, pas la réalité ou l'exploitabilité des vulnérabilités.

## Grandes familles d'alertes (issues, pas causes racines distinctes)

| Famille | Issues | Règles |
|---|---:|---|
| Identiques conditionnels | 82 | typescript:S3923, javascript:S3923 |
| PATH exécution | 68 | javascript:S4036 |
| Regex complexité | 88 | javascript:S8786, typescript:S8786 |
| Tri sans comparateur | 74 | javascript:S2871, typescript:S2871 |
| CI installation dynamique | 29 | githubactions:S6505, githubactions:S8543, githubactions:S8541 |
| Tests non reconnus | 16 | javascript:S2187, typescript:S2187 |

Les comparateurs `sort()` peuvent être parfaitement corrects selon les types et l'ordre attendu. Les alertes PATH peuvent être des avertissements de durcissement du processus. Les regex doivent être testées avec des entrées bornées ou hostiles selon l'exposition. Les tests signalés comme « vides » peuvent être des tests `node:test` à assertions au niveau module ou des suites assemblées par fonctions.

## Constats contextualisés par lecture du code

### À qualifier en priorité

1. **Exécution dynamique** : `scripts/design/generate-design-system-board.mjs` (Sonar `javascript:S1523`, ligne 115). Le générateur évalue des littéraux extraits de sources avec `Function(...names, ...)`. Une vraie interprétation de code est présente. Le risque dépend du contrôle de la source lue; privilégier une analyse de littéraux sans exécution si une correction ciblée devient justifiée.
2. **Nettoyage temporaire** : `scripts/dev/clean-local-temp.mjs` (`javascript:S5443`, doublon de deux issues sur `tempRoot` ligne 6). Revoir la portée des chemins, symlinks, races et protections avant suppression. La présence de `os.tmpdir()` n'est pas en soi une vulnérabilité démontrée.
3. **Entrées CLI / traversal** : `scripts/reports/assemble-impact-report.mjs:44` et `scripts/checks/check-public-e2e-artifact.mjs:49` (`jssecurity:S8707`). Distinguer le contrat d'accès CLI et le contrôle réel du chemin; ne pas déduire une exploitation web d'un script local.
4. **Exécutions PowerShell** : `scripts/ci/run_checks2.ps1:67`, `scripts/ci/run_focus.ps1:28` (`S8659`). `Invoke-Expression $Command` est présent. Examiner l'origine des chaînes et les callers pour juger l'injection.
5. **Authentification et traces** : deux alertes `jssecurity:S5145` concernant des sorties de logs Clerk. Vérifier la neutralisation des retours à la ligne et la provenance des données avant correction.
6. **GPS mobile et identifiants client** : `apps/mobile/lib/gps-point-identity.ts:5` (`typescript:S2245`). `crypto.randomUUID` est prioritaire avec `Math.random` en fallback; vérifier l'invariant d'unicité/idempotence requis et la collision sous les vraies plateformes. Ce n'est pas automatiquement un défaut cryptographique de session.
7. **Imports SPOGOMI / expressions régulières** : `apps/web/src/lib/spogomi/preparation-import-workbook.ts`, alertes `S8786` et contrôle de caractères. Les entrées proviennent de fichiers importés : vérifier la complexité asymptotique sous bornes métier et leurs tests.

### Probables faux positifs ou sévérités exagérées

- `scripts/data/summarize-jsonl-analysis.mjs:175`, deux issues **BLOCKER** `S2189` : la boucle `for` incrémente effectivement la date via `cursor.setUTCDate(cursor.getUTCDate()+1)`, tout en bornant à 400 jours. Le signal Sonar « non modifié dans la boucle » ne décrit pas correctement la sémantique. Ne pas réécrire pour masquer le warning sans preuve de bug.
- `scripts/checks/check-github-actions-security.test.mjs` (`S2187`, BLOCKER) comporte des assertions exécutables au niveau module. `apps/web/src/app/api/admin/moderation/route.test.ts` assemble des scénarios Vitest externes. L'affirmation « aucun test » n'est pas démontrée.
- `apps/web/src/lib/actions/exports/gpx-serializer.ts:44`, `S5332` : l'URL HTTP est une chaîne d'**identifiant de namespace GPX 1.1** ; ne pas la remplacer par HTTPS sans vérifier le standard et les attentes des consommateurs.
- `apps/web/src/lib/actions/action-creation-routes.ts:147`, `S3923` : branches `? "prepare" : "prepare"` identiques, **simplification sémantique probable** ; ce n'est pas en soi une défaillance fonctionnelle prouvée.

## Priorités retenues

- **P0 : revue de sécurité ciblée** des exécutions dynamiques (JS/PowerShell), écritures/suppressions et chemins influencés par des entrées externes. Classer l'exposition réelle. Aucune vulnérabilité exploitable n'est déclarée confirmée sans chemin d'attaque démontré.
- **P1 : fiabilité métier** : flux import SPOGOMI, regex d'import; gestion de statuts et conditions; identifiants GPS et idempotence. Préférer les tests de cause racine et de bornes.
- **P1 : observabilité** : raccorder les rapports LCOV du web et du mobile. Sans cela, aucune comparaison quantitative de couverture n'est valable.
- **P2 : hygiène CI et maintenabilité** : revue des commandes `npx`, versions de dépendances; distinguer scripts d'installation nécessaires des exécutions non contrôlées; éliminer des conditions identiques quand le contrat est établi.
- **Ne pas faire** : supprimer des tests signalés « vides », changer des namespaces HTTP normatifs, forcer `--ignore-scripts` sans impact établi, reclasser les 466 issues en défauts avérés ou exclure les scripts de Sonar pour obtenir une note verte.

## Stratégie d'intégration

1. Conserver ce rapport comme une **baseline historique**, sans le présenter comme CURRENT.
2. Exécuter `npm run audit:quality -- all` et `npm run audit:modularity` selon leurs préconditions sur `main` stable, sans recalculer leurs scanners hors runner.
3. Avant chaque lot de correction, relire l'état actuel de `maxd4/CleanmyMap` sur `main`, les règles scoped, les callers et les tests.
4. Regrouper par cause racine, valider le comportement ou le risque, puis seulement écrire des corrections et tests ciblés. Aucun refactor mécanique à partir de la seule sévérité.
5. Garder les audits AuthZ, RLS et SPOGOMI indépendants : SonarQube ne valide ni une transaction PostgreSQL réelle, ni une permission effective en production.

**Provenance :** fichier transmis par l'utilisateur `sonarqube-cleanmymap-2026-10-13.json` (schéma `cleanmymap-sonar-baseline-v1`). Aucune sortie Sonar postérieure ni état de production vérifié.
