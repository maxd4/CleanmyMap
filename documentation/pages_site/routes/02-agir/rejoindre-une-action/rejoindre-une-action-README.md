# Rejoindre une action

## Fiche canonique

- **Route** : `/sections/rejoindre-une-action`
- **Famille** : Agir
- **Accès lecture** : `public-visible`
- **Contrat SEO** : `ACCESS=HYBRID`, `SEARCH=INDEX`, `DISCOVERY=SITEMAP`, `CANONICAL=SELF`. La lecture des actions publiées est publique ; rejoindre, annuler et traiter une demande restent protégés.
- **Compte requis** : oui pour rejoindre, annuler ou traiter une demande
- **Palette runtime** : agir / emerald
- **Exception page-family** : `join-action`

## Sources principales

```txt
apps/web/src/app/(app)/sections/[sectionId]/page.tsx
apps/web/src/components/sections/rubriques/rejoindre-un-formulaire-section.tsx
apps/web/src/components/sections/rubriques/community/action-needs-panel.tsx
apps/web/src/app/api/actions/group-join/route.ts
apps/web/src/app/api/actions/[actionId]/group-join/route.ts
apps/web/src/app/api/community/needs/route.ts
apps/web/src/app/api/community/needs/[needId]/route.ts
apps/web/src/lib/community/action-needs-service.ts
apps/web/src/lib/community/needs-http.ts
apps/web/src/lib/actions/participation/group-participation.ts
apps/web/src/lib/actions/permissions.ts
```

## Objectif utilisateur

La page canonique permet à un bénévole de :

1. voir les actions futures publiques, y compris lorsque les inscriptions sont fermées ;
2. envoyer une demande d'inscription future ;
3. suivre son état ;
4. annuler une demande ou une inscription future ;
5. ouvrir directement une action ciblée avec `actionId`.

L’onglet `Besoins` liste les besoins structurés des actions futures publiquement
éligibles. Un créateur ou un organisateur/coorganisateur canonique peut créer et
administrer les besoins des actions qu’il gère ; ces contrôles ne sont jamais
accordés par le seul rôle de coordinateur. La même surface permet de modifier
un besoin ouvert, de le marquer pourvu ou de l’annuler, sans réouverture
implicite d’un état terminal ou expiré.

Le paramètre `actionId` est résolu uniquement contre les deux sources déjà
autorisées par cette page : les pré-actions futures rejoignables et les
actions passées publiques terminées. Une cible inconnue, supprimée ou
inaccessible produit un état neutre sans exposer de métadonnée. La cible
résolue sélectionne automatiquement l'onglet temporel correspondant, est
remontée en tête sans modifier le tri des autres cartes et reçoit un repère
visuel ainsi que le focus clavier.

Les onglets sont l'état de navigation canonique de l'URL (`tab=future`,
`tab=past` ou `tab=needs`) et conservent `actionId` lorsqu'il est présent. Ils exposent la
sémantique accessible `tablist` / `tab` / `tabpanel`, avec navigation clavier
par flèches, `Home` et `End`. Sans deep link, l'onglet futur est sélectionné
par défaut. Les filtres propres aux futures ne sont pas affichés dans la vue
passée. Aucun nouveau modèle `past` ou état concurrent n'est introduit ; le
claim rétroactif décrit plus bas est le flux existant de rattachement à une
participation finale.

La même surface consulte aussi les événements historiques `community_events`,
distincts des actions canoniques, dans les deux onglets. Leur lecture passe par
`GET /api/community/events` et conserve les liens profonds
`communityEventId`/`eventId` sans les confondre avec `actionId`. Une lecture par
identifiant peut retrouver un événement hors de la page courante afin qu’un
ancien lien ne soit pas perdu. La liste commence par une fenêtre bornée et
charge les pages suivantes avec `hasMore`/`nextCursor` propres à chaque onglet ;
la requête indique explicitement `phase=upcoming` ou `phase=past`, et le curseur
keyset versionné doit rester dans cette phase. Le tri `event_date`, `created_at`,
`id` reste déterministe ; après revalidation, les pages chargées sont
réconciliées par identifiant pour conserver les mises à jour RSVP/ownership/
suivi et retirer un événement devenu inaccessible. La déduplication client
reste limitée à ces identifiants communs et ne fusionne pas un événement avec
une action canonique. Un échec de continuation est retenté avec le même
curseur, sans revalider artificiellement la première page.

