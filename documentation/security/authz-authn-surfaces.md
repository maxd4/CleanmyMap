# Surfaces, rôles et accès

> Module associé à [authz-authn-regles.md](./authz-authn-regles.md). Statut : CURRENT.

## Règles durables pour les tests authentifiés

- Clerk reste l'AuthN canonique en production. Un test de surface protégée en
  production doit donc utiliser une vraie session Clerk et le contrôle serveur
  habituel.
- Le bypass `CMM_DEV_AUTH_BYPASS_*` est strictement limité au développement et
  aux hôtes locaux prévus pour les tests. Il est refusé si `NODE_ENV` n'est pas
  `development` ou si `VERCEL_ENV=production`, même lorsqu'un flag de bypass
  est présent. Il ne doit jamais être accepté comme mécanisme d'authentification
  en production.
- Les tests navigateur locaux peuvent sélectionner, selon la surface testée,
  chacun des rôles canoniques : `benevole`, `coordinateur`, `scientifique`,
  `entreprise`, `elu`, `admin` et `max`. Ils doivent privilégier l'identité qui
  correspond réellement au rôle vérifié plutôt qu'utiliser `max` par défaut.
- Les handlers authentifiés réutilisent les helpers centraux compatibles avec
  Clerk et le bypass local. Ils ne recréent pas une logique d'identification
  parallèle à partir de `auth()` ou d'en-têtes propres au handler.
- Aucun bypass de production ne doit être ajouté pour faciliter un test. Si une
  preuve de production est nécessaire, elle doit passer par le parcours et les
  permissions réels.
- Les tests d'AuthZ doivent vérifier les refus de scope : owner/non-owner,
  organizer/non-organizer, organisation A/B, territoire A/B lorsque ces scopes
  existent.

## Catégories d'accès

Chaque surface doit appartenir à une catégorie explicite.

| Catégorie | Exemple | Contrôle |
|---|---|---|
| Public | health, contenu public | aucune session requise |
| Authentifié | profil courant | session |
| Propriétaire | modifier sa ressource | session + ownership |
| Organisateur | gérer son action | session + relation organisateur |
| Organisation | gérer les ressources de son organisation | session + relation canonique |
| Territoire | consulter/piloter un territoire | session + attribution territoriale canonique |
| Modération globale | dérogation plateforme | capacité privilégiée serveur |
| Service | cron, RPC privilégiée | secret/service role |
| Webhook | Stripe ou tiers | signature |

Une relation organisationnelle ou territoriale absente ou ambiguë ne doit jamais être remplacée par un droit global.

## Qualification des accès Supabase privilégiés par HTTP

`service_role` est une identité technique de persistence. Son usage par une
route ne suffit pas à conclure que la route est administrative, ni à choisir
un garde `requireAdminAccess()`. Le contrat d'accès HTTP doit être établi à
partir du handler, des services appelés, des tests, des consommateurs et de
la documentation canonique.

Pour chaque route qui utilise `getSupabaseServerClient(true)`,
`getSupabaseAdminClient()` ou une RPC réservée à `service_role`, qualifier
successivement :

1. **Contrat d'accès HTTP** : public intentionnel, authentifié,
   owner/scoped, admin/modérateur ou service/webhook ;
2. **Projection exposée** : données individuelles, inter-utilisateurs,
   sensibles, agrégats anonymes/bornés ou projection publique explicitement
   construite ;
3. **Capacité privilégiée** : lecture interne, mutation métier,
   écriture de cache/snapshot, modification de données utilisateur ou
   opération administrative ;
4. **Inputs contrôlés par le client** : sélection de ressource ou
   d'utilisateur, identifiants, classifications, métriques, agrégats et
   tout paramètre pouvant élargir le scope ou influencer une écriture ;
5. **Garde approprié** : AuthN/AuthZ, ownership/scope, validation serveur,
   signature, idempotence, rate limiting, BotID ou autre contrôle exigé par
   le contrat.

Un snapshot ou cache écrit côté serveur reste un effet technique tant qu'il
ne modifie pas le métier et ne doit pas être qualifié comme opération admin
par défaut. Une surface publique peut donc utiliser `service_role` si sa
projection est explicitement bornée, ses inputs ne peuvent pas élargir le
scope et ses protections anti-abus sont proportionnées. BotID et rate
limiting renforcent une surface publique ; ils ne constituent pas une AuthZ.

Les qualifications autorisées sont :

| Qualification | Usage |
|---|---|
| `MISSING_AUTHZ` | capacité qui devrait être restreinte accessible sans garde serveur suffisant |
| `PUBLIC_SAFE` | façade publique volontaire, projection bornée, sans élargissement de scope |
| `INPUT_INTEGRITY` | surface légitime, mais inputs client influençant une donnée privilégiée sans preuve suffisante |
| `ABUSE_RESILIENCE` | risque de spam, replay, coût ou consommation sans garde anti-abus proportionné |
| `DATA_EXPOSURE` | projection plus large ou plus sensible que le contrat public/privé autorisé |
| `NO_FINDING` | contrat, projection, capacité, inputs et contrôles cohérents |

`requireAdminAccess()` ne doit être recommandé que lorsque la capacité HTTP
est réellement admin/modérateur ou lorsque le contrat serveur le requiert,
jamais comme conséquence mécanique de `service_role`. Réciproquement, un
handler admin doit exécuter son garde avant toute création ou utilisation du
client privilégié. Les tests doivent couvrir les chemins anonyme, refusé,
scopé et autorisé selon le contrat, et démontrer qu'aucun accès privilégié
n'est exécuté après un refus.

