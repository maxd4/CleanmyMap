# Runbook monitoring logs

## Flowchart detection -> qualification -> escalade
```mermaid
flowchart TD
  A[Detection signal monitoring/logs] --> B{Type d'alerte ?}
  B -- Sante plateforme --> C[Verifier api/health + api/uptime]
  B -- Erreur API metier --> D[Qualifier endpoint + impact utilisateur]
  B -- Auth/session --> E[Verifier Clerk/session/proxy]
  B -- Import/export --> F[Verifier pipeline data + contrats]
  C --> G{Impact critique ?}
  D --> G
  E --> G
  F --> G
  G -- Oui --> H[Escalade immediate + runbook incidents]
  G -- Non --> I[Correction locale + surveillance renforcee]
  I --> J[Cloture avec verification post-correctif]
  H --> J
```
Fallback statique:
```md
![Monitoring logs flow fallback](../archive/fallback-monitoring-logs-flow.png)
```

## Signaux de supervision
- `GET /api/health`
- `GET /api/uptime`

## Logs a suivre
- erreurs API metier
- erreurs auth/session
- erreurs import/export

## Escalade
- Si incident critique: appliquer le runbook `incidents-frequents-et-reprise.md`.
