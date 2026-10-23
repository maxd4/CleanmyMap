# Matrice cible des rôles

> Module associé à [authorization-capabilities.md](./authorization-capabilities.md). Statut : PLAN / TARGET.

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

> **`PLAN / TARGET` uniquement — non implémenté dans le runtime courant.**
> Cette section décrit des capacités potentielles à arbitrer ; elle ne modifie
> pas `EffectiveAccess` et ne constitue pas une autorisation accordée par le
> parcours UX `scientifique`.

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

> **`PLAN / TARGET` uniquement — non implémenté dans le runtime courant.**
> Cette section décrit des capacités potentielles à arbitrer ; elle ne modifie
> pas `EffectiveAccess` et le rôle seul ne constitue jamais une appartenance
> organisationnelle.

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

#### Chantier futur — Modération territoriale des actions par les élus

Une future capacité, explicitement `PLAN / TARGET` et **NON IMPLÉMENTÉE** :

```txt
actions.moderate_territory
```

Cette capacité ne constitue actuellement aucune permission runtime. Elle ne
pourra être introduite que sous le contrat fail-closed suivant :

```txt
ACTIVE_ROLE=elu
+ capability=actions.moderate_territory
+ territory_assignment canonique et non ambigu de l'élu
+ territoire canonique et non ambigu de l'action
+ correspondance vérifiée côté serveur
+ opération explicitement autorisée par le contrat
→ permission
```

Un élu affecté au territoire A doit être refusé sur une action appartenant
uniquement au territoire B. Le rôle actif et la capacité seuls ne remplacent
jamais la relation territoriale vérifiée.

L'absence de scope est toujours un refus :

```txt
territoire élu absent ou ambigu
OU territoire action absent ou ambigu
OU relation impossible à vérifier
→ refus
```

Aucun fallback vers la modération globale n'est acceptable.

#### Prérequis bloquants avant implémentation

Le chantier ne pourra commencer que lorsque les éléments suivants existeront
de manière canonique et testée :

1. l'attribution territoriale persistée de l'élu ;
2. le territoire canonique des actions ;
3. une résolution serveur fiable de l'appartenance d'une action à un
   territoire ;
4. la distinction éventuelle entre commune, arrondissement, département ou
   autre périmètre réellement retenu ;
5. la définition précise des opérations accessibles à un élu ;
6. l'audit des opérations territoriales sensibles ;
7. les tests `territoire A / territoire B / territoire absent / territoire
   ambigu`.

#### Décisions séparées restant à arbitrer

La capacité territoriale ne décide pas automatiquement que l'élu pourra :

- approuver ou rejeter une action ;
- masquer ou restaurer une action ;
- intervenir sur les participants ;
- corriger un impact validé ;
- modifier un organisateur ;
- lire l'audit administratif complet.

Chacune de ces opérations devra faire l'objet d'une décision de périmètre,
de garde-fous et d'audit lors du futur chantier. `actions.moderate_territory`
ne doit jamais devenir un nouvel `admin override` générique.

La bascule de rôle reste distincte du futur scope territorial :

```txt
GRANTED_ROLE=elu + ACTIVE_ROLE=elu
→ future capacité territoriale seulement, lorsqu'elle sera implémentée

GRANTED_ROLE=elu + ACTIVE_ROLE=admin
→ refus : cette combinaison n'est pas commutable
```

La sélection de `ACTIVE_ROLE=admin` ne définit pas le contrat territorial et
ne doit pas servir à le contourner.

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

### Attribution des rôles obtenus

`elu` et `admin` sont des `GRANTED_ROLE` obtenus; ils ne figurent pas dans les
rôles ouverts et ne sont jamais modifiables par le menu utilisateur. Les deux
seuls parcours applicatifs sont :

1. une demande authentifiée `elu` ou `admin`, enregistrée avec le statut
   `pending_owner_review` et sans changement de droits;
2. une décision de l'IMU actif, qui accepte/refuse la demande ou attribue/
   révoque directement `elu` ou `admin` via `/api/admin/role-accounts`.

Chaque acceptation ou attribution directe met à jour Clerk, synchronise la
projection `profiles.role_label` de Supabase et écrit un audit. La projection
`profiles.role_label` porte le `GRANTED_ROLE`; la projection serveur
`profiles.active_role_label`, alimentée par le même sync Clerk, porte
`ACTIVE_ROLE` pour l'audit et les consommateurs métier, mais ne porte pas une
décision RLS privilégiée et ne peut pas être écrite par un client.
Le décideur doit être authentifié, être l'identifiant exact de
`CLERK_IMU_OWNER_USER_ID`, et présenter `GRANTED_ROLE=max` et
`ACTIVE_ROLE=max`. `publicMetadata.role` est la seule attribution Clerk ; les
métadonnées privées, `profile`, `unsafeMetadata`, alias, emails, anciennes
allowlists et projections Supabase ne peuvent pas accorder un rôle privilégié.
Une synchronisation échouée est une divergence à reprendre et auditer, pas un
succès convergent.

### Projection Supabase et révocation

`profiles.role_label` et `profiles.active_role_label` sont des projections
serveur de Clerk, jamais des sources d'attribution. Une policy ou fonction SQL
ne doit jamais transformer une valeur ancienne en droit durable : après une
révocation Clerk, une projection non convergente doit rester sans effet sur la
capacité privilégiée. Les clients ne peuvent pas écrire ces colonnes et les
helpers SQL qui les lisent sont serveur seulement.

La RLS directe retire donc les branches globales de rôle du canal `admin_elu`
et des discussions d'action. Les accès directs restent bornés par la session
et par une relation métier vérifiée (propriété, organisation, inscription,
participation ou membre de conversation). Pour une capacité `admin`, `elu` ou
`max`, la frontière serveur doit vérifier auprès de Clerk le `GRANTED_ROLE`,
le `ACTIVE_ROLE`, la capacité demandée et le périmètre avant de lire ou muter
avec `service_role`. Une indisponibilité Clerk, une session absente ou
expirée, ou une autorisation non établie est un refus ; `service_role` ne vaut
jamais autorisation utilisateur. Aucun TTL sur
`role_projection_synced_at` ne remplace cette vérification.

L'audit opérationnel doit relever, pour chaque compte privilégié, le rôle
Clerk attendu, `role_label`, `active_role_label`, la source de projection et
son horodatage de synchronisation. Tant que l'écart n'est pas résorbé, ne pas
présenter l'opération comme convergente. La preuve réelle des policies,
fonctions et triggers PostgreSQL reste distincte des tests unitaires et doit
être classée `DB_SEMANTICS_NOT_EXECUTED` si aucun environnement autorisé n'est
disponible.
