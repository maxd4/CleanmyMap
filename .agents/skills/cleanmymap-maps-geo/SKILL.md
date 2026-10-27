---
name: cleanmymap-maps-geo
description: "Cartes Leaflet, données géographiques, GPX, coordonnées, signalements et projections cartographiques CleanMyMap."
category: repository
risk: medium
source: local
tags: "[maps, geo]"
---

# Cartes, géométrie et localisation

## Déclenchement

Activer pour Leaflet, calques, données GeoJSON/GPX, coordonnées, recherche géographique, routes/itinéraires, géométrie d'action, signalements territoriaux ou projection de pollution.

## Contrats

- `documentation/product/methodologie-carte-actions.md` et `documentation/product/SCIENTIFIC_PROTOCOL.md` pour **sens des scores**, projection et provenance.
- `documentation/architecture/data-governance.md` pour owners et surfaces publiques.
- `apps/web/AGENTS.md` pour SSR/Leaflet et frontières serveur/client ; `apps/mobile/AGENTS.md` pour GPS natif, si concerné.
- Lire l'implémentation du calque, les adaptateurs de géométrie, API/RPC, consumers et tests avant modification.

## Méthode

1. Identifier explicitement le référentiel de coordonnées, unités, ordre longitude/latitude et source de vérité de la géométrie. Ne jamais inventer une précision GPS.
2. Distinguer action historique, projection de re-pollution et signalement Trash Spotter actuel. La couleur d'une action ne prouve pas une pollution observée en temps réel ; le vert désigne `clean_place` documenté.
3. Préserver `null`/inconnu, géométrie absente, polygones invalides, traces multi-segments, antimeridien et limites d'emprise pertinentes.
4. Réduire le coût des tuiles/requêtes et les fuites de localisation ; mettre les détails facultatifs à la demande sans cacher la fonctionnalité utile.
5. Respecter l'initialisation client de Leaflet ; éviter appels navigateur pendant SSR et métadonnées sensibles dans la projection publique.

## Validation

Cas avec/sans géométrie, coordonnées aux bornes, zoom/déplacement, calques concurrents, données partielles, mobile/desktop et comportement après changement de filtre. Confronter la carte rendue au sens scientifique et métier réel ; une capture n'est pas une mesure terrain.
