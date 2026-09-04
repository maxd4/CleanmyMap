# Intégration des risques prédits au planner

## Contrat observé / prédit

Le planner manipule deux familles de cibles qui ne sont jamais fusionnées
sémantiquement :

- `observed` : spot CleanMyMap validé, avec preuve terrain et `observedAt` ;
- `predicted` : cellule IRIS évaluée par `urban-pressure-model`, avec
  centroïde, rayon dérivé de l'emprise, distance au corridor, version du
  modèle, confiance et contributions réelles.

Une zone prédite n'est pas insérée dans la table des spots et n'est jamais
renommée en observation. Le centroïde est uniquement le point de calcul et de
repérage cartographique ; le rayon conserve l'emprise utile de la zone.

## Sélection bornée

`buildPredictedRouteCandidates` évalue chaque zone avec le modèle pur
`paris-pressure-risk-v1`. Une zone est candidate si elle est à au plus
`1,5 km + rayon` du corridor, ou si son risque ciblé est au moins `70/100` et
son détour estimé est inférieur à `min(20 min, 35 % du budget)`. Le score de
priorité prédictif est :

```text
clamp(risque_ciblé × 0,72 + proximité_corridor × 8 - min(18, détour_min × 0,6), 0, 100)
```

`proximité_corridor = clamp(1 - distance_corridor / (1,5 + rayon), 0, 1)`.
Le facteur `0,72` borne volontairement la prédiction sous une observation de
score équivalent. Le planner applique ensuite son coût de déplacement et son
budget dur. Les cellules voisines sont dédupliquées par distance et rayon
(`max(0,35 km, 75 % de la somme des rayons)`), avec départage déterministe par
score, risque, distance puis identifiant.

À score combiné identique, le planner départage d'abord en faveur d'un stop
`observed`, puis applique ses départages habituels. Une prédiction très forte
peut donc gagner si elle apporte réellement plus de priorité ou un meilleur
compromis de déplacement, sans usurper la preuve terrain.

Le choix facultatif `riskFocus` vaut `all`, `waste` ou `cigaretteButts`. En mode
`all`, le risque maximal des deux familles pilote l'admission, mais les deux
scores restent dans la preuve et la trace.

Les événements récents issus du contrat route sont dédoublonnés par identifiant
puis reprojetés sans réseau sur le centroïde de chaque cellule ; leur distance,
récence et pression d'assistance alimentent alors la contribution
`eventPressure` propre à la cellule. En l'absence de ces données, le facteur
reste indisponible et réduit la confiance au lieu de devenir un zéro présenté
comme une observation.

## Trace et états dégradés

Chaque réponse expose `prediction` et la trace expose la famille et la preuve
de chaque stop. Pour une prédiction, la trace conserve :

- `wasteRisk`, `cigaretteButtRisk` et le risque ciblé ;
- contributions facteur par facteur et correction de propreté ;
- confiance, provenance, `snapshotId`, millésime et `modelVersion` ;
- distance au corridor, détour, score planner et décision budget.

La preuve de chaque candidate admise nomme aussi le garde qui l'a admise
(`corridor` ou `strong_opportunity`), le seuil de risque et la limite de détour.
Le résumé conserve les identifiants des zones écartées par corridor et des
cellules dédoublonnées ; l'absence d'un identifiant de zone dans les stops ne
peut donc pas être interprétée comme un signalement observé.

Un snapshot absent produit `status: unavailable`, un avertissement explicite et
aucun candidat prédit ; les observations continuent à être planifiées. Un
snapshot incomplet produit `status: partial` et conserve la même séparation.
Cette couche n'ajoute aucun appel externe pendant le calcul d'itinéraire.

## UI

La liste et la carte affichent les spots observés avec un badge vert et les
zones prédites avec un badge orange/violet, une zone circulaire et un popup.
`Comprendre cet itinéraire` indique explicitement qu'une zone prédite n'est
pas un signalement observé, affiche le modèle, le snapshot, les deux scores,
la confiance, le détour et les facteurs disponibles. Une correction de
propreté négative est affichée lorsqu'elle a effectivement réduit le risque.

Les scores sont des niveaux internes bornés de risque/pression, pas des
probabilités calibrées et pas une mesure réelle de pollution.
