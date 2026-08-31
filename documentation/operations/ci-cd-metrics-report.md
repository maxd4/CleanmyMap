# CI/CD Metrics Report

## Collecte

```bash
npm run metrics:cicd -- --days 30 --github-limit 10 --cache-log-limit 8 --vercel-limit 10
```

Le script lit automatiquement `VERCEL_TOKEN`, `VERCEL_ORG_ID` et `VERCEL_PROJECT_ID` depuis l'environnement courant, puis depuis `.env` et `.env.local` à la racine du dépôt si les variables ne sont pas déjà définies.

## Sources

- GitHub Actions API via `gh run list`, `gh run view --log`, et `gh api .../jobs`
- Vercel Deployment API via `https://api.vercel.com/v6/deployments`
- Logs de cache via les logs de workflow GitHub Actions

## Colonnes

### GitHub Actions

- `workflow`
- `run`
- `attempt`
- `conclusion`
- `jobs`
- `duration_ms (derived)` : calculé depuis `startedAt` et `updatedAt`

### GitHub Cache Logs

- `hit lines`
- `miss lines`
- `result` : `hit`, `miss`, `mixed` ou `none`

### Vercel Deployments

- `created_at`
- `readyState`
- `duration_ms (derived)` : calculé depuis `ready` et `buildingAt` ou `createdAt`
- `gitBranch`
- `gitCommitRef`

## Limites

- `duration_ms` côté GitHub n'est pas exposé directement par `gh run list`, donc le script le dérive à partir des timestamps.
- `gitBranch` et `gitCommitRef` côté Vercel sont lus dans le payload de déploiement quand ils sont présents. Sinon le rapport affiche `n/a`.
- Si `VERCEL_TOKEN` est absent, la section Vercel reste vide et le script le signale explicitement.
