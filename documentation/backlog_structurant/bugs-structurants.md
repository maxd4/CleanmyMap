# Bugs structurants

## Matrice impact / probabilite
```mermaid
quadrantChart
  title Priorisation visuelle des bugs structurants
  x-axis Probabilite faible --> Probabilite elevee
  y-axis Impact faible --> Impact eleve
  quadrant-1 A traiter en urgence
  quadrant-2 A surveiller
  quadrant-3 Faible priorite
  quadrant-4 Planifier
  "Registry/navigation mismatch": [0.84, 0.92]
  "Data geoloc partielle": [0.72, 0.81]
  "Import admin heterogene": [0.67, 0.76]
  "Incoherence affichage filtre": [0.48, 0.55]
```
Fallback statique:
```md
![Bugs matrix fallback](../archive/fallback-backlog-bugs-matrix.png)
```

- Ecarts potentiels entre registry/navigation/renderer.
- Cas limites data partielle geolocalisee.
- Robustesse des flux import admin en environnement heterogene.
