# Gouvernance GitHub du dépôt

Ce mémo résume les garde-fous GitHub à garder en place pour CleanMyMap.

## Éléments à conserver

- `SECURITY.md` à la racine du dépôt.
- Template de PR avec description, fichiers touchés et vérifications.
- Templates d'issues pour bug, UI, sécurité, dette technique, `refactor`, `supabase`, `vercel` et `quota`.
- Labels de tri: `security`, `quota`, `ui`, `supabase`, `vercel`, `docs`, `refactor`.
- Milestones pour les grandes étapes de travail.

## Protection de `main`

La branche `main` doit refuser les merges quand les checks requis échouent.

Checks attendus pour la revue manuelle GitHub:

- `fast-checks`
- `security-checks`
- `CodeQL`
- `Vercel`

## CI et maintenance

- Garder `permissions: {}` au niveau workflow, puis ouvrir uniquement ce qui est nécessaire au niveau job.
- Éviter les runs concurrents avec `concurrency` et `cancel-in-progress: true`.
- Garder un cache npm explicite sur `package-lock.json`.
- Grouper les mises à jour Dependabot, y compris les security updates, pour limiter le bruit.

## Point de vigilance

Les réglages de protection de branche, les labels et les milestones vivent dans GitHub, pas dans le dépôt. Si un de ces éléments disparaît côté repo, il faut le remettre à la main dans les réglages GitHub ou via l'API.
