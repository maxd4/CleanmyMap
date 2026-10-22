# Operations — Guide IA

Point d'entrée de la documentation d'exploitation de CleanMyMap.

Les règles transversales de Git, de publication et de validation restent
canoniques dans la gouvernance racine. Ce dossier contient les procédures,
services, coûts, incidents et diagnostics opérationnels.

## Routage des responsabilités et statuts

| Sujet | Source propriétaire | Ne pas confondre |
|---|---|---|
| Publication Vercel | [runbook-deploiement.md](./runbook-deploiement.md), [checklist-push-deploy.md](./checklist-push-deploy.md) | Git publié ≠ Vercel déployé |
| Coûts / quotas / cache | [platform-cost-governance.md](./platform-cost-governance.md) | Audit daté ≠ mesure actuelle |
| Configuration fournisseur | [services-stack.md](./services-stack.md), [environment-configuration.md](./environment-configuration.md) | Variable présente ≠ service actif |
| Incidents | [incidents-frequents-et-reprise.md](./incidents-frequents-et-reprise.md) | [INCIDENT_RUNBOOK_SHORT.md](./INCIDENT_RUNBOOK_SHORT.md) est HISTORY |
| Maintenance | [MAINTENANCE.md](./MAINTENANCE.md), [maintenance/python](../../maintenance/python/README.md) | Python legacy ≠ runtime Supabase |
| Monitoring | [runbook-monitoring-logs.md](./runbook-monitoring-logs.md) | Fenêtre de logs vide ≠ absence de trafic |
| Audit et preuves | [audits/README.md](./audits/README.md) | Un audit est `AUDIT/SNAPSHOT`, jamais contrat CURRENT |
| Sessions agents | [agent-memory-governance.md](./agent-memory-governance.md), [session-standard-runbook.md](./session-standard-runbook.md) | Mémoire volatile ≠ vérité du code |
| Partage de données / contenus | [DATA_PROTECTION_POLICY.md](./DATA_PROTECTION_POLICY.md), [CONTENT_VALIDATION_WORKFLOW.md](./CONTENT_VALIDATION_WORKFLOW.md) | Processus proposé ≠ preuve de revue |
| CI/CD | [ci-cd-metrics-report.md](./ci-cd-metrics-report.md) | Commande disponible ≠ métrique observée |
| DU et études | [../plans/README.md](../plans/README.md) | Plan ≠ réalisation |

Un README route vers le contrat, sans dupliquer ses étapes. Les fichiers `CHANGELOG.md` et `audits/` conservent la provenance historique. Pour une source CURRENT, confronter au code/tests puis aux services réellement observés, avec SHA, période et incertitudes.

## Plateforme et coûts

- [Gouvernance des coûts plateforme](./platform-cost-governance.md) — source
  `CURRENT` pour Vercel, Supabase, navigateur, cache, polling, exports et choix
  de couche ;
- [Diagnostic de build Vercel / Next.js](./vercel-build-troubleshooting.md) —
  triage build, environnement, provisioning et bundler ;
- [Services stack](./services-stack.md) — services externes et points de
  configuration.

Les décisions de stockage détaillées vivent dans
`documentation/architecture/data-governance.md`. Les optimisations de requêtes
Supabase vivent dans `documentation/database/`.

## Déploiement

- `runbook-deploiement.md`
- `checklist-push-deploy.md`
- `cloudflare-uptimerobot-checklist.md`

## Incidents et maintenance

- `INCIDENT_RUNBOOK_SHORT.md`
- `incidents-frequents-et-reprise.md`
- `MAINTENANCE.md`

## Monitoring et logs

- `runbook-monitoring-logs.md`
- `CLERK_SESSION_DASHBOARD_CHECK.md`
- `account-completion-modal.md`
- `clerk-supabase-audit.md`

La fenêtre de complétion de compte est branchée route par route, pas au niveau
du shell global. `clerk-supabase-audit.md` sert aussi de point d'entrée vers
`npm run data:audit:clerk-supabase`.

## Audits et diagnostics historiques

- [`audits/`](./audits/) — preuves contextualisées, non `CURRENT`.

Les rapports entièrement générés et reproductibles restent sous `artifacts/`.

## Sécurité publication et configuration

- [Configuration email](./email-setup.md)
- `pre-release-security-check.md`
- [Mobile : état EAS, APK et validation Android](../../apps/mobile/README.md)
- `../security/CODEX_SECURITY_PLAYBOOK.md`
- `github-governance.md`
- `github-vercel-governance-audit.md`

`OPENAI_API_KEY` reste un secret local/serveur et ne doit jamais être traité
comme une variable publique.

## Mémoire de session

- `agent-memory-governance.md`

Les documents de session et de mémoire interne ne doivent pas être recopiés
dans les sources opérationnelles courantes.

## Changelog

- `CHANGELOG.md`

Le changelog conserve l'historique. Il n'est pas une source de vérité pour une
règle actuelle.

## Import de données

- [Point d'entrée local](./data-import/README.md)
- `clerk-supabase-audit.sql` — script d'audit associé, hors parcours d'import.

## Workflow opérationnel

Avant un déploiement :

1. consulter `checklist-push-deploy.md` ;
2. utiliser `runbook-deploiement.md` ;
3. exécuter les validations requises par le candidat courant ;
4. vérifier les services ou quotas réellement concernés.

En cas d'incident :

1. qualifier la couche en échec ;
2. consulter le runbook adapté ;
3. vérifier les logs et diagnostics actuels ;
4. ne pas appliquer une conclusion d'audit historique comme état présent ;
5. documenter l'historique seulement lorsqu'il apporte une trace durable.
