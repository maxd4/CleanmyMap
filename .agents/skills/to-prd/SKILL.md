---
name: to-prd
description: "Rédiger un PRD CleanMyMap fondé sur les besoins, le runtime actuel et des critères testables, sans publication automatique."
category: workflow
risk: medium
source: local
tags: "[to, prd]"
---

# Spécification produit à partir d'un besoin CleanMyMap

## Déclenchement

Activer lorsque l'utilisateur demande un PRD, une spécification ou une définition de fonctionnalité. Ne pas imposer une interview ni publier automatiquement sur GitHub.

## Méthode

1. Partir des besoins fournis et de `documentation/product/VISION_OBJECTIFS.md`, `PARCOURS_UTILISATEURS.md`, `documentation/pages_site/INDEX.md` et de la fiche route `CURRENT` si pertinent.
2. Vérifier le runtime et l'owner avant de présenter une fonctionnalité comme absente ou déjà active.
3. Définir le problème utilisateur, le public, l'objectif mesurable et ce qui **n'est pas** prévu ; distinguer `CURRENT` et `TARGET`.
4. Décider le parcours, les états, erreurs, permissions, sources de données, contraintes scientifiques/juridiques et dépendances réelles.
5. Énoncer des critères d'acceptation **testables**, y compris sécurité, données partielles, limites et compatibilité.
6. Comparer l'extension de l'existant à un nouveau module seulement s'il y a une vraie responsabilité autonome.

## Sortie

PRD court mais complet : problème, objectifs, utilisateurs, parcours, contrat fonctionnel, non-objectifs, risques, preuves et `STOP CONDITION`. Aucun label, issue ni ADR créé automatiquement.
