# Données, risques et mise en œuvre

> Module associé à [authorization-capabilities.md](./authorization-capabilities.md). Statut : PLAN / TARGET.

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

La bibliothèque communautaire des rapports relève de `public` uniquement après
une mutation volontaire du propriétaire. `report_generation_publications` est
server-only : l'ownership, l'admissibilité de la projection et l'artefact PDF
exact sont contrôlés avant publication, et chaque lecture publique revérifie
la publication active avant de relire le bucket privé. Une révocation bloque
les nouveaux accès CleanMyMap ; elle ne révoque pas des octets déjà téléchargés.

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
- `apps/web/src/lib/actions/permissions.ts` réserve désormais les capacités globales Actions à `admin` et `max`; `elu` n'y dispose pas d'un passe-droit global.

Cette frontière ne doit pas être résolue en élargissant les autres domaines à
`elu`, ni en inventant une modération territoriale avant que son scope soit
vérifiable.

L'état runtime est :

```txt
admin/max → modération globale selon capacité explicitement consommée
elu       → scope territorial seulement lorsque la capacité territoriale est implémentée
```

Toute modification touchant ces helpers doit préserver cette séparation et
relire le comportement réel avant de changer une permission.
