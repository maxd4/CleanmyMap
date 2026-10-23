# Données privées, missions GPS et RLS

> Module associé à [authz-authn-regles.md](./authz-authn-regles.md). Statut : CURRENT.

## Lecture propriétaire Trash Spotter

La capacité `GET /api/signalements/me` est une surface propriétaire dédiée au
suivi des observations du compte connecté. Le handler appelle
`requireAuthenticatedAccess`, utilise exclusivement le `userId` retourné par
ce contrôle et filtre `trash_spotter_spots.created_by_clerk_id = userId` côté
serveur. Aucun paramètre client ne peut sélectionner un autre propriétaire.

Cette lecture est limitée aux types `spot` et `clean_place`, aux statuts
canoniques `new`, `validated` et `cleaned`, avec un ordre `created_at DESC` et
une limite de 20 par défaut plafonnée à 50. Son DTO ne contient que les champs
nécessaires au suivi utilisateur : identité, date, type, libellé, statut,
coordonnées et dates de validation/nettoyage. Il ne passe ni par
`GET /api/actions` ni par un snapshot de surface publique et doit rester
strictement privé (`no-store`).

La lecture des preuves photo reste une capacité séparée. Elle n'est déclenchée
qu'après le clic de l'auteur sur `Voir les preuves photo`; l'ownership média
existant autorise l'auteur à lire ses propres preuves, y compris lorsque le
signalement est encore `new`.

## Photos de bilan des actions

Les photos de bilan appartiennent à la capacité distincte `action_media` et au
bucket privé `action-photos`. Elles ne réutilisent ni `signalement_media` ni
`signalement-evidence`. Les routes d'intent, de finalisation et de lecture
exigent toutes une session Clerk puis revalident côté serveur l'action ciblée,
son état `post_action_complete` et `canManageAction` avec la relation canonique
`action_organizers`. Le créateur, un participant ou une structure déclarée ne
devient pas organisateur par défaut ; un profil global suit les contrôles
canoniques existants.

Le quota est de trois médias actifs par action, avec un `clientUploadId`
idempotent dans le périmètre action + utilisateur. L'identité constitutive
d'une tentative (nom, MIME, taille, dimensions déclarées, ordre et chemin
serveur) est immuable ; une retry incompatible est refusée et ne modifie pas
la ligne. Une tentative vérifie d'abord si l'objet attendu est déjà présent,
et ne demande pas un nouvel upload dans ce cas. Une ligne ne passe à `ready`
qu'après vérification de l'objet Storage, de sa taille et de son type contre
les métadonnées enregistrées ; les dimensions restent déclaratives côté
navigateur et ne sont pas vérifiées par décodage d'image serveur. Une ligne
`ready` est relue avec ces mêmes contrôles avant d'être rendue, afin qu'un
ancien jeton ne puisse pas la remplacer silencieusement. Les lignes `pending`
ou `failed` ne sont jamais retournées par la lecture. Les URLs signées sont
éphémères et aucune URL, image binaire ou `dataUrl` n'est persistée dans les
notes ou `preparation_data`. Une action publiée n'accorde aucune lecture
publique. La suppression du parent cascade sur les métadonnées ; le nettoyage
des objets abandonnés reste une responsabilité serveur dédiée et aucune
suppression autonome d'une preuve `ready` n'est exposée au client. Le parcours
`signalement_media` reste séparé ; son upload signé conserve son contrat
historique `upsert` et n'est pas corrigé par ce lot.

## Lecture propriétaire des missions GPS

La route `/missions/[id]` est une surface applicative protégée par AuthN Clerk.
Le proxy assure l'entrée authentifiée mais ne remplace pas l'AuthZ serveur de
la capacité de lecture.

La capacité serveur suit obligatoirement cet ordre :

1. appeler `requireAuthenticatedAccess` ;
2. résoudre le rôle avec `getCurrentUserRoleLabel` et le helper central
   `isAdminLikeProfile` ;
3. lire la mission ciblée avec `volunteer_id` ;
4. autoriser le `userId` correspondant à `volunteer_id`, ou un profil
   `admin`/`max` ;
