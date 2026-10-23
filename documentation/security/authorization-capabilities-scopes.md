# Rôles, scopes et ownership

> Module associé à [authorization-capabilities.md](./authorization-capabilities.md). Statut : PLAN / TARGET.

## 2. Vocabulaire canonique

### Niveau obtenu et rôle actif

Le contrat d'identité est volontairement non linéaire :

```txt
GRANTED_ROLE = identity.role       // privilège maximal obtenu, immuable par le menu
ACTIVE_ROLE  = identity.activeRole // rôle courant, source des capacités effectives
```

Les rôles librement sélectionnables sont `benevole`, `coordinateur`,
`scientifique` et `entreprise`. Les niveaux obtenus `elu`, `admin` et `max`
ouvrent respectivement les ensembles suivants :

| GRANTED_ROLE | ACTIVE_ROLE autorisés |
|---|---|
| standard / rôle ouvert | les quatre rôles ouverts |
| `elu` | rôles ouverts + `elu` |
| `admin` | rôles ouverts + `admin` |
| `max` | rôles ouverts + `elu` + `admin` + `max` |

Les capacités privilégiées sont calculées sur `ACTIVE_ROLE`. Ainsi un compte
`admin` actuellement `benevole` n'a aucune capacité admin/élu pendant cette
session, mais conserve `GRANTED_ROLE=admin` et peut réactiver `admin`. Le champ
UX historique `activeProfile` est un alias de lecture/migration et ne donne
aucun droit.

Cette matrice interdit `GRANTED_ROLE=elu → ACTIVE_ROLE=admin` et
`GRANTED_ROLE=admin → ACTIVE_ROLE=elu`. Il ne s'agit pas d'une relation
d'héritage entre les rôles. Un compte `elu` conserve uniquement ses capacités
élu ; seuls `admin` et `max` peuvent activer `admin`, sans modifier
`GRANTED_ROLE`.

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

### Quatre notions canoniques

Le contrat cible conserve quatre notions distinctes :

```txt
GRANTED_ROLE
= rôle obtenu par le compte

ACTIVE_ROLE
= persona métier actif utilisé pour les capacités effectives

organisation / structure
= entité externe éventuellement reliée à l'utilisateur par une relation persistée

parcours UX
= navigation, CTA, libellés et priorités d'interface
```

Ainsi, `coordinateur` représente une personne ou une fonction qui organise
des actions ; il n'est pas techniquement équivalent à une association.
`entreprise` est le parcours d'un représentant et son rôle seul ne prouve
aucune appartenance organisationnelle. `elu` représente le décideur public et
ne vaut ni collectivité ni attribution territoriale. `scientifique` reste un
parcours d'analyse orienté vers des projections publiques ou sanitizées. Les
scopes `organization` et `territory` exigent chacun leur relation canonique.
La navigation et ses CTA ne constituent jamais l'autorité AuthZ.

### Identité canonique du rôle IMU

La règle de nommage est : **IMU = super-admin = rôle interne `max`**.

- `max` est l'identifiant technique canonique utilisé par le code et les
  données ;
- `IMU` est l'appellation produit officielle affichée dans l'interface ;
- `super-admin`, `super_admin` et `superadmin` sont des alias entrants
  acceptés et normalisés vers `max` ;
- ces trois termes désignent strictement le même rôle et ne créent aucune
  différence de permissions ;
- `owner`, `godmode` et `creator` restent uniquement des alias de
  compatibilité lorsqu'une donnée legacy les fournit, jamais des rôles ou des
  libellés canoniques.

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
Coordinateur  → personne/fonction qui organise des actions
Scientifique  → analyse des données adaptées à son besoin
Entreprise    → représentant ; organisation seulement avec relation canonique
Élu           → décideur public ; territoire seulement avec attribution canonique
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

Une capacité à scope `organization` ou `territory` exige une relation canonique persistée et vérifiable côté serveur. Le simple rôle `entreprise` ou `elu` ne suffit pas.

En l'absence de relation canonique exploitable, appliquer le **fail-closed** : ne pas élargir la permission au global pour compenser.

### Surface métier `/pilotage`

Le rôle et le scope sont deux dimensions distinctes. Le contrat de la surface
`/pilotage` est :

| ACTIVE_ROLE | Scope métier | État |
|---|---|---|
| `coordinateur` | actions organisées par relation canonique `creator`, `organizer` ou `coorganizer` | courant |
| `elu` | territoire attribué canoniquement | `TARGET / NOT_IMPLEMENTED` |
| `admin` | supervision et modération globale via `/admin` | pas de pilotage métier |
| `max` | administration de plateforme ; rôle métier à activer explicitement pour piloter | pas de pilotage implicite |

Pour un coordinateur, l'overview, les KPI, comparaisons, zones et priorités
sont calculés uniquement sur ce corpus autorisé. Une relation absente produit
un état vide. Les paramètres fournis par le client ne peuvent ni choisir un
autre utilisateur, ni élargir le scope. Les indicateurs publics restent dans
les surfaces publiques ou Reports prévues à cet effet.

Le scope `organization` pour un couple `coordinateur`/`entreprise` et une
adhésion organisationnelle canonique est une cible future distincte du scope
`organized`. Tant que cette relation n'est pas disponible dans le runtime, son
absence ne donne aucun droit d'organisation générale.

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
