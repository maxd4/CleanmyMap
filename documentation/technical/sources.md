# Sources de donnees

## Flow complet sources -> normalisation -> usages
```mermaid
flowchart LR
  SI[Sources internes] --> N[Normalisation]
  SE[Sources externes] --> N
  N --> QC[Validation qualite]
  QC --> MAP[Carte / API map]
  QC --> HIST[Historique actions]
  QC --> REPORT[Rapports / exports]
  QC --> PILOT[Pilotage admin]
```
Fallback statique:
```md
![Sources to usage fallback](../archive/fallback-data-sources-flow.png)
```

## Sources internes
- Actions declarees (citoyens/collectifs)
- Spots et statuts de nettoyage
- Evenements communautaires et RSVPs

## Sources externes
- Imports Google Sheet admin
- Donnees contextuelles eventuelles (meteo/evenements locaux)

## Points de controle
- Traçabilite des imports
- Validation qualite avant exploitation analytique