Permettre au créateur, organisateur ou coorganisateur autorisé de :

1. voir les demandes de son action ;
2. accepter ou refuser ;
3. rechercher un compte ;
4. ajouter manuellement un participant.

Les profils dont le rôle actif dispose de la capability d'override d'action
(`ACTIVE_ROLE ∈ {admin, max}`) peuvent traiter toute file selon les permissions
centrales. `ACTIVE_ROLE=elu` ne dispose d'aucun override global d'action. Un
compte `GRANTED_ROLE=elu` ne peut jamais sélectionner `ACTIVE_ROLE=admin` :
`getSwitchableProfiles(role)` autorise les rôles ouverts et `elu` seulement.
`ACTIVE_ROLE=admin` nécessite un `GRANTED_ROLE=admin` ou `max` et une sélection
explicite compatible ; l'identité `elu` seule ne confère pas cette capacité.

## Contrat de visibilité

Une action future apparaît dans l'onglet public si le prédicat
`isPublishedFuturePreAction(...)` est vrai et que son accès n'est pas privé :

```txt
action_phase = pre_action
status ∈ {approved, pending}
moderation_visibility = visible
review_state ∈ {not_required, approved}
published_at != null
date/heure de début future selon Europe/Paris
access_mode != invite_link
```

La liste `Besoins` réutilise ce même prédicat d’éligibilité pour l’action. Elle
retire les besoins `cancelled` des projections publiques ; `expired` est un
statut effectif calculé à la lecture pour un besoin resté `open` dont
`expires_at` est dépassé. Les gestionnaires autorisés peuvent consulter leurs
besoins privés, y compris ceux d’une action encore en brouillon ou masquée, sans
que cette projection ne soit mélangée à la liste publique. `created_by_clerk_id`
reste exclusivement côté serveur.

`groupJoinEnabled` ne gouverne plus la visibilité de la carte. Il gouverne
uniquement la possibilité d'envoyer une demande d'inscription : une carte
publique peut donc afficher explicitement `Inscriptions fermées` sans modifier
les règles de comptabilisation des participants.

Le statut `pending` n'exclut donc pas automatiquement une pré-action historique
compatible de cette page ; une nouvelle action associative avec
`review_state = pending_review` reste exclue par le prédicat de lecture publique.
Pour une nouvelle action associative ou étudiante, `pending_review`, `draft` et
`rejected` restent privés jusqu'à la décision administrative; la revue ne
réactive pas l'ancien flux `community_events`.

La visibilité de l'ouverture à la participation reste distincte de :

- visibilité sur la carte publique ;
- validation d'une déclaration finale ;
- comptabilisation dans les indicateurs d'impact.

## Vocabulaire et sources temporelles

La distinction métier suit la phase de l'action :

