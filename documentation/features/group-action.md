# Group Action

Cette page documente le flux `Rejoindre une action` pour CleanMyMap.

## But

Permettre a un bénévole de rejoindre le formulaire visible d'une action publiée, sans creer une nouvelle action.

## Flux utilisateur

1. Un organisateur crée un formulaire de groupe depuis la déclaration d'action.
2. Le pré-formulaire conserve les données communes et les membres ajoutés manuellement dans `participantAccounts`, mais pas les champs de récolte finale.
3. L'action est publiée avec les contrôles de visibilité applicables.
4. Une pré-action `pending` ou `approved` peut apparaitre dans `Rejoindre une action` si elle est visible, publiée, future et ouverte aux inscriptions.
5. Le bénévole rejoint ce formulaire existant.
6. Les membres ajoutés manuellement à l'action sont enregistrés dans `action_registrations` avec la source `manual_add`, sans passer par la file publique.
7. La demande future est enregistrée dans `action_registrations` avec `registration_status`, `registration_source` et `registered_at`. Un statut `confirmed` signifie uniquement que l'inscription a été acceptée ; il ne confirme pas une présence sur le terrain.
8. Si le bénévole s'est trompé, il peut annuler une inscription en attente ou confirmée, tout en conservant la trace historique de l'inscription.
9. Depuis `Actions passées`, un bénévole peut demander son rattachement à une action publique terminée. Le claim crée une ligne distincte dans `action_participants` avec `participation_source = post_action_claim` et `participation_status = pending`, puis passe par la review de l'organisateur ou d'un administrateur autorisé. Une inscription future existante reste intacte.

## Placement dans le bloc Agir

- L'ordre canonique du bloc `Agir` est `Rejoindre → Créer → Signaler`.
- Le bloc Agir expose exactement ces trois entrées ; l'historique, les moteurs
  itinéraire/météo et les missions restent des routes de workflow ou de
  compatibilité hors navigation primaire.

## Points d'entree UI

- Bloc `Agir` — entrée `Rejoindre une action`
- Cartes d'accueil
- Historique des actions
- Bulles de carte
- Les liens profonds avec `actionId` doivent remonter l'action cible en tête de liste si elle est validee.

## Règles de comportement

- Le flux doit eviter la double saisie.
- Le formulaire rejoint doit deja exister et etre visible selon le contrat de publication ; une approbation administrative n'est pas une condition suffisante ou nécessaire isolée.
- Le formulaire complet reste le seul parcours qui expose la récolte finale, la validation scientifique et les scores.
- Le flux normal d'inscription ne change pas selon le rôle: un admin qui clique sur le bouton habituel passe aussi en `pending` dans `action_registrations` avec la source `group_form`.
- Toute intervention admin hors flux normal doit passer par une commande explicite et être journalisée.
- Les inscriptions et les participations finales doivent rester traçables, y compris si leur statut change.
- La jonction ne cree pas de nouveau formulaire.
- Une seule inscription active est conservee par benevole et par action dans `action_registrations`; une inscription et une participation finale peuvent coexister pour le même utilisateur et la même action.
- L'organisateur peut fermer ou rouvrir les inscriptions apres publication.
- L'inscription reste tracée dans `action_registrations`, mais la page bénévole permet d'annuler une demande en attente ou une inscription confirmée.
- Une inscription future suit `registration_status = pending | confirmed | cancelled`; `confirmed` signifie inscription acceptée, jamais présence terrain confirmée.
- Un claim post-action suit `participation_status = pending → confirmed | cancelled` dans `action_participants`; avec l'unicité `(action_id, user_id)`, un état `cancelled` reste terminal dans ce lot et n'est jamais reconverti silencieusement en `pending`.
- Créer, organiser ou finaliser une action ne constitue jamais une preuve de présence terrain. Le créateur et les organisateurs utilisent le même parcours explicite `post_action_claim` que les autres comptes ; la demande commence en `pending` et n'alimente les statistiques qu'après validation.
- Le contexte `wasRegisteredBeforeAction` peut être montré au validateur lorsqu'un claim correspond à une inscription antérieure. Il reste informatif: il n'accepte jamais le claim automatiquement et ne constitue pas une preuve de présence.
- Un claim ne reconstitue pas les effectifs terrain et ne modifie ni `volunteersCount`, ni `volunteerParticipation`, ni `effectiveVolunteerUnits`, ni les résultats collectifs tant qu'il n'est pas confirmé.
- Seules les lignes `action_participants` dont `participation_status = confirmed` contribuent aux statistiques personnelles, aux badges, à la progression, à la gamification et aux quotes-parts. Les inscriptions `action_registrations`, même confirmées, ainsi que les participations finales `pending` ou `cancelled`, sont exclues.

## Données

### Frontière persistée entre inscription et participation

La source canonique dépend de la phase du cycle de vie :

