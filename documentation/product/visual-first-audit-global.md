# Audit global visual-first

Date: 2026-04-18

## Perimetre audite
- Fichiers scannes: `documentation/**/*.md` et `documentation/**/*.txt`
- Volume: **93 fichiers**
- Avec visuel (Mermaid ou image): **9**
- Sans visuel: **84**
- Fichiers actifs (hors `repo-docs` et `du/archive`): **75**
- Fichiers actifs sans visuel: **66**
- Fichiers actifs textuels lourds sans visuel (>= 90 mots): **22**

## Batch conversion (etat apres execution)

- Batch A (A1 -> A10): execute.
- Batch B:
  - B1/B2/B3/B4 executes.
  - B5: aucune page `documentation/repo-docs/wiki/*.md` retenue (pas de reference externe active).
- Batch C (C1 -> C5): execute.

## Prompts executes supprimes
- Les items de prompts Visual-First A/B/C ont ete retires de ce backlog pour eviter le re-travail.
- Le suivi d'execution detaille reste dans `documentation/du/session/latest-session.md`.

## Etat actuel par domaines (lecture rapide)
- Onboarding/architecture: deja partiellement visualises.
- Produit: couverture visuelle moyenne (matrice/parcours OK, vision/roadmap non).
- Data: couverture faible (textes lourds, aucun schema).
- Securite: couverture faible (1 visuel, 3 docs textuelles).
- Exploitation: couverture moyenne (deploiement visualise, incidents/regression non).	
