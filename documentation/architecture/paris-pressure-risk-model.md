# Modèle déterministe de risque spatial parisien

## Statut et périmètre

Le module `apps/web/src/lib/geo/paris-pressure-risk.ts` produit deux sorties
distinctes pour une zone du snapshot `paris-pressure-v1` :

- `wasteRisk` : risque prédit de déchets diffus ;
- `cigaretteButtRisk` : risque prédit de mégots.

Ces valeurs sont des scores de pression/risk bornés sur `0–100`. Elles ne sont
pas une mesure réelle de pollution et ne doivent pas être présentées comme une
observation exhaustive de l'état de la zone.

Le modèle est pur : il consomme une `ParisPressureZone`, le
`ParisPressureSnapshot` qui la porte et, lorsque disponible, un contexte
préparé par les contrats existants (événements, historique validé et
provenance). Il n'effectue aucun appel réseau.

## Rattachement IRIS et couverture géométrique

Le snapshot canonique est `paris-iris-2024-pop-2021-r2-polygon`. Les points
sont d'abord rattachés par appartenance réelle au polygone IRIS, avec prise en
charge des trous et des `MultiPolygon`. La même primitive déterministe est
partagée par le runtime et le générateur (`paris-pressure-geometry-core.mjs`) :
une géométrie non finie, mal structurée, non fermée ou de surface invalide est
inexploitable et n'est jamais utilisée pour une appartenance.

Le centroïde n'est utilisé qu'en `nearest-centroid-fallback`, uniquement pour
une zone dont la géométrie est manquante ou invalide, dans un rayon maximal de
`1,5 km`. Quand la couverture géométrique est complète, un point hors de tous
les polygones reste sans rattachement, y compris s'il est proche d'un
centroïde : être dans l'emprise historique ou proche d'un IRIS ne prouve pas
l'appartenance à Paris.

La couverture expose `expectedZoneCount`, `geometryZoneCount`,
`geometryComplete`, `missingGeometryZoneCount`, `invalidGeometryZoneCount` et
`invalidSurfaceZoneCount`. `complete` exige le nombre IRIS attendu, une
géométrie exploitable pour chaque zone et une surface positive ; il ne signifie
pas que tous les signaux métier sont disponibles. Le snapshot actuel contient
992/992 géométries exploitables et 0 géométrie ou surface invalide.

## Version et configuration

La configuration versionnée est `predictionModelVersion =
"paris-pressure-risk-v3-urban-morphology"` dans
`paris-pressure-risk-contract.ts`. Le prior additionnel est versionné
séparément sous `urban-morphology-prior-v1`. Cette version ne modifie aucun
poids, aucune échelle et aucune formule de risque de base. Elle conserve la
portée de la provenance contextuelle, le comportement fail-closed d'une
résolution de propreté inconnue et la traçabilité séparée du prior
morphologique.

### Poids de base

Les poids totalisent `1` pour chaque score. Une composante absente ne reçoit
pas une valeur neutre inventée et ne redistribue pas son poids aux autres
composantes : sa contribution vaut `0`, tandis que la complétude signale
l'incertitude.

| Facteur | Déchets diffus | Mégots |
|---|---:|---:|
| Pression résidentielle | 0,22 | 0,05 |
| Pression transport | 0,16 | 0,18 |
| Présence de stations | — | 0,12 |
| Pression touristique | 0,16 | 0,15 |
| Lieux fortement fréquentés | 0,14 | — |
| Terrasses | — | 0,25 |
| Marchés | 0,08 | 0,08 |
| Événements récents | 0,12 | 0,12 |
| Historique déchets validé | 0,12 | — |
| Historique mégots validé | — | 0,05 |

Ainsi, la population seule ne peut pas saturer un score : son maximum est
`22` points pour les déchets et `5` points pour les mégots.

## Normalisations

Les valeurs déjà normalisées du snapshot sont re-bornées par
`normalizedSignal` :

```text
clamp01(x) = min(1, max(0, x))
```

Les comptes bruts utilisent une saturation exponentielle explicite :

```text
normalizeCount(x, scale) = 1 - exp(-x / scale)
```

Un compte négatif, non fini ou absent reste indisponible (`null`). Les échelles
versionnées sont :

| Signal brut | Échelle |
|---|---:|
| `stationCount` | 3 |
| `authorisedTerraces` | 40 |
| `openAirMarkets` | 4 |
| `validatedWasteReports` | 6 |
| `validatedCigaretteButts` | 150 |

Les terrasses et stations ont donc des facteurs autonomes pour le score
mégots, même si l'activité publique du snapshot possède aussi une valeur
agrégée `normalized` utilisée par le score déchets.

## Pression événementielle

Le contexte peut fournir directement `eventPressure`, déjà normalisée par le
contrat d'événements de la route. Si cette valeur n'est pas fournie, le module
peut calculer une pression à partir d'événements récents :

