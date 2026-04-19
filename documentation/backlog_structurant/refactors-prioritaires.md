# Refactors prioritaires

## Roadmap visuelle avec dependances
```mermaid
flowchart LR
  R1[Refactor registry/navigation] --> R2[Consolidation contrats data]
  R2 --> R3[Harmonisation adaptateurs API]
  R3 --> R4[Stabilisation tests non-regression]
  R1 --> R4
```
Fallback statique:
```md
![Refactors roadmap fallback](../archive/fallback-backlog-refactors-roadmap.png)
```

- Modularisation des zones metier encore fortement couplees.
- Harmonisation des contrats de donnees transverses (actions/spots/rapports).
- Consolidation des adaptateurs API pour limiter la duplication.
