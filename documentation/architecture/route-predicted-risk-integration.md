# Intégration des risques prédits au planner

## Familles de cibles

Le planner conserve deux familles distinctes :

- `observed` : spot CleanMyMap validé, avec preuve terrain et `observedAt` ;
- `predicted` : zone évaluée par `urban-pressure-model`, avec cellule, centroïde
  de calcul, rayon, millésime, version, confiance et contributions.

Une zone prédite n'est jamais insérée dans les spots et n'est jamais présentée
comme une observation.

## Enrichissement post-parcours par les observations

Quand le planner dispose du graphe piéton et de la projection segmentaire, il
calcule d'abord la boucle théorique sur les segments prédits. Il évalue ensuite
les candidats `observed` issus exclusivement des signalements
`trash_spotter_spots` `validated` : preuve, admissibilité bénévole, proximité
de la géométrie (rayon de la policy de corridor existante), détour mesuré sur
le graphe stocké et budget restant. L'ordre de décision est déterministe
(score, puis identifiant) et la borne d'opportunités est explicite.

Une observation acceptée est ajoutée aux arrêts et la géométrie est recalculée
avec `routeThroughPedestrianNetwork`; les points prédits sont projetés sur la
géométrie théorique existante afin qu'un centre de sous-segment situé au milieu
d'une arête ne rende pas le réseau indisponible. La géométrie enrichie doit
conserver les arêtes prédictives dans leur ordre ; une reconstruction qui en
perd une est rejetée. Un point observé hors nœud peut être ancré à un nœud
vérifié dans la limite de 75 m propre à l'enrichissement, sans raccordement fictif. L'enrichissement ne
modifie ni `wasteRisk`, ni `cigaretteButtRisk`, ni le classement des segments
prédits. Les observations refusées conservent une raison d'audit
(`outside_corridor`, sécurité, réseau inaccessible, parcours prédictif non
préservé ou budget). Les groupes se partagent les observations acceptées sans
réutiliser le même identifiant. Un signalement `cleaned` ou ancien n'est pas
converti en preuve de pollution actuelle : il est exclu par la source canonique
ou par son admissibilité avant l'enrichissement.

Les détours de chaque tentative sont calculés entre deux géométries successives.
Le total publié est la différence entre la géométrie finale et la géométrie
théorique initiale ; les écarts intermédiaires ne sont donc pas additionnés deux
fois lorsque plusieurs observations sont acceptées.

Les métriques `observedEnrichment` distinguent le nombre de prédictions
conservées, les observations considérées et acceptées, les détours et les
raisons de rejet. La propriété `observedDoesNotReplacePrediction` est toujours
vraie lorsque cette branche est utilisée.

Le routage réseau prédictif est autorisé uniquement si `networkVersionId` de la
projection active correspond exactement à `versionId` du graphe actif. La RPC
de lecture joint ces identités versionnées ; une absence ou une incompatibilité
ne fabrique pas de correspondance et déclenche le repli explicite prévu. Les
segments sont lus par pages ordonnées et bornées (`get_active_pedestrian_risk_projection_page`)
avec une ligne de continuation ; le lecteur exige une identité de projection,
de graphe et une date `generated_at` constantes sur toutes les pages. Une page
interrompue ou une identité modifiée rend la projection indisponible au lieu de
présenter un corpus tronqué comme complet. Les dates de génération de la
projection et des snapshots sources restent distinctes. Les
origines, arrivées et candidats doivent être rattachés à des points du graphe
vérifiés : une demande située à proximité peut être résolue vers le nœud vérifié
le plus proche dans la limite de 50 m, mais la distance hors réseau n'est pas
présentée comme un chemin piéton ni valorisée pour la collecte. Au-delà de cette
limite, ou lorsqu'aucun chemin dirigé ne relie les nœuds, le planner utilise le
repli explicite. La résolution et la distance de snap sont exposées dans les
métriques afin de distinguer départ demandé, point vérifié et parcours réseau.
Lorsqu'un segment sélectionné est inaccessible dans le graphe dirigé, il est
écarté avant la construction finale ; les arrêts, distances, durées, budgets,
indices théoriques et statuts de dégradation sont alors recalculés à partir des
seuls segments effectivement traversés. Les chevauchements de groupes sont
mesurés sur les géométries réseau finales et restent `null` lorsqu'ils ne sont
pas mesurables.

## Deux passages et sélection bornée

Un premier passage pur du planner sélectionne et ordonne les cibles observées.
Lorsque la branche segmentaire réseau est disponible, la présélection conserve
jusqu'à `600 + 72` candidats avant la déduplication par rue : la borne protège
le calcul sans laisser les premières occurrences d'une seule rue masquer les
autres rues admissibles. Les audits de présélection conservent les exclusions
réelles et leur cause.
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

## Contrat d'interface, d'export et de transfert

