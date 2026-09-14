# Méthodologie de création d’itinéraire

## Statut et périmètre

Ce document est la référence canonique de l’architecture pédagogique du
moteur de création d’itinéraire. Il explique comment CleanMyMap transforme des
données disponibles en une proposition de parcours de nettoyage priorisée et
contrainte.

Cette version ne publie ni formule, ni poids, ni coefficient du moteur. Ces
détails relèvent de contrats et de versions de modèle distincts lorsqu’ils
sont suffisamment stabilisés pour être documentés.

Le moteur produit une proposition d’itinéraire. Il ne mesure pas directement
la pollution et ne garantit pas la présence de déchets sur un lieu donné.

## 1. Objectif du moteur

Le moteur cherche un parcours praticable à partir d’une origine, d’un budget
et de contraintes de planification. Il met en relation des candidats de
nettoyage, leur niveau de preuve et les contraintes de déplacement afin de
proposer un ordre d’arrêts explicable.

Le résultat est une décision du planner, pas une observation supplémentaire.
La présence d’une zone ou d’un arrêt dans la proposition ne transforme pas une
estimation en constat de terrain.

## 2. Données d’entrée

Le planner reçoit les grandes familles de données suivantes :

- une origine, avec sa source et son éventuel caractère approximatif ;
- les contraintes utilisateur, notamment le budget de déplacement, le nombre
  maximal d’arrêts et la préférence entre priorité et déplacement ;
- les observations terrain disponibles et éligibles pour une intervention ;
- les données contextuelles disponibles, par exemple les signaux urbains et
  les événements utilisables par le contrat courant ;
- les événements éventuellement associés à la demande, avec leurs données de
  localisation et de contexte lorsqu’elles sont disponibles ;
- les prédictions locales disponibles, avec leur zone, leur provenance, leur
  version de modèle, leur confiance et leurs risques distincts pour les
  déchets et les mégots ;
- l’état de santé et de complétude des sources nécessaires au parcours.

Une donnée absente, partielle ou approximative reste identifiée comme telle
dans les contrats et dans la trace. Elle n’est pas silencieusement remplacée
par une observation ou par une valeur équivalente.

## 3. Construction des candidats

### Candidats observés

Les candidats observés correspondent aux signalements terrain effectivement
disponibles dans le périmètre du planner. Leur preuve est portée par le contrat
`observed` et reste distincte des risques calculés par le modèle prédictif.

### Candidats prédits

Les candidats prédits représentent une zone ou une cellule à risque. Ils
référencent la source `urban-pressure-model`, la version du modèle, les
risques déchets et mégots, les contributions explicatives, la confiance, la
provenance et l’état de complétude associés.

Le centroïde d’une zone peut servir aux calculs de distance et de corridor ;
il ne crée pas un signalement observé ponctuel au centre de cette zone.
L’emprise et le rayon de la zone restent disponibles pour qualifier la
proximité et le détour.

### Exclusions

Un candidat peut être écarté parce qu’il n’est pas éligible pour une
intervention bénévole, parce qu’il ne respecte pas une contrainte de sécurité,
parce qu’il est hors du corridor admissible ou parce qu’il ne peut pas être
rejoint dans le budget disponible. Une exclusion est une décision du pipeline,
pas une conclusion sur l’état réel du lieu.

### Déduplication

Les candidats prédits voisins sont dédupliqués avant leur transmission au
planner. Cette étape évite qu’une même opportunité spatiale augmente
artificiellement sa priorité parce qu’elle est représentée par plusieurs
zones proches. Les identifiants de zones dédupliquées et les avertissements
associés restent auditables.

Les candidats observés et prédits ne sont pas fusionnés en un seul type de
preuve. Le pool peut les comparer pour planifier, mais conserve leur famille
jusqu’à l’interface et à l’explication finales.

## 4. Priorisation

La priorité de pollution est construite à partir de plusieurs signaux
disponibles, dans le respect de leur provenance et de leur état de confiance.
Elle peut tenir compte du contexte urbain, de la proximité du trajet, des
événements, de l’historique disponible et du coût de déplacement. Le planner
conserve séparément `pollutionPriority`, `volunteerAdditionality` et
`finalPlannerContribution` : l’additionnalité modifie le classement dans une
pondération bornée, mais ne remplace ni la pression déchets/mégots, ni les
événements, ni le budget, ni la sécurité.

