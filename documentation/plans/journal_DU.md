# Journal DU

Ce document sert de porte d'entrée courte vers le journal d'impact lié aux ateliers DU.

## Usage

- suivre les évolutions issues des ateliers;
- retrouver les décisions liées à la sobriété numérique;
- lire les ajouts qui ont été conservés dans le projet;
- disposer d'un résumé téléchargeable et partageable.

## Référence principale

Le journal détaillé et tenu à jour se trouve dans [journal_impact_DU.md](./journal_impact_DU.md).

## Schéma des liens

Le schéma suivant résume les relations entre les documents DU, le rapport d'impact IA, l'estimateur d'impact et l'estimateur des quotas gratuits des services web utilisés.

```mermaid
flowchart TD
  JD["documentation/plans/journal_DU.md"]
  AJ["documentation/plans/atelier_DU.md"]
  RI["documentation/plans/rapport_impact/impact_IA.md"]
  GI["documentation/plans/rapport_impact/graphique_impact_CO2e.md"]
  JI["documentation/plans/journal_impact_DU.md"]
  EI["Estimateur d'impact environnemental"]
  QG["Estimateur des quotas gratuits<br/>des services web utilisés"]

  JD --> AJ
  JD --> RI
  JD --> JI
  RI --> GI
  AJ --> EI
  RI --> EI
  EI --> QG
  QG --> RI
  QG --> EI

  style JD fill:#0f172a,stroke:#38bdf8,color:#e2e8f0
  style AJ fill:#111827,stroke:#34d399,color:#e5e7eb
  style RI fill:#111827,stroke:#f59e0b,color:#e5e7eb
  style GI fill:#111827,stroke:#f97316,color:#e5e7eb
  style JI fill:#111827,stroke:#a78bfa,color:#e5e7eb
  style EI fill:#0b1220,stroke:#fb7185,color:#fee2e2
  style QG fill:#0b1220,stroke:#22c55e,color:#dcfce7
```

Lecture rapide:

- `journal_DU.md` sert d'index court.
- `atelier_DU.md` fixe les règles de lecture et de sobriété.
- `journal_impact_DU.md` conserve l'historique détaillé.
- `rapport_impact/impact_IA.md` est le rapport principal.
- `rapport_impact/graphique_impact_CO2e.md` documente la méthode du graphique.
- l'estimateur d'impact agrège les signaux du projet et alimente le rapport;
- l'estimateur des quotas gratuits aide à documenter les limites et hypothèses des services web utilisés.
