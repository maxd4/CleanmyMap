# Autorisation par capacités et périmètres

> **Statut** : contrat d'autorisation cible durable pour CleanMyMap.
>
> Ce document définit comment attribuer des permissions utiles mais contrôlées aux rôles métier. Tant que la convergence du code n'est pas complète, le comportement réellement implémenté reste déterminé par le code et les tests sur `main`. Une divergence entre ce contrat cible et le runtime doit être traitée explicitement ; elle ne doit jamais être masquée par la documentation.

## 1. Objectif

CleanMyMap ne doit pas modéliser ses permissions comme une hiérarchie linéaire de rôles.

La règle cible est :

```txt
permission effective
=
identité authentifiée
+ capacité demandée
+ périmètre autorisé
+ relation à la ressource
+ état métier
+ contraintes de données
```

Un rôle donne accès à un ensemble de capacités possibles. Il ne donne pas, à lui seul, un droit global sur toutes les ressources du même domaine.

Exemples :

```txt
coordinateur
+ actions.manage_organized
+ action dont il est organisateur
→ autorisé

coordinateur
+ actions.manage_organized
+ action d'une autre organisation
→ refusé

elu
+ reports.view_territory
+ territoire qui lui est attribué
→ autorisé

elu
+ actions.moderate_global
→ refusé par défaut
```

## Classification canonique des surfaces

Cette classification constitue la politique cible documentaire de CleanMyMap.
Elle guide la convergence future sans prétendre décrire un runtime déjà
convergé : le comportement effectivement implémenté sur `main` reste défini
par le code et les tests.

| Classe | Règle cible |
|---|---|
| `public_read` | lecture publique de données `public-safe`, sans session obligatoire |
| `authenticated_write` | mutation après session Clerk, avec AuthZ, ownership/scope, validation et rate limit côté serveur |
| `private_read` | lecture après session Clerk, avec contrôle d'ownership, de scope et d'AuthZ |
| `privileged` | surface d'administration ou de modération avec AuthN, AuthZ forte, audit et garde-fous adaptés au risque |
| `public_write_exception` | écriture publique explicitement justifiée, sans compte obligatoire, avec contrôles anti-abus proportionnés |

La visibilité d'une page ne vaut pas autorisation d'exécuter ses actions. Une
page peut rester publique tout en présentant des CTA qui demandent ensuite une
connexion au moment où l'interaction nécessite une identité, une donnée privée
ou une mutation. Le proxy peut contribuer à la navigation et au premier
filtrage, mais il n'est pas l'autorité finale : l'handler ou le service serveur
doit reprendre la décision.

Toute mutation liée à un compte doit être attribuée à l'identité Clerk
courante. Toute lecture privée doit contrôler l'ownership, le scope et
l'AuthZ applicables. Une session authentifiée ne remplace jamais l'AuthZ.

BotID est une défense anti-automation complémentaire ; ce n'est ni une
primitive d'AuthN ni une primitive d'AuthZ. Il ne doit pas être imposé comme
hard gate par défaut aux écritures déjà authentifiées. Un CAPTCHA ou un
challenge présenté à l'authentification ne remplace ni le rate limit, ni
l'AuthZ, ni les contrôles métier après connexion.

Les exceptions d'écriture publique doivent rester rares, explicitement
justifiées et documentées. Elles combinent les contrôles strictement
nécessaires — validation, honeypot ou délai lorsque pertinent, rate limit et
anti-automation éventuelle — sans rendre le parcours inaccessible aux humains
légitimes.

Exemples de classification cible :

- carte, méthodologie, apprentissage et données validées publiques : `public_read` ;
- créer, rejoindre ou modifier une action, envoyer un feedback attribué et
  envoyer des messages : `authenticated_write` ;
- profil, historique personnel et messages privés : `private_read` ;
- administration et modération : `privileged` ;
- contact, newsletter et notification de contenu illicite lorsque leur
  contrat l'exige : `public_write_exception`.

## Vérification transverse des surfaces interactives

Toute surface interactive doit pouvoir être vérifiée à trois niveaux :

```txt
PAGE_OK
→ page et navigation utilisables

INTERACTION_OK
→ action utilisateur produit l'état UI attendu

END_TO_END_OK
→ effet réel vérifié côté persistence, email, audit, redirection ou état métier selon le cas
```