Les déchets diffus et les mégots ne sont pas obligés de produire la même
priorité. Le planner peut exploiter le risque correspondant au contexte
demandé, tout en conservant les deux risques dans l’évidence prédite lorsque
la couche les fournit.

Une forte priorité ne suffit pas à imposer un arrêt : elle est évaluée avec le
budget, la sécurité, l’origine, le nombre maximal d’arrêts et les possibilités
de routage.

Les prédictions restent des risques ou des pressions estimées. Elles ne
remplacent jamais l’historique terrain et ne sont pas présentées comme une
mesure réelle de pollution.

`volunteerAdditionality` estime la valeur complémentaire d’une action bénévole
à partir du besoin probable, de la couverture municipale relative et de
l’aptitude bénévole. Le calcul reste borné et dépendant de la confiance : une
donnée municipale documentée prévaut sur une inférence, tandis qu’une donnée
absente rapproche le facteur de son neutre et réduit la confiance globale.
Une difficulté mécanique peut contribuer à l’additionnalité, mais ne constitue
jamais à elle seule une preuve de faible couverture municipale.

Une intervention municipale forte ou imminente, lorsqu’elle est documentée,
réduit l’additionnalité. La surface et les obstacles décrivent des indices de
nettoyabilité ; ils ne constituent pas une observation de tournée.

## 5. Contraintes du planner

Le planner applique les contraintes suivantes :

- le budget de déplacement demandé ;
- `maxStops`, qui borne le nombre d’arrêts proposés ;
- les règles d’éligibilité et de sécurité ;
- l’origine et sa précision déclarée ;
- le mode de planification, notamment le mode libre ou le mode centré sur un
  événement (`planningMode: "free"` ou `"event-centered"`) ;
- les contraintes du réseau et les informations effectivement fournies par
  le routage ;
- les états de disponibilité, de complétude et de dégradation des sources.

En mode event-centered, le contexte événementiel et l’ancrage sont conservés
dans la trace : événement, statut temporel, rayon, poids d’ancrage, candidats
favorisés et impacts par candidat. Cet ancrage reste soumis au budget et aux
contraintes de sécurité.
Ces contraintes peuvent empêcher la sélection d’une zone pourtant prioritaire.
Le résultat doit alors conserver la décision et la raison de l’exclusion dans
la trace lorsque le contrat le permet.

Le planner reste fail-closed sur les éléments qu’il ne peut pas établir de
manière fiable : une source indisponible est signalée comme indisponible, une
géométrie estimée est identifiée comme estimation et un candidat non sûr n’est
pas promu par défaut.

## 6. Construction du trajet

La construction sépare quatre responsabilités :

1. la sélection et la priorisation des candidats admissibles ;
2. l’ordre des arrêts selon la priorité, le déplacement incrémental et les
   critères déterministes de départage ;
3. le calcul de la géométrie et des mesures fournies par le routage réseau ;
4. l’application d’un fallback lorsque la géométrie réseau n’est pas
   disponible ou lorsqu’un préfixe compatible avec le budget doit être retenu.

Un résultat `network` est attribué au fournisseur de routage pour les choix de
tracé et les mesures qu’il fournit. Un résultat `fallback` ou `estimated` est
présenté comme tel ; il ne doit pas être confondu avec une mesure réseau.

La séparation s’applique aussi aux distances utilisées pour admettre une zone
prédite : distance au corridor, détour estimé et résultat réseau sont des
informations différentes et sont conservés dans leurs champs respectifs.

### Charge de nettoyage estimée, sans durée calibrée

Le contrat versionné `route-cleanup-workload-v1` expose une charge vectorielle
séparée entre `ordinaryWaste` et `cigaretteButts`. Cette charge reste une
dérivation d’évidence, pas une mesure physique :

- pour un signalement observé éligible, les catégories prouvent uniquement une
  présence (`observedPresence`) ; elles ne représentent ni une quantité, ni un
  poids, ni un volume ;
