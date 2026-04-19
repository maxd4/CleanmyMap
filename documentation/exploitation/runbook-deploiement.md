# Runbook deploiement

## Sequence deploiement (runtime web)
```mermaid
sequenceDiagram
  participant Dev as Developpeur
  participant CI as CI
  participant Vercel as Plateforme deploy
  participant App as Web app
  Dev->>CI: Push branche/PR
  CI->>CI: Typecheck + lint + tests cibles
  CI-->>Dev: Validation
  Dev->>Vercel: Declenche deploy
  Vercel->>App: Build + release
  App-->>Dev: /api/health et /api/uptime
  Dev-->>App: Verification parcours critiques
```
Fallback statique:
```md
![Runbook deploiement fallback](../archive/fallback-runbook-deploiement-sequence.png)
```

## Avant deploy
- Validation locale/CI (typecheck, lint, tests cibles)
- Verification env critiques (Clerk/Supabase)

## Pendant deploy
- Suivre statut deployment (branche, root `apps/web`)
- Eviter changements paralleles non traces

## Apres deploy
- Verifier `/api/health` et `/api/uptime`
- Tester parcours critiques (auth, action, admin)