```text
distanceFactor = clamp01(1 - distanceKm / 2)
recencyFactor  = clamp01(1 - ageDays / 56)
attendanceFactor = 0,5 si l'assistance est inconnue, sinon clamp01(assistance)
eventPressure = distanceFactor × recencyFactor × attendanceFactor
```

Plusieurs événements sont agrégés sans dépasser `1` :

```text
1 - produit(1 - eventPressure_i)
```

Un événement non valide ne contribue pas. L'absence complète d'événements
reste `null`; un appelant qui sait qu'il n'y a aucun événement peut transmettre
`eventPressure: 0`.

La provenance du contexte est portée par le facteur qu'elle peut réellement
justifier, et non par un tableau global :

```ts
contextProvenance: {
  eventPressure?: ParisPressureContextProvenance[];
  validatedWastePressure?: ParisPressureContextProvenance[];
  validatedCigarettePressure?: ParisPressureContextProvenance[];
}
```

Une provenance événementielle ne renforce donc jamais l'historique déchets ou
mégots. Sans provenance propre au facteur, la fiabilité explicite
`contextWithoutProvenance = 0,5` est appliquée et un gap est conservé. Une
provenance `partial` reste utilisable avec `0,7`; une provenance `unavailable`
ne valide pas le facteur.

## Formules des deux scores

Pour un facteur `i`, la contribution traçable est :

```text
points_i = normalized_i × weight_i × 100
```

avec `points_i = 0` si `normalized_i` est absent. Le score de base est la somme
des contributions, arrondie à trois décimales :

```text
baseRisk = somme(points_i)
```

`estimateWasteRisk` et `estimateCigaretteButtRisk` construisent des listes de
facteurs différentes ; ils ne partagent donc pas un score de pression humaine
unique.

## Correction indépendante de propreté

Dans le snapshot actuel, `cleanlinessPrior.normalized` provient du nombre
normalisé d'anomalies Dans Ma Rue. Il s'agit donc d'une pression d'anomalies :
une valeur basse est compatible avec une zone historiquement plus propre, une
valeur haute avec une zone plus signalée comme anormale. Ce sens est conservé
explicitement dans le contrat et n'est pas inversé silencieusement.

Pour une donnée disponible :

```text
centered = (cleanlinessPressure - 0,5) × 2
correction = centered × 12 × resolutionMultiplier
finalRisk = clamp01((baseRisk + correction) / 100) × 100
```

`resolutionMultiplier` vaut `1` à l'IRIS et `0,75` à l'arrondissement. Une
pression basse produit donc une correction négative ; une pression haute
produit une correction positive. Si le prior est absent, la correction est
`0`, marquée `available: false` et expliquée comme indisponible : cette absence
n'est pas assimilée à une zone propre ou sale. Si `normalized` existe mais que
`resolution` vaut `null`, la résolution devient explicitement `unknown`, la
correction n'est pas appliquée et `resolutionReason` vaut
`unknown_resolution`. Le modèle ne promeut jamais implicitement cette valeur
en IRIS.

La correction ne remplace jamais l'historique local validé. Un hotspot peut
donc conserver un risque élevé malgré une correction de propreté favorable.

## Prior morphologique urbain

Le prior morphologique est un contexte géographique optionnel, porté par
`zone.urbanMorphology`. Il est séparé du risque de base et calculé
indépendamment pour les déchets et les mégots. Le pipeline est explicitement :

```text
beforeMorphology = clamp(baseRisk + cleanlinessCorrection, 0, 100)
afterRisk = clamp(beforeMorphology - appliedMalusPoints, 0, 100)
```

`beforeMorphology` est donc le risque après les facteurs de base et la
correction de propreté, mais avant le prior morphologique. Le prior ne remplace
ni les facteurs de base ni la correction de propreté.

Les composantes atténuantes utilisées par le prior sont :

- voie locale peu circulée (`lowTrafficLocalStreet`) ;
- voie sans issue (`deadEnd`) ;
- intérieur de parc (`parkInterior`) ;
- secteur résidentiel à faible flux (`residentialLowFlow`).

Des exceptions géographiques réduisent une composante lorsqu'un contexte
local documente une fréquentation ou un usage incompatible avec cette
atténuation : entrées, lisières, équipements et restauration de parc pour
`parkInterior` ; proximité d'une station, d'un commerce, d'une école, de
terrasses ou d'un secteur touristique pour les composantes liées au faible
flux. Ces exceptions sont appliquées avant le calcul des points du prior.

Les plafonds configurés sont de `10` points pour les déchets et `8` points
pour les mégots. Le seuil de confiance du prior est `0,55`. Les coefficients
et ces plafonds sont ceux de `urban-morphology-prior-v1` ; ils ne doivent pas
être réinterprétés comme des observations de pollution.

Un prior appliqué peut être compensé par des signaux déjà présents dans la
branche de risque concernée :

- pression événementielle supérieure ou égale à `0,65` ;
- historique local validé supérieur ou égal à `0,4`, déchets ou mégots selon
  la branche ;
