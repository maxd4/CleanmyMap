# Système d'Autorisation et Parcours Utilisateurs (AUTHZ)

Ce document décrit la structure des droits d'accès et de l'expérience utilisateur (UX) sur la plateforme CleanMyMap. Il sert de guide de référence pour les développeurs et les agents IA.

Le contrat canonique d'autorisation est défini dans
[`authorization-capabilities.md`](./authorization-capabilities.md). Ce fichier
reste un guide compact de compatibilité pour les surfaces et helpers existants
et ne doit pas maintenir une seconde matrice de permissions.

Règle de visibilité : une page est publique par défaut lorsque les données
exposées sont `public-safe`; l'interaction est ensuite protégée au niveau
approprié selon la classification canonique. Une page publique peut donc
présenter un CTA qui demande une connexion au moment où l'action nécessite une
identité, une donnée privée ou une mutation.

Pour la Communauté, cette règle s'applique à `/sections/community` et à
`GET /api/community/events` : la liste, les compteurs RSVP publics et les
données d'événement `public-safe` sont lisibles sans session. Le contexte Clerk
reste optionnel pour enrichir la réponse connectée avec le seul
`myRsvpStatus` de l'utilisateur courant ; il vaut `null` pour un anonyme. Les
créations d'événement et les RSVP restent des mutations authentifiées et ne
doivent pas être ouvertes par le GET public.

Les réponses anonymes et personnalisées utilisent des clés et des tags de
cache distincts. Une réponse contenant un état RSVP personnel est privée et ne
doit jamais être servie par un cache partagé ; la lecture anonyme ne contient
aucune donnée Clerk privée.

Règle de vocabulaire : **IMU = super-admin = rôle interne `max`**. `max` est
l'identifiant technique canonique, `IMU` le libellé produit et `super-admin` un
alias entrant ; les trois termes ont strictement les mêmes permissions.

## 1. Glossaire Technique

Règle de vocabulaire : **IMU = rôle interne `max`**. Le rôle `max` est accordé
uniquement par l'identité Clerk immuable présente dans `CLERK_MAX_USER_IDS` ou
par une metadata serveur canonique `role=max`. Le rôle `admin` provient de
`CLERK_ADMIN_USER_IDS` ou d'une metadata serveur canonique `role=admin`.
Les adresses email primaire et secondaire sont des attributs de contact et de
connexion mutables ; elles ne sont jamais une source d'AuthZ. `CREATOR_INBOX_EMAIL`
reste réservé au contact et aux notifications internes. `activeRole`,
`activeProfile` et la ligne Supabase `profiles.role_label` ne peuvent jamais
accorder un privilège.

Les alias historiques (`owner`, `godmode`, `creator`, `super_admin`, etc.) sont
acceptés seulement comme valeurs d'entrée legacy et sont ignorés pour
l'autorisation IMU lorsqu'ils ne correspondent pas à l'identité propriétaire.
Le bypass `dev-max` est une identité synthétique réservée à `NODE_ENV=development`
sur `localhost`, `127.0.0.1` ou `[::1]`; il ne peut pas fonctionner sur Preview,
Production ou un hôte distant. `dev-admin` couvre le test admin sans utiliser
l'identité IMU.

## Attribution des rôles privilégiés

`elu` et `admin` sont des niveaux obtenus (`GRANTED_ROLE`), jamais des rôles
self-service. Les rôles ouverts ne contiennent que `benevole`, `coordinateur`,
`scientifique` et `entreprise`; `activeRole` ne peut jamais augmenter le rôle
obtenu.

Les seuls parcours d'attribution sont :

- une demande authentifiée `elu` ou `admin`, créée avec le statut
  `pending_owner_review` et sans nouveau droit;
- une décision de l'IMU actif pour accepter/refuser la demande, ou attribuer/
  révoquer directement `elu` ou `admin` dans `/api/admin/role-accounts`.

Les deux décisions synchronisent Clerk vers Supabase et sont auditées. La
surface directe exige `ACTIVE_ROLE=max`; un `admin` ou un `elu` ne peut donc pas
attribuer ces rôles. Aucune route ne peut attribuer `max`. `CLERK_ADMIN_USER_IDS`
reste une source canonique de résolution du rôle `admin`, tandis que les
écritures Clerk `role`/`profile` sont limitées à ces parcours.
### GRANTED_ROLE et ACTIVE_ROLE

