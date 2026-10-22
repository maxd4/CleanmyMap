# AuthZ — carte de lecture (chemins relatifs à la racine du dépôt)

| Contexte | Source | État |
|---|---|---|
| Authentification et autorisation | `documentation/security/authz-authn-regles.md` | CURRENT |
| Modèle par capacités et périmètres | `documentation/security/authorization-capabilities.md` | PLAN / TARGET |
| Ancienne façade AuthZ | `documentation/security/AUTHZ.md` | COMPATIBILITY |
| Métadonnées et normalisation Clerk | `apps/web/src/lib/auth/README.md` | CURRENT |
| Gardes et décisions de serveur | `apps/web/src/lib/authz.ts` | CURRENT |
| Contrat API méthode/par méthode | `apps/web/src/lib/auth/api-authorization-contract.ts` | CURRENT |
| Proxy de navigation | `apps/web/src/proxy.ts` | Garde partiel, jamais autorité finale |
| Frontières client/serveur | `documentation/architecture/frontend-backend-boundaries.md` | CURRENT |
| ADR historiques d'identité et secrets | `documentation/architecture/adr/ADR-001-clerk-auth.md`, `ADR-002-service-role-key.md` | Décision historique à confronter au code |

Commencer par le code et les tests de la surface concernée. Ne pas appliquer la matrice TARGET comme une permission déjà déployée.