La réponse `RouteResponse` expose `riskHeatmap` uniquement lorsqu'une projection
géospatiale matérialisée a effectivement été chargée. Cette couche reprend les
segments, les deux risques, le risque mixte canonique, la résolution effective,
la confiance, la provenance, les versions de sources et la date de
rafraîchissement de `pedestrian_risk_projection` ; elle ne recalcule aucun
score dans le navigateur. L'absence de projection reste une absence de couche,
jamais une couche à zéro.

La carte route réutilise cette couche pour les filtres `Déchets`, `Mégots` et
`Mixte`. Le mode mixte est celui du cache (`mixedRisk`) et n'est pas défini par
le maximum des deux familles. Les valeurs sont affichées comme risques
théoriques estimés, avec leur modèle et leur fraîcheur ; elles ne sont pas des
mesures de pollution observée. Les signalements `observed` ajoutés après la
boucle prédictive restent comptés séparément.

`plannerRiskContext` est copié dans `OperationalRoute`, le handoff vers la
création d'action et les snapshots/proofs via le résumé prédictif. Les routes
historiques sans ce champ restent valides. La géométrie planifiée est donc
conservée séparément de toute géométrie de trajet réellement observé.

L'export PDF conserve les groupes, leurs métriques et leurs passages distincts,
et ajoute la provenance de la projection lorsqu'elle existe. Il rappelle que
le risque est théorique et que les observations terrain sont une famille
différente.

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
finale du provider reste la source de vérité de l'itinéraire affiché. Le
rendez-vous intermédiaire est une projection de cette géométrie : il vise 50 %
de la distance cumulée des coordonnées finales, expose sa distance et son temps
relatif lorsqu'ils sont disponibles, et porte sa provenance. Un point manuel
conserve ses coordonnées enregistrées ; ses métriques sont projetées sur le
segment le plus proche seulement lorsque le résidu géodésique est inférieur ou
égal à 10 m, sinon elles restent inconnues. L'effacement d'un point manuel
retire sa provenance manuelle avant toute éventuelle projection automatique.
Pour plusieurs groupes indépendants, chaque boucle porte sa propre projection ;
aucun midpoint partagé ambigu n'est créé et l'absence de rendez-vous commun est
affichée séparément des rendez-vous disponibles dans les cartes de groupe. Une
géométrie insuffisante laisse le rendez-vous indisponible sans inventer de
coordonnées ou d'ETA. Lorsque ce point existe,
le panneau peut proposer au plus trois opportunités locales issues du même pool
de candidats admissibles, dans le rayon maximal de la policy
`MEETING_OPPORTUNITY_POLICY` (150 m). Leur distance
est explicitement à vol d'oiseau, leur provenance observée ou prédite reste
visible, et aucune accessibilité piétonne, aucun détour ni second itinéraire
n'est fabriqué ; les garanties de sécurité et d'accessibilité manquantes les
excluent.

## Potentiel théorique versionné du parcours

La réponse route peut aussi porter `pollutionPotential`, dont le schéma est
`route-pollution-potential-v1`. Ce champ est distinct de
`scoreBreakdown.priority` et des scores historiques des actions : il décrit un
potentiel théorique relatif sur 100, sans signifier une probabilité ni une
quantité mesurée. Les scores historiques ne sont donc jamais réécrits.

Le calcul est réalisé sur les identifiants de sous-segments IRIS réellement
retenus et parcourus par le planner. Ces identifiants restent distincts même
quand plusieurs portions partagent une arête OSM ; les raccordements du graphe
ne sont jamais des portions valorisées. Les identifiants sont dédupliqués avant la pondération
par longueur ; un passage répété, une liaison de déplacement ou un candidat
observé ne reçoit pas de valeur de couverture supplémentaire. Les catégories
`waste` et `cigaretteButts` sont calculées séparément. `mixed` est la moyenne
des indices de catégories normalisés disponibles ; si une catégorie manque,
elle reste explicitement absente et le résultat est `partial` lorsque l'autre
catégorie est disponible.

Les références sont construites hors requête par
`buildRoutePollutionReferenceCatalog`. Elles sont comparées sur la préférence,
la topologie, le budget et la longueur utile. Une action historique n'est
admissible que si son score vaut 100, sa géométrie est un tracé réseau, ses
segments sont mappés et les mesures requises utilisent la méthode de
comparaison versionnée. Ces mesures qualifient l'homogénéité de la référence ;
elles ne sont jamais transformées en risque spatial. À défaut, une référence
théorique admissible du réseau pré-calculé peut être utilisée.

Le catalogue embarque l'identité exacte de la projection, du graphe et du
modèle. Un catalogue absent ou incompatible avec le snapshot courant ne donne
pas lieu à une normalisation de convenance : le parcours expose un statut
`unavailable`, ses limites et sa provenance. Le champ contient également la
couverture, la confiance, la référence utilisée, la version et les limites,
ainsi qu'un indice global et un indice par groupe.

