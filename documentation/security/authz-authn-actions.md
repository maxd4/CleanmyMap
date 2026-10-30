# Actions et discussions

> Module associé à [authz-authn-regles.md](./authz-authn-regles.md). Statut : CURRENT.

## Permissions sur les actions

### Utilisateur ordinaire

Un utilisateur ordinaire peut suivre le parcours normal prévu par le produit.

Exemples :

- créer une action ;
- demander à rejoindre ;
- annuler sa propre demande ;
- modifier ce que l'ownership autorise.

Le rôle seul ne permet pas de modifier une action d'un tiers.

### Organisateur

Un organisateur autorisé peut, selon le contrat de l'action :

- consulter les demandes ;
- accepter ou refuser ;
- ajouter ou retirer un participant ;
- ouvrir ou fermer les inscriptions ;
- modifier les informations autorisées.

Cette gestion reste limitée à l'action dont il est organisateur/coorganisateur. Elle ne déclenche pas les droits de modération globale et ne doit pas être confondue avec une dérogation admin.

### Dérogation globale et future dérogation territoriale

Une dérogation globale doit être une capacité explicite de modération, normalement réservée au rôle qui possède cette capacité dans le domaine concerné.

Une future capacité territoriale pour `elu`, nommée
`actions.moderate_territory`, doit être distincte :

```txt
canModerateTerritoryAction(identity, action, territoryAssignment)
```

et ne doit être activée que lorsque :

- le territoire de l'utilisateur est canonique ;
- le territoire de la ressource est canonique ;
- la relation est vérifiée côté serveur ;
- les cas territoire A / territoire B sont testés.

Un utilisateur privilégié qui suit le parcours utilisateur normal reste dans le parcours normal.

Exemple canonique :

```txt
admin demande normalement à rejoindre l'action d'un tiers
→ participationStatus: "pending"
→ participationSource: "group_form"
```

Le rôle privilégié ne doit pas transformer automatiquement cette demande en participation confirmée.

## Dérogation administrative

Une dérogation doit être distincte du flux normal.

Exemples :

- confirmer manuellement un participant ;
- corriger une attribution ;
- masquer ou restaurer une action ;
- corriger un impact validé ;
- modifier un organisateur ;
- supprimer un contenu abusif.

Une dérogation sensible doit :

1. vérifier l'identité et la capacité côté serveur ;
2. vérifier le scope lorsque l'opération n'est pas globale ;
3. être explicite dans le code ;
4. être séparée du bouton ou flux utilisateur normal ;
5. exiger un motif lorsque pertinent ;
6. créer une trace d'audit ;
7. utiliser une source claire, par exemple `admin_override`, si le contrat le permet.

Ne pas utiliser un booléen envoyé par le client comme preuve d'autorisation.

Pour les participations d'action, les nouvelles dérogations administratives utilisent `participation_source = admin_override`. La valeur historique `admin` reste acceptée en lecture pour compatibilité, mais elle ne doit plus être utilisée par le flux normal de jonction.

Un retrait d'un participant déjà confirmé est une opération distincte `admin_remove_participant`. Elle exige un motif, conserve la cible utilisateur et journalise l'état avant/après. Un refus de demande en attente reste `admin_review_reject`.

Le contrat d'audit action doit conserver au minimum :

- l'identifiant d'opération ;
- l'administrateur ou modérateur auteur ;
- l'action cible ;
- l'opération métier ;
- l'issue `success` ou `error` ;
- le motif lorsqu'il est obligatoire ;
- l'ancienne valeur et la nouvelle valeur lorsqu'une donnée change ;
- la cible utilisateur lorsque l'opération concerne une participation ou un compte ;
- le contexte technique utile, sans pouvoir écraser les champs canoniques.

Les opérations sensibles comme rejet, masquage, restauration, correction d'impact, changement d'organisateur ou dérogation de participation exigent un motif d'au moins 5 caractères après trim lorsqu'elles sont classées comme telles par leur contrat.

Le journal d'audit d'une action n'est pas public. Son droit de lecture doit suivre une capacité dédiée et la minimisation des données. Les accès historiques actuellement présents doivent être relus lors de la convergence vers la matrice de capacités.

Ne pas ajouter `change_organizer` ou `reopen_action` tant qu'une commande produit et un modèle d'état explicites n'existent pas. Un changement d'organisateur devra préserver les coorganisateurs existants et auditer avant/après.

## Visibilité de modération des actions

Le masquage de modération est distinct du statut métier de l'action.

```txt
status = pending | approved | rejected | cancelled
moderation_visibility = visible | hidden
published_at = NULL | timestamp de publication explicite
```

Une action `hidden` est exclue des surfaces publiques, dont la carte, les listes publiques et la page Formulaire de groupe. Elle reste traitable par les chemins de modération autorisés.

