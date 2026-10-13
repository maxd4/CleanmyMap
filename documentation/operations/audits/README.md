# Audits opérationnels

Ce dossier contient des audits, diagnostics et photographies techniques liés à
l'exploitation de CleanMyMap.

Ces documents sont des **preuves contextualisées**, pas des contrats `CURRENT`.
Ils peuvent contenir des chemins, compteurs, probabilités, priorités ou états
qui étaient vrais au moment de l'audit mais qui ne doivent pas être appliqués
comme règles actuelles sans vérification du code et des sources canoniques.

## Règles

- conserver le contenu historique d'un audit lors d'un simple reclassement ;
- ne pas moderniser ses chemins ou conclusions uniquement pour les aligner sur
  l'état présent ;
- ne pas utiliser un audit comme source de vérité pour une règle durable ;
- lorsqu'une conclusion devient une règle durable, la documenter dans la source
  `CURRENT` du domaine puis laisser l'audit comme preuve de contexte ;
- les rapports entièrement générés et reproductibles doivent vivre sous
  `artifacts/`, pas dans ce dossier.

## Baseline SonarQube Cloud

[`CleanMyMap_SonarQube_Bilan_2026-10-13.md`](CleanMyMap_SonarQube_Bilan_2026-10-13.md)
conserve le premier snapshot SonarQube Cloud du projet
[`maxd4_CleanmyMap`](https://sonarcloud.io/project/overview?id=maxd4_CleanmyMap).
Il s'agit d'une preuve historique `SNAPSHOT / AUDIT`, liée à un SHA et à une
date d'analyse précis, et non d'un état `CURRENT` de `main`.

La configuration reproductible actuelle est portée par
[`sonar-project.properties`](../../../sonar-project.properties) et le workflow
manuel [`sonarqube-manual.yml`](../../../.github/workflows/sonarqube-manual.yml).
Le workflow est déclenchable uniquement par `workflow_dispatch`, analyse la
référence sélectionnée dans GitHub, installe d'abord le lockfile avec `npm ci`,
puis transmet uniquement le secret GitHub `SONAR_TOKEN` au scanner. Il ne se
lance ni sur `push` ni sur `pull_request`.

Le projet SonarQube Cloud doit exister sous la clé `maxd4_CleanmyMap`, et le
secret de dépôt ou d'organisation `SONAR_TOKEN` doit être configuré dans GitHub
avant la première exécution. Le workflow ne crée pas le projet, ne modifie pas
les réglages SonarQube Cloud et ne déclenche pas d'analyse depuis le checkout
local.

Les sources JS/TS/Python et les tests sont classés dans
`sonar-project.properties`; les inclusions de tests retirent automatiquement
ces fichiers du périmètre source afin de conserver une classification
disjointe. Les trois `tsconfig.json` existants sont réutilisés tels quels et
les extensions npm sont résolues par les dépendances installées par `npm ci`.
Les exclusions explicites se limitent aux dépendances et artefacts générés,
pas aux sources métier, à la couverture ou à la duplication.

La méthode canonique de qualification et de comparaison avant/après se trouve
dans [`repo-quality-rules.md`](../../development/repo-quality-rules.md).
Elle distingue SonarQube des audits internes, CodeQL, Semgrep et des tests,
et interdit de traiter un finding statique comme une preuve autonome
d'exploitabilité. Aucun rapport « après » n'est créé avant une nouvelle
analyse SonarQube réelle ; la couverture reste `NON MESURÉE` tant qu'un
rapport LCOV n'est pas produit puis déclaré explicitement dans la configuration
de l'analyse.

## Sources courantes associées

Les règles et procédures actuelles restent dans les documents canoniques de
`documentation/operations/`, `documentation/database/`,
`documentation/security/` et `documentation/architecture/` selon la
responsabilité concernée.

## Bilans d'exécution des prompts liés aux PR

[`pr-prompt-execution-bilans-2026-10-14.md`](./pr-prompt-execution-bilans-2026-10-14.md)
conserve le snapshot des quatre lots PR exécutés les 13–14 octobre 2026.
Chaque entrée relie le prompt, la décision, le SHA, les validations locales,
les workflows distants et les limites de preuve. Ce registre est un audit
contextualisé : il ne remplace pas la PR, le code courant, les règles de
gouvernance ou une preuve de production.
