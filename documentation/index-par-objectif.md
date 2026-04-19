# Index par objectif

## Parcours visuel developpement (comprendre ou agir en < 5 min)
```mermaid
flowchart TD
  A[Start dev] --> B[Lire system-overview]
  B --> C[Lire front-back boundaries]
  C --> D[Lire modules-cles-et-dependances]
  D --> E[Coder dans apps/web]
  E --> F[Valider typecheck + lint + tests cibles]
  F --> G[Verifier regression-gates]
```
Fallback statique:
```md
![Parcours dev fallback](./archive/fallback-onboarding-dev.png)
```
1. [architecture/system-overview.md](./architecture/system-overview.md)
2. [architecture/frontend-backend-boundaries.md](./architecture/frontend-backend-boundaries.md)
3. [architecture/modules-cles-et-dependances.md](./architecture/modules-cles-et-dependances.md)
4. [exploitation/regression-gates.md](./exploitation/regression-gates.md)

## Parcours visuel audit
```mermaid
flowchart TD
  A[Start audit] --> B[Matrice rubriques]
  B --> C[Schema normalisation data]
  C --> D[API vigilance + authz]
  D --> E[Audit par rubrique]
  E --> F[Rapport risques + priorites]
```
Fallback statique:
```md
![Parcours audit fallback](./archive/fallback-onboarding-audit.png)
```
1. [produit/matrice-rubriques.md](./produit/matrice-rubriques.md)
2. [data/schema-normalisation.md](./data/schema-normalisation.md)
3. [securite/api-vigilance.md](./securite/api-vigilance.md)
4. [audit_rubrique/](./audit_rubrique)

## Parcours visuel maintenance / production
```mermaid
flowchart TD
  A[Incident ou maintenance] --> B[Runbook monitoring logs]
  B --> C[Incidents frequents et reprise]
  C --> D[Checklist push deploy]
  D --> E[Verification uptime/health]
  E --> F[Mise a jour latest-session]
```
Fallback statique:
```md
![Parcours maintenance fallback](./archive/fallback-onboarding-maintenance.png)
```
1. [exploitation/runbook-monitoring-logs.md](./exploitation/runbook-monitoring-logs.md)
2. [exploitation/incidents-frequents-et-reprise.md](./exploitation/incidents-frequents-et-reprise.md)
3. [securite/checklist-push-deploy.md](./securite/checklist-push-deploy.md)
4. [du/session/latest-session.md](./du/session/latest-session.md)
