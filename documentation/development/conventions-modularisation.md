# Conventions de modularisation

## Regles
- Preferer des modules metier courts, testes et nommes par domaine.
- Garder des facades d'exports pour limiter les ruptures d'import.
- Eviter les fichiers monolithiques quand ils cumulent trop de responsabilites, pas seulement quand ils sont longs.

## Lecture des warnings ESLint
- `max-lines` est un signal d'alerte, pas un objectif en soi.
- Un fichier JSX de page peut etre long s'il reste declaratif et lineaire.
- Un fichier court mais dense doit etre extrait s'il cache plusieurs sous-responsabilites, transformations de donnees ou branches logiques.
- La priorite est la densite fonctionnelle, puis la longueur, puis la profondeur JSX.

## Politique recommandee
- Pages et gros rendus JSX: accepter des fichiers plus longs si la structure reste lisible.
- Logique metier (`lib/`, `hooks/`, `config/`, `data/`, `types/`): rester plus strict sur la taille et la complexite.
- Favoriser l'extraction quand un bloc devient:
  - une etape de parcours utilisateur distincte,
  - une transformation de donnees reusable,
  - une logique conditionnelle avec plusieurs variantes,
  - un sous-composant qui peut etre compris sans lire tout le fichier parent.

## Pattern recommande
1. `*.types.ts`
2. `*.formulas.ts` / `*.helpers.ts`
3. `*.data.ts`
4. `*.service.ts` ou facade domaine

## Validation minimale
- `npm -C apps/web run typecheck`
- `npm -C apps/web run lint`
- tests cibles des modules modifies

## Exemple de decision
- Garder le fichier long si:
  - il assemble principalement des sections visuelles,
  - il ne multiplie pas les branches ni les calculs,
  - il expose une progression metier claire.
- Modulariser le fichier court si:
  - il entasse plusieurs etats et transformations,
  - il contient plusieurs micro-flux qui se croisent,
  - il devient difficile de voir le contrat du composant en une lecture.
