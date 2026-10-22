# Communauté — présentation historique

## Statut

La composition décrite ici est obsolète : la page autonome, son sélecteur
`Communauté` / `Partenaires` et son rendu dédié ont été retirés. Ce document
reste une trace `HISTORY` liée à la note de compatibilité
[`community-README.md`](./community-README.md).

## Répartition actuelle des responsabilités

- `/sections/rejoindre-une-action` consulte les actions canoniques et les
  événements historiques `community_events`, avec leurs liens profonds et les
  RSVP existants.
- `/sections/messagerie` porte les groupes de discussion et les messages.
- `/sections/annuaire` porte la recherche, les filtres et les fiches publiques
  des acteurs, ainsi que le référencement partenaire.
- `/sections/open-data` porte les données publiques.

Les API et composants métier nécessaires aux événements historiques sont
conservés. Leur consultation ne transforme pas un RSVP en inscription ou en
participation Action, et les données historiques ne deviennent pas des impacts
certifiés sans preuve. `GET /api/community/events`, `POST
/api/community/rsvps` et `POST /api/community/events/ops` restent les
propriétaires des contrats historiques ; le `POST /api/community/events` de
création est désormais une réponse de compatibilité `410`, car les nouvelles
missions appartiennent à `/actions/new`.

Les rapports, le pilotage, la gamification, les notifications, la messagerie et
l’assistant d’itinéraire peuvent encore relire ces événements ou leurs RSVP.
Ces consommateurs sont classés `CURRENT` ou `COMPATIBILITY` selon leur rôle ;
ils ne constituent pas une justification pour recréer la page autonome.

## Compatibilité des liens

Les anciennes URL de la page sont des redirections permanentes. Un lien qui
porte `eventId` conserve cet identifiant sous `communityEventId` ; `actionId`
reste un identifiant d’action et n’est jamais converti en événement. Les alias
partenaires aboutissent directement à l’Annuaire.

## Référence

Pour l’état courant, consulter le README du bloc
[`Réseau & Discussions`](../reseau-discussions-README.md) et les fiches des
surfaces canoniques. Aucune capacité décrite dans cette archive ne doit être
présentée comme une page actuellement rendue.