Ces niveaux constituent un invariant de validation cible pour les formulaires,
écritures, feedbacks, emails, liens et redirections, participations, messages,
exports et autres effets métier. Ils ne constituent pas un résultat de
commissioning actuel.

## 2. Vocabulaire canonique

Les rôles métier sont définis dans :

```txt
apps/web/src/lib/domain-language.ts
apps/web/src/lib/profiles.ts
```

Rôles canoniques :

```txt
benevole
coordinateur
scientifique
entreprise
elu
admin
max
```

Conserver la distinction :

```txt
Role        = attribution métier
Parcours    = projection UX du rôle
Capability  = action métier autorisable
Scope       = périmètre dans lequel cette capacité peut s'exercer
Ownership   = relation directe utilisateur ↔ ressource
Override    = dérogation privilégiée hors parcours normal
```

Un `Parcours` ne constitue jamais une permission serveur.

### Identité canonique du rôle IMU

La règle de nommage est : **IMU = rôle interne `max`**, accordé uniquement à
l'identité owner Clerk canonique de l'instance.

- `max` est l'identifiant technique canonique utilisé par le code et les
  données ;
- `IMU` est l'appellation produit officielle affichée dans l'interface ;
- les alias `super-admin`, `super_admin`, `superadmin`, `owner`, `godmode` et
  `creator` sont uniquement des valeurs legacy ; ils ne constituent jamais une
  preuve d'autorisation IMU ;
- l'accès `max` exige `CLERK_IMU_OWNER_USER_ID` et
  `CLERK_IMU_OWNER_EMAIL`, avec l'email principal Clerk vérifié et exactement
  correspondant ;
- `activeProfile=max`, `profiles.role_label=max`, une allowlist admin ou
  `CREATOR_INBOX_EMAIL` ne peuvent pas accorder `max`.

Les chemins historiques comme `09-admin-superadmin` et `/admin/godmode` sont
conservés pour compatibilité documentaire et de navigation. Leur nom ne définit
pas un rôle distinct.

## 3. Pas de hiérarchie linéaire des rôles

Ne pas raisonner comme :

```txt
benevole < coordinateur < scientifique < entreprise < elu < admin < max
```

Cette hiérarchie est incorrecte.

Les rôles doivent représenter des responsabilités différentes :

```txt
Bénévole      → agit sur lui-même et ses contributions
Coordinateur  → organise les ressources dont il a la charge
Scientifique  → analyse des données adaptées à son besoin
Entreprise    → gère son organisation et ses partenariats
Élu           → supervise un territoire attribué
Admin         → modère la plateforme
Max           → administre et arbitre la plateforme
```

Un scientifique n'hérite pas des droits d'un coordinateur. Un élu n'hérite pas des droits d'un admin. Une entreprise ne gagne pas des droits sur les autres organisations.

## 4. Périmètres d'autorisation

Les capacités doivent être évaluées avec un périmètre explicite.

| Scope | Signification | Exemple |
|---|---|---|
| `public` | donnée ou action publique | lire la carte publique |
| `self` | compte courant | modifier ses préférences |
| `owned` | ressource créée ou possédée par l'utilisateur | modifier sa propre action |
| `organized` | ressource dont l'utilisateur est organisateur/coorganisateur | gérer les participants d'une action |
| `organization` | organisation à laquelle l'utilisateur est explicitement rattaché | gérer les actions de son entreprise |
| `territory` | territoire explicitement attribué | consulter un tableau de bord communal |
| `global_moderation` | ensemble des ressources modérables de la plateforme | masquer une action abusive |
| `platform` | administration structurante de la plateforme | gérer des rôles privilégiés |
| `service` | identité technique serveur | cron, migration, RPC privilégiée |

Une capacité à scope `organization` ou `territory` exige une relation canonique persistée et vérifiable côté serveur.

En l'absence de relation canonique exploitable, appliquer le **fail-closed** : ne pas élargir la permission au global pour compenser.

## 5. Relations de ressource

Les principales relations utilisables pour l'AuthZ sont :

```txt
owner
creator
organizer
coorganizer
participant
organization_member
territory_assignment
moderator
platform_admin
```

