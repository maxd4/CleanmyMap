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

La méthode canonique de qualification et de comparaison avant/après se trouve
dans [`repo-quality-rules.md`](../../development/repo-quality-rules.md).
Elle distingue SonarQube des audits internes, CodeQL, Semgrep et des tests,
et interdit de traiter un finding statique comme une preuve autonome
d'exploitabilité. Aucun rapport « après » n'est créé avant une nouvelle
analyse SonarQube réelle ; la couverture reste `NON MESURÉE` en l'absence de
rapport importé.

## Sources courantes associées

Les règles et procédures actuelles restent dans les documents canoniques de
`documentation/operations/`, `documentation/database/`,
`documentation/security/` et `documentation/architecture/` selon la
responsabilité concernée.
