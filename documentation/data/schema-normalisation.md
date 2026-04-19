# Schema de normalisation

## Architecture entites + relations
```mermaid
flowchart LR
  IMPORT[Import source] --> ACTION[Action normalisee]
  IMPORT --> SPOT[Spot normalise]
  IMPORT --> EVENT[Evenement communautaire]
  ACTION --> REPORT[Rapports / classements]
  SPOT --> REPORT
  EVENT --> REPORT
  ACTION --> PROG[Profil progression]
  EVENT --> PROG
  SPOT --> PROG
```
Fallback statique:
```md
![Schema normalisation fallback](../archive/fallback-data-schema-normalisation.png)
```

## Entites principales
- Action
- Spot
- Evenement communautaire
- Profil progression

## Principes
- Unifier les champs minimaux (date, localisation, statut, auteur/source)
- Normaliser les champs de volume/qualite avant agrgation
- Marquer explicitement les donnees estimees/proxy