- signal de fréquentation robuste supérieur ou égal à `0,65`, parmi les
  facteurs de fréquentation disponibles pour cette branche.

Les signaux et les points de compensation sont conservés dans
`urbanMorphologyPrior.compensatingSignals` et
`urbanMorphologyPrior.compensationPoints`. Ils ne sont pas inventés après le
calcul.

La source géographique est portée par `urbanMorphologyPrior.source` et
`geographicSource`, avec le contrat complet de provenance : éditeur, jeu de
données, version, niveau géographique, statut, dates, licence et notes. Les
sources morphologiques réellement utilisées sont également intégrées à la
provenance pertinente du score. Le runtime ne déduit pas une morphologie à
partir de la proximité d'un centroïde ou d'une autre source non déclarée.

Si la morphologie est `unavailable` ou si sa confiance est inférieure à
`0,55`, aucun malus n'est appliqué. L'absence de morphologie ne signifie donc
pas que la zone est propre. Le prior est non éliminatoire au niveau du
contrat : il n'ajoute aucune règle d'exclusion propre ; les règles d'admission
et de corridor du planner restent distinctes.

Lorsque le snapshot courant ne contient pas de données morphologiques pour une
zone, le statut est `unavailable`, `appliedMalusPoints` vaut `0` et
`afterRisk` est égal à `beforeMorphology`. Le comportement est alors identique
à celui qui précédait l'introduction du prior.

## Sortie explicable et provenance

`estimateParisPressureRisk` retourne notamment :

- `wasteRisk` et `cigaretteButtRisk` ;
- pour chaque score, `baseRisk`, `finalRisk` et chaque contribution avec sa
  valeur normalisée, son poids, ses points, sa disponibilité et la fiabilité
  de sa source ;
- `cleanlinessCorrection` séparée, avec sa valeur, sa résolution et son
  explication ;
- `urbanMorphologyPrior` séparé par branche, avec son statut, sa version, sa
  source géographique, ses composantes, son plafond, ses points avant/après
  compensation, sa confiance et son explication ;
- `confidence` par score : complétude des facteurs de base, fiabilité de leurs
  sources, disponibilité et fiabilité de la correction de propreté, score,
  niveau et facteurs manquants ;
- `snapshotId`, `schemaVersion`, `generatedAt` et `refreshedAt` ;
- les entrées `provenance` spatiales réellement utilisées, les entrées
  `contextProvenance` réellement utilisées et les `provenanceGaps` structurés
  par facteur.

La confiance expose quatre composantes :

- `dataCompleteness` : complétude pondérée des facteurs de base ;
- `sourceCompleteness` : fiabilité pondérée des sources de ces facteurs ;
- `cleanlinessCorrectionCompleteness` : `1` si la correction est appliquée,
  sinon `0` ;
- `cleanlinessCorrectionSourceReliability` : fiabilité de la source de
  propreté utilisée, avec `1`, `0,7` ou `0` selon son statut.

La confiance globale est la borne minimale de ces quatre indicateurs. Elle
décrit les facteurs de base et la correction de propreté ; elle n'intègre pas
la confiance du prior morphologique. Cette dernière est tracée séparément dans
`urbanMorphologyPrior.confidence`, avec son propre statut `applied`,
`low_confidence` ou `unavailable`. Ainsi une correction inconnue ou sans source
fiable ne peut pas conserver la même confiance qu'un `finalRisk` dont la
correction de propreté est documentée, sans prétendre que cette confiance
globale mesure aussi la fiabilité du prior. Le niveau est `unknown` à `0`,
`low` sous `0,4`, `medium` de `0,4` à moins de `0,75`, et `high` à partir de
`0,75`.

Le tri de `estimateParisPressureRiskByZone` est déterministe :
`wasteRisk` décroissant, puis `cigaretteButtRisk` décroissant, puis `zoneId`
croissant.

## Limites et cas limites

- Les données manquantes restent `null` dans les contributions et réduisent la
  complétude ; elles ne sont pas transformées en état « propre » ou « sale ».
- Une source partielle ne devient pas disponible par défaut local.
- Un seul facteur ne peut dépasser son poids configuré ; la correction de
  propreté est séparée et limitée à `±12` points à l'IRIS (`±9` à
  l'arrondissement).
- Les historiques `validatedWasteReports` et `validatedCigaretteButts` sont
  optionnels et doivent être accompagnés d'une provenance dans les appels
  métier qui veulent une confiance complète.
- `RoutePredictedEvidence` transporte `contextProvenance`, `provenanceGaps`,
  les sous-indicateurs de confiance et la correction de propreté sans
  recalcul frontend. La trace conserve donc les limites de provenance tout en
  gardant la prédiction distincte de l'observation.
- Aucun facteur socio-économique n'est utilisé.
- Les noms de sortie restent `risk`, `pressure` et `predicted`; aucune sortie
  n'est présentée comme `observed`.
