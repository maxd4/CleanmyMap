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
portés par les tables `community_events` / `event_rsvps`, les API historiques et
les surfaces canoniques Actions et `/sections/rejoindre-une-action`. Ils ne sont
pas supprimés par cette redirection. `/missions/[id]` conserve son contrat
propre de mission GPS.

## Surfaces canoniques

- Les groupes de discussion vivent dans `/sections/messagerie`.
- La consultation des actions et des événements historiques vit dans
  `/sections/rejoindre-une-action`.
- L’exploration des acteurs et le référencement partenaire vivent dans
  `/sections/annuaire`.
- Les données publiques vivent dans `/sections/open-data`.
- Le soutien au projet vit dans `/sections/funding`.

La navigation primaire du bloc Réseau & Discussions contient exactement les
quatre entrées documentées dans
[`../reseau-discussions-README.md`](../reseau-discussions-README.md) : groupes
de discussion, annuaire des acteurs, données publiques et soutien à
CleanMyMap. Feedback reste accessible par son menu dédié et ses liens directs.

## Capacités conservées et classement

| Capacité | Owner actuel | Classement | Contrat conservé |
|---|---|---|---|
| Lecture des événements historiques | `GET /api/community/events`, Rejoindre une action, liens `communityEventId` | `CURRENT` | Projection HTTP publique bornée ; `community_events` n'est plus lisible directement par `anon` ou `authenticated`, et un `eventId` demandé hors page est relu côté serveur. |
| RSVP `yes` / `maybe` / `no` | `POST /api/community/rsvps`, `event_rsvps` | `CURRENT` | RSVP personnel persistant ; jamais converti en `action_registrations` ou `action_participants`. |
| Suivi historique `attendanceCount` / `postMortem` | `POST /api/community/events/ops` | `CURRENT` | Organisateur ou admin autorisé ; audit admin conservé ; aucune certification automatique de présence ou d’impact. |
| Création via l’ancien endpoint | `POST /api/community/events` | `COMPATIBILITY` | Répond `410` et renvoie vers `/actions/new` ; aucune nouvelle écriture `community_events`. |
| Export funnel et pilotage | `/api/community/funnel.csv`, Pilotage, rapports | `CURRENT` | Lectures admin/scopées conservées pour l’historique et les agrégats bornés. |
| Ancienne page, son registre et son rendu dédié | `/sections/community`, `/community` | `LEGACY` | Redirection permanente ; aucune dépendance de présentation restante. |
| Ancien hub, onglets et tests propres à la page | composants supprimés lors du retrait de la page | `DELETE_PROVEN` | Aucun consommateur actif ; les tests métier partagés ont été conservés. |

Les tables, lignes historiques, migrations et références `event_rsvps` ne sont
ni supprimées ni converties rétroactivement. Les liens `fromEventId` indiquent
une origine historique lors de la création d’une action ; ils ne confondent pas
`communityEventId` et `actionId`.

## Statut documentaire

Ce document est une note de compatibilité `LEGACY / REDIRECT`, pas une fiche
`CURRENT`. Les redirections, les décisions historiques et les limites encore pertinentes
sont conservées dans cette fiche. Les anciens fichiers compagnons génériques
ont été supprimés ; ils ne définissent aucune fonctionnalité actuellement rendue.