- pour une zone prédite explicitement sûre, `relativePressure` conserve
  directement l’échelle native `0–100` de `wasteRisk` et
  `cigaretteButtRisk`, avec la confiance prédictive existante ; aucun score
  n’est converti en kilogrammes, en nombre de mégots ou en minutes ;
- la provenance, la confiance et la version du contrat restent exposées pour
  éviter de mélanger observation et prédiction ;
- une catégorie non ramassable par des bénévoles, une zone dangereuse ou une
  sécurité inconnue est exclue de la charge et ne devient jamais une cible de
  collecte.

Une présence observée n’est pas une quantité. Un risque prédit `0–100` n’est
pas une quantité physique. `cleanupWorkload` n’est pas une durée de collecte :
aucune durée de nettoyage n’est actuellement calibrée. Les mesures de trajet
restent des mesures de déplacement fournies ou estimées par le routage.

### Infrastructure de calibration temporelle

La durée de collecte est un contrat distinct de `cleanupWorkload` :
`route-cleanup-duration-v1`. Il expose `minutes`, `uncertaintyMinutes`, la
version du modèle, le statut `calibrated`, `data_insufficient`, `unavailable`
ou `excluded`, une raison et sa provenance. Tant qu’aucun artefact calibré
versionné n’est actif, `minutes` et `uncertaintyMinutes` restent `null`.
Aucun coefficient, conversion risque → poids, risque → mégots ou risque →
minutes n’est déduit des données courantes.

Lorsqu’une recommandation devient le point de départ d’une action, son contrat
transporte `calibrationContext` dans `preparationData.routeCalibrationContext`.
Le contexte de préparation est versionné `action-route-calibration-v2` ; lorsqu’il
porte une preuve serveur cohérente avec son snapshot, il est versionné
`action-route-calibration-v3`. Il conserve avant
l’action la date de génération, la version du moteur, la version de
`cleanupWorkload`, les bénévoles et groupes prévus, ainsi que chaque candidat
retenu avec sa famille (`observed` ou `predicted`) et le snapshot exact de sa
charge. Son `plannerSnapshot` conserve en plus les paramètres ayant influencé
la génération, les versions de modèles et de sources, la géométrie et les
distances recommandées, l’allocation prévue des groupes et la provenance de la
réponse. Les deux pressions restent individuelles : elles ne sont ni sommées
ni moyennées.

`preparation_data` demeure la source canonique. La création valide strictement
le contexte ; une édition ordinaire conserve le snapshot historique et une
tentative explicite de le remplacer est refusée. Le snapshot
`route-planner-snapshot-v1` est donc
immuable après la création de l’action : une modification ultérieure du
formulaire, de la localisation ou de l’itinéraire opérationnel ne le réécrit jamais.
Les contextes v1 et v2 déjà persistés restent lisibles pour compatibilité, mais ne
peuvent pas être complétés rétroactivement. Une ancienne action sans ce
contexte est exclue du dataset de calibration : son contexte n’est jamais
reconstruit depuis l’état courant.

### Parcours opérationnel après création

Le snapshot planner et le parcours opérationnel sont deux objets distincts.
Lorsqu’une action est créée depuis le planner, le client initialise
`preparationData.operationalRoute` avec une copie opérationnelle v1 de la ou
des boucles recommandées. Cette copie peut ensuite être ajustée (zones) ou
supprimée boucle par boucle sans toucher à
`routeCalibrationContext.plannerSnapshot`. Elle décrit le parcours prévu, pas
un trajet GPS observé : le futur contrat `executedRoute` est hors de ce lot.

`operationalRoute` conserve les géométries et les arrêts techniques du planner
sous `plannerTechnicalStops`, sans durée par arrêt. Le rendu public de la carte
ne dessine que les lignes des boucles et les trois zones éditables — départ,
mi-parcours et arrivée — ; les arrêts techniques du planner ne sont pas
affichés comme étapes publiques. Le nombre historique `plannerGroupCount` reste
immuable, même après suppression de toutes les boucles ; le nombre courant de
boucles n’est jamais présenté comme une répartition de bénévoles.

Les nouvelles écritures utilisent exclusivement `operational-route-v1` dans le
champ JSONB existant `preparation_data`. Les anciennes valeurs
`preparationData.actualRoute` (`actual-route-v1`) restent lisibles et sont
normalisées à la lecture, avec priorité à `operationalRoute` si les deux clés
coexistent ; aucune migration destructive ni nouvelle table ou nouvel endpoint
n’est introduit.