### Évaluation de pertinence

`RoutePollutionRelevanceAssessment` applique la policy versionnée
`route-pollution-relevance-v1` aux scores serveur du potentiel. Un score
strictement inférieur à 40 déclenche un avertissement rouge ; de 40 inclus à
65 exclu, un avertissement orange ; à partir de 65, aucune alerte. La policy
exige aussi une confiance d'au moins 0,5 ; une confiance inconnue ou inférieure
rend la pertinence non évaluable et ne déclenche pas d'alerte de faible
pollution.

Le résumé de `RouteResults` affiche le score, la catégorie, la confiance, la
référence parisienne et le rappel qu'il s'agit d'un potentiel théorique relatif.
Les indices de chaque groupe restent visibles et leurs avertissements ne sont
pas masqués par une moyenne globale favorable. Le bouton de recherche
alternative n'est présent que lorsqu'un avertissement serveur rouge ou orange
est évalué ; il relance le planner avec la priorité théorique maximale, sans
interdire la création de l'action courante et sans qualifier une rue de propre.

### Recherche du parcours pertinent le plus proche

Le bouton transmet désormais `searchMode=nearest_relevant` à la même frontière
serveur que la recommandation initiale. Le serveur recalcule d'abord la demande
d'origine, conserve son point précis ou la géométrie de zone, puis explore le
graphe piéton actif par élargissements bornés de `0,5`, `1`, `2`, `3` et `5 km`.
Les départs candidats sont des nœuds sortants du réseau couvert et situés dans
Paris intra-muros ; leur nombre est plafonné par rayon et par requête.

Chaque candidat est planifié comme une boucle avec la préférence, les groupes,
les effectifs, la sécurité et les budgets de la demande initiale. Une solution
n'est retenue que si le score serveur atteint `65`, que la confiance est au
moins celle de `route-pollution-relevance-v1`, que chaque groupe respecte ces
deux conditions et que la boucle respecte les budgets. Dans le premier rayon
admissible, la distance d'accès depuis le point initial — ou depuis la limite
de la zone — est prioritaire ; le score départage les accès équivalents.

La réponse `nearestRelevantSearch` distingue le score avant/après, le nouveau
rendez-vous, la distance et la durée d'accès, le rayon utilisé, les limites,
le meilleur résultat insuffisant et le statut du routage (`network` ou
`fallback`). Le déplacement d'accès n'est pas ajouté à la durée de collecte.
La recherche est bornée à 40 tentatives, à quatre appels fournisseur cumulés,
à trois secondes par plan et à un budget global de 12 secondes. Les tentatives
expirées ou rejetées sont comptabilisées dans `plansEvaluated` ; leur travail
est signalé par un `AbortSignal` et n'est plus retenu comme alternative. Une
absence de solution, un rejet fournisseur ou une expiration conserve
l'itinéraire initial et expose explicitement l'état contrôlé sans le présenter
comme suffisant.

### Comparaison et remplacement explicite

La réponse initiale reste la réponse active tant que l'utilisateur n'a pas
choisi une proposition. Pendant la recherche, `RouteResults` conserve donc le
résumé, les métriques, la topologie, le départ et les exports du parcours
initial ; la carte superpose l'ancien tracé et l'alternative lorsqu'elle est
admissible, avec les deux départs, leurs distances, leurs temps de déplacement,
leurs scores théoriques et la distance/durée d'accès au nouveau rendez-vous.
Cette distance d'accès reste distincte du temps de collecte.

`Conserver mon itinéraire` ferme la comparaison sans muter la saisie ou la
réponse initiale. `Utiliser cet itinéraire` remplace explicitement la réponse
active par la réponse serveur de l'alternative : son départ réel, sa boucle,
ses groupes, ses versions de projection/graphe/modèle, sa trace et ses preuves
restent ceux calculés pour cette alternative. Le handoff de création d'action
est construit uniquement depuis cette réponse active ; `OperationalRoute`,
reprise, PDF, GPX et les liens de navigation en aval ne reçoivent donc pas
l'ancien tracé. La saisie historique des contraintes et de l'adresse n'est pas
réécrite silencieusement.

Un refus, une absence de solution, une erreur ou un changement de saisie
invalide la proposition en cours et conserve le parcours initial. L'erreur de
recherche reste visible même lorsqu'aucune donnée alternative n'est disponible,
avec une action explicite pour conserver le parcours. La sélection
ne crée aucune nouvelle source de scoring et ne change pas les scores
historiques des actions. Pour plusieurs groupes, la comparaison et le choix
portent sur la réponse complète : départ commun, boucles complémentaires et
preuves propres à chaque groupe sont conservés ensemble.
