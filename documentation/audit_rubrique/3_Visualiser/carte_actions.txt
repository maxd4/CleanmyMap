### 📋 Audit : Carte des Actions

## Partie 1 : Logiques clés et utilité (Ce que fait la rubrique)

- **Mission Principale :** Donner une lecture géolocalisée et visuelle de la pollution (actions, spots signalés, zones nettoyées) pour aider à prioriser rapidement les interventions sur le terrain.
- **Logique de Fonctionnement :** 
  - Fusionne toutes les données (`actions`, `spots`, `local`) sur une carte interactive (`leaflet`).
  - Utilise un code visuel direct (Gradient Bleu/Cyan à Violet/Rouge, variation d'opacité) pour signaler l'intensité de la pollution (Score).
  - Inclut un écosystème de filtres (temporel, statut, impact, qualité) et relie la carte à un panneau de détail/statistiques.
- **Valeur pour l'utilisateur :** Comprendre en un coup d'œil "où ça brûle" et avec quelle fiabilité (Score QA), pour passer immédiatement à la décision (Où envoyer des bénévoles ? Où concentrer l'effort ?).
