# AuthZ — réutiliser les gardes propriétaires

Chercher d'abord dans `apps/web/src/lib/authz.ts` et les modules `apps/web/src/lib/auth/` le garde adapté ; exemples existants :

- `requireAuthenticatedAccess()`
- `requireAdminAccess()`
- `requireCreatorAccess()`
- `getCurrentUserRoleLabel()`

L'existence d'un garde n'autorise pas sa substitution universelle : le handler doit décider la capacité, le scope, la relation à l'objet, l'état métier et le DTO minimal. Les exceptions publiques restent explicitement qualifiées ; `service_role` n'est pas un rôle utilisateur.

La décision `CURRENT` est dans `documentation/security/authz-authn-regles.md`. `authorization-capabilities.md` décrit la cible `PLAN / TARGET`. Pour une opération privilégiée, auditer après effet conformément au contrat d'audit du domaine.