| Phase | Source canonique | Sens des libellés UI |
| --- | --- | --- |
| Avant l'action | `public.action_registrations` | `Inscription confirmée`, `Inscriptions confirmées`, `Mes inscriptions`, `Demandes d'inscription` |
| Après l'action | `public.action_participants` | `J’ai participé à cette action`, `Participation à confirmer`, `Participation confirmée`, `Demande refusée` |

Une inscription future, même confirmée, indique une place acceptée avant le
terrain ; elle ne confirme jamais une présence. L'onglet `Actions passées`
permet à un bénévole authentifié de demander un rattachement rétroactif à une
action publique terminée. Cette demande de claim est créée dans
`action_participants` avec `participation_source = post_action_claim` et reste
en attente de validation selon les permissions existantes.

Une action privée `access_mode = invite_link` n'est jamais ajoutée aux cartes,
recherches, rapports, exports, références ou projections publics. Son lien
profond donne une projection minimale et expire trois mois calendaires après sa
création ou son renouvellement. Avant le début prévu, l'utilisation authentifiée
du lien crée ou retrouve une inscription `action_registrations` `confirmed` de
source `invite_link`. Une date passée sans finalisation affiche « Action en
attente de finalisation » ; après `post_action_complete`, le lien ouvre une
demande `action_participants` `post_action_claim` `pending`, jamais une
confirmation automatique de présence. La révocation ou le renouvellement ferme
immédiatement l'ancien lien.

Une ligne `action_registrations` avec `registration_source = manual_add` et
`registration_status = pending` est une invitation directe, pas une demande
publique `group_form`. Elle n'est pas comptée comme inscription confirmée et
ne donne pas l'accès d'un membre confirmé. Après publication, sa décision est
présentée dans la cloche et le Dashboard via `action_event` / `invitation` ;
l'acceptation passe à `confirmed`, le refus à `cancelled`, de manière
authentifiée, atomique et idempotente.

L'onglet `Actions futures` réutilise exclusivement `/api/actions/group-join`.
Cette route renvoie aussi les actions publiées dont `groupJoinEnabled = false`,
afin que la découverte et la participation restent deux décisions distinctes.
La mutation de participation continue de refuser une inscription lorsque le
formulaire est fermé.
L'onglet `Actions passées` lit les références publiques d'actions terminées,
publiées et visibles depuis la surface d'actions ; il ne lit pas l'historique
personnel `historyItems` pour construire cette liste. Il permet en revanche le
claim rétroactif décrit ci-dessus, sans transformer une inscription antérieure
en preuve de présence. L'historique personnel et le partage d'une référence
d'action restent des capacités distinctes de ce parcours.

Lorsqu'une action passée est ouverte avec son `actionId`, la fiche relit la
projection publique canonique de l'action. Elle affiche le remerciement et les
champs du retour publié, puis masque entièrement la continuité si aucune
prochaine action fiable n'est disponible. Les suggestions sont dérivées à la
volée, limitées à trois actions `pre_action` futures publiques et visibles, et
classées par territoire canonique identique, voisinage connu, date/heure puis
identifiant stable. Elles ne déduisent ni présence, ni impact, ni proximité
réelle ; un territoire libre ou inconnu n'est pas transformé en correspondance.

Les événements communautaires affichés dans ces onglets restent une source de
compatibilité historique : leurs RSVP `yes` / `maybe` / `no` restent dans
`event_rsvps`, et leur suivi `attendanceCount` / `postMortem` passe par
`POST /api/community/events/ops` avec les gardes d’ownership/AuthZ existantes.
Un RSVP ne crée aucune ligne `action_registrations` ou `action_participants`.
Les valeurs historiques de suivi ne deviennent pas automatiquement une
présence confirmée, une mesure ou un impact certifié.

Pour une participation confirmée à une action terminée, la carte « Votre part
des résultats » affiche uniquement la projection canonique
`personalImpactAttribution`. Chaque métrique indique sa provenance — « Mesure
individuelle », « Quote-part calculée » ou « Indisponible ». Une quote-part
calculée n'est jamais présentée comme une mesure physique individuelle ; les
participations non confirmées et les mesures indisponibles restent exclues ou
signalées selon le contrat d'attribution.

Une action future annulée n'est plus renvoyée dans la liste normale et ne peut
plus être rejointe. Lorsqu'un utilisateur y avait déjà une participation, son
historique peut afficher `Cette action a été annulée.` ; la relation de
participation et les références de discussion ne sont pas supprimées. La
discussion historique est consultable selon son contrat propre, mais aucun
nouveau message ne peut être publié après l'annulation.

Les nouvelles missions sont créées et suivies via `/actions/new` et les
contrats Actions. `POST /api/community/events` est conservé comme endpoint de
compatibilité qui répond `410` ; il ne crée plus d’événement. Le paramètre
`fromEventId` conserve seulement la référence de l’événement historique à
l’origine de la préparation d’action.

Les besoins structurés sont servis par `GET /api/community/needs`, créés par
`POST /api/community/needs` et administrés par les opérations explicites
`update`, `fulfill` et `cancel` de
`PATCH /api/community/needs/[needId]`. La pagination est bornée ; une cible
`actionId` qui n’est ni publique ni administrable renvoie une liste vide afin de
ne pas révéler son existence. Le topic conversationnel historique
`besoin_ressources` reste dans `/sections/messagerie` ; l’onglet ajoute
seulement un lien contextuel vers ce topic lorsque l’action est identifiable.

## Contrat de participation

Le flux normal :

```txt
POST /api/actions/group-join
```

force :

```txt
isAdminLike = false
```

Donc même un admin utilisant le bouton normal rejoint selon le parcours normal :

```txt
participationStatus = pending
participationSource = group_form
```

Pour une action `pre_action` ou `post_action_draft`, ces champs API/UI restent
les libellés compatibles du parcours, mais leur source persistée canonique est :

```txt
public.action_registrations.registration_status
public.action_registrations.registration_source
```

Ils décrivent une inscription planifiée, et non une présence terrain finale.
`public.action_participants` est réservé à la participation finale après
`post_action_complete`, avec `participation_status` et `participation_source`.
Une inscription future, même `confirmed`, ne devient pas automatiquement une
participation finale et n'alimente pas à elle seule les statistiques ou la
gamification.

Lorsqu'une action atteint `post_action_complete`, aucun compte n'est initialisé
automatiquement dans `public.action_participants` en raison de sa création, de
son rôle de créateur ou de sa responsabilité d'organisateur. Le créateur et les
organisateurs peuvent demander leur rattachement par le même
`post_action_claim` que les autres comptes ; la demande reste en attente de
validation et ne transforme pas les inscriptions futures en participations
finales.

## Missions réalisées et historique personnel

Une mission sélectionnée avant l'action (`action_field_role_assignments`) ne
prouve pas qu'elle a été réalisée. Dans le Bilan, seuls les participants
`action_participants` `confirmed` sont affichés pour une revue de mission. Un
reviewer autorisé peut confirmer ou rejeter chaque rôle prévu, corriger une
décision avec un motif conservé, ou attester une mission rétrospective avec une
justification explicite. Les états `pending`, `confirmed` et `rejected` restent
distincts de la participation et sont historisés dans
`action_role_attestations` et `action_role_attestation_audit`.

Une auto-validation par un organisateur ou un participant reste en attente
d'un reviewer indépendant, sauf le traitement autorisé par `admin`/`max`. Le
centre de notifications informe le participant seulement après la transaction
réussie et déduplique chaque révision. L'historique personnel peut afficher les
missions confirmées et leurs décisions ; aucune mission attestée ne crée encore
de gain XP ni de permission.

## Contrat de traitement de file

La route :

```txt
/api/actions/[actionId]/group-join
```

utilise `resolveReviewerAccess(...)`.

Sont autorisés selon le code actuel :

```txt
créateur
organisateur
coorganisateur autorisé
capability d'override d'action (`ACTIVE_ROLE ∈ {admin, max}`)
```

Un utilisateur extérieur ne peut pas rechercher des comptes ni traiter la file.

## Deux concepts à ne pas confondre

### Liste publique des actions ouvertes

Visible sans compte.

Contient les pré-actions ouvertes à la participation.

### File de modération des demandes

Visible uniquement pour un reviewer autorisé.

Contient :

```txt
pendingRequests
confirmedParticipants
```

Cette file de modération n'est pas publique ; elle est réservée aux reviewers autorisés.

## Ajout manuel

Le backend utilise encore la fonction nommée :

```txt
addActionParticipationByAdmin(...)
```

alors que la route peut maintenant être utilisée par un organisateur ou coorganisateur autorisé.

Dette de nommage :

```txt
renommer ou généraliser le helper sans casser son contrat
```

Ne pas considérer le nom du helper comme une règle d'autorisation.

## Audit admin

Les opérations de traitement de participation réalisées avec la capability
d'override d'action sont journalisées via :

```txt
appendActionModerationAudit(...)
```

Les ajouts directs par modération utilisent `participation_source = admin_override`. La source historique `admin` reste lisible pour compatibilité mais ne doit plus être produite par le parcours normal.

Un retrait d'un participant confirmé est journalisé comme `admin_remove_participant`. Un refus de demande en attente reste journalisé comme `admin_review_reject`.

Les opérations normales d'un organisateur sur sa propre action ne doivent pas être confondues avec un override administratif.

## Progression

Après :

```txt
acceptation
ajout manuel
annulation / départ
```

le code tente de rafraîchir le profil de progression concerné.

Toute évolution de cette logique doit rester idempotente.

## UI cible

- hero court ;
- onglets `Actions futures`, `Actions passées` et `Besoins` ;
- recherche et filtres sur les actions futures ;
- cartes d'actions futures ouvertes ;
- résultats publics finaux des actions passées ;
- suivi personnel ;
- distinction claire entre demande `pending` et participation `confirmed` ;
- file de modération uniquement pour les reviewers autorisés ;
- confirmation avant participation, annulation ou départ ;
- création et administration des besoins structurés pour les gestionnaires
  autorisés, avec états vide, chargement, erreur et expiration ;
- états loading, empty, error et forbidden accessibles.

Chaque carte d'action future publiée contient un bloc compact `Informations
pratiques`. Sa projection publique minimale distingue les indications de
l'organisateur (accessibilité, consignes, matériel à apporter ou fourni,
message aux participants) des recommandations produites par le catalogue Waste
à partir des déchets attendus. Les champs absents restent explicites :
`Accessibilité non évaluée`, `Non renseigné` ou `Matériel à confirmer`.

La carte ne renvoie jamais `preparation_data` dans son intégralité : les notes
privées, checklists, traces administratives et contexte technique du planner
restent côté serveur. Les actions historiques sans préparation structurée
conservent la même `actionId` et reçoivent une projection vide, sans exposer de
contenu de compatibilité.

Après publication, une évolution effective des consignes de sécurité ou du
matériel à prévoir réutilise le flux `action_event` existant, avec la révision
persistée et la déduplication de la RPC d'updates. Une simple variation de
casse, d'espacement ou de ponctuation ne produit pas de notification.

## États

```txt
loading
empty
error
forbidden
queue-empty
confirmation dialog
```

## Binôme privé sur une action future

Une carte d'action future n'affiche le panneau `Besoin d'un binôme ?` qu'à un
inscrit confirmé. Un compte anonyme, non inscrit, `pending` ou annulé ne voit
aucun CTA de binôme. Le panneau conserve ses états `loading`, `empty`, `error`,
`conflict` et `success` et relit l'état serveur après chaque mutation.

