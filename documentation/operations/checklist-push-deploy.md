# Checklist push deploy

Cette checklist couvre le préflight applicatif et l'exploitation Vercel. La
publication Git et les candidates suivent exclusivement la gouvernance racine
du dépôt et ne sont pas détaillées ici.

## Préflight applicatif

- [ ] Typecheck exécuté si le lot touche le code TypeScript.
- [ ] Lint exécuté si le lot touche le code web.
- [ ] Tests ciblés des zones modifiées exécutés.
- [ ] Variables d'environnement critiques vérifiées sans afficher leurs
      valeurs.
- [ ] Routes sensibles (`/admin`, authentification, API métier) contrôlées.
- [ ] Aucun secret ni fichier d'environnement local n'est destiné au
      deployment.

## Deployment Vercel

- [ ] Le projet et l'environnement Vercel sont corrects.
- [ ] Le `rootDirectory` est `apps/web`.
- [ ] Le deployment automatique correspondant au commit publié est identifié.
- [ ] Le deployment atteint `READY`.
- [ ] Les alias et le domaine actif correspondent au deployment attendu.
- [ ] Aucun upload concurrent inutile n'est lancé pour le même changement.

Un deployment manuel est réservé à une récupération explicitement justifiée.
Inspecter alors le projet, l'état `READY`, les alias et les logs ciblés avant
de conclure. Pour un incident, préférer le rollback ou la promotion d'un
deployment Vercel existant.

Si Vercel renvoie `TEAM_ACCESS_REQUIRED`, arrêter les retries et corriger
l'accès à l'équipe ou l'identité de publication selon la gouvernance racine.
Ne pas conclure au succès tant que le deployment n'est pas inspectable et
accessible par l'équipe attendue.

## Vérifications post-production

- [ ] `/api/health` répond correctement sur le domaine actif.
- [ ] `/api/uptime` répond correctement sur le domaine actif.
- [ ] Smoke ciblé exécuté pour les parcours concernés.
- [ ] Logs ciblés inspectés en cas d'incident.
- [ ] Le compte rendu distingue une absence de lignes dans une fenêtre de logs
      d'une absence de trafic.
