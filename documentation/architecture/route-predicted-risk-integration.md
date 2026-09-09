# Intégration des risques prédits au planner

## Familles de cibles

Le planner conserve deux familles distinctes :

- `observed` : spot CleanMyMap validé, avec preuve terrain et `observedAt` ;
- `predicted` : zone évaluée par `urban-pressure-model`, avec cellule, centroïde
  de calcul, rayon, millésime, version, confiance et contributions.

Une zone prédite n'est jamais insérée dans les spots et n'est jamais présentée
comme une observation.

## Deux passages et sélection bornée

Un premier passage pur du planner sélectionne et ordonne les cibles observées.
Ces points ordonnés, précédés de l'origine, forment `ordered_baseline`. Ils
servent uniquement de support déterministe de distance ; ce n'est pas une
géométrie réseau. Sans arrêt observé de base, le support est `origin_only`.
L'évidence expose `planningCorridor.source`, `pointCount` et une note explicite.

Les zones prédictives sont ensuite évaluées, dédupliquées par zone voisine, puis
placées dans le même pool que les observés. La borne pré-planner vaut :

```text
maxCandidates = max(maxStops * 2, 8)
```

Le tri est déterministe : score de priorité décroissant, famille `observed` à
égalité, puis identifiant lexicographique. Ainsi vingt observés ne masquent pas
une prédiction forte ; à score égal, la preuve observée gagne. La contrainte de
budget reste appliquée par le planner et demeure dure.

La préférence de collecte est une préférence souple appliquée uniquement à la
branche prédictive : `waste` sélectionne `wasteRisk`, `cigarette_butts`
sélectionne `cigaretteButtRisk`, et `balanced` conserve le `riskFocus` explicite
historique ou `all` par défaut. Le resolver est unique à la frontière HTTP et
la valeur `effectiveRiskFocus` est propagée jusqu'à la construction des zones,
au pool, au planner, à la partition, au routage multi-groupe et à la trace.
Elle modifie donc la priorité déterministe des zones prédites et peut modifier
les stops, la boucle et ses métriques de déplacement lorsque les données le
justifient.

Contrat canonique :

```text
pickupPreference = préférence souple
≠ filtre absolu
≠ permission de ramassage
≠ estimation de durée de collecte
```

La trace expose toujours `pickupPreference` et `effectiveRiskFocus`. La valeur
`prediction.riskFocus` est celle effectivement utilisée pour calculer les zones
prédites ; elle ne doit pas diverger du `effectiveRiskFocus` propagé au planner.
La sécurité, la distance et l'utilité restent prises en compte. Les
signalements observés ne sont pas repondérés : leur scoring observé reste
inchangé. Les champs `serviceMinutesEstimate` et `totalMinutesEstimate` restent
`null`.

L'admission géographique hors corridor reste évaluée avec le risque global
`all`. Ainsi, une préférence focalisée peut réordonner une zone de l'autre type
sans la transformer en exclusion absolue ; le corridor, la sécurité,
l'additionalité et le budget conservent leurs contraintes propres.

Cette préférence n'est ni un filtre absolu, ni une permission de ramassage,
ni un modèle de durée de collecte. Les candidats observés conservent leur
scoring, leurs catégories et leurs preuves existants. Les contraintes de
sécurité, d'additionalité, d'événement, de distance, de budget et de réseau
restent prioritaires. Une zone prédite sans preuve de sécurité `safe` n'est pas
transmise au planner ; aucune préférence ne peut lever cette exclusion.

Le résumé prédictif distingue les compteurs et identifiants :

- `admitted` : zones prédites admises après le corridor et la déduplication ;
- `passedToPlanner` : prédictions réellement transmises dans le pool borné ;
- `excludedByPreselection` : prédictions écartées par cette borne ;
- `excludedByPlannerBudget` : prédictions évaluées mais infaisables au budget ;
- `selected` : prédictions finalement retenues.

Chaque identifiant écarté par la borne porte aussi la raison
`preselection_bound` dans `preselectionExclusionReasons`.

Une exclusion de pré-sélection n'est jamais comptée comme exclusion de budget.

## Réconciliation du budget après le provider

Le cycle de sélection est tracé séparément :

```text
admitted → passedToPlanner → résultat du planner → réconciliation réseau finale → selected
```

Le planner peut retenir localement un préfixe que la géométrie réseau mesure
ensuite au-delà du budget. Les candidats retirés uniquement à cette dernière
étape sont exposés dans `excludedByFinalRoutingBudget` et
`finalRoutingBudgetExcludedCandidateIds`. Ils ne sont ajoutés ni à
`excludedByPreselection`, ni à `excludedByPlannerBudget`.

Lorsque le premier résultat réseau dépasse le budget et qu'un préfixe non vide
reste possible, le provider est rappelé avec l'origine et les seuls arrêts
conservés. Cette seconde géométrie réseau est la géométrie finale affichée.
Elle est réservée à cette réconciliation post-provider ; elle ne sert pas à
construire le corridor prédictif. Si cette mesure échoue, la sortie passe en
`degraded`, utilise un fallback local explicitement signalé et conserve dans la
trace le nombre d'appels, les arrêts avant/après et les identifiants retirés.
Un préfixe vide n'entraîne pas de second appel.

## Statuts de données

La réponse contient `dataLayers` :

- `observed` décrit exclusivement l'état de la source de signalements ;
- `prediction` vaut `available`, `partial` ou `unavailable` pour le snapshot ;
- `recommendation` décrit l'état global de la recommandation.

Une source observée vide avec une prédiction disponible sélectionnée donne donc
`observed: empty`, `prediction: available` et une recommandation exploitable,
sans transformer la prédiction en observation. Sans source observée ni prédiction
sélectionnée, la recommandation reste `empty`.

## Preuve et limites

Chaque candidat prédit conserve les deux scores, la confiance, les contributions,
la correction de propreté, la provenance et `predictionModelVersion`. Le score
est un niveau borné de risque/pression, pas une probabilité calibrée et pas une
mesure réelle de pollution.

Le snapshot est chargé localement avant le calcul. Aucun appel Paris Data ou
autre appel externe n'est ajouté au calcul de pré-sélection. La géométrie réseau
finale du provider reste la source de vérité de l'itinéraire affiché.
