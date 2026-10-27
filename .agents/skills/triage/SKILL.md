---
name: triage
description: "Qualifier, prioriser et préparer des issues GitHub CleanMyMap avec les labels existants, sans mutation implicite."
category: workflow
risk: medium
source: local
tags: "[triage]"
---

# Triage d'issues CleanMyMap

## Déclenchement

Activer pour classer, comparer, prioriser ou préparer des issues/bugs explicitement désignés. Ne pas supposer que les labels et états d'un template tiers existent sur GitHub.

## Méthode

1. Lire l'issue actuelle, ses commentaires et labels existants, puis les contrats et tests du domaine concernés sur `main`.
2. Séparer `BUG_DÉMONTRÉ`, `AMÉLIORATION`, `QUESTION`, `RÉGRESSION`, `DETTE` et `NON_REPRODUIT`. Une hypothèse critique n'est pas un bug prouvé.
3. Estimer gravité par sécurité/données, utilisateurs touchés, fréquence prouvée, coût de réparation et contournement réel.
4. Détecter doublons, régressions connues, dépendances et cause commune ; fusionner conceptuellement les corrections d'une même responsabilité.
5. Proposer une priorité et un état dans les **labels réellement disponibles**, sans remplacer une décision produit par un état générique.
6. Préparer un brief d'intégration avec entrée, résultat, scope, invariants, preuves et condition d'arrêt. Les `AGENT-BRIEF.md` et `OUT-OF-SCOPE.md` inclus peuvent être consultés comme templates non canoniques.

## Sortie

Recommandation argumentée. Les mutations d'issues, labels et commentaires sont réservées à un intégrateur autorisé et demandées explicitement ; ChatGPT reste en lecture et préparation. Ne pas ajouter d'avertissement artificiel non exigé.
