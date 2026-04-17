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

| Droit / Permission | anonymous | benevole | coordinateur / scientifique / elu | admin |
| :--- | :---: | :---: | :---: | :---: |
| Accès App Protégée | ❌ | ✅ | ✅ | ✅ |
| Accès Page Admin | ❌ | ❌ | ❌ | ✅ |
| Modération | ❌ | ❌ | ❌ | ✅ |
| Imports sensibles | ❌ | ❌ | ❌ | ✅ |
| Export Elus Dossier | ❌ | ✅ | ✅ | ✅ |

Note : Certains droits sont plus granulaires et vérifiés directement dans les APIs via `requireAdminAccess`.

## 3. Parcours Utilisateur (UX)

Chaque rôle est associé à un **Parcours** (ou Profil) qui définit ce que l'utilisateur voit en priorité. La configuration complète est dans `apps/web/src/lib/profiles.ts`.

- **Parcours Administrateur** : Priorité à la supervision (`supervise`) et à la modération.
- **Parcours Elu** : Priorité à la décision (`decide`) et aux rapports institutionnels.
- **Parcours Coordinateur** : Priorité à l'organisation communautaire.
- **Parcours Bénévole** : Priorité à l'action terrain (`execute`).

## 4. Implémentation dans le Code

### Côté Serveur (Actions API / Routes)
Utiliser `requireAdminAccess()` pour protéger les endpoints sensibles.
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

### Côté Client (Composants React)
Utiliser le hook de session ou les fonctions de `lib/authz` si nécessaire.

### Redirection et Gardes
Les pages de profil (`/profil/[role]`) sont protégées par des gardes serveur pour éviter qu'un utilisateur n'accède à une vue ne correspondant pas à son rôle effectif (ex: un bénévole voyant le parcours admin).

---
*Dernière mise à jour : Avril 2026*
