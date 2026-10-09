# Group Action

Cette page documente le flux `Rejoindre une action` pour CleanMyMap.

## But

Permettre a un bénévole de rejoindre le formulaire visible d'une action publiée, sans creer une nouvelle action.

## Flux utilisateur

1. Un organisateur crée un formulaire de groupe depuis la déclaration d'action.
2. Le pré-formulaire conserve les données communes et les comptes à inviter dans `participantAccounts`, mais pas les champs de récolte finale.
3. L'action est publiée avec les contrôles de visibilité applicables.
4. Une pré-action `pending` ou `approved` peut apparaitre dans `Rejoindre une action` si elle est visible, publiée, future et ouverte aux inscriptions.
5. Le bénévole rejoint ce formulaire existant.
6. Les membres ajoutés manuellement à l'action sont enregistrés dans `action_registrations` avec `registration_source = manual_add` et `registration_status = pending`, sans passer par la file publique. Ils ne sont pas confirmés silencieusement. Leur identité est conservée, même après retrait ou décision.
7. La demande future est enregistrée dans `action_registrations` avec `registration_status`, `registration_source` et `registered_at`. Un statut `confirmed` signifie uniquement que l'inscription a été acceptée ; il ne confirme pas une présence sur le terrain.
8. Après la publication effective, une invitation `manual_add` est émise dans `app_notifications` avec `type = action_event` et `payload.subtype = invitation`. La déduplication est faite par l'identité d'événement versionnée (`registrationId` + `invitationVersion`) ; une sauvegarde de brouillon ne l'émet pas. La livraison utilise l'identité Clerk et ne dépend pas de l'existence préalable d'une ligne `profiles`.
9. La cloche et le Dashboard affichent l'invitation comme décision « À traiter ». Les boutons acceptent ou refusent via la mutation authentifiée atomique ; le statut réel devient ensuite « Traitée », sans bouton résiduel. « Lu » reste distinct de « Traité ». La récupération des cartes décisionnelles est groupée par famille et paginée ; une recherche plafonnée signale une résolution incomplète au lieu de classer silencieusement la décision comme absente.
10. Une invitation `pending` ne réserve aucune place confirmée, ne donne pas l'accès de membre confirmé à la discussion et ne contribue ni aux présences terrain, ni aux statistiques, ni à l'XP ou aux badges. Une demande publique `group_form` reste une demande distincte.
11. Si le bénévole s'est trompé, il peut annuler une inscription en attente ou confirmée, tout en conservant la trace historique de l'inscription.
12. Une synchronisation du pré-formulaire est une opération atomique : une invitation en attente retirée par l'organisateur devient `cancelled` avec `registration_cancellation_reason = organizer_withdrawn`, une invitation acceptée reste `confirmed`, et une invitation refusée par son destinataire (`recipient_rejected`) ne peut pas être renvoyée par une sauvegarde ordinaire. Une réinvitation explicitement autorisée après retrait de l'organisateur réutilise la même ligne avec une nouvelle version d'événement.
13. Depuis `Actions passées`, un bénévole peut demander son rattachement à une action publique terminée. Le claim crée une ligne distincte dans `action_participants` avec `participation_source = post_action_claim` et `participation_status = pending`, puis passe par la review de l'organisateur ou d'un administrateur autorisé. Une inscription future existante reste intacte.
14. Une demande `group_form` `pending` génère un événement `action_event` dédupliqué pour le créateur, les organisateurs habilités et les rôles `admin`/`max`, à l'exclusion du demandeur. Elle est distinguée d'une invitation `manual_add` par `payload.subtype = registration_request`. Pour le créateur et les organisateurs, l'identité de livraison est leur `user_id` Clerk issu de la relation d'action : une ligne `profiles` n'est pas requise ; `profiles` reste utilisé uniquement pour résoudre les rôles `admin`/`max`.
15. La carte « Demande d'inscription » expose `✓ Accepter` et `× Refuser`. Chaque clic repasse par l'autorisation serveur et une transition conditionnelle depuis `pending`; une décision concurrente ou un droit révoqué rend la carte indisponible sans seconde mutation.
16. Une décision effective `confirmed` ou `cancelled` crée une notification `registration_decision` pour le demandeur Clerk avec un lien vers l'action, sans dépendre d'une présence préalable dans `profiles`. L'annulation de l'action retire la demande de la projection actionnable sans acceptation implicite ni refus fabriqué.
17. La file de review d'une action future ne contient que les inscriptions `registration_source = group_form` et `registration_status = pending`. Une invitation `manual_add` reste absente de cette file, même si son identifiant est connu ; son destinataire est le seul parcours normal d'acceptation ou de refus via `respond_to_action_invitation`.
18. Après une écriture réussie sur une action publiée future en pré-action, les seuls changements notifiés sont la date, l'horaire, le point de rendez-vous, le parcours actif ou l'annulation. Les notifications `action_event` ciblent le créateur, les organisateurs et les inscriptions `confirmed`, excluent l'auteur et les inscriptions `cancelled`, puis sont dédupliquées par une clé de révision.
19. Les modifications opérationnelles rapprochées sont regroupées dans une seule notification non lue par action. Son `changeEvents` conserve au plus 50 événements ; une notification déjà lue reste immuable afin de préserver la traçabilité. Les brouillons, descriptions, estimations et formalités internes ne déclenchent pas cette émission opérationnelle. Une action déjà publiée, future et visible dont `administrativeRequirements.status = pending` peut toutefois produire une unique notification informative regroupée par action et organisateur ; elle ne crée aucune obligation nouvelle.
20. Quand une action est publiée, approuvée et réellement passée en `post_action_complete`, une notification `action_event` `subtype = action_result` est créée une seule fois par action et inscrit confirmé qui ne possède pas encore de participation finale `confirmed`. Elle utilise uniquement `actionId` et propose « J'ai participé » ou « Je n'ai pas participé ».
21. « J'ai participé » crée ou retrouve exclusivement un claim `action_participants` `post_action_claim` `pending`; il ne confirme jamais une présence. « Je n'ai pas participé » traite la sollicitation dans la notification sans modifier le bilan collectif. Les claims pendants apparaissent aux organisateurs habilités et à `admin`/`max` dans une carte `post_action_claim`, puis la review existante produit une notification de résultat au demandeur.
22. Le centre de notifications reste la boîte unique : les projections `post-action-prompts` et `post-action-claims` relisent respectivement les notifications `action_result` et `post_action_claim` avec les états métier canoniques. Une décision lue, traitée, refusée ou rendue impossible n'est jamais reproposée comme décision ouverte. Les audiences de discussion réutilisent les relations Clerk canoniques et les seuls états `confirmed` ; l'existence d'un profil Supabase ne conditionne pas l'appartenance, et les inscriptions ou participations `pending` restent exclues.
23. Après confirmation effective d'une participation finale et publication du bilan validé, une notification informative `action_event` `subtype = action_result_impact` intitulée « Participation confirmée et résultats disponibles » renvoie vers `Rejoindre une action` en vue `past` avec le même `actionId`. Elle ne fige aucun montant : la vue relit `personalImpactAttribution` et donne accès à la progression courante canonique.
24. Les recalculs d'attribution ne produisent une notification supplémentaire que si la projection canonique de déchets ou de mégots change pour un participant déjà `action_participants.confirmed`. La notification porte une empreinte de projection versionnée ; avant persistance, la révision interne qui peut contenir les identités des participants est transformée en empreinte SHA-256 opaque et de taille fixe. Une réexécution identique est silencieuse, les anciennes clés historiques restent inchangées, et aucune identité d'un autre participant n'est exposée dans le payload. Une incohérence ou une mesure indisponible n'est jamais annoncée comme une attribution définitive.
25. Le registre unique `/api/cron/maintenance` exécute chaque jour le job `action-reminders`. À J-1 selon `Europe/Paris`, il crée au plus un rappel in-app par couple action/inscription confirmée, avec la date, l'horaire disponible, le point de rendez-vous et un lien vers l'action. Les inscriptions `pending` ou `cancelled`, les actions annulées/non publiées et les utilisateurs ayant désactivé les rappels sont exclus.
26. La clé d'événement du rappel est stable pour l'action et l'utilisateur : une relance du cron reste idempotente et une modification de date ne réémet pas un rappel déjà délivré. Une inscription confirmée plus tard le même J-1 peut encore recevoir son rappel unique.
27. Le centre de suivi réutilise `app_notifications` et sépare `À traiter` (projection de l'état métier encore pending, sans dépendre de `read_at`) de `Informations`. Les préférences persistées peuvent masquer les informations facultatives ou les rappels ; les décisions en attente et les alertes critiques restent visibles. Les canaux externes restent désactivés par défaut.
28. Une demande de partage d'action reste portée par `action_share_contact_requests` et son notification in-app. La carte indique l'expéditeur et l'action concernée, ouvre la messagerie avec le `requestId`, puis conserve l'état `pending`, `treated` ou `unavailable` après la décision. Une acceptation ou un refus produit au plus une information de résultat pour l'expéditeur ; les reprises de la même demande ne recréent pas de décision.

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
- Le sélecteur « Inviter des membres » prépare des invitations, sans envoi pendant la saisie du brouillon. Les comptes déjà sélectionnés sont conservés jusqu'à la publication ou leur retrait explicite.
- L'inscription reste tracée dans `action_registrations`, mais la page bénévole permet d'annuler une demande en attente ou une inscription confirmée.
- Une inscription future suit `registration_status = pending | confirmed | cancelled`; `confirmed` signifie inscription acceptée, jamais présence terrain confirmée.
- Un claim post-action suit `participation_status = pending → confirmed | cancelled` dans `action_participants`; avec l'unicité `(action_id, user_id)`, un état `cancelled` reste terminal dans ce lot et n'est jamais reconverti silencieusement en `pending`.
- Créer, organiser ou finaliser une action ne constitue jamais une preuve de présence terrain. Le créateur et les organisateurs utilisent le même parcours explicite `post_action_claim` que les autres comptes ; la demande commence en `pending` et n'alimente les statistiques qu'après validation.
- Le contexte `wasRegisteredBeforeAction` peut être montré au validateur lorsqu'un claim correspond à une inscription antérieure. Il reste informatif: il n'accepte jamais le claim automatiquement et ne constitue pas une preuve de présence.
- Un claim ne reconstitue pas les effectifs terrain et ne modifie ni `volunteersCount`, ni `volunteerParticipation`, ni `effectiveVolunteerUnits`, ni les résultats collectifs tant qu'il n'est pas confirmé.
- Seules les lignes `action_participants` dont `participation_status = confirmed` contribuent aux statistiques personnelles, aux badges, à la progression, à la gamification et aux quotes-parts. Les inscriptions `action_registrations`, même confirmées, ainsi que les participations finales `pending` ou `cancelled`, sont exclues.
- Les notifications d'impact réutilisent exclusivement `loadActionParticipantImpactSnapshot`, `personalImpactAttribution` et `allocateActionParticipantImpact()`. Elles n'implémentent aucun calcul de quote-part et ne transforment jamais une valeur physique en XP.

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
- Origine d'inscription: `group_form` pour les demandes publiques futures et `manual_add` pour les invitations directes. Les invitations directes commencent toujours en `pending` et passent à `confirmed` ou `cancelled` par la réponse canonique du destinataire ; une inscription déjà acceptée peut ensuite être annulée par son titulaire sans perdre son historique. `registration_cancellation_reason` distingue `recipient_rejected`, `organizer_withdrawn` et `accepted_cancelled`; aucune sauvegarde ordinaire ne transforme un refus destinataire en nouvelle invitation.
- Dans `Rejoindre une action`, une inscription future `group_form` `pending` est libellée « Demande d'inscription », tandis qu'une invitation `manual_add` `pending` est libellée « Invitation en attente de réponse » et renvoie à la carte de notification ; elle ne peut pas être annulée ou confirmée par la review organisateur.
- Origine de participation finale: `admin`, `admin_override`, `import` ou `post_action_claim` selon l'opération qui l'a créée.
- Source badge, progression et gamification: uniquement `action_participants` avec `participation_status = confirmed`. Un claim confirmé suit cette même source; une inscription future ne la remplace jamais.
- Source stats et quotes-parts: uniquement les participants finaux confirmés; le dénominateur exclut les inscriptions, les demandes `pending` et les lignes `cancelled`.
- Source fermeture: metadata de `actions.notes` via `groupJoinEnabled`.
- Source dérogation: les opérations admin sont journalisées séparément et ne modifient pas le parcours normal.
- Discussion d'action: le créateur, les organisateurs, les rôles actifs `admin`/`max` et les participants confirmés peuvent lire et écrire avant l'action; après `post_action_complete`, seuls les participants finaux `action_participants` `confirmed` conservent l'accès, avec le créateur, les organisateurs et les admins. Une demande `pending`, notamment un claim post-action, ne donne aucun accès d'écriture. Une action annulée conserve une lecture autorisée mais bloque les nouveaux messages.
- Audience des notifications de discussion: elle suit les mêmes sources de membres confirmés, exclut l'auteur et les exclusions actives, et produit une notification `action_discussion` idempotente dans `app_notifications` avec `actionId`, `commentId`/`messageId` et `actionPhase`. Une inscription future `pending`, y compris une invitation `manual_add`, n'est pas notifiée comme membre confirmé. L'appartenance Clerk issue de ces relations ne dépend pas de l'existence d'une ligne `profiles`.
- Architecture de livraison future: la notification métier `action_discussion` est d'abord créée dans `app_notifications`, puis pourra être évaluée par canal. Le canal in-app reste actif par défaut; le futur push mobile sera séparé, explicitement opt-in et piloté par `actionDiscussionPush = off | important_only | all`, sans fournisseur push choisi dans l'état courant.
- Importance des messages: le contrat futur distingue `normal` et `important`. Seule une marque explicite d'importance, réservée aux annonces organisateur réellement justifiées (lieu, horaire, itinéraire, annulation, sécurité/météo ou message épinglé), peut satisfaire `important_only`; un commentaire libre n'est jamais promu automatiquement.
- Notifications de changement opérationnel: la RPC `emit_action_update_notifications` est réservée à `service_role` et appelée après persistance par les routes d'édition, de version de parcours et d'annulation. La clé `action_update:<actionId>:<révision>:<types>` rend les reprises idempotentes ; l'absence temporaire de livraison ne fait pas échouer la mutation métier, et une nouvelle tentative réutilise cette même clé.

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
- Verifier qu'une action finalisée publiquement ne notifie qu'une fois chaque inscrit confirmé sans participation finale confirmée, avec le même `actionId`.
- Verifier que « J'ai participé » reste `pending` jusqu'à review et que « Je n'ai pas participé » ne modifie ni les résultats ni les statistiques.
- Verifier qu'une décision concurrente, un droit de review révoqué ou une action devenue indisponible rend la carte non actionnable et conserve l'état métier observé.
