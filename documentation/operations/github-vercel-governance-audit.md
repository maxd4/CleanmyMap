# Audit GitHub/Vercel CleanMyMap

Snapshot de gouvernance du dépôt, centré sur l'exploitation de GitHub comme outil de pilotage et sur les réglages Vercel qui impactent les merges et les previews.

## Tableau de synthèse

| Élément | État actuel | Utilité | Correction recommandée | Priorité |
| --- | --- | --- | --- | --- |
| Protection de `main` / PR / checks / reviewers / bypass admin | Pas besoin de la renforcer pour l'instant; le dépôt garde déjà les checks CI et CodeQL, mais la branche n'est pas protégée au niveau GitHub | Garder la voie ouverte au merge sans surcouche de gouvernance | Différer la protection de `main` tant que le besoin n'est pas confirmé; reconsidérer seulement si le risque de merge direct augmente | Différée |
| Vercel - branche de production | Vercel est branché sur `apps/web` et `main`; le `rootDirectory` est explicite dans `.vercel/project.json` | Garantir que la prod part de la bonne branche | Conserver cette liaison et surveiller les previews plutôt que de reconfigurer la branche | Basse |
| Vercel - previews / Dependabot | `apps/web/vercel.json` a un `ignoreCommand` qui saute `dependabot/*`; la doc signale des previews Dependabot qui échouent quand les branches Supabase saturent | Réduire le bruit et éviter des previews rouges inutiles | Conserver ce skip si les previews Dependabot n'apportent rien; sinon, retirer le skip et traiter le quota Supabase des previews | Moyenne |
| Workflows Actions | `ci.yml` et `codeql.yml` sont propres: `permissions: {}`, `concurrency` + `cancel-in-progress`, cache npm explicite | Minimiser les droits et les runs concurrents | Rien à changer; garder ce pattern pour tout nouveau workflow | Basse |
| Dependabot | Weekly, groupes par workspace et security updates, groupes GitHub Actions; 6 PR Dependabot ouvertes et 19 alertes ouvertes | Mettre à jour sans bruit excessif | Globalement bon; si tu veux moins de bruit, baisse `open-pull-requests-limit` ou fusionne certains groupes, mais garde le weekly | Moyenne |
| Labels | Les labels requis existent et `refactor` a été ajouté pour compléter le triage: `bug`, `docs`, `quota`, `refactor`, `security`, `supabase`, `ui`, `vercel` | Triage cohérent des issues/PR | Garder des descriptions courtes et stables pour limiter l'ambiguïté | Faible |
| Issue templates | Templates pour bug, sécurité, UI, dette technique, `refactor`, `supabase`, `vercel` et `quota`; `config.yml` pointe vers `SECURITY.md` et la doc | Structurer les demandes sans workflow supplémentaire | Conserver un formulaire par intention métier et éviter de multiplier des variantes redondantes | Faible |
| PR template | Bon template: résumé, surfaces touchées, vérifications, impact Vercel/Supabase/Auth/CI, checklist quotas | Forcer la documentation de l'impact avant revue | Rien de bloquant; au besoin, rappeler explicitement que les checks requis de `main` doivent être verts | Faible |
| `SECURITY.md` | Présent à la racine, avec un guide détaillé aussi dans `documentation/security/SECURITY.md` | Canal clair pour signaler une vulnérabilité | Conserver la racine comme point d'entrée et éviter les divergences entre les deux versions | Faible |
| Documentation technique | Gouvernance et guides déjà présents: `documentation/operations/github-governance.md`, `documentation/security/README.md`, guides Vercel/quota | Avoir une base de gouvernance hors GitHub | Suffisant; garder un index clair et ne pas multiplier les docs parallèles | Faible |
| Alertes ouvertes | 19 alertes Dependabot, 56 alertes CodeQL, 0 alertes secret scanning | Mesurer le risque réel sans masquer les signaux | Triage prioritaire des alertes high/medium sur `main`; ne pas désactiver les scanners | Haute |

## Sources vérifiées

- [Gouvernance GitHub du dépôt](./github-governance.md)
- [Configuration PR](../../.github/PULL_REQUEST_TEMPLATE.md)
- [Configuration Dependabot](../../.github/dependabot.yml)
- [Workflow CI](../../.github/workflows/ci.yml)
- [Workflow CodeQL](../../.github/workflows/codeql.yml)
- [Configuration Vercel](../../apps/web/vercel.json)
- [Politique de sécurité](../../SECURITY.md)
- [Documentation sécurité](../security/SECURITY.md)