`cancelled` est un état métier terminal distinct de `rejected`. Seuls les
administrateurs autorisés (`ACTIVE_ROLE=admin|max`) peuvent annuler une
pré-action déjà publiée dont le début local est futur, après confirmation
explicite. L'annulation conserve l'identité de l'action et ses dépendances,
ainsi que `cancelled_at`, `cancelled_by_clerk_id`, le motif et le statut
précédent ; elle retire l'action des listes futures, du joinage et du partage.
Une discussion existante peut être relue en historique mais n'accepte plus de
nouveau message. Aucune action annulée n'est comptée comme réalisée ou
gamifiée, et aucune suppression physique n'est proposée par ce contrat.

`published_at` ne remplace ni `status` ni `moderation_visibility`. Une
pré-action créée ou seulement `pret_a_partager` conserve `published_at = NULL`
et reste privée. Seule la commande authentifiée `Publier cette action`, après
contrôle d'ownership/co-organisateur autorisé, renseigne ce champ. Une action
future est ensuite une propriété dérivée : pré-action publiée et début local
Europe/Paris strictement postérieur à l'instant courant.

Pour une nouvelle pré-action associative (`organizer_type = association` ou
`student_association`), `review_state` est une frontière indépendante :
`draft → pending_review → approved|rejected`. Le serveur et le trigger SQL
forcent `draft` à la création et refusent une publication avant `approved`.
Une décision `admin|max` passe par la file administrative et une RPC atomique
avec `admin_operations_audit`; le refus conserve l'action et son motif. Les
états `draft`, `pending_review` et `rejected` restent exclus de toute lecture
publique, inscription, discussion et référence d'action, tandis que les lignes
historiques `not_required` restent compatibles.

Après une approbation effective, seule la commande serveur de diffusion
administrative peut créer l'annonce officielle `app_messages` du topic
`evenements_associatifs`. Elle relit l'action publiée, publique, visible et
future ; la prédiction temporelle canonique autorise les statuts `pending` et
`approved` tant que la revue administrative est `approved`. Elle utilise
`action_id` comme identité canonique et refuse une action devenue privée,
masquée, annulée ou passée. Le compositeur utilisateur peut écrire un message
dans ce topic mais ne peut pas fabriquer une annonce officielle en envoyant
`message_kind = announcement`. La contrainte unique persistante garantit au
plus une annonce par action ; la clé unique partielle des notifications et
`ON CONFLICT DO NOTHING` rendent le fan-out sûr sous concurrence et retry. Un
échec de fan-out conserve la décision et est relançable par un administrateur.

### Frontière de lecture de `GET /api/actions`

La lecture publique globale est toujours public-safe : une requête sans statut,
avec un statut invalide ou avec `status=approved` ne restitue que les actions
approuvées et les signalements Trash Spotter `validated` ou `cleaned`. Cette
lecture peut utiliser `loadOrRefreshPublicSurfaceSnapshot`.

Toute vue qui peut inclure un état non public — `status=pending`,
`status=rejected`, `status=cancelled` ou la vue globale explicite `status=all` — exige l'AuthN puis
l'AuthZ de modération prévue par le code courant. Ces surfaces globales sont
réservées aux capacités explicites des rôles actifs `admin` et `max` ; `elu`
reste fail-closed tant qu'un scope territorial canonique n'est pas
implémenté.

La cible architecturale reste :

```txt
admin/max → capacité de modération globale
elu       → lecture/pilotage territorial puis éventuelle modération territoriale bornée
```

Les vues non publiques sont lues directement et ne doivent jamais passer par un snapshot de surface publique.

Restaurer `moderation_visibility = visible` ne valide pas l'action et ne transforme pas une pré-action en collecte finalisée.

### Frontière de lecture de la carte publique

`GET /api/actions/map` est une projection public-safe distincte des lectures de
modération. Quel que soit le paramètre `status` fourni (`approved`, `pending`,
`rejected` ou `all`), le handler conserve la compatibilité de l'URL. Il expose
les actions `approved` visibles et, dans la seule projection cartographique,
les pré-actions `pending` publiées dont le début local est futur. Ces dernières
sont normalisées en `approved` dans le DTO public de la carte, tandis que leur
statut persisté reste `pending` et qu'elles restent exclues des KPI Impact.
Cette règle est appliquée à la fois avec et sans viewport, y compris lorsqu'un
snapshot existant est servi. Les actions `pending` post-action, `rejected` ou
masquées ne sont jamais incluses.

