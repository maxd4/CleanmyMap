# Messagerie

## Fiche canonique

- **Route** : `/sections/messagerie`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/messagerie/page.tsx`
- `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
- `apps/web/src/components/sections/rubriques/connect-section.tsx`
- `apps/web/src/components/chat/chat-shell.tsx`
- `apps/web/src/app/api/chat/inbox/route.ts`
- `apps/web/src/app/api/chat/search/route.ts`
- `apps/web/supabase/migrations/20260825210000_chat_dm_inbox_read_state.sql`
- `apps/web/supabase/migrations/20260826000000_chat_message_topics.sql`
- `apps/web/supabase/migrations/20260826010000_chat_announcements.sql`
- `apps/web/supabase/migrations/20260826020000_chat_polls.sql`
- **Type fonctionnel** : page de réseau
- **Famille / bloc fonctionnel** : Réseau & Discussions (bloc)
- **Statut** : protégé
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Objectif utilisateur principal** : Retrouver rapidement un échange privé et poursuivre le fil actif.
- **Action principale attendue** : Sélectionner une conversation, lire les messages réellement visibles et répondre.
- **Palette attendue** : pink
- **Scope** : lots 1 à 4B livrés — boîte privée, salons thématiques persistants, annonces/relais communautaires, création et vote des sondages
- **Terminée** : création, lecture, vote, changement et retrait d'un vote oui ; résultats agrégés oui ; multi-choix, expiration et clôture restent hors périmètre.
- **Données** : `app_messages` reste la source canonique ; aucune table de conversations n'est créée.
- **Annonces** : `message_kind` distingue `message` et `announcement`. Une annonce est communautaire, utilise un topic canonique (`relais_associatif`, `appel_aux_benevoles` ou `demande_diffusion`) et peut référencer un `community_events.id` réellement existant via `related_event_id`. Les détails de l'événement affichés viennent de la base, jamais de l'URL.
- **Sondages** : `message_kind = 'poll'` est réservé à `community`. La question reste dans `app_messages.content` et les 2 à 6 options ordonnées vivent dans `chat_poll_options`, créées atomiquement avec le message. Les votes vivent dans `chat_poll_votes`, avec une ligne par `(message_id, user_id)` ; les lectures retournent uniquement des compteurs agrégés et le choix de l'utilisateur courant, jamais une liste nominative.
- **Topics** : `topic_id` est nullable ; `NULL` conserve les messages legacy/non classés. Les topics communauté sont `relais_associatif`, `appel_aux_benevoles`, `demande_diffusion`, `besoin_ressources` et `coordination_secteur`. Les topics territoire sont `mon_territoire` et `territoires_voisins`.
- **Lecture publique** : la vue globale de `community` ou `territory` inclut les messages legacy et tous les topics autorisés ; une vue topic ne retourne que le topic sélectionné.
- **Lecture** : le compteur ne compte que les messages DM entrants après le curseur propre à `(user_id, peer_id)`. Pour un sondage, les options retournent `voteCount`, le poll retourne `totalVotes` et `selectedOptionId`.
- **Notifications** : `app_notifications.read_at` reste la source canonique des non-lus de notification. Les notifications chat portent `channelType`, `messageId`, `messageKind` et `topicId` lorsqu'il existe. Les compteurs communauté/territoire sont lus en batch par canal et salon ; l'ouverture d'un salon ou d'une conversation DM marque uniquement le périmètre effectivement consulté.
- **Navigation** : `tab=dm`, `recipientId`, `recipientLabel` et `recipientHandle` restent compatibles avec les deep-links existants. `topicId` peut ouvrir un salon public stable ; son absence signifie la vue agrégée.
- **Historique** : le fil est lu par pages de 50 messages maximum avec un curseur keyset stable `created_at + id`. Le bouton « Charger les messages précédents » ajoute une page au début sans déplacement de la position de lecture ; les revalidations temps réel/polling réconcilient seulement la page récente.
- **Ancrage notification** : une notification chat peut porter `messageId`. Le serveur vérifie que la cible appartient au scope accessible (canal, topic, territoire ou DM), charge directement la page qui la contient et le fil la centre avec une surbrillance temporaire. Une cible indisponible laisse le fil ouvert avec un état discret.
- **Recherche** : le endpoint dédié `/api/chat/search` recherche dans `app_messages.content` du scope ouvert uniquement. La requête est comprise entre 2 et 120 caractères, les résultats sont limités à 20 par page et suivent le même curseur keyset `created_at + id`. En DM, la recherche reste strictement limitée à la conversation sélectionnée.
- **Responsive** : inbox puis fil avec retour sur mobile ; inbox et fil simultanés sur desktop lorsque l'espace le permet.
- **Composants UI concernés** : inbox DM, fil actif, sélection de destinataire et états loading/empty/error.
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : critique


## États à documenter

- **loading** : skeletons sobres dans la liste DM, sans conversation artificielle.
- **empty** : aucune conversation privée affichée ; la recherche de membre existante permet de démarrer un échange.
- **error** : erreur de chargement explicite avec réessai réel, sans faux compteur.
- **access refused / connexion indisponible** : l'API RLS renvoie l'état d'accès ou de disponibilité approprié.
- **fil actif** : les messages et pièces jointes existants restent dans le composant chat ; l'ouverture marque le fil lu de façon idempotente.
- **recherche** : le champ du header est débouncé, affiche loading/vide/erreur et permet de sélectionner un résultat pour réutiliser l'ancrage `messageId` du fil.
- **vote de sondage** : le choix, le changement et le retrait sont disponibles dans le fil ; l'interface applique la mise à jour localement puis réconcilie avec l'agrégat serveur. Les votes restent anonymes dans la lecture.



## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- `/messagerie` reste un alias de compatibilité vers cette section canonique.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.

## Fichiers associés

- [Présentation détaillée](./messagerie-presentation-detaillee.md)
- [Liste des propositions à traiter](./messagerie-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./messagerie-objectifs-non-pertinents.md)
