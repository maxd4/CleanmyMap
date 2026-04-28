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

## Controle hebdomadaire recommande
- Verifier les 3 derniers incidents Sentry et qualifier les nouveaux digestes.
- Verifier les derniers runs GitHub Actions en echec ou annules.
- Verifier les derniers deploiements Vercel et les erreurs de build.
- Verifier les alertes Dependabot et les PR de mise a jour de dependances.
- N'agir que sur les signaux nouveaux ou persistants, puis consigner le resultat dans la session.

## Escalade
- Si incident critique: appliquer le runbook `incidents-frequents-et-reprise.md`.

## Services web non utilises pour l'instant
- Stripe (paiements en ligne / dons): a ajouter plus tard, quand le tunnel de don est priorise.
- Pinecone (vecteurs image): a activer quand on lance la recherche IA pour retrouver facilement des cleanwalks dans la base.
- Upstash (Redis serverless, rate limiting, QStash, Workflow): ne pas ajouter tant qu'il n'y a pas un besoin explicite.
- Ajouter Upstash uniquement le jour ou l'on dit:
  - "je dois limiter les abus sur mes API"
  - "j'ai besoin de cache/queues maintenant"