Le fallback navigateur appelle `actions_map_feed` avec le statut public
`approved` et filtre défensivement ses lignes. La RPC restitue les actions
approuvées visibles ainsi que les pré-actions futures explicitement publiées
`pending` (avec un statut de projection `approved`) et les lignes
`trash_spotter_spots.status IN ('validated', 'cleaned')`. La RLS de cette table
interdit également la lecture directe des lignes `new` aux rôles anon et
authenticated. Une pré-action future dont le contexte persisté est `school` est
exclue de la RPC et de l'API tant qu'aucune projection géographique publique
généralisée et sécurisée n'existe ; ses coordonnées ne sont donc pas exposées.
Une action scolaire approuvée et finalisée suit la projection publique normale.

Les projections publiques de `GET /api/actions`, `GET /api/actions/map` et
`GET /api/actions/map/initial-nearest` ne contiennent aucun identifiant interne
de propriétaire ou d'utilisateur, y compris dans un contrat imbriqué. Les
contrats internes conservent ces identités pour l'ownership, la modération et
les traitements serveur ; la frontière DTO publique les retire avant la réponse
HTTP.

La lecture authentifiée `GET /api/spots` suit la même frontière public-safe pour
les observations Trash Spotter : sans filtre, elle impose côté serveur
`status IN ('validated', 'cleaned')`. Un filtre explicite peut demander l'un de
ces deux statuts uniquement ; `new`, les statuts inconnus et les paramètres de
statut ambigus sont refusés avant toute lecture privilégiée. La réponse ne
contient que la date, le libellé, le type, les coordonnées et le statut : aucun
identifiant interne de ligne ou de compte, aucune note privée, et aucune
réutilisation de cache ou snapshot d'une projection antérieure. La lecture
propriétaire `GET /api/signalements/me` reste l'unique surface permettant au
compte courant de retrouver ses observations `new`.

La vue publique `GET /api/actions?view=future` réutilise la même projection
Actions et ne renvoie que les pré-actions publiées dont le début est futur.
Les champs `volunteers_count`, `duration_minutes`, l'itinéraire et les objectifs
restent prévisionnels ; les mesures post-action restent nulles jusqu'à une
observation réelle. Le join futur passe par `action_registrations` et est
refusé si `groupJoinEnabled` est faux. Une inscription `confirmed` signifie
uniquement qu'elle a été acceptée; elle ne constitue pas une présence terrain
et ne contribue pas à la gamification.

La lecture propriétaire `GET /api/signalements/me` reste séparée : elle utilise
la session du compte courant et peut restituer ses propres observations `new`,
sans les exposer à la carte publique.

### Reprise de `/actions/new?actionId=...`

La reprise d'une action ne doit utiliser l'identifiant fourni par l'URL que
pour déduire l'onglet initial ; elle ne constitue ni une autorité de lecture
ni une autorité de mutation. Un `tab=` explicite reste prioritaire et évite
toute lecture de l'action.

- un visiteur anonyme utilise uniquement la projection minimale autorisée par
  la RLS publique ; une action privée ou inaccessible produit un fallback
  neutre et ne révèle ni son existence ni sa phase ;
- un utilisateur authentifié utilise d'abord la frontière Clerk/RLS ; si une
  résolution serveur explicite est nécessaire pour un propriétaire ou un
  organisateur, elle réévalue `canManageAction` avant de retourner la phase ;
- aucun chemin anonyme ne remplace cette projection par le `service_role`.

Les règles d'interface restent inchangées : `pre_action` ouvre l'onglet
Pré-formulaire, les phases de formulaire complet ouvrent Formulaire, et le
changement d'onglet ne crée pas d'action.

### Partage d'action et discussion : capacités distinctes

Les deux décisions d'accès sont indépendantes :

```txt
ACTION_SHARE_ELIGIBILITY
!=
ACTION_DISCUSSION_AVAILABILITY
```

#### Partage d'action

Une référence d'action est partageable uniquement selon le contrat porté par
`isPublicActionReferenceAvailable` et son équivalent SQL
`is_public_action_reference_available` :

```txt
pré-action future, publiée et visible
→ invitation

action post_action_complete, approuvée, publiée et visible
→ result
```

Cette éligibilité ne donne aucun droit de lire ou d'écrire la discussion. Elle
détermine uniquement si une référence publique peut être sélectionnée,
transmise ou matérialisée dans un partage.

#### Disponibilité de la discussion

La discussion possède son propre contrat. Le comportement antérieur à la
migration `20260915000009_action_share_requests.sql` reste la référence à
préserver :

- une pré-action publique future conforme à
  `isPublishedFuturePreAction` côté TypeScript et
  `is_public_future_pre_action` côté SQL ;
- une action non-`pre_action`, approuvée, publiée et visible ;
- la compatibilité historique `action_phase IS NULL`, considérée comme
  non-`pre_action` ;
- un utilisateur authentifié ;
- l'absence d'exclusion explicite active.