### Qualification canonique des feedbacks

La qualification métier d'un feedback est distincte de son statut technique
de traitement. Les décisions autorisées sont `pending`, `needs_info`,
`accepted`, `duplicate` et `rejected`. La capacité de décision est réservée
au compte `max` canonique : rôle `max`, rôle actif `max` et identifiant égal à
`CLERK_IMU_OWNER_USER_ID`. Un compte admin, `elu`, un autre compte `max`, un
utilisateur ordinaire ou un visiteur anonyme ne peut pas qualifier un retour.

La route HTTP conserve la garde admin commune pour la boîte créateur, puis
applique cette vérification d'identité avant toute lecture du feedback. La
mutation passe par la RPC serveur transactionnelle, qui verrouille le retour,
écrit la décision et son audit, puis crée au besoin la notification
`app_notifications` de manière idempotente. Le repli local est interdit pour
cette capacité afin de ne jamais enregistrer une décision sans audit ni
notification atomiques. Le motif est obligatoire pour `needs_info`,
`duplicate` et `rejected`; `duplicate` exige une référence distincte.

### `PUBLIC_LEADERBOARD_EXCEPTION`

`GET /api/gamification/leaderboard/public` est une lecture publique
explicitement bornée, et non une capacité AuthZ. Le handler valide uniquement
`scope=user|structure` et `metric=level|xp|badges`, applique le rate limiting,
utilise le client serveur privilégié uniquement pour construire la projection
et ne transmet jamais `userId`, `organizerId`, email, metadata ou champs de
modération. Le scope utilisateur repose sur le consentement serveur
`profiles.leaderboard_public_opt_in`; le scope structure repose sur
`organizer_id` et `organizer_name` canoniques. La réponse est une projection
publique minimale et ne donne aucun droit sur les ressources classées.

### Contrat courant de `/pilotage`

`/pilotage` est une surface métier scoped, distincte de la modération et des
indicateurs publics de Reports. En `ACTIVE_ROLE=coordinateur`, son corpus est
formé côté serveur par les actions dont l'utilisateur est le créateur couvert
par le contrat ou possède une relation `organizer`/`coorganizer` canonique.
Une absence de relation donne un corpus vide, sans élargissement global.

La cible `ACTIVE_ROLE=elu` est un pilotage `territory` fondé sur une
attribution territoriale canonique ; elle reste `TARGET / NOT_IMPLEMENTED` tant
que le runtime et les tests de séparation territoire A/B ne sont pas complets.
`ACTIVE_ROLE=admin` reste sur `/admin` pour la supervision/modération et
`ACTIVE_ROLE=max` reste sur l'administration de plateforme : aucun des deux ne
reçoit le parcours métier `/pilotage` implicitement. `GRANTED_ROLE=elu →
ACTIVE_ROLE=admin` est refusé ; seuls `admin` et `max` peuvent choisir
explicitement `ACTIVE_ROLE=admin`.

## Routes sensibles

Fichiers pivots :

```txt
apps/web/src/proxy.ts
apps/web/src/lib/authz.ts
apps/web/src/lib/auth/
apps/web/src/lib/profiles.ts
apps/web/src/app/api/
```

Le proxy ne remplace pas l'autorisation du handler.

La navigation et le parcours UX ne remplacent pas non plus l'AuthZ serveur.

## Rôles et capacités

Les rôles ne sont pas une hiérarchie linéaire.

La cible est :

```txt
benevole     → self / owned
coordinateur → organized ; organization seulement avec relation canonique
scientifique → public / sanitized analytics selon la projection autorisée
entreprise   → organization seulement avec relation canonique
elu          → territory seulement avec attribution canonique
admin        → global moderation
max          → platform administration
```

Le contrat détaillé, les scopes et les données accessibles sont définis dans `authorization-capabilities.md`.

### Frontière globale et territoriale

Les capacités globales du domaine Actions sont explicitement réservées aux
rôles actifs `admin` et `max`. Le rôle actif `elu` n'obtient aucun override
global de modération, de statut, de participants, d'audit ou d'impact.

La règle runtime est donc :

```txt
elu → scope territorial explicite, sans override global
admin/max → capacités globales explicitement autorisées
```

La capacité cible `actions.moderate_territory`, c'est-à-dire la modération
territoriale des élus, est **NON IMPLÉMENTÉE** tant que
l'attribution territoriale de l'élu, le territoire canonique de l'action, la
relation vérifiable côté serveur et les tests de séparation territoire A/B ne
sont pas tous disponibles. En attendant, ce chemin est fail-closed plutôt que
remplacé par un fallback global.

Les prérequis complets et les opérations encore ouvertes sont définis dans la
section Élu de
[`authorization-capabilities.md`](./authorization-capabilities.md). Ce
document `CURRENT` ne confère donc aucune permission runtime à
`actions.moderate_territory`.

Un compte `GRANTED_ROLE=elu` ne peut pas sélectionner
`ACTIVE_ROLE=admin`, y compris lorsqu'une ancienne métadonnée ou une fixture
interne tente de le faire. Une demande de promotion `elu → admin` reste un
workflow soumis à l'IMU : la demande n'accorde aucun droit et seule une
attribution Clerk explicite peut faire évoluer `GRANTED_ROLE`.