Une provenance n'est pas nécessairement une permission.

Exemple :

```txt
created_by
```

ne doit être utilisé comme ownership que si son contrat le définit explicitement.

Les IDs fournis par le client ne constituent jamais une preuve d'ownership, d'organisation ou de territoire.

## 6. Capacités métier canoniques

Les noms ci-dessous constituent le vocabulaire cible. Ils peuvent être implémentés par des helpers existants ou futurs sans imposer un moteur générique unique.

### Actions

```txt
actions.create
actions.view_public
actions.view_own
actions.edit_own
actions.manage_organized
actions.view_organization
actions.view_territory
actions.moderate_territory
actions.moderate_global
actions.edit_validated_impact
actions.view_moderation_audit
```

### Participations

```txt
participants.join_self
participants.cancel_self
participants.manage_organized
participants.admin_override
```

### Signalements et données terrain

```txt
signalements.create
signalements.view_own
signalements.edit_own
signalements.review_scoped
signalements.moderate_global
```

### Rapports et analyse

```txt
reports.view_personal
reports.view_organization
reports.view_territory
reports.view_global
reports.export_personal
reports.export_organization
reports.export_territory
reports.export_global
analytics.view_sanitized
analytics.export_sanitized
```

### Annuaire et partenaires

```txt
directory.view_public
directory.manage_own
directory.manage_organization
directory.review_global
partners.manage_requests
```

### Communauté

```txt
community.use
community.manage_own
community.moderate_global
```

### Administration

```txt
admin.view_backoffice
admin.run_operational_tools
admin.view_audit
roles.assign_self_service
roles.assign_privileged
platform.admin
```

Cette liste est un vocabulaire de conception. Ne pas créer des helpers inutilisés uniquement pour matérialiser chaque chaîne.

## 7. Matrice cible par rôle

### Bénévole

Capacités principales :

```txt
actions.create
actions.view_public
actions.view_own
actions.edit_own
participants.join_self
participants.cancel_self
signalements.create
signalements.view_own
signalements.edit_own
reports.view_personal
reports.export_personal
community.use
community.manage_own
directory.manage_own si une fiche personnelle existe
```

Contraintes :

- aucune modification d'une ressource d'un tiers sans relation explicite ;
- aucune modération globale ;
- aucune lecture de données privées globales ;
- aucune attribution de rôle privilégié.

### Coordinateur

Le coordinateur conserve les capacités normales d'un utilisateur sur ses propres ressources et reçoit des capacités d'organisation.

```txt
actions.manage_organized
participants.manage_organized
reports.view_organization si relation organisationnelle canonique
reports.export_organization si nécessaire au produit
directory.manage_organization si relation canonique
```

Contraintes :

- le scope est `organized` ou `organization` ;
- aucune action sur une autre organisation par simple rôle `coordinateur` ;
- aucune modération globale ;
- aucune dérogation admin implicite.

### Scientifique

Le scientifique est un rôle d'analyse, pas un rôle de modération.

Capacités cibles :

```txt
analytics.view_sanitized
analytics.export_sanitized
reports.view_global ou scoped uniquement sur projections autorisées
```

Les données doivent être agrégées, pseudonymisées ou minimisées selon le besoin scientifique réel.

Le rôle `scientifique` ne donne pas par défaut accès :

- aux emails ;
- aux identifiants Clerk bruts ;
- aux messages privés ;
- aux coordonnées personnelles inutiles ;
- aux fonctions de modération ;
- aux mutations de contributions d'autres utilisateurs.

### Entreprise

L'entreprise agit dans un périmètre organisationnel explicite.

Capacités cibles :

```txt
actions.view_organization
actions.manage_organized
reports.view_organization
reports.export_organization
directory.manage_organization
```

Contraintes :

- aucune visibilité privée sur une autre organisation ;
- aucun pouvoir de modération globale ;
- aucune donnée individuelle hors nécessité contractuelle ;
- la simple valeur du rôle ne remplace pas une relation d'organisation.

### Élu

L'élu est un rôle de pilotage territorial et décisionnel.

Capacités cibles :

```txt
actions.view_territory
reports.view_territory
reports.export_territory
```