```txt
PRE-ACTION / POST_ACTION_DRAFT
→ public.action_registrations
→ inscription planifiée
→ registration_status
→ registration_source

POST_ACTION_COMPLETE
→ public.action_participants
→ participation finale
→ participation_status
→ participation_source
```

Les libellés API et UI historiques du parcours « rejoindre » (`participationStatus`
et `participationSource`) restent compatibles, mais ils sont alimentés par
`action_registrations.registration_status` et
`action_registrations.registration_source` pour une action future. Ils ne font
pas de `action_participants` la source des demandes futures ni des ajouts
manuels de pré-action. Une inscription future confirmée et une participation
finale peuvent donc coexister pour un même compte et une même action.

Le passage à `post_action_complete`, la création de l'action et l'ajout ou la
modification d'un organisateur n'écrivent aucune participation finale. La
migration append-only qui neutralise les anciens callbacks conserve les
triggers, les RLS, la restauration et les lignes historiques, mais retire toute
insertion implicite `confirmed`. Une présence du créateur ou d'un organisateur
doit donc venir du parcours explicite `post_action_claim`, puis de sa validation.

- Source d'affichage: table `actions`, limitée aux pré-actions `pending` ou `approved` qui sont publiées, visibles, futures et ouvertes aux inscriptions selon le contrat de `Rejoindre une action`.
- Source d'inscription future: table `action_registrations` avec `registration_status`, `registration_source`, `registered_at` et `updated_at`.
- Source de participation finale: table `action_participants` avec `participation_status`, `participation_source`, `joined_at` et `updated_at`.
- Identité de création: `actions.created_by_clerk_id`; responsabilité organisationnelle et permissions: `action_organizers`; aucune de ces deux sources ne prouve une présence terrain.
- Origine d'inscription: `group_form` pour les demandes publiques futures et `manual_add` pour les membres ajoutés directement.
- Origine de participation finale: `admin`, `admin_override`, `import` ou `post_action_claim` selon l'opération qui l'a créée.
- Source badge, progression et gamification: uniquement `action_participants` avec `participation_status = confirmed`. Un claim confirmé suit cette même source; une inscription future ne la remplace jamais.
- Source stats et quotes-parts: uniquement les participants finaux confirmés; le dénominateur exclut les inscriptions, les demandes `pending` et les lignes `cancelled`.
- Source fermeture: metadata de `actions.notes` via `groupJoinEnabled`.
- Source dérogation: les opérations admin sont journalisées séparément et ne modifient pas le parcours normal.
- Discussion d'action: le créateur, les organisateurs, les rôles actifs `admin`/`max` et les participants confirmés peuvent lire et écrire avant l'action; après `post_action_complete`, seuls les participants finaux `action_participants` `confirmed` conservent l'accès, avec le créateur, les organisateurs et les admins. Une demande `pending`, notamment un claim post-action, ne donne aucun accès d'écriture. Une action annulée conserve une lecture autorisée mais bloque les nouveaux messages.
- Audience des notifications de discussion: elle suit les mêmes sources de membres confirmés, exclut l'auteur et les exclusions actives, et produit une notification `action_discussion` idempotente dans `app_notifications` avec `actionId`, `commentId`/`messageId` et `actionPhase`. Une inscription future `pending` n'est pas notifiée.
- Architecture de livraison future: la notification métier `action_discussion` est d'abord créée dans `app_notifications`, puis pourra être évaluée par canal. Le canal in-app reste actif par défaut; le futur push mobile sera séparé, explicitement opt-in et piloté par `actionDiscussionPush = off | important_only | all`, sans fournisseur push choisi dans l'état courant.
- Importance des messages: le contrat futur distingue `normal` et `important`. Seule une marque explicite d'importance, réservée aux annonces organisateur réellement justifiées (lieu, horaire, itinéraire, annulation, sécurité/météo ou message épinglé), peut satisfaire `important_only`; un commentaire libre n'est jamais promu automatiquement.

## Validation

- Verifier que le bouton de join est visible sur les surfaces ciblees.
- Verifier qu'une inscription future, même confirmée, ne remonte pas dans les statistiques ni la gamification.
- Verifier qu'une demande en attente peut etre annulée par son auteur.
- Verifier qu'une participation acceptée peut etre quittée par son auteur.
- Verifier qu'aucune action non validée n'affiche de CTA de jonction.
- Verifier qu'un lien profond `actionId` affiche bien l'action cible, meme hors du lot par défaut.
- Verifier qu'une action terminée publique peut recevoir un claim idempotent et qu'un claim refusé reste terminal.
- Verifier qu'un utilisateur inscrit avant l'action peut conserver son inscription et créer un claim final distinct.
- Verifier qu'un claim `pending` reste absent des statistiques et qu'un claim `confirmed` y contribue uniquement après décision.
