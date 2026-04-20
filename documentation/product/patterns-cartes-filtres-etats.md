# Patterns cartes, filtres, etats

## Flowchart des etats UI et transitions
```mermaid
flowchart TD
  A[Chargement] --> B{Donnees recues ?}
  B -- Non --> C[Erreur]
  B -- Oui --> D{Liste vide ?}
  D -- Oui --> E[Etat vide actionnable]
  D -- Non --> F[Succes]
  F --> G{Filtre actif ?}
  G -- Oui --> H[Succes filtre actif]
  G -- Non --> F
  H --> I{Resultat filtre vide ?}
  I -- Oui --> E
  I -- Non --> H
  C --> A
  E --> A
```
Fallback statique:
```md
![UI states fallback](../archive/fallback-ux-ui-states-flow.png)
```

## Cartes
- Information essentielle en premier (qui, quoi, ou, action).

## Filtres
- Filtres utiles au terrain: zone, type d'acteur, type d'action, statut.

## Etats
- Etats vides actionnables
- Etats d'erreur explicites
- Etats de chargement sobres
