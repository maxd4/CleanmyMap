# Group Action Publishing

## Problem Statement

CleanMyMap ne propose pas encore un flux clair pour publier une action de groupe puis laisser d'autres volontaires la rejoindre sans refaire le formulaire complet.

## Goal

Permettre a une seule personne de publier une action de groupe, puis a d'autres volontaires de rejoindre cette action via un bouton dedie, tout en attribuant correctement leur part aux statistiques personnelles.

## User Outcomes

- Un organisateur peut creer un formulaire de groupe.
- Un volontaire peut rejoindre une action existante en quelques clics.
- Les statistiques personnelles reflètent la participation au groupe sans saisie redondante.
- Les points d'entrée UI rendent la fonction visible depuis l'accueil, l'historique et la carte.

## Key Questions

- Le bouton doit-il s'appeler exactement `Rejoindre un formulaire` ou faut-il une variante plus naturelle ?
- Faut-il une confirmation avant de rejoindre une action de groupe ?
- Comment répartir la contribution statistique entre participants ?
- La participation doit-elle être historique et immuable, ou modifiable par l'organisateur ?

## Scope

### In scope

- UI d'édition pour publier une action de groupe.
- Entrées UI pour rejoindre une action de groupe.
- Modèle de données pour la participation de groupe.
- Endpoint dédié ou adaptation d'un endpoint existant pour enregistrer la participation.
- Tests d'intégration et vérifications UI principales.

### Out of scope

- Refonte complète du moteur de statistiques.
- Nouveau système de paiement ou de compensation.
- Modifications du mobile app non liée au flux web.

## Success Criteria

- Un groupe peut être créé et rejoint sans refaire toute la saisie.
- Les statistiques affichent une part de participation cohérente.
- Les parcours homepage, historique et carte exposent un point d'entrée visible.
- Les tests couvrent le chemin nominal et un cas d'erreur.