Le flux de données est donc :

```text
cleanupWorkload → contexte historique → données terrain → readiness
→ artefact calibré versionné → estimation de durée
```

### Budget opérationnel

Le budget opérationnel est un contrat distinct et versionné :
`route-operational-budget-v2`. Il sépare toujours :

- `travelMinutes` : déplacement réseau ou estimation de fallback ;
- `actionMinutes` : durée estimée de l’action future, c’est-à-dire marche,
  ramassage, tri et pesée ; `serviceMinutes` reste un alias de lecture
  compatible ;
- `eventBudgetMinutes` : créneau utilisateur transporté par le champ historique
  `travelBudgetMinutes` tant que le contrat de requête n’est pas renommé ;
- `organizationMarginMinutes` : marge fixe de 15 minutes pour le dépôt des
  sacs, boire, le regroupement et les petites opérations de fin ; ce n’est pas
  une incertitude statistique ;
- `actionBudgetMinutes` : `eventBudgetMinutes - 15`, borné à zéro ;
- `totalMinutes` : `actionMinutes + 15`, uniquement lorsque la durée d’action
  est disponible ;
- `uncertaintyReserveMinutes` : diagnostic de l’estimateur, conservé pour la
  provenance mais jamais ajouté au budget ;
- `withinBudget` : conformité de la durée d’action au budget d’action, `null`
  lorsque l’une des deux valeurs est inconnue.

Le champ historique `travelBudgetMinutes` est donc interprété comme le créneau
total de l’événement dans le contrat v2. Le temps réseau reste une contrainte
interne et un diagnostic du trajet, retour au point de départ compris ; il ne
représente pas seul la durée réelle de l’action. Avec un estimateur calibré,
le planner compare le total `actionMinutes + 15` au créneau. Lorsque la
calibration est `data_insufficient`, le planner reste fonctionnel avec son
admission réseau historique : aucune route n’est supprimée uniquement parce
que la durée opérationnelle complète manque, et l’interface l’indique
explicitement.

Le planner et la partition multi-groupe reçoivent une dépendance explicite vers
l’estimateur de durée. Lorsqu’un artefact calibré est injecté, le coût
opérationnel incluant la branche de retour à l’origine peut devenir le coût
d’admission et d’équilibrage ; lorsqu’il est indisponible, le coût de
déplacement historique reste la seule contrainte. Chaque groupe porte son
propre contrat. Pour des groupes exécutés en parallèle, le créneau global est
`max(actionMinutes des groupes) + 15` : la marge organisationnelle n’est pas
répétée une fois par groupe. Le système ne fabrique pas de répartition de
bénévoles entre routes. Si seule la composition globale est disponible,
`balancedVolunteerCounts` conserve une allocation déterministe ; elle ne
prétend pas connaître la composition enfants/adultes/retraités de chaque
groupe. Une composition ou un effectif différent peut donc modifier la
proposition lorsque l’estimateur actif en tient compte.

La réponse serveur et la trace exposent séparément déplacement réseau, durée
d’action, marge, réserve diagnostique et créneau total. `trace.duration.totalMinutes`
reste `null` quand la durée d’action est inconnue ; le déplacement demeure dans
`networkMinutes` ou `estimatedMinutes`. Le frontend et l’export PDF affichent
les estimations utilisateur comme un intervalle au quart d’heure, sans
modifier la précision interne ni les calculs. La réserve d’incertitude n’est
jamais ajoutée ni fabriquée par le planner, l’API ou le client.
Le frontend affiche les budgets, durées, charges, allocations et états
`withinBudget` fournis par le serveur ; l’édition du brouillon local ne déclenche
aucune requête tant que l’utilisateur n’a pas demandé explicitement le calcul.

La readiness est structurelle, sans seuil statistique arbitraire. Elle vérifie
la couverture et la variation des déchets ordinaires et des mégots séparément,
la diversité des workloads, des types de lieu et des compositions bénévoles,
la couverture des snapshots planner, la dissociabilité de la charge et des
bénévoles, l’existence du bridge runtime historique et la possibilité d’une
validation indépendante. Ces indicateurs décrivent l’état du dataset ; ils ne
déclenchent pas à eux seuls l’activation d’un modèle.