La migration de partage ne doit donc pas être interprétée comme faisant de
l'éligibilité au partage une autorité d'accès à la discussion. La migration
append-only dédiée à la discussion restaure ce contrat dans un prédicat SQL
distinct, sans modifier le flux de partage ni son first-contact.

L'accès à une discussion d'action exige une action publiée et visible, une
session authentifiée et l'un des liens suivants : créateur, organisateur,
`ACTIVE_ROLE=admin|max`, inscription future `confirmed` dans
`action_registrations`, ou participation finale `confirmed` dans
`action_participants` après `post_action_complete`. Une demande `pending`, un
claim post-action en attente ou une participation annulée ne donne pas accès
d'écriture. La table `action_conversation_exclusions` porte l'état courant ;
les exclusions et réintégrations sont aussi enregistrées via
`appendActionModerationAudit` dans l'audit canonique, avec l'acteur,
l'utilisateur cible, l'action, la conversation et le motif lorsqu'il est
fourni. La correction append-only courante est
`20260927000008_action_discussion_access_and_notifications.sql`.

### Audience des notifications de discussion

L'accès à la discussion et l'audience de notification sont deux contrats
distincts :

```txt
DISCUSSION_ACCESS != NOTIFICATION_AUDIENCE
```

L'accès et l'audience partagent les sources canoniques de membres autorisés ;
`action_conversation_members` reste seulement une projection technique et ne
peut jamais accorder un droit.

Le fan-out des messages d'action suit le cycle de vie :

- avant l'action : créateur, comptes organisateurs et inscriptions futures
  `confirmed` encore actives ;
- après `post_action_complete` : créateur, comptes organisateurs et seules les
  participations finales `action_participants` `confirmed`.

Une inscription future, même `confirmed`, ne devient jamais une participation
finale. Un ancien inscrit sans participation finale confirmée perd l'accès et
ne reçoit plus automatiquement les notifications post-action. Les exclusions
Chat restent appliquées au fan-out, l'auteur n'est jamais notifié, et une
opération rejouée ne produit pas de doublon logique. Les notifications portent
le type `action_discussion`, séparé du type générique `chat`.

### Canaux de livraison futurs

Le domaine sépare explicitement :

```txt
notification métier → destinataire → canaux de livraison
```

`app_notifications` reste le canal in-app canonique et la source de l'état lu/
non lu. Le contrat TypeScript courant prépare la préférence utilisateur
`apps/web/src/lib/notifications/action-discussion-delivery.ts` expose la
préférence `actionDiscussionPush` avec les valeurs `off`, `important_only` et
`all`; son absence ou une valeur invalide signifie `off`. Le push mobile n'est donc jamais
déduit d'un rôle, d'un CTA ou de l'existence d'une notification in-app.

Aucun fournisseur mobile, token d'appareil ou table de devices n'est introduit
avant le choix réel de l'application et de son infrastructure. Lors de cette
intégration, les tokens seront séparés des profils métier, révocables,
multi-appareils, supprimables lorsqu'ils sont invalides et incapables d'exposer
des données privées excessives sur écran verrouillé. Le push consommera le même
événement métier que l'in-app et ne créera jamais une seconde notification.

### Binômes privés d'une action future

Les routes `/api/actions/[actionId]/buddy*` exigent une session Clerk
authentifiée et prennent l'identité exclusivement dans
`requireAuthenticatedAccess`. Un `actionId`, `requestId` ou `proposalId`
fourni par l'appelant ne constitue jamais une preuve d'ownership. Chaque
service recalcule le scope de l'action, la propriété de la demande ou de la
proposition et l'inscription future
`action_registrations.registration_status = confirmed`.

| Opération | Capacité effective | Protection métier |
|---|---|---|
| lire l'état buddy | acteur concerné | projection privée, aucune liste publique de mentors |
| publier/retirer sa disponibilité | inscrit confirmé, puis retrait de sa propre ligne | action `pre_action` publique, publiée, visible et future pour la publication |
| créer une demande | inscrit confirmé | une demande `open` ou `matched` par demandeur/action |
| proposer un binôme | mentor confirmé et disponible | demande de la même action, ouverte, mentor distinct |
| accepter | propriétaire de la demande | RPC `service_role` uniquement, revalidation et verrous SQL |
| décliner/retirer une proposition | mentor de la proposition | ownership strict et états terminaux conservés |
| annuler une demande | demandeur | aucune réouverture ; les propositions `pending` deviennent `withdrawn` |

Les rôles organisateur, administrateur ou compte avec inscription `pending`
n'obtiennent aucun droit implicite. Les rôles navigateur n'ont ni grant direct
sur les trois tables ni droit d'exécuter `accept_action_buddy_proposal` ; le
`service_role` reste confiné au serveur après les contrôles HTTP.
