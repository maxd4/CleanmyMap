# Domaine route

Cette arborescence porte la création d’itinéraires et ses contrats. Elle ne
mesure pas directement la pollution : elle combine des signaux disponibles
pour produire une décision de planner contrainte et explicable.

- `route-response-contract.ts` : contrats HTTP request/response partagés par
  l’API et l’UI ; les types d’état ou de rendu restent dans le domaine UI.
- `route-planner.ts` : sélection déterministe sous contraintes de budget,
  sécurité, origine et nombre maximal d’arrêts. Pour une boucle, chaque
  candidat réserve le retour à l’origine ; pour un trajet ouvert, la dernière
  liaison vise l’arrivée fournie ou déterminée par le planner.
- `fossgis-foot-routing.ts` : résultat de routage
  réseau et fallback explicitement estimé. L’API reçoit une séquence adaptée à
  la topologie : `origine → stops → origine` pour une boucle, ou
  `origine → stops → arrivée` pour un trajet ouvert.
- `pedestrian-network.ts`, `pedestrian-network-store.ts` et
  `../../scripts/import-pedestrian-network.mjs` : représentation versionnée du
  graphe OSM piéton, import borné Panthéon/Jardin des Plantes et lecture
  serveur par RPC. Quand une version active couvre la recommandation, le
  planner route sur ce graphe dirigé sans appel OSM/FOSSGIS ; un point ou une
  restriction non prouvés restent exclus et sont conservés dans les
  diagnostics d’import.
- `route-predicted-targets.ts` : candidats prédits, distincts des spots
  observés, avec provenance, modèle et état de disponibilité.
- `route-data-status.ts` : états de disponibilité et de dégradation exposés
  par le contrat courant.
- `route-recommendation-loader.ts`, `recommendation-assistant.ts` et
  `trash-spotter-recommendation.ts` : chargement et enrichissements de la
  recommandation ; la pression événementielle peut être chargée comme signal
  d’entrée de l’orchestration API et du contexte d’assistance. Les modes
  `free`, `event-centered` et `territorial-guided` sont des contrats courants.
- `route-trace.ts` : contrat de trace et d’explicabilité lorsqu’il est fourni
  par le pipeline courant.
- `street-cleaning-corridor.ts` : contrat séparé du corridor réellement
  nettoyable. Il exige une preuve géographique latérale ou d’un corridor
  unique ; sans cette preuve, le handoff reste `unknown`.
- `paris-pressure-route-adapter.ts` : politique d’utilisation du prior
  géospatial par le planner. Le rattachement spatial reste dans
  `lib/geo/paris-pressure-lookup.ts`.

La structure reste volontairement plate dans l’état actuel de `main`. Les
groupes événements, prédiction, providers et trace ne constituent pas encore
des sous-domaines publiés dans ce checkout ; aucun déplacement cosmétique n’est
justifié par ce seul classement. Une extraction ultérieure devra réduire un
couplage réel et préserver les imports publics. La couche de serviceabilité
municipale est une fondation de données distincte ; elle ne constitue pas
encore une politique d’additionalité branchée au planner.

La géométrie `network`/`fallback` décrit le déplacement. Elle ne prouve pas
le trottoir nettoyable : ni OSRM/FOSSGIS, ni une polyline, ni les steps ne
permettent seuls de produire `left`, `right` ou `single`. Le contrat de
corridor exige une orientation de référence explicite, une source versionnée,
la provenance et, lorsque connu, les traversées prouvées qui restent sur le
même côté. Aucun nom de rue, largeur supposée, intersection ou terre-plein ne
crée à lui seul un corridor. Le handoff courant est donc `unknown`, car le
snapshot de serviceabilité municipal versionné ne contient pas encore de
preuve latérale ni de traversée ; aucune dépendance Overpass live n’est
ajoutée au hot path. Le planner peut toutefois répartir l’hypothèse
opérationnelle en deux identifiants abstraits `A` et `B` pour une rue routable
(aller/retour ou groupes distincts). `A`/`B` restent `geographicSide:
"unknown"` tant qu’aucune preuve n’est disponible. `networkOverlap` mesure le
passage réseau commun ou proche uniquement lorsqu’une référence de segment ou
une géométrie de step permet de l’identifier ; sinon il vaut `null` (inconnu),
et non zéro. Le nom de rue reste un label. `cleaningCoverageOverlap` ne compte
que la répétition du même corridor opérationnel ; une exception versionnée à un
seul corridor prévaut sur le défaut.

La frontière suit le flux `API → domaine route → UI` : l’API valide et orchestre,
le domaine calcule et trace, l’UI affiche sans recalculer la géographie ni le
planner. `observed` n’est jamais `predicted`; une décision du planner n’est
pas un résultat du fournisseur de routage; une estimation ou un fallback est
identifié comme tel.

Le budget et la sécurité sont des contraintes dures. À entrées identiques, la
sélection est déterministe. Une version active du graphe pilote évite les
appels de routage externes pendant la recommandation ; en son absence, le
provider FOSSGIS existant reste le chemin de compatibilité documenté.

Le contrat de recommandation expose la topologie (`routeTopology: "loop"` par
défaut ou `"open"`), la sélection de départ (`startLocation`) et l’origine
résolue, la distance et la durée totales, le coût du
retour pour une boucle et le budget restant. Une boucle conserve
strictement départ = arrivée et sa trace ajoute le retour comme dernier
segment explicable. Un trajet ouvert conserve son arrivée distincte, sans
`returnLeg` artificiel ; si elle n’est pas fournie, le planner la choisit dans
les contraintes du parcours. Un fallback conserve la topologie demandée et
estime les legs à 4,5 km/h.

