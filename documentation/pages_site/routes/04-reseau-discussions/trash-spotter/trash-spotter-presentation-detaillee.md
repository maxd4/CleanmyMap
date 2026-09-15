# Suivi Trash Spotter - Présentation détaillée

## Objet

Cette route est une surface secondaire de consultation et de monitoring. Elle
lit les signalements `spot` approuvés, leur carte globale, leur liste récente
et la qualité des coordonnées disponibles.

La saisie d'une observation ne se fait pas ici : `/signalement` est l'unique
entrée Agir « Signaler un déchet » et rend `TrashSpotterObservationForm` avec
la boucle propriétaire « Mes observations ».

## Points à détailler

- Parcours de consultation de la carte et de la liste récente.
- États de chargement, erreur et absence de signalements.
- Aperçu flouté avant connexion selon le registre de sections.
- Lien vers `/signalement` pour la création canonique d'une observation.
