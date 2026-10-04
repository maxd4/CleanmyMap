---
name: cleanmymap-accessibility
description: "Utiliser quand une modification CleanMyMap affecte navigation clavier, focus, sémantique, contraste, formulaires, dialogues, médias ou comportement d'assistance."
category: repository
risk: medium
source: local
tags: "[accessibility, a11y, keyboard, focus, semantics, contrast]"
---

# CleanMyMap — accessibilité

## But

Préserver une interface utilisable au clavier, compréhensible sémantiquement et robuste avec les technologies d'assistance.

## Règles

- Préférer les éléments HTML natifs avant d'ajouter ARIA.
- Tout contrôle interactif doit avoir un nom accessible et être utilisable au clavier.
- Préserver un ordre de tabulation logique ; ne pas utiliser `tabIndex` positif pour réparer artificiellement le focus.
- Un focus visible ne doit pas être supprimé sans remplacement équivalent ou supérieur.
- Les dialogues, menus et popovers doivent gérer entrée/sortie de focus et fermeture attendue.
- Associer labels, descriptions et erreurs aux champs de formulaire ; ne pas dépendre uniquement de la couleur.
- Respecter la hiérarchie des titres et la sémantique structurelle de la page.
- Les icônes décoratives restent cachées aux technologies d'assistance ; les icônes porteuses de sens ont un label.
- Vérifier contraste et lisibilité dans le contexte réel du design system.
- Respecter `prefers-reduced-motion` lorsque l'animation est non essentielle.

## Validation

Pour une UI interactive, tester au minimum clavier + focus visible + nom accessible. Utiliser les checks automatisés disponibles comme filet de sécurité, mais ne pas les considérer comme preuve exhaustive d'accessibilité.
