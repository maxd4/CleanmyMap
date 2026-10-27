---
name: cleanmymap-design-system
description: "Concevoir ou refaire une UI CleanMyMap, maquettes, palettes, boutons, PageHeader, cartes, responsive et modes d affichage."
category: repository
risk: medium
source: local
tags: "[design, system]"
---

# Composition UI et design system CleanMyMap

## Déclenchement

Activer pour création/refonte de page, maquette, responsive, tokens, cartes, CTA, navigation, PageHeader, motion ou modes d'affichage. Utiliser en complément du skill navigateur pour valider le rendu, et du skill accessibilité pour les contrôles spécialisés.

## Sources

`documentation/design-system/README.md`, `Design-system.md`, `BLOC_COLOR_SYSTEM_PREMIUM.md`, `PAGE_HEADER.md`, `SURFACES_CARDS.md`, `ACTIONS_BUTTONS.md`, `LAYOUT_SPACING.md`, `DISPLAY_MODES_CANONICAL.md`, fiche `documentation/pages_site/routes/` de la page concernée et composant réel.

## Méthode

1. Lire la fiche de page `CURRENT` et la famille visuelle, puis isoler le comportement à préserver : données, actions, erreurs, responsive et AuthZ.
2. Une maquette fournie est **référence visuelle** de composition, proportion, densité et hiérarchie, non source de vérité fonctionnelle. Documenter les écarts imposés par le runtime/design system.
3. Réutiliser `PageHeader`, les primitives `CmmCard`, `CmmButton`, et les tokens existants. Le H1 ne se redéfinit pas localement ; hiérarchie de boutons par importance et non couleur du bloc.
4. Respecter les familles de couleurs, contraste réel et trois modes `exhaustif`, `minimaliste`, `sobre` sans masquer les fonctionnalités ni données essentielles.
5. Prévoir chargement/vide/erreur/refus/succès, interaction clavier, tailles mobiles et reduced-motion selon le périmètre.
6. Garder UI et état découplés de la logique métier, sans extraction artificielle de JSX.

## Validation

Comparer le rendu local aux largeurs représentatives et aux états nécessaires ; rapporter les écarts de structure et de comportement. Aucun mockup ne prouve qu'une API ou autorisation fonctionne.
