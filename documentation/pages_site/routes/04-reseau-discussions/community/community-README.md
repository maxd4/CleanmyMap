# Communauté — compatibilité historique

`/sections/community` n’est plus une page autonome et n’est plus enregistrée
dans le registre des rubriques. Cette fiche est conservée uniquement pour
documenter les anciennes URL et éviter de réintroduire leur composition.

## Cibles actuelles

- `/sections/community` et `/community` redirigent vers
  `/sections/rejoindre-une-action` ; les paramètres `eventId` sont convertis
  en `communityEventId` pour conserver le bon identifiant d’événement.
- `/partners/network` et `/partners/network/pepite` redirigent vers
  `/sections/annuaire` ; l’ancien `tab=partners` n’est pas une surface
  canonique.

Les événements historiques, leurs RSVP et leurs opérations autorisées restent
portés par les API `community_events` et par les surfaces canoniques Actions et
`/sections/rejoindre-une-action`. Ils ne sont pas supprimés par cette
redirection. `/missions/[id]` conserve son contrat propre de mission GPS.

## Surfaces canoniques

- Les groupes de discussion vivent dans `/sections/messagerie`.
- La consultation des actions et des événements historiques vit dans
  `/sections/rejoindre-une-action`.
- L’exploration des acteurs et le référencement partenaire vivent dans
  `/sections/annuaire`.
- Les données publiques vivent dans `/sections/open-data`.

La navigation primaire du bloc Réseau & Discussions contient exactement les
trois entrées documentées dans
[`../reseau-discussions-README.md`](../reseau-discussions-README.md) : groupes
de discussion, annuaire des acteurs, données publiques. Feedback et Soutenir
CleanMyMap restent accessibles par leurs destinations directes.

## Statut documentaire

Ce document est une note de compatibilité `LEGACY / REDIRECT`, pas une fiche
`CURRENT`. Les fichiers associés ci-dessous conservent les décisions et limites
historiques de la page supprimée ; aucune de leurs propositions ne décrit une
fonctionnalité actuellement rendue.

- [Présentation historique](./community-presentation-detaillee.md)
- [Propositions historiques](./community-liste-propositions-a-traiter.md)
- [Objectifs hors périmètre](./community-objectifs-non-pertinents.md)