Une future capacité :

```txt
actions.moderate_territory
```

n'est acceptable que lorsque le territoire de l'utilisateur et celui de la ressource sont représentés par un contrat canonique testé.

Le rôle `elu` ne doit pas, par défaut, donner :

```txt
actions.moderate_global
participants.admin_override
admin.view_backoffice
roles.assign_privileged
platform.admin
```

Tant que le scope territorial canonique n'existe pas pour une opération, le rôle `elu` ne doit pas recevoir un droit global de remplacement.

### Admin

L'admin est le rôle de modération et de supervision opérationnelle globale.

Capacités cibles :

```txt
actions.moderate_global
participants.admin_override
signalements.moderate_global
community.moderate_global
directory.review_global
partners.manage_requests
admin.view_backoffice
admin.run_operational_tools
admin.view_audit
```

Les opérations sensibles restent soumises aux garde-fous :

```txt
motif si requis
+ audit
+ before/after allowlisté
+ erreur bornée
+ targetUserId si pertinent
```

Un admin ne doit pas pouvoir attribuer `max` sauf contrat explicite distinct.

### Max

`max` est le rôle propriétaire de supervision et d'arbitrage final.

Il peut disposer des capacités d'administration de plateforme nécessaires :

```txt
admin.*
roles.assign_privileged
platform.admin
```

`max` ne remplace pas `service_role`.

Même `max` passe par les contrats métier, validations, audits et garde-fous applicables. Éviter les chemins spéciaux non testés de type « god mode » qui court-circuitent le domaine.

## 8. Permissions sur les données

Autoriser une fonctionnalité ne signifie pas autoriser tous les champs disponibles.

Définir la projection de données selon le besoin.

### Exemple scientifique

Préférer :

```txt
actionId
commune / zone non sensible
catégories de déchets
masses et quantités
dates utiles
indicateurs agrégés
qualité / provenance de mesure
```

à :

```txt
email
nom complet
Clerk ID
message privé
notes libres non nécessaires
coordonnées personnelles non nécessaires
```

### Exemple élu

```txt
vue territoriale agrégée
≠
accès global aux comptes individuels du territoire
```

### Niveaux de données

| Niveau | Usage |
|---|---|
| `public` | publication volontaire / surface publique |
| `owner_private` | suivi personnel |
| `scoped_operational` | organisation ou territoire explicitement autorisé |
| `sanitized_analytics` | analyse sans PII inutile |
| `privileged_admin` | modération/support avec minimisation |
| `security_audit` | audit sensible non public |

Le DTO serveur doit être borné au niveau nécessaire. Ne pas charger un objet complet pour ensuite masquer quelques champs dans le client.

## 9. Garde-fous par niveau de risque

### Risque faible

Exemples : lecture publique, modification de préférence personnelle.

```txt
AuthN si nécessaire
+ validation d'entrée
```

### Risque moyen

Exemples : gérer une action organisée, exporter un rapport d'organisation.

```txt
AuthN
+ capacité
+ scope/ownership
+ état métier
```

### Risque élevé

Exemples : masquer une action, rejeter une participation, corriger un impact validé.

```txt
AuthN
+ capacité privilégiée
+ cible
+ état métier
+ motif lorsque pertinent
+ audit success/error
```

### Risque critique

Exemples : attribuer un rôle privilégié, opération de plateforme à large impact.

```txt
rôle très restreint
+ capacité explicite
+ validation renforcée
+ audit obligatoire
+ absence de fallback permissif
```

## 10. Règles d'implémentation serveur

Préférer des helpers de capacité orientés domaine :

```txt
canManageAction(identity, action, organizerIds)
canModerateAction(identity, action, scope)
canReviewActionParticipants(identity, action, organizerIds)
canViewReport(identity, reportScope)
canManagePartner(identity, partnerScope)
canAssignRole(identity, targetRole)
```

Éviter dans les handlers :

```ts
if (role === "elu") { ... }
if (role === "admin") { ... }
```

lorsqu'une décision de capacité plus précise existe.

Ne pas construire un « moteur de permissions » générique avant d'avoir des contrats métier concrets. Les helpers peuvent rester distribués par domaine tant que le vocabulaire et les invariants convergent.