5. lire `gps_points` seulement après cette décision positive.

`mission` et `gps_points` constituent une donnée propriétaire sensible. Un
profil `elu` ou un autre profil ordinaire ne reçoit pas un accès par analogie
avec la modération des actions. `created_by` reste une provenance potentielle
et ne constitue pas une permission tant qu'un producteur et un contrat d'accès
explicites ne sont pas établis.

Le `service_role` peut être utilisé par cette capacité comme moyen technique
strictement serveur, mais il ne constitue jamais l'autorisation : toute
restitution reste conditionnée par la décision d'ownership ou de rôle
privilégié. La lecture mission/GPS est directe, sans cache partagé indexé par
`missionId`, et aucun partage public n'est autorisé sans future vue sanitizée
explicite.

## Demande de suppression depuis le mobile

`POST /api/mobile/account/deletion-request` est une capacité de compte, pas un
endpoint public et pas une suppression directe. Le handler exige le Bearer
Clerk validé par `requireMobileAuthenticatedAccess`, utilise exclusivement le
`userId` issu du JWT, applique un quota par identité, valide la confirmation
explicite et réutilise `contact_requests`. L'identifiant retourné prouve
l'enregistrement de la demande ; `notificationStatus` décrit uniquement la
notification et `deletionProcessed=false` interdit d'afficher une suppression
effectuée. Le traitement et l'audit restent dans le workflow RGPD canonique.
La page publique `/contact` conserve le même type de demande pour une personne
ayant désinstallé l'application.

## Centralisation des permissions

Éviter les comparaisons dispersées de chaînes de rôles.

Préférer des helpers de capacité orientés domaine.

Exemples existants :

```txt
canManageAction
canReviewActionParticipants
canModerateActionsGlobally
canManageActionsGlobally
canOverrideActionParticipants
canEditValidatedImpact
canViewActionModerationAudit
canValidateActionAdministrativeRequirements
```

Les capacités globales ci-dessus consomment uniquement `ACTIVE_ROLE` et sont
limitées à `admin`/`max`. Les droits du créateur, de l'organisateur et du
coorganisateur restent des droits relationnels distincts ; ils ne constituent
pas un passe-droit global.

Exemples de cibles plus précises lorsqu'un scope est nécessaire :

```txt
canModerateAction(identity, action, scope)
canViewTerritoryReport(identity, territory)
canManageOrganizationResource(identity, organization)
canAssignRole(identity, targetRole)
```

Ne pas créer un moteur universel parallèle si les helpers de domaine suffisent. La convergence porte sur le vocabulaire, les invariants et les scopes, pas sur une abstraction unique obligatoire.

## Permissions sur les données

L'accès à une fonctionnalité ne donne pas accès à toutes les colonnes disponibles.

Appliquer la minimisation des DTO :

```txt
public
owner_private
scoped_operational
sanitized_analytics
privileged_admin
security_audit
```

Un scientifique doit recevoir les données nécessaires à l'analyse, pas les PII disponibles par commodité.

Un élu doit recevoir les informations nécessaires au pilotage territorial, pas un accès implicite à tous les comptes individuels du territoire.

Une projection serveur sanitizée est préférable au chargement d'un objet complet suivi d'un masquage client.

## Validation des actions

La création ou la déclaration d'une action suit toujours le parcours métier
normal de validation, quel que soit le rôle actif de son auteur. Aucun rôle ne
confère d'auto-validation implicite.

La validation des démarches administratives d'une pré-action est une capacité
distincte de `canManageAction` :

```txt
ACTIVE_ROLE=admin|max|elu
OU organisateur/coorganisateur de l'action dans action_organizers
→ autorisé
autres → 403
```

Le créateur n'obtient pas cette capacité du seul fait de la création. La
mutation est contrôlée côté serveur, conserve `administrativeRequirements`
séparé de l'ancien `preparationState` (lecture historique uniquement), et réutilise l'audit Actions avec les valeurs
avant/après. Une pré-action créée ne signifie donc pas que les démarches sont
validées ; elles doivent l'être avant le démarrage réel de l'action. Cette
validation ne doit pas empêcher la saisie rétrospective des résultats déjà
réalisés.