L'identité serveur expose deux niveaux distincts :

| Champ | Contrat |
| :--- | :--- |
| `identity.role` (**GRANTED_ROLE**) | niveau réellement obtenu (`benevole`, `coordinateur`, `scientifique`, `entreprise`, `elu`, `admin` ou `max`). Il ne peut pas être modifié par le menu utilisateur. |
| `identity.activeRole` (**ACTIVE_ROLE**) | rôle actuellement utilisé ; il détermine les capacités effectives de la requête. |
| `identity.activeProfile` | alias de compatibilité pour l'UX ; il ne constitue jamais une source d'AuthZ. |

Les rôles ouverts sont `benevole`, `coordinateur`, `scientifique` et
`entreprise`. Un compte `elu` peut activer ces rôles ou `elu`, un compte
`admin` peut aussi activer `admin`, et seul un compte `max` peut activer `max`.
Un changement d'`ACTIVE_ROLE` ne change jamais le `GRANTED_ROLE` ; un retour
vers le rôle obtenu reste possible via le même contrat.

Les capacités serveur doivent toujours être calculées depuis
`activeRole`/`EffectiveAccess`, jamais depuis le rôle obtenu seul. La route
`/api/account/active-profile` conserve son nom historique mais ne persiste que
`publicMetadata.activeRole`. Elle ne peut ni attribuer ni élever un rôle.

| **Role / GRANTED_ROLE** | Niveau métier réellement obtenu et autorité d'attribution ; il ne doit pas être confondu avec le rôle actif. |
| **ACTIVE_ROLE** | Rôle sélectionné pour la session UX et la décision des capacités effectives. |
| **Parcours** | (ou **Profile**) Projection UX de l'`ACTIVE_ROLE` (priorité des menus, CTAs, dashboard). |
| **EffectiveAccess** | Décision serveur issue de l'identité, de la capacité, du rôle compatible, du scope ou ownership et de l'état métier. |
## 2. Repères d'accès (`EffectiveAccess`)
| Accès app protégée | AuthN puis parcours UX adapté |
## 3. Parcours Utilisateur (UX)
Chaque rôle est associé à un **Parcours** (ou Profil) qui définit ce que l'utilisateur voit en priorité. La configuration complète est dans `apps/web/src/lib/profiles.ts`.
## 4. Implémentation dans le Code
Utiliser le hook de session ou les fonctions de `lib/authz` si nécessaire.
Les pages de profil (`/profil/[role]`) sont protégées par des gardes serveur pour éviter qu'un utilisateur n'accède à une vue ne correspondant pas à son rôle effectif (ex: un bénévole voyant le parcours admin).
*Dernière mise à jour : Avril 2026*
| Terme | Définition |
| :--- | :--- |
| **Role** | Attribution métier technique (`admin`, `benevole`, etc.) utilisée par le serveur pour les permissions réelles. |
| **SessionRole** | État d'authentification de la session en cours (inclut `anonymous`). |
| **AppProfile** | Persona UX sélectionnable pour la navigation, les priorités de menus, les CTAs et les libellés. |
| **activeProfile** | Valeur persistée de l'`AppProfile` courant ; elle ne constitue jamais une preuve d'autorisation. |
| **Espace** | Groupe de navigation transverse (`execute`, `supervise`, `decide`, `prepare`). |
| **Capability** | Opération métier autorisable. |
| **Scope** | Périmètre dans lequel une capacité peut s'exercer. |
| **EffectiveAccess** | Décision serveur issue de l'identité, de la capacité, du `role` compatible, du scope ou ownership et de l'état métier. |

## 2. Contrat `role` / `activeProfile`

L'identité utilisateur expose deux valeurs indépendantes :

```ts
role: Role                 // permissions réelles, décidées côté serveur
activeProfile: AppProfile  // persona et navigation UX
```

Le changement de profil ne change jamais `role`. Les gardes
`requireAdminAccess`, `requireCreatorAccess`, `EffectiveAccess` et les APIs
sensibles doivent lire uniquement `role`. La navigation, les CTA, les
libellés et les priorités d'espace lisent uniquement `activeProfile`.

