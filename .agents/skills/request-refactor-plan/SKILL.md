---
name: request-refactor-plan
description: "Définir un plan de refactorisation CleanMyMap borné, fondé sur les responsabilités, contrats et tests actuels."
category: workflow
risk: medium
source: local
tags: "[request, refactor, plan]"
---

# Plan de refactorisation borné

## Déclenchement

Activer pour planifier une refactorisation de responsabilité, réduire une dette démontrée ou préparer une extraction de modules.

## Procédure

1. Lire la version actuelle de la zone et `documentation/development/conventions-modularisation.md`.
2. Qualifier la dette : problème réel, impact, consommateur, risque, preuve, cause. Ne pas utiliser la taille seule comme objectif.
3. Décider `EXTEND_EXISTING`, `CREATE_MODULE` ou `RESTRUCTURE_FIRST` ; préserver contrats publics, authentification, persistence et comportement utilisateur.
4. Établir le contrat avant/après, les points d'intégration, la compatibilité et les tests qui démontrent l'absence de régression.
5. Découper seulement sur les frontières autonomes ou déploiements/migrations nécessitant séquencement ; pas de micro-commits artificiels.
6. Indiquer la `STOP CONDITION` et les critères de retour arrière seulement lorsque le risque l'exige.

## Sortie

Plan d'intégration ou prompt Codex ciblé, sans créer une issue, branche, PR ni document supplémentaire. Toute intégration Git éventuelle revient à Codex selon la gouvernance.