### Dataset de calibration traçable

Le dataset de calibration est construit par action à partir de l’infrastructure
`route-calibration` existante. Une action approuvée et dotée d’un contexte
historique reste exploitable sur chaque axe disponible : `wasteKg = null`
n’exclut donc pas l’analyse des mégots, et l’inverse est également vrai. Les
valeurs absentes restent `null` et leur absence est portée par la qualité de la
ligne ; un zéro explicitement mesuré reste une observation disponible.

Chaque ligne conserve, lorsque ces éléments existent, le snapshot planner
original, le `operationalRoute` prévu et mutable, les distances recommandée et
opérationnelle prévue, le
type de lieu, la durée totale de l’action, les mesures ordinaires et mégots,
leurs méthodes/provenances, ainsi que les versions de contrat. La durée
`duration_minutes` est la durée réelle couvrant la marche, le ramassage, le
tri et la pesée. Les quatre composantes ne sont pas séparées dans le contrat
actuel : elles restent donc inconnues individuellement au lieu d’être
inventées.

Les bénévoles sont conservés sous leurs trois catégories sources
(`childrenCount`, `adultCount`, `retiredCount`). `participantsCount` reste le
nombre réel de personnes. `effectiveVolunteerUnits` est une dérivation
distincte, calculée par la règle versionnée `effective-volunteer-units-v1`
(`1 adulte`, `0,5 enfant`, `0,5 retraité`) ; elle ne remplace jamais les
catégories dans le dataset scientifique. Une action historique qui ne possède
que `volunteersCount` conserve ce nombre comme participation historique, avec
les catégories et les unités effectives à `null`.

La readiness reste `data_insufficient` tant que les données ne permettent pas
une calibration défendable. Le diagnostic expose le nombre d’échantillons, la
couverture de chaque axe, les diversités observées, la couverture des snapshots
et les raisons de l’insuffisance. Il n’invente ni seuil scientifique, ni
mesure, ni provenance. Tant qu’un artefact versionné n’a pas été validé
indépendamment et activé explicitement, aucune durée calibrée n’est produite.

Les états à distinguer sont :

- `CURRENT` : contrat, contexte historique et collecte future sont actifs ;
- `DATA_INSUFFICIENT` : les données actuelles ne permettent pas d’activer un
  modèle numérique ;
- `FUTURE CALIBRATED` : un artefact versionné pourra fournir minutes et
  incertitude après validation indépendante.

Avec `DATA_INSUFFICIENT`, cette infrastructure ne modifie ni le ranking ni le
planner existants et ne crée pas de migration : le champ JSONB
`preparation_data` existant suffit. Le chemin `CALIBRATED` est activé uniquement
par injection explicite d’un artefact versionné et validé.

À entrées identiques et à données snapshotées identiques, l’ordre de sélection
est déterministe. Le frontend affiche le résultat et sa trace ; il ne recalcule
pas la logique du planner.

## 7. Explicabilité

La trace d’itinéraire doit permettre de relier la proposition à ses données et
à ses décisions. Elle documente notamment :

- la version du moteur et le mode de planification ;
- l’origine, les paramètres demandés et les candidats considérés ;
- les arrêts retenus et leur ordre ;
- les évaluations, le coût de déplacement et le budget consommé ou restant ;
- les exclusions et les candidats incompatibles avec les contraintes ;
- les risques déchets et mégots, leurs composantes, leur confiance, leur
  provenance et leurs éventuels gaps ;
- `pollutionPriority`, `volunteerAdditionality` et
  `finalPlannerContribution`, pour les candidats observés comme prédits ;
- la nature des surfaces et la complexité géométrique, la couverture
  municipale documentée ou estimée, la fréquence lorsqu’elle existe, la
  confiance des signaux et les éventuels malus d’intervention programmée ;
- l’aptitude bénévole et l’état de sécurité géographique ; une prédiction sans
  sécurité explicite n’est pas admise comme cible bénévole ;
- la distance au corridor, le détour et la contribution à l’admission d’une
  zone prédite ;
- le fournisseur de routage, le mode `network` ou `fallback`, les estimations,
  les avertissements et les approximations.

