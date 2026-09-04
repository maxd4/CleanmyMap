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

## Version et configuration

La configuration versionnée est `predictionModelVersion =
"paris-pressure-risk-v1"` dans `paris-pressure-risk-contract.ts`. Toute
évolution d'un poids, d'une échelle, d'un seuil ou d'une correction doit
incrémenter cette version.

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
n'est pas assimilée à une zone propre ou sale.

La correction ne remplace jamais l'historique local validé. Un hotspot peut
donc conserver un risque élevé malgré une correction de propreté favorable.

## Sortie explicable et provenance

`estimateParisPressureRisk` retourne notamment :

- `wasteRisk` et `cigaretteButtRisk` ;
- pour chaque score, `baseRisk`, `finalRisk` et chaque contribution avec sa
  valeur normalisée, son poids, ses points, sa disponibilité et la fiabilité
  de sa source ;
- `cleanlinessCorrection` séparée, avec sa valeur, sa résolution et son
  explication ;
- `confidence` par score : `dataCompleteness`, `sourceCompleteness`, score,
  niveau et facteurs manquants ;
- `snapshotId`, `schemaVersion`, `generatedAt` et `refreshedAt` ;
- les entrées `provenance` réellement utilisées et les `provenanceGaps` pour
  les signaux de contexte fournis sans métadonnées de source.

La complétude est la somme des poids des facteurs disponibles. La couverture
de source applique `1` à une source disponible, `0,7` à une source partielle,
`0` à une source indisponible et `0,5` à un signal de contexte fourni sans
provenance. Le niveau est `unknown` à `0`, `low` sous `0,4`, `medium` de `0,4`
à moins de `0,75`, et `high` à partir de `0,75`.

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
- Aucun facteur socio-économique n'est utilisé.
- Les noms de sortie restent `risk`, `pressure` et `predicted`; aucune sortie
  n'est présentée comme `observed`.
