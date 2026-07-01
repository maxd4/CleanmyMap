# AuthN/AuthZ + secrets + API boundaries

## Schema unifie (un ecran)
```mermaid
flowchart LR
  U[Utilisateur] --> UI[Frontend Next.js]
  UI --> CL[Clerk AuthN]
  UI --> API[API Routes]
  API --> AZ[AuthZ roles/profils]
  AZ --> ADM[/api/admin/*]
  AZ --> PUB[/api/actions|community|reports]
  API --> SB[(Supabase)]
  SEC[Secrets env] --> API
  SEC --> CL
```
Fallback statique:
```md
![Auth boundaries fallback](../archive/fallback-security-auth-boundaries.png)
```

## Architecture des couches AuthN/AuthZ
```mermaid
flowchart LR
  REQ[Requete utilisateur] --> MW[Proxy/Middleware]
  MW --> AUTHN[AuthN Clerk session]
  AUTHN --> ROUTE[API Route handler]
  ROUTE --> AUTHZ[AuthZ role/profil]
  AUTHZ --> DOMAIN[Service metier]
  DOMAIN --> DATA[(Supabase)]
  AUTHZ --> AUDIT[Journalisation admin]
```
Fallback statique:
```md
![Auth layers architecture fallback](../archive/fallback-auth-layers-architecture.png)
```

## Points de vigilance (visibles en un ecran)
```mermaid
flowchart TD
  A[Requete API] --> B{Session valide Clerk ?}
  B -- Non --> B1[401]
  B -- Oui --> C{Role/profil autorise ?}
  C -- Non --> C1[403]
  C -- Oui --> D{Input valide ?}
  D -- Non --> D1[400]
  D -- Oui --> E{Endpoint sensible ?}
  E -- Oui --> F[Audit log obligatoire]
  E -- Non --> G[Execution metier]
  F --> G
```
Fallback statique:
```md
![Auth vigilance fallback](../archive/fallback-security-vigilance.png)
```

## Boundaries de securite a ne pas casser
| Boundary | Regle | Fichiers pivots |
|---|---|---|
| Secrets | jamais en clair dans git | `.env*`, runtime env |
| AuthN | session Clerk obligatoire sur routes protegees | `apps/web/src/lib/auth/*` |
| AuthZ | roles/profils verifies cote serveur | `apps/web/src/lib/authz.ts` |
| Middleware | routes sensibles filtrees avant handler | `apps/web/src/proxy.ts` |
| Admin API | acces strictement admin + audit | `apps/web/src/app/api/admin/*` |

## Checklist rapide avant merge/deploy
1. Verifier variables `CLERK_*` et `SUPABASE_*`.
2. Verifier protections `/admin` et `/api/admin/*`.
3. Verifier retours 401/403/400 sur cas invalides.
4. Verifier journalisation des operations sensibles.
5. Verifier que les endpoints publics n'exposent pas de donnees admin.

## Sequence acces admin
```mermaid
sequenceDiagram
  participant U as Utilisateur admin
  participant UI as Frontend
  participant MW as Proxy
  participant API as API admin
  participant AZ as AuthZ
  participant DB as Supabase
  U->>UI: Ouvre /admin
  UI->>MW: Requete protegee
  MW->>API: Forward si session valide
  API->>AZ: Verifier role/profil admin
  AZ-->>API: Autorise / refuse
  alt Autorise
    API->>DB: Operation admin
    DB-->>API: Resultat
    API-->>UI: 200 + payload
  else Refuse
    API-->>UI: 403
  end
```
Fallback statique:
```md
![Admin access sequence fallback](../archive/fallback-admin-access-sequence.png)
```
