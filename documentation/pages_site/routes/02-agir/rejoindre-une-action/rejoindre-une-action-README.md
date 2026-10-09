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
apps/web/src/app/api/actions/group-join/route.ts
apps/web/src/app/api/actions/[actionId]/group-join/route.ts
apps/web/src/lib/actions/participation/group-participation.ts
apps/web/src/lib/actions/permissions.ts
```

## Objectif utilisateur

La page canonique permet à un bénévole de :

1. voir les actions de groupe ouvertes ;
2. envoyer une demande d'inscription future ;
3. suivre son état ;
4. annuler une demande ou une inscription future ;
5. ouvrir directement une action ciblée avec `actionId`.

Le paramètre `actionId` est résolu uniquement contre les deux sources déjà
autorisées par cette page : les pré-actions futures rejoignables et les
actions passées publiques terminées. Une cible inconnue, supprimée ou
inaccessible produit un état neutre sans exposer de métadonnée. La cible
résolue sélectionne automatiquement l'onglet temporel correspondant, est
remontée en tête sans modifier le tri des autres cartes et reçoit un repère
visuel ainsi que le focus clavier.

Les onglets sont l'état de navigation canonique de l'URL (`tab=future` ou
`tab=past`) et conservent `actionId` lorsqu'il est présent. Ils exposent la
sémantique accessible `tablist` / `tab` / `tabpanel`, avec navigation clavier
par flèches, `Home` et `End`. Sans deep link, l'onglet futur est sélectionné
par défaut. Les filtres propres aux futures ne sont pas affichés dans la vue
passée. Aucun nouveau modèle `past` ou état concurrent n'est introduit ; le
claim rétroactif décrit plus bas est le flux existant de rattachement à une
participation finale.

Permettre au créateur, organisateur ou coorganisateur autorisé de :

1. voir les demandes de son action ;
2. accepter ou refuser ;
3. rechercher un compte ;
4. ajouter manuellement un participant.

Les profils dont le rôle actif dispose de la capability d'override d'action
(`ACTIVE_ROLE ∈ {admin, max}`) peuvent traiter toute file selon les permissions
centrales. `ACTIVE_ROLE=elu` ne dispose d'aucun override global d'action. Un
compte dont `GRANTED_ROLE=elu` peut sélectionner explicitement
`ACTIVE_ROLE=admin`, mais cette bascule n'est ni implicite ni une permission
propre à `elu`.

## Contrat de visibilité

Une action future apparaît dans l'onglet public uniquement si le prédicat
`isJoinableFuturePreAction(...)` est vrai, c'est-à-dire si :

```txt
action_phase = pre_action
status ∈ {approved, pending}
moderation_visibility = visible
published_at != null
date/heure de début future selon Europe/Paris
groupJoinEnabled = true
```

Le statut `pending` n'exclut donc pas automatiquement une pré-action de cette page.

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

Une ligne `action_registrations` avec `registration_source = manual_add` et
`registration_status = pending` est une invitation directe, pas une demande
publique `group_form`. Elle n'est pas comptée comme inscription confirmée et
ne donne pas l'accès d'un membre confirmé. Après publication, sa décision est
présentée dans la cloche et le Dashboard via `action_event` / `invitation` ;
l'acceptation passe à `confirmed`, le refus à `cancelled`, de manière
authentifiée, atomique et idempotente.

L'onglet `Actions futures` réutilise exclusivement `/api/actions/group-join`.
L'onglet `Actions passées` lit les références publiques d'actions terminées,
publiées et visibles depuis la surface d'actions ; il ne lit pas l'historique
personnel `historyItems` pour construire cette liste. Il permet en revanche le
claim rétroactif décrit ci-dessus, sans transformer une inscription antérieure
en preuve de présence. L'historique personnel et le partage d'une référence
d'action restent des capacités distinctes de ce parcours.

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
- onglets `Actions futures` et `Actions passées` ;
- recherche et filtres sur les actions futures ;
- cartes d'actions futures ouvertes ;
- résultats publics finaux des actions passées ;
- suivi personnel ;
- distinction claire entre demande `pending` et participation `confirmed` ;
- file de modération uniquement pour les reviewers autorisés ;
- confirmation avant participation, annulation ou départ ;
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

## Statut documentaire

```txt
Fonction principale en place.
Documentation réalignée sur le runtime actuel.
Rester en maintenance pour les futures commandes produit non encore modélisées, notamment changement d'organisateur et réouverture d'action si un statut de clôture apparaît.
```

## Références

- [Présentation détaillée](./rejoindre-une-action-presentation-detaillee.md)
- [Propositions à traiter](./rejoindre-une-action-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./rejoindre-une-action-objectifs-non-pertinents.md)