`startLocation` distingue une adresse précise (`precise`, adresse ou GPS,
origine obligatoire et inchangée) d’une zone (`zone`, emprise confirmée et
bornée). Pour une zone, le serveur ne fabrique pas de centroïde de parcours :
il choisit de façon déterministe un candidat admissible dans l’emprise, selon
la contribution du planner puis la proximité et l’identifiant. Sans candidat
admissible, la requête est refusée explicitement. La sélection et l’origine
résolue sont conservées dans la réponse, le snapshot, la preuve et le
`OperationalRoute`; les brouillons historiques sans `startLocation` gardent
leur résolution d’origine. Dans l’interface, le mode de départ reste la
sélection effective même avant géocodage d’une zone ; changer de source précise
invalide l’ancienne origine devenue inapplicable, tandis qu’un brouillon valide
réhydrate son mode et sa sélection sans les supprimer lors d’un simple
rerender. La zone de départ ne constitue pas une zone de collecte : après la
résolution déterministe de l’origine, le pool canonique de candidats reste
disponible et les contraintes du planner (sécurité, distance, budget et mode)
déterminent les cibles. Les sélections persistées réutilisent le même prédicat
structurel partagé que les brouillons, snapshots et `OperationalRoute` ; un
historique sans `startLocation` reste valide, mais une sélection présente doit
respecter intégralement le contrat de coordonnées, bornes et énumérations.

## Répartition multi-groupe

La requête HTTP accepte `volunteers` (1 à 100) et `groupCount` (1 à 12), avec
la contrainte `groupCount <= volunteers`. Le défaut reste `1 / 1` afin de
préserver le comportement historique du planner. Pour plusieurs groupes,
`route-group-partition.ts` charge un seul pool de candidats, conserve l'origine
commune et produit une partition déterministe dans le domaine route ; l'UI ne
recalcule ni la sélection ni la répartition.

Les effectifs sont équilibrés au plus près (par exemple `11 → 4 / 4 / 3`).
Chaque candidat est attribué au plus à un groupe par défaut. La sélection
réserve le retour à l'origine dans chaque boucle estimée ; pour un trajet ouvert,
elle évalue la liaison vers l'arrivée lorsqu'elle est fournie. Elle applique d'abord
les exclusions de sécurité, puis la valeur, l'équilibre et les coûts de
recouvrement (cible, zone prédictive et corridor). Un secteur court partagé
près de l'origine n'est pas pénalisé comme un corridor commun inutile.

La réponse expose `groups` et `partition`. Ses métriques sont déterministes :
`sharedTargetRatio`, `coverageGain`, `balanceDistance`, `balanceDuration` et
`balanceTargetCount`. Tant que les géométries finales de chaque groupe ne sont
pas routées, `networkSharedDistanceKm` reste `null` et
`networkDistanceMeasured` reste `false`. Le mode `event-centered` conserve
l'ancre et l'origine communes ; sa complémentarité est calculée sur le pool
déjà pondéré par le contexte événementiel.

Documentation canonique associée :
`documentation/architecture/methodologie-creation-itineraire.md`.

Le mode `territorial-guided` courant reçoit la version
`route-territorial-guided-v2`, un secteur borné, des waypoints ordonnés par
groupe et un budget utilisateur décomposé en créneau total, marge
d’organisation, collecte minimale et plafond de déplacement. La version v1
reste lisible pour compatibilité et reçoit un budget interne conservant sa
sémantique historique : tout le créneau de v1 reste disponible pour le
déplacement, sans marge d’organisation ni collecte minimale artificielles.
Chaque groupe reprend exactement l’origine commune et respecte la topologie
effective : boucle fermée pour `routeTopology: "loop"`, trajet ouvert jusqu’à
l’arrivée pour `routeTopology: "open"`, y compris lorsque le pool de
signalements est vide. Les
`plannedWaypoints` restent séparés des `stops` : ils ne portent ni score,
`observed`/`predicted`, priorité scientifique, additionnalité ou provenance de
pollution.

Le routage guidé appelle FOSSGIS/OSRM groupe par groupe ; l’intervalle de
quota distribué existant d’une requête par seconde est respecté avec une
attente bornée. La réponse expose l’audit `guidedRouting` et les
`guidedSegments` : les liaisons `origin-link` sont distinguées des portions
`collection`, l’ordre des waypoints, la fermeture lorsqu’il s’agit d’une
boucle, l’arrivée d’un trajet ouvert, l’écart au secteur et le budget sont
vérifiables. L’audit du secteur est calculé sur la polyline finale
des seules portions `collection` ; `sectorStatus` vaut `unknown` et
`sectorDeviationKm` vaut `null` si cette séparation ne peut pas être démontrée.
Une géométrie de fallback est toujours marquée estimée et indisponible comme
parcours piéton réseau validé.

Dans `RouteSection`, le mode guidé permet de choisir le départ commun sur la
carte, de configurer chaque secteur, de nommer les groupes, de régler leurs
effectifs, d’ordonner leurs passages et d’ajuster le budget. La carte affiche
les groupes ensemble puis par groupe avec des couleurs distinctes, en
respectant la topologie effective. L’export
terrain produit une vue générale et une fiche par groupe ; il sépare les
passages planifiés des observations/prédictions et signale explicitement les
géométries réseau ou estimées.

Lors du rafraîchissement explicite d’une action guidée, le nombre de groupes,
les secteurs, les passages ordonnés, les noms et le budget sont conservés. Les
effectifs confirmés sont redistribués de façon déterministe en nombres entiers
positifs aussi équilibrés que possible. Le panneau ne propose pas de changer
le nombre de groupes tant qu’un éditeur explicite des nouveaux secteurs et
passages n’est pas disponible ; aucune version active ne change avant
l’acceptation de la proposition.
