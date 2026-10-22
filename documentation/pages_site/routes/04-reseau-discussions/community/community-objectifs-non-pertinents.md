# Communauté — objectifs hors périmètre

## Statut

Cette liste est conservée comme `HISTORY` pour empêcher le retour de la page
autonome ou de fonctions qui brouilleraient les contrats actuels.

## À ne pas réintroduire

- une page indépendante `/sections/community` ;
- un tableau de bord d’administration, de staffing ou d’impact dans une page
  publique ;
- une seconde messagerie, un second annuaire ou une seconde persistance des
  événements ;
- une conversion implicite d’un RSVP historique en inscription, présence ou
  impact certifié ;
- une redirection de `/missions/[id]`, qui conserve son contrat de mission
  GPS.

Les accès actuels sont `/sections/rejoindre-une-action`,
`/sections/messagerie`, `/sections/annuaire`, `/sections/open-data` et
`/sections/funding`. Feedback
et `/sections/funding` appartiennent à leurs contrats propres ; Feedback reste
accessible depuis le menu dédié. Les événements historiques conservent leurs
API, RSVP et opérations autorisées sans réintroduire la page autonome.

Ne pas supprimer `community_events`, `event_rsvps`, les migrations, les exports,
les lectures de rapports, les signaux de gamification, les notifications, les
références de messagerie ou l’assistant d’itinéraire : ces consommateurs sont
encore `CURRENT` ou `COMPATIBILITY`.

## Référence

Voir [`community-README.md`](./community-README.md) pour les redirections et
la répartition actuelle des responsabilités.