## 11. Frontière UI / serveur

L'UI peut :

- masquer une action impossible ;
- adapter la navigation au parcours ;
- expliquer pourquoi une capacité n'est pas disponible.

L'UI ne peut jamais être l'autorité d'autorisation.

Toute opération sensible doit être revérifiée dans le handler ou le service serveur.

```txt
navigation par rôle
≠
autorisation serveur
```

Le registre des rubriques sert à l'expérience produit. Il ne remplace pas les helpers AuthZ.

## 12. Supabase et RLS

L'AuthZ applicative et RLS doivent défendre la même frontière lorsque la table est accessible avec un rôle utilisateur Supabase.

Règles :

- RLS reste active ;
- `service_role` reste serveur uniquement ;
- l'utilisation serveur de `service_role` ne constitue pas une autorisation utilisateur ;
- ownership, organisation ou territoire doivent être vérifiés avant toute restitution ;
- une RPC privilégiée a un contrat de rôle explicite ;
- ne jamais élargir une policy uniquement pour contourner une route mal autorisée.

## 13. Dérogations administratives

Une dérogation est une capacité distincte du parcours normal.

Un utilisateur privilégié qui suit le parcours normal ne doit pas obtenir automatiquement l'effet d'une dérogation.

Exemple :

```txt
admin rejoint normalement une action d'un tiers
→ parcours normal

admin ajoute explicitement un participant via commande de modération
→ admin override
→ motif si requis
→ audit
```

Les dérogations sont documentées dans :

```txt
documentation/security/authz-authn-regles.md
```

et leurs audits suivent le contrat transverse de journalisation administrative lorsqu'il existe.

## 14. Tests d'autorisation

Toute capacité sensible doit tester au minimum les identités pertinentes.

Selon le domaine :

```txt
anonymous
owner
non-owner
organizer
non-organizer
organization member
other organization
territory member
other territory
admin
max
service role si réellement nécessaire
```

Un test positif `max` ne suffit pas à prouver la sécurité d'une capacité.

Tester explicitement les refus de scope.

Exemple :

```txt
elu territoire A
→ ressource territoire A : autorisée si capacité territoriale implémentée
→ ressource territoire B : refusée
```

## 15. État actuel à surveiller pendant la convergence

Le code actuel contient encore des modèles qui ne décrivent pas tous la même frontière.

Exemples constatés sur `main` lors de la création de ce contrat :

- `apps/web/src/lib/domain-language.ts` réserve les droits admin génériques à `admin` et `max` ;
- `apps/web/src/lib/profiles.ts` considère également `admin` et `max` comme profils admin-like génériques ;
- `apps/web/src/lib/actions/permissions.ts` inclut actuellement `elu` dans `ACTION_MODERATION_ROLES`, ce qui lui confère des dérogations globales sur les actions.

Cette divergence ne doit pas être résolue en élargissant tous les autres domaines à `elu`.

La direction cible est :

```txt
admin/max → modération globale selon capacité
elu       → pilotage territorial, puis modération territoriale seulement si scope canonique
```

Jusqu'à convergence du code et des tests, toute modification touchant ces helpers doit relire le comportement réel avant de changer une permission.

## 16. Checklist de conception

Avant d'accorder une nouvelle permission :

```txt
□ Quel rôle métier en a besoin ?
□ Quelle capacité exacte est nécessaire ?
□ Quel scope minimal suffit ?
□ Quelle relation prouve ce scope ?
□ Quel état métier autorise l'opération ?
□ Quelles données sont réellement nécessaires ?
□ Une projection sanitizée suffit-elle ?
□ Le client peut-il falsifier un identifiant de scope ?
□ RLS doit-elle reproduire cette frontière ?
□ Un motif est-il nécessaire ?
□ Un audit est-il nécessaire ?
□ Les refus owner/non-owner ou scope A/scope B sont-ils testés ?
```

## 17. Références

```txt
apps/web/src/lib/domain-language.ts
apps/web/src/lib/profiles.ts
apps/web/src/lib/authz.ts
apps/web/src/lib/actions/permissions.ts
documentation/security/authz-authn-regles.md
documentation/architecture/adr/ADR-007-capability-scoped-authorization.md
```
