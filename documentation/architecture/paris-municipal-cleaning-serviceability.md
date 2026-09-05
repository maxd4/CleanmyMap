# Couche de serviceabilité du nettoiement municipal — CURRENT

## Finalité et limites

Cette couche estime la facilité relative avec laquelle une zone est
normalement accessible à une opération de nettoiement municipal. Elle peut
servir à raisonner sur l'additionnalité potentielle d'une intervention
bénévole, mais ne mesure pas la pollution, ne mesure pas un résultat de
nettoyage et ne permet jamais d'affirmer qu'une zone est « non nettoyée ».

Le contrat v2 sépare explicitement :

- `municipal_coverage` et `cleaning_frequency` : preuve municipale directe
  lorsqu'elle est jointe à la zone ;
- `scheduled_operation` : opération documentée et datée, sans implication de
  tournée permanente ;
- `geometry_proxy` : inférence à partir des surfaces et obstacles du Plan de
  Voirie de Paris (PVP), sans valeur de couverture municipale ;
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

## Contrat v2 et formules versionnées

La configuration est centralisée dans
`MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG` et sa version est
`municipal-cleaning-serviceability-v2`.
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
geometryServiceabilityProxy = 100 × mechanizedAccessibility
```

Une accessibilité fournie par une source municipale explicite jointe à la
zone est utilisée comme `source_documented` et ne reçoit pas une seconde
correction géométrique.

Quand une fréquence par zone est réellement documentée et reliée à une
preuve `cleaning_frequency`, elle prévaut sur le proxy :

```text
documentedFrequencyScore =
  100 × clamp(visitsPerWeek / 14, 0, 1)
municipalCleaningServiceLevel = documentedFrequencyScore
```

Le nombre 14 est une borne de normalisation du score relatif ; le résultat
n'est ni une fréquence ni une probabilité. Une fréquence de zéro est une
valeur documentée ; une fréquence absente reste `null`.

`geometryServiceabilityProxy`, `municipalCleaningServiceLevel` et
`mechanizedCleaningAccessibility` exposent des scores relatifs bornés sur
0–100. Le premier est une facilité opérationnelle géométrique ; le deuxième
existe uniquement avec une preuve municipale directe ; le troisième décrit
l'accessibilité mécanisée, pas la couverture. Aucun de ces scores n'est une
fréquence, une probabilité ou une mesure réelle du nettoiement.

La règle contractuelle est :

```text
municipalCleaningServiceLevel != geometryServiceabilityProxy
lower municipal coverage ne peut jamais être déduit de
mechanizedCleaningAccessibility ou geometryServiceabilityProxy seuls
```

Une preuve `municipal_coverage` ou `cleaning_frequency` doit référencer des
preuves existantes, du bon `evidenceType`, et dont le statut n'est pas
`unavailable`. Une preuve `partial` reste exploitable mais sa confiance est
réduite. Les confidences sont conservées séparément dans
`serviceabilityConfidence.signalConfidence` pour éviter qu'une bonne
provenance géométrique ne renforce une fréquence absente.

`manualCleaningLikely` vaut `true` ou `false` avec `basis: "documented"`
uniquement si une preuve `manual_cleaning` valide le documente. Il vaut
`true` avec `basis: "geometric_inference"` lorsque la géométrie est fortement
compatible avec une intervention manuelle (accessibilité mécanique au plus
0,30 ou pression d'obstacles au moins 0,65). Une bonne accessibilité ne
produit jamais `false` par inférence : le résultat reste
`{ value: null, basis: "unknown" }`. Des preuves manuelles contradictoires
produisent `basis: "conflict"`, jamais une sélection selon l'ordre d'entrée.

`documentedCleaningFrequencyResolution` et les résolutions de signal peuvent
valoir `resolved`, `conflict` ou `unknown`. Une fréquence contradictoire est
donc conservée comme conflit explicite et n'est pas transformée en fréquence
documentée.

La confiance combine les signaux présents et leurs preuves propres. Un proxy
géométrique est plafonné par une fiabilité de 0,55 ; une preuve directe
`available` peut atteindre 1,00 et une preuve `partial` 0,70. Sans preuve
adaptée, le signal reste `unknown`, même si une valeur technique a été
fournie. Une preuve géométrique ne peut donc pas augmenter la confiance d'une
fréquence municipale absente.

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

La préparation des exports se fait hors requête. L'agrégateur déduplique les
lignes par identifiant d'objet (`sourceObjectId`, `objectId` ou `featureId`)
ou, à défaut, par signature stable de leurs valeurs. Les comptes ne sont
additionnés que pour des lignes distinctes ; les inventaires non marqués
`aggregationMode: "additive"` deviennent conflictuels lorsqu'ils portent des
valeurs différentes. Les fréquences et booléens concurrents sont résolus par
égalité exacte ou exposés comme `conflict`, jamais par première ligne.
`observedAt` retient la date valide la plus récente. Les lignes inconnues, sans
preuve ou sans géométrie ne sont pas transformées en couverture municipale.

## Validation couverte

`municipal-cleaning-serviceability.test.ts` couvre le trottoir standard, les
escaliers, les obstacles, la fréquence documentée, les preuves `unavailable`
et `partial`, les preuves manuelles, les conflits, l'absence de données et
l'alignement de toutes les zones. Le test Node du générateur vérifie la
déduplication, l'agrégation additive explicite, l'indépendance à l'ordre des
lignes et les conflits. Les assertions vérifient notamment qu'un accès
mécanique faible ne devient jamais une couverture faible, qu'une bonne
accessibilité ne devient jamais `manualCleaningLikely=false`, et qu'une zone
absente du snapshot reste `unknown`.
