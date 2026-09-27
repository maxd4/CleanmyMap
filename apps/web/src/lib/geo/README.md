# Domaine géospatial

Ce dossier regroupe les primitives géographiques utilisées par le web :
coordonnées, distances, territoires, géométries et signaux spatiaux
normalisés.

## Frontière

- les fonctions pures de distance, géométrie et normalisation restent ici ;
- les accès aux données ou aux fournisseurs externes passent par les loaders
  et services propriétaires ;
- la composition cartographique appartient à `components/actions/map/` ;
- une polyline ou un résultat de routage ne constitue pas à lui seul une
  preuve de côté de rue, de corridor nettoyable ou d'additionalité.

Les valeurs `unknown`, les fallbacks et la provenance doivent rester explicites.
Ne pas inventer une précision géographique à partir d'un nom de rue, d'un
centre approximatif ou d'une distance estimée.

## Contrats et validation

Les contrats municipaux, de pression, de territoire et de routage conservent
leurs tests auprès des modules concernés. À entrées identiques, les
normalisations et décisions pures doivent rester déterministes et ne pas
introduire d'appel réseau caché.

Lire la documentation canonique du domaine avant d'étendre un contrat et
utiliser le typecheck, le lint et les tests web ciblés correspondants.