Les libellés d’interface doivent respecter les statuts suivants :

- `observed` ou **observé** : preuve terrain disponible ;
- `predicted` ou **prédit** : risque ou pression estimée par le modèle ;
- **décision du planner** : sélection, ordre ou exclusion sous contraintes ;
- **résultat du fournisseur de routage** : géométrie et mesures réseau
  retournées ;
- **estimation/fallback** : résultat dégradé explicitement identifié.

La surface `Comprendre cet itinéraire` restitue cette trace. Elle ne fabrique
pas un texte justificatif séparé des calculs réels et ne convertit pas un score
de risque en probabilité de trouver des déchets sans calibration statistique
appropriée.

Le contrat versionné `route-cleanup-workload-v1` sépare la preuve de charge selon
deux axes : `ordinaryWaste` et `cigaretteButts`. Pour une cible observée, une
catégorie bénévole éligible prouve uniquement une présence (`presence_only`) ;
elle ne prouve ni une quantité ni un niveau de pression. Pour une cible
prédite explicitement sûre, les axes conservent les risques natifs 0–100 et la
confiance existante du modèle (`relative_estimate`). Une donnée absente est
`unavailable` et une cible non sûre est `excluded`.

Ainsi, `présence observée ≠ quantité`, `risque prédit 0–100 ≠ quantité
physique` et `cleanupWorkload ≠ durée de collecte`. La calibration temporelle
reste une évolution future : le workload n'est converti ni en kilogrammes, ni
en nombre d'objets, ni en minutes.

## 8. Dégradations et données manquantes

Les règles de lecture sont les suivantes :

- `null` n’est pas zéro ;
- l’absence d’une source n’est pas l’absence de pollution ;
- l’absence de couverture municipale documentée n’est pas l’absence de
  nettoyage ;
- une source partielle produit un état partiel, pas une certitude complète ;
- une origine approximative, une distance estimée et un trajet de fallback
  doivent être identifiables ;
- une prédiction ne devient jamais une observation ;
- l’absence de couche prédictive ne doit pas empêcher le planner observé de
  fonctionner ;
- une zone prédite obsolète, partielle ou indisponible doit dégrader
  explicitement l’état de la recommandation selon le contrat courant.
- une prédiction sans preuve explicite de sécurité géographique est exclue du
  planner bénévole ; une sécurité inconnue ne peut pas augmenter son
  additionnalité ;

Les distinctions suivantes sont contractuelles :

```text
geometry proxy ≠ municipal coverage
prediction ≠ observation
additionality ≠ preuve d’absence de nettoyage municipal
planner decision ≠ mesure terrain
```

Un fallback permet de continuer avec une information moins précise lorsque le
contrat le prévoit. Il n’autorise pas à inventer une source, une preuve terrain
ou une couverture réseau.

## 9. Capacités actuelles

Le socle actuellement présent sur `main` comprend :

- les candidats observés et les candidats prédits, conservés dans des familles
  distinctes ;
- le modèle `urban-pressure-model`, qui produit séparément un risque prédit de
  déchets diffus et un risque prédit de mégots, avec leur provenance,
  explicabilité et état de confiance lorsqu’ils sont disponibles ;
- l’intégration bornée de ces zones prédites au pool du planner, sans créer de
  signalement observé artificiel ;
- la pression événementielle et le mode `planningMode` libre ou
  event-centered, avec ancrage événementiel et trace ;
- le snapshot `municipal-cleaning-serviceability`, chargé hors requête et
  consommé par `volunteerAdditionality` ;
- le calcul de `volunteerAdditionality`, sa pondération bornée dépendante de la
  confiance et sa contribution distincte au classement du planner ;
- la séparation explicite de `pollutionPriority`,
  `volunteerAdditionality` et `finalPlannerContribution`, avec exclusion des
  prédictions sans sécurité explicite du planner bénévole ;
- la trace et la surface `Comprendre cet itinéraire`, qui exposent la
  pollution, l’additionnalité, la couverture, la complexité, la sécurité et la
  confiance sans recalcul côté frontend ;
- le routage réseau et les fallbacks explicitement identifiés.

