# Vision et objectifs

CleanMyMap structure l'action locale de depollution en connectant citoyens, associations, entreprises et acteurs publics.

## Architecture bloc produit (7 blocs)
```mermaid
flowchart LR
  HOME[Accueil<br/>formulaire + compte] --> AGIR[Agir<br/>itineraire IA + trash spotter]
  HOME --> VISU[Visualiser<br/>cartographie + tableaux dynamiques]
  AGIR --> IMPACT[Impact<br/>rapports + classement]
  VISU --> IMPACT
  IMPACT --> RESEAU[Reseau<br/>discussion + partenaires]
  RESEAU --> APPRENDRE[Apprendre<br/>DD + guide + seconde vie + kit terrain]
  IMPACT --> PILOTER[Piloter<br/>admin + elus + coordinateur]
  RESEAU --> PILOTER
```
Fallback statique:
```md
![Product blocks architecture fallback](../archive/fallback-produit-blocs-architecture.png)
```

## Objectifs produit
- Acceleration des actions concretes locales
- Mesure d'impact lisible et exploitable
- Coordination reseau multi-acteurs
- Apprentissage et professionnalisation des pratiques terrain
