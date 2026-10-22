---
name: cleanmymap-authz-roles
description: "Use this skill when a task touches Clerk auth, roles, permissions, protected routes, or authorization boundaries in CleanMyMap."
category: repository
risk: high
source: local
tags: "[authz, roles, clerk, permissions, protected-routes]"
date_added: "2026-05-24"
---

# CleanMyMap — AuthN, AuthZ, rôle et scope

## Activer quand

Clerk, rôle, capability, garde API, propriété d'une ressource ou accès privé/administratif changent.

## Sources

1. `documentation/security/authz-authn-regles.md` — **CURRENT** pour les frontières applicables.
2. `documentation/security/authorization-capabilities.md` — **PLAN / TARGET** ; ne jamais lui attribuer un droit déjà implémenté.
3. `apps/web/src/lib/auth/README.md`, `apps/web/src/lib/authz.ts`, contrat méthode/par route et tests.
4. `documentation/security/admin-operation-audit.md` lorsqu'une mutation privilégiée produit un effet auditable.

## Règles

- `publicMetadata.role` est l'entrée de rôle Clerk autoritative ; `activeRole` reste borné par le rôle obtenu ; `activeProfile` est une persona UX, pas une permission.
- Ne jamais attribuer `admin` ou `max` depuis une adresse email, `privateMetadata`, un alias, un client ou un simple `service_role`.
- Le handler/service serveur résout l'acteur, la capacité, le scope, l'ownership, l'état métier et la projection appropriée. Une session, un proxy, une visibilité UI ou un ID prévisible ne suffisent pas.
- Les accès publics explicitement admis sont distincts des lectures privées et mutations ; ne pas imposer AuthN à toutes les routes par automatisme.
- Refuser les contournements RLS, les garde-fous supprimés et les audits de succès émis avant l'effet réel.

## Validation

Tester cas autorisé ET cas refusé (anonyme, autre propriétaire, mauvais scope/rôle, ressource inaccessible) au niveau du handler et du service concerné. Qualifier la différence entre contrat statique, tests mockés et preuve Supabase réellement exécutée. Consulter [références](references/authz-map.md) et [patterns](references/role-guard-patterns.md) seulement si nécessaires.
