# Operations - Guide IA

Documentation opérationnelle pour agents IA.

Cette section reste utile pour le déploiement, le monitoring, la maintenance et les imports de données.
Les fichiers de mémoire de session et les runbooks internes sont exclus de l’index public et décrits dans la politique de publication.

---

## Fichiers essentiels

### Déploiement
- `runbook-deploiement.md`
- `checklist-push-deploy.md`
- `cloudflare-uptimerobot-checklist.md`

### Incidents & maintenance
- `INCIDENT_RUNBOOK_SHORT.md`
- `incidents-frequents-et-reprise.md`
- `MAINTENANCE.md`

### Monitoring & logs
- `runbook-monitoring-logs.md`
- `CLERK_SESSION_DASHBOARD_CHECK.md`

### Sécurité publication et config
- `pre-release-security-check.md`
- `../security/CODEX_SECURITY_PLAYBOOK.md`
- `OPENAI_API_KEY` reste un secret local/serveur et ne doit jamais être traité comme un env public

### Changelog
- `CHANGELOG.md`

### Import de données
- `data-import/`
  - `pipeline-import.md`
  - `schema-normalisation.md`
  - `mapping-colonnes.md`
  - `regles-nettoyage-et-cas-limites.md`

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