À la lecture de l'identité, `activeProfile` est accepté seulement s'il est
valide et présent dans `getSwitchableProfiles(role)`. En cas de valeur absente,
invalide ou incompatible, le fallback fail-closed est :

```txt
activeProfile = role
```

Les rôles privilégiés restent donc privilégiés même lorsque leur persona UX
est `benevole`, `scientifique` ou une autre vue autorisée. Inversement, une
persona UX ne peut jamais promouvoir un compte.

La seule mutation UX est `POST /api/account/active-profile` :

- session authentifiée obligatoire ;
- cible validée avec `getSwitchableProfiles(role)` ;
- écriture Clerk limitée à `activeProfile`, en préservant les autres métadonnées ;
- `role` jamais fourni ni réécrit par cette route ;
- synchronisation Clerk → Supabase après l'écriture ;
- refus `403` pour une cible non autorisée, par exemple `admin → max`.

L'ancienne route `/api/account/profile-role` est retirée comme sélecteur UX et
ne doit plus être appelée par l'interface. Elle répond `410` aux sessions
authentifiées afin d'éviter qu'un ancien client ne modifie le rôle par erreur.

## 3. Repères d'accès (`EffectiveAccess`)

La matrice cible des capacités, rôles et scopes se trouve dans
[`authorization-capabilities.md`](./authorization-capabilities.md). La valeur
de `Role` seule ne constitue pas une permission.

| Surface | Contrat de décision |
| :--- | :--- |
| Accès app protégée | AuthN puis parcours UX adapté ; les permissions restent fondées sur `role` |
| Accès backoffice | capacité `admin.view_backoffice` et contrôle serveur |
| Modération globale | capacité de modération, scope global et état métier |
| Imports sensibles | capacité opérationnelle dédiée et garde-fous de données |
| Export territorial | capacité d'export et relation territoriale canonique |

Les droits effectifs sont vérifiés directement dans les APIs via les helpers
de domaine, par exemple `canUseAdminOverride`, `canManageAction` et
`canReviewActionParticipants`. Le proxy et le parcours UX ne remplacent pas
cette décision serveur.

Le proxy n'est pas l'autorité finale d'autorisation : toute API ou tout service
serveur doit revérifier l'identité, la capacité, l'ownership ou le scope et
l'état métier. La classification détaillée des surfaces (`public_read`,
`authenticated_write`, `private_read`, `privileged` et
`public_write_exception`) est maintenue uniquement dans
[`authorization-capabilities.md`](./authorization-capabilities.md).

## 4. Parcours Utilisateur (UX)

Chaque compte possède un `activeProfile` qui définit ce que l'utilisateur voit
en priorité. La configuration complète est dans
`apps/web/src/lib/profiles.ts`. `role` détermine les profils commutables ; il
ne doit pas être recalculé à partir de `activeProfile`.

- **Parcours Administrateur** : Priorité à la supervision (`supervise`) et à la modération.
- **Parcours Elu** : Priorité à la décision (`decide`) et aux rapports institutionnels.
- **Parcours Coordinateur** : Priorité à l'organisation communautaire.
- **Parcours Bénévole** : Priorité à l'action terrain (`execute`).

## 5. Implémentation dans le Code

### Côté Serveur (Actions API / Routes)
Utiliser `requireAdminAccess()` pour les surfaces strictement admin.
```typescript
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }
  // Logique admin ici...
}
```

Pour les routes d'action, préférer les helpers métier centralisés:

- `canAutoApproveOwnAction`
- `canManageAction`
- `canReviewActionParticipants`
- `canUseAdminOverride`
- `canModerateAnyAction`
- `canChangeActionStatus`
- `canViewModerationAudit`

Règle de lecture :

- parcours normal: créer, rejoindre, modérer selon le rôle métier et la propriété de l'action;
- dérogation administrative : explicite, serveur, journalisée et autorisée par une capacité avec le scope requis ;
- le domaine Actions contient encore une divergence connue : certaines capacités de modération globale acceptent actuellement `elu` ; cela ne constitue pas une règle `admin-like` transversale et ne doit pas être propagé aux autres domaines ;
- un admin qui rejoint via le flux normal reste traité comme une demande normale `group_form`.
- un organisateur ou coorganisateur autorisé peut gérer la file de sa propre action sans devenir modérateur global;
- une pré-action ouverte au groupe reste une action prévue, pas une collecte validée ni une preuve d'impact.

