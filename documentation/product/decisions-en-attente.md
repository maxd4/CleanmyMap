# Decisions en attente

## Decision tree des arbitrages produit
```mermaid
flowchart TD
  A[Decision a arbitrer] --> B{Bloque-t-elle un lot critique ?}
  B -- Oui --> B1[Escalade prioritaire 24h]
  B -- Non --> C[Mettre en file arbitrage hebdo]
  B1 --> D{Impact utilisateur eleve ?}
  D -- Oui --> D1[Prototype + validation rapide]
  D -- Non --> D2[Decision owner produit]
  C --> E{Besoin donnees supplementaires ?}
  E -- Oui --> E1[Collecte metriques/tests]
  E -- Non --> F[Decision en comite produit]
  D1 --> G[Action suivante assignee]
  D2 --> G
  E1 --> F
  F --> G
```
Fallback statique:
```md
![Decisions en attente fallback](../archive/fallback-produit-decisions-attente.png)
```

## A arbitrer
- Niveau de priorisation des recommandations proactives Itineraire IA.
- Strategie d'ouverture API externe (quota, auth, format).
- Cadre de calibration des proxys d'impact par territoire.
