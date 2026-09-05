# Domaine route

Cette arborescence porte la création d’itinéraires et ses contrats. Elle ne
mesure pas directement la pollution : elle combine des signaux disponibles
pour produire une décision de planner contrainte et explicable.

- `route-response-contract.ts` : contrats HTTP request/response partagés par
  l’API et l’UI ; les types d’état ou de rendu restent dans le domaine UI.
- `route-planner.ts` : sélection déterministe sous contraintes de budget,
  sécurité, origine et nombre maximal d’arrêts.
- `fossgis-foot-routing.ts` et les providers associés : résultat de routage
  réseau et fallback explicitement estimé.
- `route-event-pressure.ts`, `route-event-centered.ts` : signaux et modes
  liés aux événements.
- `route-predicted-targets.ts` : candidats prédits, distincts des spots
  observés, avec provenance, modèle et état de disponibilité.
- `route-trace.ts` et `route-data-status.ts` : audit, explications et états
  de dégradation.
- `paris-pressure-route-adapter.ts` : politique d’utilisation du prior
  géospatial par le planner. Le rattachement spatial reste dans
  `lib/geo/paris-pressure-lookup.ts`.

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
