---
name: zoom-out
description: "Obtenir une carte architecturale concise des modules, flux, dépendances et contrats CleanMyMap avant une décision."
category: workflow
risk: safe
source: local
tags: "[zoom, out]"
disable-model-invocation: true
---

# Revenir au niveau architectural du problème

## Déclenchement

Activer sur demande « zoom-out », pour comprendre une zone inconnue ou distinguer un symptôme local de sa frontière métier réelle.

## Méthode

1. Localiser le module dans `documentation/architecture/system-overview.md`, puis consulter `main` et le `AGENTS.md` scoped pertinent.
2. Tracer **entrée → owner → contrats → consommateurs → données/effets → tests**. Réduire l'exploration aux voisins utiles.
3. Distinguer responsabilité métier, UI, route/API, AuthN/AuthZ, stockage et services externes.
4. Signaler les responsabilités réellement dupliquées et les dettes démontrées sans proposer un refactoring par défaut.

## Sortie

Carte concise des composants, flux, invariants, zones inconnues et prochaine décision à prendre. Aucun changement, publication ou diagnostic exhaustif par simple activation.
