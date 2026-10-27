---
name: qa
description: "Reproduire, qualifier et expliquer un bug CleanMyMap, définir ses preuves et son correctif minimal sans ouvrir automatiquement une issue."
category: workflow
risk: medium
source: local
tags: "[qa]"
---

# Reproduction et qualification d'anomalie

## Déclenchement

Activer lorsque l'utilisateur décrit un bug, un comportement inattendu ou souhaite une session de QA ciblée.

## Procédure

1. Relever attendu/observé, surface, acteur, état métier, environnement et reproduction déjà fournis, sans reposer les questions résolues.
2. Vérifier `main`, suivre entrée -> propriétaire métier -> dépendances -> consommateurs -> tests, puis relever voies alternatives.
3. Reproduire dans le harness autorisé si possible ; sinon séparer `REPRODUIT`, `NON_REPRODUIT`, `BLOQUÉ` et `HYPOTHÈSE`.
4. Comparer avec le contrat `CURRENT`, la source de vérité des données, les frontières AuthN/AuthZ et les états d'erreur.
5. Localiser la cause racine démontrée ou fournir une expérience discriminante ; ne pas confondre coïncidence et causalité.
6. Proposer le correctif minimal **complet**, ses tests positif/négatif/limite et la condition d'arrêt. Éviter le nettoyage hors périmètre.

## Livrable

Rapport bref ou prompt Codex borné selon la demande. La création d'une GitHub Issue et l'usage de labels ne sont **jamais implicites** ; ils nécessitent une demande explicite. Les tests non exécutés sont signalés.
