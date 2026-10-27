---
name: cleanmymap-scientific-indicators
description: "Indicateurs CleanMyMap : proxys eau/CO2e/surface, scores, pollution projetée, facteurs versionnés, incertitudes et preuves."
category: repository
risk: medium
source: local
tags: "[scientific, indicators]"
---

# Indicateurs scientifiques et intégrité des mesures

## Déclenchement

Activer pour score de pollution, masse, mégots, eau/CO2e/surface proxy, projection temporelle, unités bénévoles, rapports environnementaux, calibration ou justification scientifique.

## Sources

`documentation/product/SCIENTIFIC_PROTOCOL.md`, `documentation/product/methodologie-carte-actions.md`, `apps/web/src/lib/actions/pollution/`, `apps/web/src/lib/actions/volunteer-participation.ts`, facteurs runtime et tests concernés.

## Protocole

1. Identifier l'objet exact : **mesure terrain, déclaration, dérivation, proxy, hypothèse ou inconnu** (`OBSERVED`, `DERIVED`, `DECLARED`, `ASSUMPTION`, `PROXY`, `NA`). Ne pas fusionner ces statuts.
2. Vérifier chaque entrée et son unité, source, version, période, facteurs, incertitude et valeurs absentes. `NA` n'est ni zéro, ni valeur à reconstruire arbitrairement.
3. Conserver la formule existante comme contrat tant qu'aucune décision scientifique justifiée ne la remplace ; ne pas inventer coefficient, précision ou causalité environnementale.
4. La pollution constatée avant une action reste historique. La projection non linéaire de re-pollution est une **heuristique** distincte d'une observation actuelle. Le vert est réservé aux déclarations `clean_place`.
5. Distinguer personnes `volunteersCount` et unités opérationnelles pondérées ; ne pas reconstituer les classes d'âge historiques manquantes.
6. Pour tout changement de facteur/modèle, conserver comparaison avant/après, cas limites, version de méthode, sensibilité et traçabilité dans la source canonique.

## Validation

Tests dimensionnels, bornes, zéro explicite, NA, ratios indéfinis, valeurs extrêmes, données historiques et cohérence UI/export. Le score de 0 à 100 se présente en pourcentage sans recalcul. Ne jamais affirmer une quantité d'eau réellement dépolluée à partir d'une équivalence pédagogique.
