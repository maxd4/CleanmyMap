# CI Patterns

Prefer these practices:

- keep checks scoped to the changed surface
- fail closed when a deployment invariant is missing
- verify preview output for any UI or routing change
- do not weaken a gate unless the reason is documented

Treat GitHub and Vercel checks as part of the feature, not as optional polish.
