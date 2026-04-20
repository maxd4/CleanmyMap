# System overview

## Vue globale runtime
```mermaid
flowchart LR
  U[Utilisateurs] --> UI[Next.js App Router UI]
  UI --> API[API routes apps/web/src/app/api]
  API --> AUTH[Clerk AuthN/AuthZ]
  API --> DB[(Supabase)]
  API --> DOM[Libs domaine apps/web/src/lib]
  DOM --> DB
```
Fallback statique:
```md
![System overview fallback](../archive/fallback-system-overview.png)
```

## Flux front -> API -> data
```mermaid
sequenceDiagram
  participant User as Utilisateur
  participant Front as Frontend Next.js
  participant Api as API route
  participant Domain as Lib metier
  participant Data as Supabase
  User->>Front: Action UI
  Front->>Api: Requete HTTP
  Api->>Domain: Validation + regles metier
  Domain->>Data: Read/Write
  Data-->>Domain: Donnees
  Domain-->>Api: Payload normalise
  Api-->>Front: Reponse JSON
  Front-->>User: Feedback
```
Fallback statique:
```md
![Flux front-api-data fallback](../archive/fallback-system-flow.png)
```

## Zones critiques a lire en premier
1. `apps/web/src/lib/authz.ts`
2. `apps/web/src/lib/auth/protected-routes.ts`
3. `apps/web/src/proxy.ts`
4. `apps/web/src/lib/actions/data-contract.ts`
5. `apps/web/src/lib/actions/unified-source.ts`
6. `apps/web/src/app/api/admin/moderation/route.ts`

## Regle de lecture rapide
- Commencer par ce document, puis ouvrir uniquement les fichiers du flux concerne.
- Eviter la lecture exhaustive du repo avant de localiser le point d'impact.
