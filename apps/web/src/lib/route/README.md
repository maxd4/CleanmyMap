# Domaine route

Cette arborescence porte la création d’itinéraires et ses contrats. Elle ne
mesure pas directement la pollution : elle combine des signaux disponibles
pour produire une décision de planner contrainte et explicable.

- `route-response-contract.ts` : contrats HTTP request/response partagés par
  l’API et l’UI ; les types d’état ou de rendu restent dans le domaine UI.
- `route-planner.ts` : sélection déterministe sous contraintes de budget,
  sécurité, origine et nombre maximal d’arrêts.
- `fossgis-foot-routing.ts` : résultat de routage
  réseau et fallback explicitement estimé.
- `route-predicted-targets.ts` : candidats prédits, distincts des spots
  observés, avec provenance, modèle et état de disponibilité.
- `route-data-status.ts` : états de disponibilité et de dégradation exposés
  par le contrat courant.
- `route-recommendation-loader.ts`, `recommendation-assistant.ts` et
  `trash-spotter-recommendation.ts` : chargement et enrichissements de la
  recommandation ; les événements restent un signal d’entrée de l’orchestration
  API tant qu’un sous-domaine dédié n’est pas publié.
- `route-trace.ts` : contrat de trace et d’explicabilité lorsqu’il est fourni
  par le pipeline courant.
- `paris-pressure-route-adapter.ts` : politique d’utilisation du prior
  géospatial par le planner. Le rattachement spatial reste dans
  `lib/geo/paris-pressure-lookup.ts`.

La structure reste volontairement plate dans l’état actuel de `main`. Les
groupes événements, prédiction, providers et trace ne constituent pas encore
des sous-domaines publiés dans ce checkout ; aucun déplacement cosmétique n’est
justifié par ce seul classement. Une extraction ultérieure devra réduire un
couplage réel et préserver les imports publics.

La frontière suit le flux `API → domaine route → UI` : l’API valide et orchestre,
le domaine calcule et trace, l’UI affiche sans recalculer la géographie ni le
planner. `observed` n’est jamais `predicted`; une décision du planner n’est
pas un résultat du fournisseur de routage; une estimation ou un fallback est
identifié comme tel.

Le budget et la sécurité sont des contraintes dures. À entrées identiques, la
sélection est déterministe et aucun appel externe supplémentaire n’est réalisé
pendant les calculs hors des providers déjà contractuels.

Documentation canonique associée :
`documentation/architecture/methodologie-creation-itineraire.md`.