Règle de visibilité:

- le masquage de modération utilise `moderation_visibility`, séparé du statut de publication;
- une action masquée est exclue des listes publiques, de la carte et de la page Formulaire de groupe;
- la restauration de visibilité ne valide pas automatiquement l'action et ne contourne pas le statut métier.

Règle d'audit:

- les opérations sensibles passent par le journal d'audit admin existant;
- `appendActionModerationAudit(...)` centralise le contrat d'audit action avec auteur, action cible, opération, issue, motif obligatoire si sensible, valeurs avant/après et cible utilisateur éventuelle;
- les nouvelles dérogations de participation utilisent `participation_source = admin_override`; `admin` reste une valeur historique acceptée en lecture;
- un retrait admin d'un participant confirmé est journalisé comme `admin_remove_participant`, distinct d'un refus de demande en attente;
- le journal d'audit d'une action est lisible selon une capacité de lecture d'audit dédiée, avec minimisation des données ; les accès historiques doivent être réalignés lors de la convergence ;
- les motifs sensibles doivent contenir au moins 5 caractères après trim;
- les détails techniques libres ne doivent pas écraser les champs canoniques d'audit.

Limites actuelles:

- `change_organizer` n'a pas encore de commande produit dédiée; ne pas l'implémenter via une édition silencieuse des coorganisateurs;
- `reopen_action` n'est pas modélisé tant qu'aucun statut de clôture réel n'existe.

### Côté Client (Composants React)

Utiliser `identity.role` pour afficher les badges de rôle et respecter les
limites d'accès serveur. Utiliser `identity.activeProfile` pour la navigation,
les CTA et les libellés. `AccountIdentityChip` doit appeler
`/api/account/active-profile`, jamais `/api/account/profile-role`.

### Redirection et Gardes
Les pages de profil (`/profil/[profile]`) utilisent `activeProfile` pour la vue
UX et contrôlent côté serveur que la cible reste dans les profils commutables
du `role` réel. Une vue UX `admin` ne confère donc pas les permissions admin à
un bénévole ; de même, un compte `admin` ou `max` conserve son `role` lorsqu'il
choisit une vue UX moins privilégiée.

Tests minimaux à maintenir :

- `max` change de profil et reste `role=max` ;
- `admin` change de profil et reste `role=admin` ;
- `admin → activeProfile=max` est refusé ;
- une tentative bénévole de modifier `role` est refusée ;
- onboarding et refresh préservent les rôles privilégiés ;
- une valeur `activeProfile` absente ou invalide retombe sur `role`.

---
*Dernière mise à jour : Septembre 2026*
### GRANTED_ROLE et ACTIVE_ROLE

L'identité serveur expose deux niveaux distincts :

| Champ | Contrat |
| :--- | :--- |
| `identity.role` (**GRANTED_ROLE**) | niveau réellement obtenu (`benevole`, `coordinateur`, `scientifique`, `entreprise`, `elu`, `admin` ou `max`). Il ne peut pas être modifié par le menu utilisateur. |
| `identity.activeRole` (**ACTIVE_ROLE**) | rôle actuellement utilisé ; il détermine les capacités effectives de la requête. |
| `identity.activeProfile` | alias de compatibilité pour l'UX ; il ne constitue jamais une source d'AuthZ. |

Les rôles ouverts sont `benevole`, `coordinateur`, `scientifique` et
`entreprise`. Un compte `elu` peut activer ces rôles ou `elu`, un compte
`admin` peut aussi activer `admin`, et seul un compte `max` peut activer `max`.
Un changement d'`ACTIVE_ROLE` ne change jamais le `GRANTED_ROLE` ; un retour
vers le rôle obtenu reste possible via le même contrat.

Les capacités serveur doivent toujours être calculées depuis
`activeRole`/`EffectiveAccess`, jamais depuis le rôle obtenu seul. La route
`/api/account/active-profile` conserve son nom historique mais ne persiste que
`publicMetadata.activeRole`. Elle ne peut ni attribuer ni élever un rôle.

