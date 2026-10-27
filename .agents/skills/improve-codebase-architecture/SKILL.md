---
name: improve-codebase-architecture
description: "Analyser les frontières et décider une amélioration architecturale CleanMyMap justifiée par un défaut mesurable, sans refactoring cosmétique."
category: workflow
risk: medium
source: local
tags: "[improve, codebase, architecture]"
---

# Amélioration architecturale fondée sur des preuves

## Déclenchement

Activer pour analyse des frontières, responsabilités, dépendances, cycles, top-heavy, croissance des modules, ou refonte architecturale explicitement demandée. Ne pas l'activer pour une simple correction ciblée.

## Méthode

1. Lire `documentation/architecture/master-architecture.md`, `documentation/development/conventions-modularisation.md`, les ADR pertinents, les scoped `AGENTS.md`, le code actuel et ses consommateurs.
2. Identifier un **symptôme mesurable** : complexité, couplage, cycles, duplication, risque de régression, coût ou défaut de contrat, pas uniquement des fichiers volumineux.
3. Dessiner la responsabilité de l'owner, ses entrées/sorties, effets, dépendances et tests ; comparer `EXTEND_EXISTING`, `CREATE_MODULE` et `RESTRUCTURE_FIRST`.
4. Privilégier les modules profonds réellement autonomes ; ne pas extraire de fichiers pour les rendre courts ni créer de façade re-exportant tout.
5. Estimer coût de migration, surface de risque, consommateurs, compatibilité et preuve de bénéfice ; privilégier un lot cohérent complet.
6. Préparer un plan limité à la frontière réellement justifiée, avec invariants et `STOP CONDITION`.

## Livrable

Diagnostic, recommandation, trajectoire de migration et validation. Une visualisation HTML ou un ADR n'est créée que sur demande ou si elle apporte une preuve décisive. Ne pas ouvrir d'issue automatiquement.
