# Système d'Autorisation et Parcours Utilisateurs (AUTHZ)

Ce document décrit la structure des droits d'accès et de l'expérience utilisateur (UX) sur la plateforme CleanMyMap. Il sert de guide de référence pour les développeurs et les agents IA.

## 1. Glossaire Technique

| Terme | Définition |
| :--- | :--- |
| **Role** | Attribution métier technique (`admin`, `benevole`, etc.) définissant les droits. |
| **SessionRole** | État d'authentification de la session en cours (inclut `anonymous`). |
| **Parcours** | (ou **Profile**) Projection UX du rôle (priorité des menus, CTAs, dashboard). |
| **Espace** | Groupe de navigation transverse (`execute`, `supervise`, `decide`, `prepare`). |
| **EffectiveAccess** | Droits réels (booléens) calculés à partir du rôle pour autoriser une action. |

## 2. Matrice des Rôles et Droits (`EffectiveAccess`)

La source de vérité pour ce mapping se trouve dans `apps/web/src/lib/domain-language.ts`.

| Droit / Permission | anonymous | benevole | coordinateur / scientifique / elu | admin / elu / max |
| :--- | :---: | :---: | :---: | :---: |
| Accès App Protégée | ❌ | ✅ | ✅ | ✅ |
| Accès Page Admin | ❌ | ❌ | ❌ | ✅ |
| Modération | ❌ | ❌ | ❌ | ✅ |
| Imports sensibles | ❌ | ❌ | ❌ | ✅ |
| Export Elus Dossier | ❌ | ✅ | ✅ | ✅ |

Note : Certains droits sont plus granulaires et vérifiés directement dans les APIs via `requireAdminAccess` ou les helpers centraux de permissions comme `canUseAdminOverride`, `canManageAction` et `canReviewActionParticipants`.

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

Règle de lecture:

- parcours normal: créer, rejoindre, modérer selon le rôle métier et la propriété de l'action;
- dérogation admin: explicite, serveur, journalisée, réservée aux rôles `admin`, `elu` et `max`;
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
- le journal d'audit d'une action est lisible par le créateur, les organisateurs/coorganisateurs autorisés et les rôles `admin`, `elu`, `max`;
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