Le demandeur peut créer ou annuler sa demande et accepter ou refuser une
proposition. Un inscrit confirmé peut publier sa disponibilité, la retirer et
proposer son aide aux demandes ouvertes de cette action. Les identités ne sont
pas affichées dans les demandes ouvertes ni les propositions ; après un match,
seule la projection minimale du partenaire est visible aux deux acteurs.
L'historique final confirmé peut signaler une première action connue, mais une
absence d'historique reste inconnue et ne bloque jamais un bénévole expérimenté.

Le panneau ne lit jamais `action_participants` pour établir l'inscription
future : cette table sert uniquement au signal optionnel d'historique final.

Les propositions, acceptations et annulations pertinentes alimentent
`app_notifications` avec `type=community`, `actionId`, `requestId` et/ou
`proposalId`, sous une clé d'événement idempotente. Après un match, le bouton
`Contacter mon binôme` ouvre le DM canonique avec le `buddyRequestId` ; l'API
revalide le match et le destinataire au moment de chaque envoi. Le mécanisme
`action_share_contact_requests` reste réservé au partage d'action.

## Covoiturage privé

Une carte d'action future affiche le panneau `Covoiturage` uniquement à un
inscrit confirmé. Les formulaires proposent une zone territoriale reconnue,
un horaire de départ, une capacité bornée et une note facultative ; aucune
adresse exacte, coordonnée ou contact ne doit y être saisi. Les états de
chargement, vide, erreur, trajet ouvert/fermé/annulé et demande
pending/accepted/declined/withdrawn sont relus depuis l'API privée après
chaque mutation.

Le conducteur voit les demandes de son trajet et peut accepter ou refuser ; le
serveur vérifie la capacité sous verrou avant toute acceptation. Le passager
peut retirer une demande et, après acceptation, ouvrir le DM Chat existant
avec le conducteur. L'annulation d'un trajet informe une seule fois les
passagers acceptés. Aucun champ libre, identifiant Clerk ou contact n'est
projeté dans une carte publique.

## Statut documentaire

```txt
Fonction principale en place.
Documentation réalignée sur le runtime actuel.
Rester en maintenance pour les futures commandes produit non encore modélisées, notamment changement d'organisateur et réouverture d'action si un statut de clôture apparaît.
```

## Références

- [Présentation détaillée](./rejoindre-une-action-presentation-detaillee.md)
