---
name: cleanmymap-release-ci
description: "Utiliser quand une tâche touche GitHub Actions, hooks, validations, publication sur main, Vercel, scopes STAGED/PUSH_CANDIDATE/DYNAMIC_CANDIDATE ou contrats de CI CleanMyMap."
category: repository
risk: medium
source: local
tags: "[ci, github-actions, release, vercel, hooks, validation]"
---

# CleanMyMap — livraison et CI

## But

Modifier ou diagnostiquer la chaîne de livraison sans affaiblir ses garde-fous ni confondre les scopes de validation.

## Utiliser quand

- `.github/**`, hooks ou scripts CI changent ;
- un job GitHub Actions échoue ou est skippé de manière inattendue ;
- la logique `checks:fast` / `checks:full` est concernée ;
- un commit/push sur `main` doit être préparé ou vérifié ;
- Vercel ou la portée de publication fait partie du problème.

## Sources canoniques

Lire d'abord :

- `AGENTS.md` ;
- `scripts/AGENTS.md` ;
- `.github/AGENTS.md` si applicable ;
- `documentation/development/TESTING.md` ;
- la workflow ou le script exact concerné.

## Invariants

- Distinguer `WORKTREE`, `STAGED`, `PUSH_CANDIDATE` et `DYNAMIC_CANDIDATE`.
- Ne jamais remplacer le protocole Git courant par un workflow générique de « stage all + push ».
- Stager une allowlist du candidat ; ne jamais utiliser `git add -A` par commodité.
- Une modification de garde-fou doit préserver son intention et tester au moins un cas positif et un cas négatif quand pertinent.
- Un job `skipped` n'est pas un `PASS` de la fonctionnalité qu'il aurait testée.
- Ne pas affaiblir une policy, un seuil, une condition ou un timeout seulement pour obtenir du vert.
- Une erreur étrangère au candidat est rapportée séparément ; elle n'autorise pas à modifier un autre domaine.

## Validation

Choisir la preuve selon le blast radius. Une modification CI/gouvernance transversale exige les tests ciblés du script/workflow et les validations prévues par la gouvernance actuelle. `checks:full` est réservé à une préparation immédiate de déploiement Vercel ou à un prompt explicitement dédié ; il ne doit pas être lancé automatiquement sur le candidat final d'un lot.

Après push, vérifier la convergence et le statut réel du SHA publié ; ne pas inférer la CI depuis une exécution locale.