Une validation ou modération ultérieure par `admin`/`max` est une opération
distincte, contrôlée côté serveur, motivée lorsque le contrat l'exige et
auditée. Elle ne doit pas être déduite de la création de l'action.

La création d'une action n'est pas une permission `INSERT` directe du Data API.
`POST /api/actions` vérifie la session Clerk, valide le payload et délègue la
création atomique et ses relations à `create_action_with_relations`, exécutée
uniquement par `service_role`. Les rôles `anon` et `authenticated` conservent
les lectures RLS prévues mais ne disposent d'aucun `INSERT`, `UPDATE` ou
`DELETE` direct sur `public.actions` ; les métriques, le statut et la
modération ne peuvent donc pas être choisis ou modifiés par un payload
PostgREST hors de cette frontière métier. Les retries restent bornés par la
clé idempotente `(created_by_clerk_id, client_request_id)` et son fingerprint.

## Supabase et RLS

L'AuthZ applicative ne remplace pas RLS.

`public.profiles.role_label` et `public.profiles.active_role_label` sont des
projections serveur dérivées de Clerk. Elles sont utiles à l'audit et aux
consommateurs métier, mais ne constituent ni une autorité d'attribution ni un
cache autorisant durablement un privilège révoqué. Les clients `anon` et
`authenticated` ne peuvent pas écrire ces colonnes, et les helpers SQL qui les
projettent sont réservés au serveur. Les routes sensibles doivent d'abord
résoudre Clerk côté serveur ; une mutation de rôle Clerk n'est considérée
convergente qu'après la synchronisation Supabase réussie.

La RLS directe ne peut pas vérifier la fraîcheur de Clerk. Elle ne contient
donc plus de branche globale fondée sur une projection pour `admin_elu`, ni
pour les membres de discussion d'action. Une route Next.js ou mobile qui
porte une capacité `admin`/`elu`/`max` doit établir `GRANTED_ROLE`,
`ACTIVE_ROLE`, la capacité et le périmètre depuis Clerk, refuser en cas de
session absente, expirée ou Clerk indisponible, puis utiliser le client serveur
approprié avec un scope explicite. `service_role` est un mécanisme technique
de cette route ; il ne crée jamais une permission utilisateur implicite.
Les discussions d'action conservent séparément les relations vérifiées de
propriété, organisation, participation et appartenance persistée.

Après une révocation, toute divergence entre Clerk et ces projections est un
incident `BLOCKED` : suspendre les opérations sensibles dépendant de la
projection, reprendre la synchronisation idempotente, puis exécuter l'audit
Clerk/Supabase. En l'absence d'une exécution PostgreSQL/RLS autorisée, le
contrat reste non prouvé en intégration et doit être marqué
`DB_SEMANTICS_NOT_EXECUTED`.

La confidentialité des profils repose également sur les privilèges de
colonnes PostgreSQL. La table `public.profiles` conserve les données privées,
mais `anon` et `authenticated` ne lisent que `id`, `display_name`, `handle` et
`avatar_url`; la surface publique canonique est la vue minimale
`public.public_profiles`. `metadata`, `role_label`, `active_role_label`, les
champs de referral, le consentement de leaderboard et les champs de
synchronisation Clerk ne doivent donc jamais être récupérés par une requête
PostgREST directe d'un autre compte. Les routes personnelles et les routes
administratives doivent effectuer l'autorisation Clerk avant d'utiliser le
client serveur privilégié, avec un prédicat d'owner ou un scope administratif
explicite.

La table `public.action_organizers` conserve la même frontière d'écriture
serveur-only. Sa lecture RLS est corrélée à la ligne `public.actions` : une
relation d'organisateur n'est visible que si l'action associée est visible par
l'acteur selon `actions_select_public_or_owner`. Une action privée ne révèle
donc pas ses organisateurs à `anon` ni à un autre compte ; les organisateurs
d'une action publique restent lisibles par la surface publique prévue. Cette
policy ne remplace pas les contrôles Clerk des routes de gestion : elle ferme
la fuite Data API et ne donne aucune capacité de mutation.

