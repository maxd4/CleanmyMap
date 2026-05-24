# AuthZ Map

Read these files before changing any permission boundary:

- `../../../documentation/security/AUTHZ.md`
- `../../../documentation/security/authz-authn-regles.md`
- `../../../documentation/architecture/adr/ADR-001-clerk-auth.md`
- `../../../documentation/architecture/adr/ADR-002-service-role-key.md`
- `../../../documentation/architecture/frontend-backend-boundaries.md`
- `../../../apps/web/src/lib/authz.ts`
- `../../../apps/web/src/lib/domain-language.ts`
- `../../../apps/web/src/proxy.ts`

The repo treats identity, roles, and access as separate concerns. Preserve that split.
