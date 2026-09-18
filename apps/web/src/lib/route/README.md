# Domaine route

Cette arborescence porte la création d’itinéraires et ses contrats. Elle ne
mesure pas directement la pollution : elle combine des signaux disponibles
pour produire une décision de planner contrainte et explicable.

- `route-response-contract.ts` : contrats HTTP request/response partagés par
  l’API et l’UI ; les types d’état ou de rendu restent dans le domaine UI.
- `route-planner.ts` : sélection déterministe sous contraintes de budget,
  sécurité, origine et nombre maximal d’arrêts. Chaque candidat réserve aussi
  le retour à l’origine ; le planner ne produit donc qu’une boucle fermée.
- `fossgis-foot-routing.ts` : résultat de routage
  réseau et fallback explicitement estimé. L’API reçoit la séquence
  `origine → stops → origine` et les legs incluent le dernier retour.
- `route-predicted-targets.ts` : candidats prédits, distincts des spots
  observés, avec provenance, modèle et état de disponibilité.
- `route-data-status.ts` : états de disponibilité et de dégradation exposés
  par le contrat courant.
- `route-recommendation-loader.ts`, `recommendation-assistant.ts` et
  `trash-spotter-recommendation.ts` : chargement et enrichissements de la
  recommandation ; la pression événementielle peut être chargée comme signal
  d’entrée de l’orchestration API et du contexte d’assistance, mais le mode
  `event-centered`/`planningMode` n’est pas un contrat courant.
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
sélection est déterministe et aucun appel externe supplémentaire n’est réalisé
pendant les calculs hors des providers déjà contractuels.

Le contrat de recommandation expose `isLoop: true`, l’origine, la distance et
la durée totales de la boucle, le coût du retour et le budget restant. La trace
répète ces éléments et ajoute le retour comme dernier segment explicable. Un
fallback conserve la même fermeture et estime les legs à 4,5 km/h.

## Répartition multi-groupe

La requête HTTP accepte `volunteers` (1 à 100) et `groupCount` (1 à 12), avec
la contrainte `groupCount <= volunteers`. Le défaut reste `1 / 1` afin de
préserver le comportement historique du planner. Pour plusieurs groupes,
`route-group-partition.ts` charge un seul pool de candidats, conserve l'origine
commune et produit une partition déterministe dans le domaine route ; l'UI ne
recalcule ni la sélection ni la répartition.

Les effectifs sont équilibrés au plus près (par exemple `11 → 4 / 4 / 3`).
Chaque candidat est attribué au plus à un groupe par défaut. La sélection
réserve le retour à l'origine dans chaque boucle estimée et applique d'abord
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
