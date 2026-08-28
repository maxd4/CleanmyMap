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

Règle de vocabulaire : **IMU = super-admin = rôle interne `max`**. `max` est
l'identifiant technique canonique, `IMU` le libellé produit et `super-admin` un
alias entrant ; les trois termes ont strictement les mêmes permissions.

## 1. Glossaire Technique

| Terme | Définition |
| :--- | :--- |
| **Role** | Attribution métier technique (`admin`, `benevole`, etc.) qui contribue à la décision sans suffire à elle seule. |
| **SessionRole** | État d'authentification de la session en cours (inclut `anonymous`). |
| **Parcours** | (ou **Profile**) Projection UX du rôle (priorité des menus, CTAs, dashboard). |
| **Espace** | Groupe de navigation transverse (`execute`, `supervise`, `decide`, `prepare`). |
| **Capability** | Opération métier autorisable. |
| **Scope** | Périmètre dans lequel une capacité peut s'exercer. |
| **EffectiveAccess** | Décision serveur issue de l'identité, de la capacité, du rôle compatible, du scope ou ownership et de l'état métier. |

## 2. Repères d'accès (`EffectiveAccess`)

La matrice cible des capacités, rôles et scopes se trouve dans
[`authorization-capabilities.md`](./authorization-capabilities.md). La valeur
de `Role` seule ne constitue pas une permission.

| Surface | Contrat de décision |
| :--- | :--- |
| Accès app protégée | AuthN puis parcours UX adapté |
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

## 3. Parcours Utilisateur (UX)

Chaque rôle est associé à un **Parcours** (ou Profil) qui définit ce que l'utilisateur voit en priorité. La configuration complète est dans `apps/web/src/lib/profiles.ts`.

- **Parcours Administrateur** : Priorité à la supervision (`supervise`) et à la modération.
- **Parcours Elu** : Priorité à la décision (`decide`) et aux rapports institutionnels.
- **Parcours Coordinateur** : Priorité à l'organisation communautaire.
- **Parcours Bénévole** : Priorité à l'action terrain (`execute`).

## 4. Implémentation dans le Code

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
Utiliser le hook de session ou les fonctions de `lib/authz` si nécessaire.

### Redirection et Gardes
Les pages de profil (`/profil/[role]`) sont protégées par des gardes serveur pour éviter qu'un utilisateur n'accède à une vue ne correspondant pas à son rôle effectif (ex: un bénévole voyant le parcours admin).

---
*Dernière mise à jour : Avril 2026*