### Événements communautaires

`public.community_events` est server-only pour les lectures directes : les
privilèges `SELECT` et la policy globale de lecture sont retirés pour `anon` et
`authenticated`. La consultation publique passe exclusivement par
`GET /api/community/events`, qui utilise une lecture serveur et construit une
projection bornée sans `organizer_clerk_id` ni notes internes ; son `eventId`
explicite reste ciblé côté serveur. Les lectures serveur historiques qui ne
retournent que des champs publics utilisent également le client privilégié
sans l'exposer au client. La création passe par `/actions/new` et les contrats
Actions. `POST /api/community/events` reste une frontière de compatibilité qui
répond `410` et ne crée plus de nouvelle ligne. Les opérations historiques autorisées passent par
`POST /api/community/events/ops`, après
vérification de l'organisateur ou d'une capacité admin. Une dérogation admin
exige un motif, reste auditée et n'élargit pas les droits du Data API. Les
privilèges DML de `service_role` sont réservés à ces frontières serveur et ne
constituent pas une permission utilisateur.

Les privilèges `TRUNCATE`, `TRIGGER`, `REFERENCES` et `DELETE` ne font pas
partie du contrat des rôles applicatifs sur les profils. Les capacités métier
nécessaires des préférences de notification et de l'inscription newsletter
restent accordées explicitement, sans réouvrir une lecture anonyme des données
privées. Le contrat réel est exercé pour `anon`, `authenticated` et
`service_role` dans l'environnement PostgreSQL éphémère.

### Données utilisateur, notifications et progression

Les tables `public.event_rsvps` et `public.quiz_srs` sont strictement
propriétaire-scopées : une session `authenticated` doit présenter un `sub`
Clerk non vide qui correspond exactement à `participant_clerk_id` ou
`user_id`. `anon`, une session sans `sub` et une valeur propriétaire vide ne
peuvent donc ni lire ni écrire ces données. Le navigateur conserve la capacité
de sauvegarder et relire son propre état `quiz_srs`, tandis que les écritures
de RSVP restent soumises à la même frontière de propriétaire.

`public.quiz_type_progress` est une projection de progression fiable. Un
utilisateur authentifié peut lire ses propres compteurs, mais ne peut pas les
insérer, les modifier ou les supprimer via le Data API ; leur avancement passe
par `/api/gamification/quiz/progress` et le client serveur privilégié après
vérification Clerk et de la réponse canonique. Les récompenses XP/badges sont
émises seulement lorsque l'événement de progression idempotent est réellement
inséré : un rejeu pédagogique peut encore avancer le SRS et la progression,
mais ne réattribue pas un événement déjà consommé.

`public.app_notifications` reste lisible uniquement par le propriétaire
authentifié ou par les producteurs serveur. Le client ne dispose que des
privilèges de colonnes `read_at`, `seen_at` et `acknowledged_at`, avec un
`WITH CHECK` qui maintient `user_id` sur l'identité courante ; `title`,
`content`, `type`, `payload` et `user_id` restent des champs serveur. Les
producteurs utilisent `service_role` côté serveur et ne transmettent jamais ce
secret au navigateur.

Tester selon le domaine :

- anonyme ;
- connecté propriétaire ;
- connecté non-propriétaire ;
- organisateur / non-organisateur ;
- organisation A / organisation B ;
- territoire A / territoire B ;
- admin ;
- max ;
- service role si réellement nécessaire.

Ne jamais :

- désactiver RLS pour débloquer un flux ;
- envoyer `service_role` au client ;
- accorder une RPC sensible au public uniquement pour contourner un échec client ;
- utiliser `service_role` comme justification de l'autorisation d'un utilisateur ;
- élargir une policy organisationnelle ou territoriale faute de relation canonique.
