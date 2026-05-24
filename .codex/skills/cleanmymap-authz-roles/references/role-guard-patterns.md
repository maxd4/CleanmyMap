# Role Guard Patterns

Prefer the existing helper functions over inline role checks:

- `requireAdminAccess()`
- `requireCreatorAccess()`
- `requireAuthenticatedAccess()`
- `getCurrentUserRoleLabel()`

If a route or component needs a role, validate it at the server boundary first.
