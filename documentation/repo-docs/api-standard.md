# Standard API & Gestion des Erreurs : CleanMyMap

Ce document définit les règles de développement pour les routes API afin de garantir la prévisibilité et la sécurité du backend.

---

## 1. Format de Réponse Unifié
Toutes les API doivent renvoyer un objet JSON cohérent, même en cas d'erreur.

### Succès (200, 201)
```json
{
  "success": true,
  "payload": { ... }
}
```

### Erreur (4xx, 5xx)
```json
{
  "success": false,
  "error": {
    "code": "ACCÈS_REFUSÉ",
    "message": "Vous n'avez pas les droits pour cette opération.",
    "metadata": { ... }
  }
}
```

## 2. Codes d'Erreur Standards
| Code | HTTP | Usage |
| :--- | :--- | :--- |
| `UNAUTHORIZED` | 401 | Utilisateur non connecté. |
| `FORBIDDEN` | 403 | Rôle insuffisant (AuthZ). |
| `INVALID_INPUT` | 400 | Schéma Zod invalide ou données incohérentes. |
| `INTERNAL_ERROR` | 500 | Erreur non gérée (à éviter au maximum). |

## 3. Sécurité (Proxy Layer)
Toute route sensible (modération, admin, exports) **doit** passer par le Proxy de contrôle situé dans `apps/web/src/proxy.ts`. L'assistant IA ne doit jamais contourner ce proxy pour un accès direct à la DB.

## 4. Journalisation d'Audit
Les opérations critiques (suppression, validation d'action, export de masse) doivent être tracées via `lib/admin/operation-audit.ts`. Une opération réussie sur un endpoint admin sans audit log est considérée comme une **rupture de gouvernance**.