Les risques et pressions restent des estimations. Ils ne sont ni des
observations de terrain ni des probabilités calibrées de trouver des déchets.
Le mode event-centered ne transforme pas un événement en observation de
pollution ; il ajoute un contexte d’ancrage traçable à la décision du planner.

## 10. Fondations et intégrations en cours

### Contexte météo horaire du créneau

Le planner peut recevoir un contexte de prévision Open-Meteo pour un lieu et
un créneau local en heure de Paris. Le client partagé
`apps/web/src/lib/weather/open-meteo-client.ts` est la seule couche qui
construit et exécute les appels Open-Meteo : il applique un timeout de 8
secondes et un cache mémoire borné à 32 requêtes pendant 5 minutes. Une
génération logique du planner effectue au plus une récupération météo ; elle
ne déclenche jamais de lecture par arrêt ou par groupe. L’horizon utilisé par
le contexte planner est de 16 jours ; au-delà, la météo est explicitement
indisponible plutôt que remplacée par une valeur fictive.

Le contrat `planner-weather-snapshot-v1` conserve le provider, la date de
récupération, les coordonnées, la fenêtre couverte, les points horaires et
une synthèse déterministe. Pour la synthèse : température et température
ressentie sont des moyennes des valeurs connues, les précipitations sont
additionnées, la probabilité de pluie et le vent/les rafales prennent le
maximum, et le code météo est le mode (égalité départagée par le code le plus
bas). Une valeur absente reste absente ; elle n’est jamais remplacée par zéro.

Si le créneau est absent, invalide, hors de l’horizon de prévision ou si
Open-Meteo est indisponible, `weatherStatus` vaut `unavailable`. Ce statut est
fail-soft : la route est tout de même générée. La prévision est copiée dans
la trace et le snapshot planner au moment de la génération. Elle décrit ce
que CleanMyMap savait alors et ne constitue pas une observation météo de
l’action réalisée.

Le contexte météo n’est pas une entrée de `pollutionPriority`, du ranking,
de `cleanupWorkload`, de la durée estimée, du budget, de la partition des
groupes ou de la géométrie. La météo observée pendant l’action relève d’un
futur lot de calibration distinct.

Les fondations suivantes bornent la capacité actuelle sans devenir des
affirmations métier supplémentaires :

- le snapshot `municipal-cleaning-serviceability` est versionné et chargé
  localement ; il n’est pas rafraîchi en temps réel pendant chaque calcul et
  sa couverture reste partielle ;
- les fréquences municipales et les opérations programmées ne sont utilisées
  que lorsqu’elles sont documentées dans le snapshot ou le contexte fourni ;
- les proxies géométriques, la complexité de surface et l’accessibilité
  mécanisée ne mesurent pas une tournée municipale ;
- la disponibilité d’un événement, d’une preuve municipale ou d’une preuve de
  sécurité dépend de la complétude du snapshot et du contrat d’entrée.

Une difficulté d’accès mécanique ou une inférence géométrique ne peut donc pas
être lue comme une absence de nettoiement municipal.

## 11. Évolutions futures

Les extensions suivantes restent explicitement futures dans le périmètre
actuel :

- l’utilisation de la météo pour modifier le ranking, la durée, le budget ou
  la géométrie ; le contexte prévisionnel est disponible mais reste
  informatif et traçable uniquement ;
- la durée d’intervention et l’estimation du temps de nettoyage, qui ne sont
  pas encore calibrées par `route-cleanup-workload-v1` ;
- une allocation détaillée des catégories de bénévoles par groupe, lorsque
  cette information n’a pas été fournie au planner.

Ces évolutions devront conserver la séparation entre observation, prédiction,
décision du planner et résultat du routage. Toute modification de contrat ou
de sémantique publique devra être documentée et versionnée avant d’être
exposée comme une capacité disponible.

Références détaillées : [modèle de risque parisien](paris-pressure-risk-model.md),
[intégration des risques prédits](route-predicted-risk-integration.md) et
[serviceabilité du nettoiement municipal](paris-municipal-cleaning-serviceability.md).

## Références de navigation

- [Créer un itinéraire](/sections/route)
- [Méthodologie de la carte d’actions](/docs/product/methodologie-carte-actions.md)
- [Retour à la section de méthodologie](/methodologie#methodologie-itineraire)
