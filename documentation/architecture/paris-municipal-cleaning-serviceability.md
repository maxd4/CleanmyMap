# Couche de serviceabilité du nettoiement municipal — CURRENT

## Finalité et limites

Cette couche estime la facilité relative avec laquelle une zone est
normalement accessible à une opération de nettoiement municipal. Elle peut
servir à raisonner sur l'additionnalité potentielle d'une intervention
bénévole, mais ne mesure pas la pollution, ne mesure pas un résultat de
nettoyage et ne permet jamais d'affirmer qu'une zone est « non nettoyée ».

Le contrat sépare explicitement :

- `municipal_coverage` et `cleaning_frequency` : preuve municipale directe
  lorsqu'elle est jointe à la zone ;
- `scheduled_operation` : opération documentée et datée, sans implication de
  tournée permanente ;
- `geometry_proxy` : inférence à partir des surfaces et obstacles du Plan de
  Voirie de Paris (PVP) ;
- `unknown` : information absente ou non exploitable.

Le snapshot est chargé localement par
`municipal-cleaning-serviceability-loader.ts`. Le calcul d'un itinéraire ne
fait aucun appel à Paris Data.

## Données publiques retenues

La page officielle [Propreté : comment la Ville de Paris entretient ses
rues](https://www.paris.fr/pages/la-proprete-239) documente l'organisation du
service et des fréquences générales : nettoyage quotidien de trottoirs,
fréquences variables selon la voie, l'affluence et l'activité, interventions
sur les marchés après fermeture et opérations saisonnières ou événementielles.
Elle ne fournit pas une fréquence actuelle par IRIS. Les fréquences ne sont
donc pas projetées automatiquement sur les 992 zones.

Les proxies géométriques sont issus des jeux Paris Data suivants :

- [Voies en escalier](https://opendata.paris.fr/explore/dataset/plan-de-voirie-voies-en-escalier/map/),
  qui décrit une géométrie piétonne et indique que la mise à jour n'est pas
  exhaustive ;
- [Accès piétons Métro et Parkings](https://opendata.paris.fr/explore/dataset/plan-de-voirie-acces-pietons-metro-et-parkings/map/),
  qui représente les emprises d'accès, escaliers et murets, et non le
  nettoiement d'une station ;
- [Aires piétonnes et assimilées](https://opendata.paris.fr/explore/dataset/aires-pietonnes/information/),
  qui distingue les zones piétonnes permanentes ;
- [Jardinières, bancs et corbeilles](https://opendata.paris.fr/explore/dataset/plan-de-voirie-mobiliers-urbains-jardinieres-bancs-corbeilles-de-rue/export/),
  [bornes, barrières et potelets](https://opendata.paris.fr/explore/dataset/plan-de-voirie-mobiliers-urbains-bornes-barrieres-potelets/map/)
  et [abris voyageurs / arrêts bus](https://opendata.paris.fr/explore/dataset/plan-de-voirie-mobiliers-urbains-abris-voyageurs-points-darrets-bus/table/),
  qui sont des inventaires d'objets ;
- [Permis de végétaliser](https://opendata.paris.fr/explore/dataset/permis-de-vegetaliser/table/),
  utilisé seulement pour les pieds d'arbres et jardinières représentés.

Les licences et millésimes sont conservés dans
`data/geospatial/paris-municipal-cleaning-serviceability-snapshot.json`.
Le snapshot courant contient 992 zones IRIS, dont 711 avec un proxy dérivé
des trois exports géométriques PVP capturés le 2026-09-04 et 281 en
`unknown`. Sa couverture est donc `partial`. L'absence de fréquence actuelle
rue par rue laisse `documentedCleaningFrequency` à `null` au lieu d'inventer
une tournée.

## Contrat spatial

Chaque résultat est une cellule/zone. Il conserve son centroïde uniquement
pour les calculs qui le nécessitent, sa surface et un rayon de cercle
équivalent marqué `radiusBasis: "equivalent_circle"`. Ce rayon ne remplace
pas une emprise polygonale : il est une approximation géométrique bornée et
ne doit pas être affiché comme le contour réel de la zone.

Les classes de surface sont :

```ts
type CleaningSurfaceClass =
  | "standard_sidewalk" | "pedestrian_area" | "stairs"
  | "tree_surround" | "planter_edge" | "street_furniture_cluster"
  | "barrier_edge" | "bridge_or_footbridge" | "underpass"
  | "embankment" | "other_complex_public_space";
```

Une zone peut avoir plusieurs classes. Elles sont normalisées en parts de
features, triées par classe, sans double comptage de la zone.

## Formules versionnées

La configuration est centralisée dans
`MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG` et sa version est
`municipal-cleaning-serviceability-v1`.
Cette version est également portée explicitement par le snapshot via
`predictionModelVersion`; toute évolution des coefficients doit donc créer
une nouvelle version.

Les accessibilités de classe sont des coefficients de proxy géométrique
bornés, pas des observations de tournée :

| classe | accessibilité mécanique |
| --- | ---: |
| `standard_sidewalk` | 1,00 |
| `pedestrian_area` | 0,55 |
| `stairs` | 0,10 |
| `tree_surround`, `planter_edge` | 0,35 |
| `street_furniture_cluster` | 0,45 |
| `barrier_edge` | 0,30 |
| `bridge_or_footbridge` | 0,45 |
| `underpass` | 0,25 |
| `embankment` | 0,20 |
| `other_complex_public_space` | 0,35 |

Si `s_i` est la part normalisée de la classe `i`, alors :

```text
surfaceAccessibility = Σ(s_i × classAccessibility_i)
obstacleAccessibility = 1 - clamp(obstacleCount / (250 × areaKm2), 0, 1)
mechanizedAccessibility =
  weightedAvailable(
    surfaceAccessibility × 0,75,
    obstacleAccessibility × 0,25
  )
municipalCleaningServiceability = 100 × mechanizedAccessibility
```

Une accessibilité fournie par une source municipale explicite jointe à la
zone est utilisée comme `source_documented` et ne reçoit pas une seconde
correction géométrique.

Quand une fréquence par zone est réellement documentée et reliée à une
preuve `cleaning_frequency`, elle prévaut sur le proxy :

```text
documentedFrequencyScore =
  100 × clamp(visitsPerWeek / 14, 0, 1)
municipalCleaningServiceability = documentedFrequencyScore
```

Le nombre 14 est une borne de normalisation du score relatif ; le résultat
n'est ni une fréquence ni une probabilité. Une fréquence de zéro est une
valeur documentée ; une fréquence absente reste `null`.

Les champs `municipalCleaningServiceability` et
`mechanizedCleaningAccessibility` exposent des scores relatifs bornés sur
0–100. Ils ne sont pas des pourcentages de chance et ne doivent pas être
présentés comme une mesure réelle du nettoiement.

`manualCleaningLikely` vaut explicitement `true` si une preuve municipale
jointe le documente. Sinon, il vaut une inférence géométrique lorsque
l'accessibilité mécanique est au plus 0,30 ou lorsque la pression d'obstacles
atteint 0,65. Sans géométrie exploitable, il vaut `{ value: null, basis:
"unknown" }`.

La confiance combine complétude des cinq signaux (`surfaceClasses`,
`obstacleCount`, fréquence, couverture municipale, opération programmée) et
présence de la preuve de zone. Un proxy géométrique est plafonné par une
fiabilité de 0,55 ; une fréquence documentée peut atteindre 1,00. Sans
provenance de zone, la complétude de source est zéro et le niveau reste
`unknown`, même si une valeur technique a été fournie.

## Rafraîchissement

`apps/web/scripts/refresh-paris-municipal-cleaning-serviceability-snapshot.mjs`
consomme un snapshot de zones existant, un export de features déjà
pré-agrégé et un fichier de preuves. Exemple de forme d'une feature :

```json
{
  "zoneId": "IRIS_ID",
  "surfaceClass": "stairs",
  "featureCount": 2,
  "obstacleCount": 4,
  "sourceEvidenceIds": ["pvp-stairs"]
}
```

Depuis `apps/web`, le rafraîchissement s'exécute ainsi :

```powershell
node --experimental-strip-types scripts/refresh-paris-municipal-cleaning-serviceability-snapshot.mjs `
  --zones-json data/geospatial/paris-pressure-snapshot.json `
  --features-json <export-features-pre-agrege> `
  --sources-json <export-preuves>
```

La préparation des exports se fait hors requête. Les lignes inconnues, sans
preuve ou sans géométrie ne sont pas transformées en couverture municipale.

## Validation couverte

`municipal-cleaning-serviceability.test.ts` couvre le trottoir standard, les
escaliers, les classes superposées, les obstacles, la fréquence documentée,
l'absence de données, la provenance manquante et l'alignement de toutes les
zones. Les assertions vérifient notamment qu'un accès mécanique faible ne
devient jamais « non nettoyé », qu'une preuve documentée prévaut sur un proxy
et qu'une zone absente du snapshot devient `unknown` sans créer de point
artificiel.
