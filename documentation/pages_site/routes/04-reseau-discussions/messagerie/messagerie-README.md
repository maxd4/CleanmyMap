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
- `apps/web/supabase/migrations/20260915000020_admin_elu_polls.sql`
- `apps/web/supabase/migrations/20260915000006_action_conversation_exclusions.sql`
- `apps/web/supabase/migrations/20260915000007_action_conversation_access_and_audit.sql`
- `apps/web/supabase/migrations/20260915000009_action_share_requests.sql`
- `apps/web/supabase/migrations/20260915000010_territory_context_access.sql`
- `apps/web/supabase/migrations/20260915000011_action_discussion_access_contract.sql`
- `apps/web/supabase/migrations/20260915000019_admin_elu_topics.sql`
- `apps/web/src/app/api/chat/action-exclusions/route.ts`
- `apps/web/src/app/api/chat/contact-requests/route.ts`
- **Type fonctionnel** : page de réseau
- **Famille / bloc fonctionnel** : Réseau & Discussions (bloc)
- **Accès runtime** : `auth-blur-gate` ; la surface est floutée avant connexion et l'accès conversationnel reste contrôlé par le contrat Chat.
- **Contrat SEO** : `ACCESS=PRIVATE`, `SEARCH=NOINDEX`, `DISCOVERY=INTERNAL_ONLY`, `CANONICAL=NONE`. Le flou est une présentation ; l'accès réel aux conversations reste privé.
- **Objectif utilisateur principal** : Retrouver rapidement un échange privé et poursuivre le fil actif.
- **Action principale attendue** : Sélectionner une conversation, lire les messages réellement visibles et répondre.
- **Palette attendue** : pink
- **Scope** : lots 1 à 5C et finition UI livrés — boîte privée, salons thématiques persistants, annonces/relais communautaires, sondages avec vote, historique paginé et recherche scoped
- **Terminée** : création, lecture, vote, changement et retrait d'un vote oui ; résultats agrégés oui ; multi-choix, expiration et clôture restent hors périmètre.
- **Données** : `app_messages` reste la source canonique des messages. `action_conversations` ne duplique pas une action : elle garantit l'unicité de la relation `action_id → conversation_id`. Toute personne authentifiée peut lire et écrire une discussion d'action selon le contrat de disponibilité de discussion, sauf exclusion active. `ACTION_SHARE_ELIGIBILITY != ACTION_DISCUSSION_AVAILABILITY` : une référence partageable n'est jamais une autorité d'accès à la discussion. `action_conversation_members` est seulement une audience technique de notifications ; il ne confère aucun droit d'accès.
- **Actions** : la surface `Actions` liste uniquement les actions publiées autorisées, met en évidence les actions à venir et conserve les actions passées selon le cycle de vie existant. Un brouillon ou une action non publiée n'est jamais exposé dans la messagerie.
- **Accès action** : `ACTION_DISCUSSION_AVAILABILITY` est distinct de `ACTION_SHARE_ELIGIBILITY`. Pour la discussion, `isActionDiscussionAvailable` / `is_action_discussion_available` accepte une pré-action publique future conforme à `isPublishedFuturePreAction` / `is_public_future_pre_action`, ou une action non-`pre_action`, approuvée, publiée et visible ; `action_phase IS NULL` reste compatible comme valeur non-`pre_action`. L'utilisateur doit être authentifié et ne pas faire l'objet d'une exclusion explicite. La participation (`pending`, `confirmed`, `cancelled` ou `refused`) et le partage d'action ne sont jamais des autorités d'accès à la discussion. Le créateur et les organisateurs autorisés ainsi que les rôles actifs `admin`/`max` peuvent exclure ou réintégrer un utilisateur sans supprimer de message ni modifier la participation ; chaque opération est conservée dans l'audit de modération canonique.
- **Contexte territorial** : le territoire est un contexte de discussion et une préférence, pas une permission. Le profil peut rester sans territoire ; lorsqu'il en contient un, il sert de défaut et de préférence pour les notifications automatiques. Tout compte authentifié peut choisir ponctuellement une autre zone valide prise en charge par le référentiel, la consulter et y écrire ; le choix courant ne modifie jamais le profil et ne crée pas d'abonnement de notification. Une action peut fournir automatiquement son territoire lorsqu'il est résoluble de façon fiable depuis ses données canoniques, sinon le parcours revient au défaut du profil puis au choix manuel. La lecture et l'écriture territoriales restent distinctes des permissions métier, de la modération et des exclusions.
- **Partage d'action** : `isPublicActionReferenceAvailable` et son équivalent SQL portent uniquement l'éligibilité d'une référence publique : une action future publiée et visible est partageable comme `invitation` ; une action `post_action_complete` publiée, visible et approuvée est partageable comme `result`. Les brouillons, actions masquées, non publiées ou non approuvées sont refusés par le sélecteur, l'API et la référence publique. Le caractère partageable d'une action ne gouverne jamais l'accès à sa discussion. Un partage vers un DM existant suit le fil courant ; sans DM, il crée une demande de premier contact persistante. Le destinataire voit uniquement l'identité de messagerie et la projection publique de l'action, puis l'acceptation crée le premier message et ouvre le fil ; un refus ou une ignorance ne crée pas de conversation. La participation, le profil et la zone temporaire ne sont jamais modifiés silencieusement par ce partage.
- **Continuité** : une pré-action publiée et l'action qui lui succède utilisent le même `action_id`, la même conversation et le même historique. Le header relit le titre, la date, le lieu, l'organisateur, les participants prévus, la durée et l'itinéraire depuis l'action source.
- **Annonces** : `message_kind` distingue `message` et `announcement`. Une annonce est communautaire, utilise un topic canonique (`relais_associatif`, `appel_aux_benevoles` ou `demande_diffusion`) et peut référencer un `community_events.id` réellement existant via `related_event_id`. Les détails de l'événement affichés viennent de la base, jamais de l'URL.
- **Sondages** : `message_kind = 'poll'` est réservé à `community` et `admin_elu`. Un sondage est une aide à l'arbitrage, pas une décision officielle ; son résultat ne vaut pas décision officielle. La question reste dans `app_messages.content` et les 2 à 6 options ordonnées vivent dans `chat_poll_options`, créées atomiquement avec le message. Les votes vivent dans `chat_poll_votes`, avec une ligne par `(message_id, user_id)` ; les lectures retournent uniquement des compteurs agrégés et le choix de l'utilisateur courant, jamais une liste nominative.
- **Topics** : `topic_id` est nullable ; `NULL` conserve les messages legacy/non classés. Les topics communauté sont `relais_associatif`, `appel_aux_benevoles`, `demande_diffusion`, `besoin_ressources` et `coordination_secteur`. Les topics territoire sont `mon_territoire` et `territoires_voisins`. Le canal existant `admin_elu` conserve son audience `admin`, `max` et `elu` et propose exactement `arbitrages`, `priorites`, `suivi_decisions` et `coordination_institutionnelle` ; aucun topic libre n'est accepté par le client.
- **Résultat d'une discussion** : un fil ou un topic peut documenter un échange, un arbitrage ou un suivi, mais ne constitue jamais à lui seul une décision officielle et ne remplace pas le journal d'audit admin.
- **Lecture des canaux publics** : la vue globale de `community` ou `territory` inclut les messages legacy et tous les topics autorisés pour les comptes connectés ; une vue topic ne retourne que le topic sélectionné.
- **Lecture** : le compteur ne compte que les messages DM entrants après le curseur propre à `(user_id, peer_id)`. Pour un sondage, les options retournent `voteCount`, le poll retourne `totalVotes` et `selectedOptionId`.
- **Notifications** : `app_notifications.read_at` reste la source canonique des non-lus de notification. Les notifications chat portent `channelType`, `messageId`, `messageKind` et `topicId` lorsqu'il existe. Les compteurs communauté/territoire/admin_elu sont lus en batch par canal et salon ; l'ouverture d'un salon ou d'une conversation DM marque uniquement le périmètre effectivement consulté. Le ciblage territorial automatique conserve uniquement la préférence persistée du profil et sa logique de voisinage ; une zone choisie ponctuellement ne notifie pas tous les utilisateurs et n'élargit pas l'audience future.
- **Navigation** : `tab=dm`, `recipientId`, `recipientLabel` et `recipientHandle` restent compatibles avec les deep-links existants. Un deep-link `admin_elu` transporte `channel=admin_elu`, `topicId=<topic>` lorsqu'un topic existe et `messageId=<message>` ; le topic reste optionnel et un message sans topic reste navigable. `topicId` peut ouvrir un salon public stable ; son absence signifie la vue agrégée.
- **Navigation action** : `channel=action&actionId=<uuid>` ouvre la discussion canonique de l'action publiée ; l'identifiant de l'action est le seul lien transporté par l'URL.
- **Navigation primaire** : les tabs `Discussions` et `Messages privés` pilotent la surface affichée. En mode Messagerie, la navigation Discussions contient Communauté, Territoire, le canal existant Admin & élus et leurs topics ; l’inbox DM porte seule la liste des conversations privées.
- **Historique** : le fil est lu par pages de 50 messages maximum avec un curseur keyset stable `created_at + id`. Le bouton « Charger les messages précédents » ajoute une page au début sans déplacement de la position de lecture ; les revalidations temps réel/polling réconcilient seulement la page récente.
- **Ancrage notification** : une notification chat peut porter `messageId`. Le serveur vérifie que la cible appartient au scope accessible (canal, topic, territoire ou DM), charge directement la page qui la contient et le fil la centre avec une surbrillance temporaire. Une cible indisponible laisse le fil ouvert avec un état discret.
- **Recherche** : le endpoint dédié `/api/chat/search` recherche dans `app_messages.content` du scope ouvert uniquement. La requête est comprise entre 2 et 120 caractères, les résultats sont limités à 20 par page et suivent le même curseur keyset `created_at + id`. En DM, la recherche reste strictement limitée à la conversation sélectionnée.
- **Finition UI** : les tabs supérieurs sont la navigation primaire : `Discussions` et `Messages privés`, sur une ligne dédiée sous le titre et le sous-titre de `PageHeader`. Sur desktop, Discussions présente une colonne compacte dans l’ordre Communauté, Territoire, Actions, puis Admin & élus si le compte y est autorisé ; le canal racine `Territoire` conserve sa description `Organisation locale` et le topic `Coordination de secteur` reste distinct. Les topics n’apparaissent que sous le canal sélectionné ; la boîte privée expose un seul bouton `Nouveau message` qui ouvre et focalise la recherche membre. Sans conversation sélectionnée, le fil affiche `Aucune conversation sélectionnée` sans second CTA. Les deep-links DM synchronisent l’onglet privé avant le rendu du shell. Les sélections courantes réécrivent `tab`, `channel`, `topicId`, `actionId`, les paramètres de destinataire, `messageId` et le contexte territorial pertinent dans l’URL ; chaque sélection crée une entrée d’historique, tandis que le retour navigateur réapplique l’état à la surface active. Les deux shells restent montés pendant le changement d’onglet afin de conserver les fils et brouillons non envoyés.
- **Responsive** : sur mobile, chaque surface suit un parcours vertical contextes → fil → Retour ; les Messages privés suivent inbox → fil → Retour. Le fil et sa liste de contextes ne sont jamais affichés simultanément sur mobile. Sur desktop, la colonne contextes et le fil restent simultanés lorsque l’espace le permet.
- **Finition responsive** : le shell utilise la hauteur disponible sans hauteur minimale artificielle ; le header, les états du fil, la recherche et le composer restent contenus dans leur zone de défilement.
- **Finition accessibilité/UI** : le titre de page utilise `PageHeader` ; le shell reste sur une surface claire rose/pink, avec l’indigo réservé aux repères privés/relationnels. Les tabs primaires exposent une sémantique `tablist`/`tab`/`tabpanel`, les contrôles gardent un focus visible et les animations respectent `prefers-reduced-motion` ainsi que les modes `minimaliste` et `sobre`. En lecture invitée, les discussions restent consultables avec un composer désactivé et un lien de connexion explicite ; les messages privés n’affichent jamais de parcours d’envoi sans connexion. Le statut réseau n’est affiché que lorsqu’il apporte une information utile.
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
