# Operations - Guide IA

Documentation opérationnelle pour agents IA.

Cette section reste utile pour le déploiement, le monitoring, la maintenance et les imports de données.
Les documents de session et de mémoire interne sont gérés ailleurs et ne doivent pas être dupliqués ici.

---

## Fichiers essentiels

### Déploiement
- `runbook-deploiement.md`
- `checklist-push-deploy.md`
- `cloudflare-uptimerobot-checklist.md`
- `fix_vercel_deploy.md` - note de travail sur les warnings de source maps Vercel

### Incidents & maintenance
- `INCIDENT_RUNBOOK_SHORT.md`
- `incidents-frequents-et-reprise.md`
- `MAINTENANCE.md`

### Monitoring & logs
- `runbook-monitoring-logs.md`
- `CLERK_SESSION_DASHBOARD_CHECK.md`
- `account-completion-modal.md`
- la fenêtre de complétion de compte est branchée route par route, pas au niveau du shell global
- `clerk-supabase-audit.md`
- `clerk-supabase-audit.md` sert aussi de point d'entrée vers `npm run data:audit:clerk-supabase`

### Mémoire de session
- `agent-memory-governance.md` - doctrine de mémoire persistante, cycle de travail autonome et clôture de session
- résumé de clôture de la dernière session
- contexte courant du projet

### Sécurité publication et config
- `pre-release-security-check.md`
- `../security/CODEX_SECURITY_PLAYBOOK.md`
- `OPENAI_API_KEY` reste un secret local/serveur et ne doit jamais être traité comme un env public
- les runbooks internes de mémoire et de session restent hors index public
- `github-vercel-governance-audit.md` - audit synthétique de la gouvernance GitHub/Vercel

### Changelog
- `CHANGELOG.md`

### Import de données
- `data-import/`
  - `pipeline-import.md`
  - `schema-normalisation.md`
  - `mapping-colonnes.md`
  - `regles-nettoyage-et-cas-limites.md`
- `clerk-supabase-audit.sql`

---

## Instructions

### Avant déploiement
1. Lire `checklist-push-deploy.md`
2. Vérifier `runbook-deploiement.md`
3. S'assurer que les tests passent

### En cas d'incident
1. Consulter `INCIDENT_RUNBOOK_SHORT.md`
2. Vérifier `incidents-frequents-et-reprise.md`
3. Documenter l'incident dans `CHANGELOG.md`

### Import de données
1. Consulter `data-import/pipeline-import.md`
2. Respecter `data-import/schema-normalisation.md`
3. Appliquer `data-import/regles-nettoyage-et-cas-limites.md`

---

## Workflow

1. Vérifier la checklist de déploiement
2. Lancer les tests
3. Suivre le runbook adéquat
4. Vérifier le monitoring
5. Documenter dans le changelog
