# Frontend / Backend Boundaries

## Architecture des zones UI/API/lib + contrats
```mermaid
flowchart LR
  subgraph FE[Frontend]
    UI[Pages + Components]
    NAV[Navigation + Rubriques]
  end

  subgraph API[Backend API]
    ROUTES[App API Routes]
    AUTH[AuthN/AuthZ + Proxy]
  end

  subgraph DOMAIN[Domain Services]
    ACTIONS[Actions data-contract + unified-source]
    COMMUNITY[Community + moderation]
    GAMIFICATION[Progression/gamification]
  end

  subgraph DATA[Data Layer]
    SUPA[(Supabase)]
  end

  UI --> ROUTES
  NAV --> ROUTES
  ROUTES --> AUTH
  ROUTES --> ACTIONS
  ROUTES --> COMMUNITY
  ROUTES --> GAMIFICATION
  ACTIONS --> SUPA
  COMMUNITY --> SUPA
  GAMIFICATION --> SUPA
```
Fallback statique:
```md
![Frontend backend boundaries fallback](../archive/fallback-frontend-backend-boundaries.png)
```

## Frontend (apps/web)
- Pages App Router: `apps/web/src/app/*`
- Components UI: `apps/web/src/components/*`
- Navigation/rubriques: `apps/web/src/lib/navigation.ts`, `apps/web/src/lib/sections-registry.ts`

## Backend (API routes + services)
- API routes: `apps/web/src/app/api/*`
- AuthN/AuthZ: `apps/web/src/lib/auth/*`, `apps/web/src/lib/authz.ts`, `apps/web/src/proxy.ts`
- Data access Supabase: `apps/web/src/lib/**` (domain modules)

## Contrats a stabiliser
- Contrat actions unifiees: `apps/web/src/lib/actions/data-contract.ts`
- Agrgation actions: `apps/web/src/lib/actions/unified-source.ts`
- Profil progression/gamification: `apps/web/src/lib/gamification/*`

## Regle
- Toute evolution de contrat backend doit avoir test de regression + validation API/UI associee.
