# Messagerie et discussions (`apps/web/src/lib/chat/`)

Statut : `CURRENT` — orientation et cycle d'accès aux discussions. Le code source et les migrations SQL restent autoritaires.

## Propriétaires et points d'entrée

- **Discussions d'action** : `action-conversations.ts` (`isActionDiscussionAvailable`, `canViewActionDiscussionForMembership`).
- **Canaux, sondages et messages** : `channels.ts`, `topics.ts`, `polls.ts`, `poll-votes.ts`, `announcements.ts`, `chat-pagination.ts`, `chat-search.ts`.
- **Demandes de partage et pièces jointes** : `action-share-requests.ts`, `action-sharing.ts`, `chat-attachments.ts`, `chat-attachment-reading.ts`.
- **Notifications et cibles** : `chat-notifications.ts`, `chat-notification-targets.ts`, `chat-notification-unreads.ts`.

## Transitions et invariants vérifiés

- **Disponibilité d'une discussion d'action (`isActionDiscussionAvailable`)** :
  - `pre_action` future publiée (`isPublishedFuturePreAction`) et visible (`moderation_visibility !== "hidden"`) → ouverte ;
  - `post_action_*` approuvée et publiée → ouverte ;
  - action `cancelled` déjà publiée (non masquée) → discussion conservée en lecture seule (`action-cancellation` SQL) ;
  - action non publiée ou masquée → `unavailable`.
- **Accès membre (`canViewActionDiscussionForMembership`)** : réservé à `admin`/`max`, créateur, organisateur canonique, ou participant/inscrit `confirmed` selon le store de participation (`usesRegistrationStore`).
- **Tests repères** : `action-conversation-access.test.ts`, `action-conversations-migration.test.ts`, `chat-message-write-boundaries-migration.test.ts`, `dm-inbox-migration.test.ts`, `chat-attachments-security.test.ts`.
