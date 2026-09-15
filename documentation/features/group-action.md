# Group Action

Cette page documente le flux `Rejoindre une action` pour CleanMyMap.

## But

Permettre a un bénévole de rejoindre le formulaire d'une action deja validee par les administrateurs, sans creer une nouvelle action.

## Flux utilisateur

1. Un organisateur crée un formulaire de groupe depuis la déclaration d'action.
2. Le pré-formulaire conserve les données communes et les membres ajoutés manuellement dans `participantAccounts`, mais pas les champs de récolte finale.
3. L'action passe par la validation admin.
4. Une fois validée, elle apparait dans `Rejoindre une action`.
5. Le bénévole rejoint ce formulaire existant.
6. Les membres ajoutés manuellement à l'action sont enregistrés dans `action_registrations` avec la source `manual_add`, sans passer par la file publique.
7. La demande future est enregistrée dans `action_registrations` avec `registration_status`, `registration_source` et `registered_at`. Un statut `confirmed` signifie uniquement que l'inscription a été acceptée ; il ne confirme pas une présence sur le terrain.
8. Si le bénévole s'est trompé, il peut annuler une inscription en attente ou confirmée, tout en conservant la trace historique de l'inscription.
9. Depuis `Actions passées`, un bénévole peut demander son rattachement à une action publique terminée. Le claim crée une ligne distincte dans `action_participants` avec `participation_source = post_action_claim` et `participation_status = pending`, puis passe par la review de l'organisateur ou d'un administrateur autorisé. Une inscription future existante reste intacte.

## Placement dans le bloc Agir

- La rubrique publique est `Rejoindre une action`, deuxième entrée du bloc `Agir`.
- Elle se situe après `Créer une action` et avant `Signaler un déchet`.
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
- Le formulaire rejoint doit deja exister et etre valide par un admin.
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

Lors du passage à `post_action_complete`, le runtime initialise actuellement les
comptes CleanMyMap du créateur et des organisateurs comme participations finales
`confirmed` dans `action_participants`, avec les sources dédiées correspondantes.
Ce comportement est documenté comme état courant et reste une décision produit
distincte à arbitrer ultérieurement si nécessaire.

- Source d'affichage: table `actions` filtree sur `status = approved`.
- Source d'inscription future: table `action_registrations` avec `registration_status`, `registration_source`, `registered_at` et `updated_at`.
- Source de participation finale: table `action_participants` avec `participation_status`, `participation_source`, `joined_at` et `updated_at`.
- Origine d'inscription: `group_form` pour les demandes publiques futures et `manual_add` pour les membres ajoutés directement.
- Origine de participation finale: `admin`, `admin_override`, `import` ou `post_action_claim` selon l'opération qui l'a créée.
- Source badge, progression et gamification: uniquement `action_participants` avec `participation_status = confirmed`. Un claim confirmé suit cette même source; une inscription future ne la remplace jamais.
- Source stats et quotes-parts: uniquement les participants finaux confirmés; le dénominateur exclut les inscriptions, les demandes `pending` et les lignes `cancelled`.
- Source fermeture: metadata de `actions.notes` via `groupJoinEnabled`.
- Source dérogation: les opérations admin sont journalisées séparément et ne modifient pas le parcours normal.
- Audience des notifications de discussion: avant l'action, créateur, organisateurs et inscriptions futures `pending` ou `confirmed`; après `post_action_complete`, créateur, organisateurs et seules les participations finales `confirmed`. Cette audience ne gouverne pas l'accès à la discussion : une inscription future n'est pas une participation réelle, et un ancien inscrit sans participation finale confirmée n'est plus notifié automatiquement après l'action.

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
