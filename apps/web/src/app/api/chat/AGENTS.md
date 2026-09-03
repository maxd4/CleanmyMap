# Gouvernance locale — API Chat

Cette frontière hérite de `AGENTS.md` à la racine, de `apps/web/AGENTS.md` et
de `apps/web/src/app/api/AGENTS.md`. Elle ajoute uniquement les invariants
propres au Chat.

## Contrat et sécurité

- Préserver l'AuthN et l'AuthZ propres au canal et à la conversation pour
  chaque lecture, écriture, recherche, inbox et vote ; ne jamais élargir une
  visibilité par défaut.
- Respecter RLS et la frontière Server/Client. Un client privilégié côté
  serveur ne peut être utilisé que pour l'effet déjà prévu par le contrat,
  sans remplacer les contrôles d'accès ni exposer de données supplémentaires.
- Préserver les contrats HTTP existants : statuts, erreurs, payloads,
  curseurs, ordre et déduplication des messages, filtres de canal/topic et
  ciblage d'un message.

## Responsabilités Chat

- Conserver les invariants de pagination, recherche, sondages, pièces jointes
  et notifications, y compris les effets atomiques et les fan-out non
  bloquants déjà établis par les modules du domaine.
- Réutiliser les propriétaires canoniques de `apps/web/src/lib/chat`
  (canaux, topics, annonces, polls, attachments, pagination, notifications,
  recherche et accès PostgREST). Ne pas recréer leur logique métier dans les
  handlers API.

## Protection du contrat

- Maintenir les tests du contrat public des routes ainsi que les tests ciblés
  de `inbox`, `search`, `users` et des votes ; tout changement de contrat ou
  de contrôle de sécurité doit être couvert à la frontière HTTP.
