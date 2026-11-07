# Maintenance — commandes et frontières réelles

## Rétention des brouillons et actions en attente

Le cron unique `/api/cron/maintenance` (`20 3 * * *`, UTC) exécute chaque jour
le job `action-retention` enregistré dans
`apps/web/src/lib/periodic/maintenance-job-registry.ts`. Aucun scheduler
secondaire n'est créé.

Le job appelle `purge_inactive_action_records` par lots bornés. Il commence par
un inventaire `dry_run`; la suppression physique ne reçoit que la liste
d'identifiants issue de cet inventaire. La fonction recalcule ensuite
l'éligibilité et la dernière activité persistée sous `FOR UPDATE SKIP LOCKED`,
avec une fenêtre d'un mois calendaire (`as_of - 1 month`). Une mise à jour
concurrente, une clé étrangère, une référence de notification/message, un
objet Storage ou toute autre dépendance non résolue bloque la ligne sans
interrompre le lot.

Les enregistrements `approved`, publiés, futurs publiés, en modération active
ou possédant une dépendance métier ne sont jamais candidats. Les résultats sont
journalisés uniquement sous forme agrégée dans
`maintenance_action_retention_runs`; les erreurs et conflits sont retentés au
passage quotidien suivant. Aucune purge rétroactive distante n'a été exécutée
par ce lot.

Une contribution `public_impact_action_contributions` purement dérivée et
non-éligible (`eligible_non_temporal = false` et
`eligible_temporal = false`) est réconciliable lors de la suppression ; elle ne
bloque pas un brouillon abandonné et son trigger ne retire aucun agrégat. Toute
contribution active ou toute dépendance métier non résolue bloque la purge.
Les RPC de références relisent toujours l'état d'éligibilité de `actions` au
moment du calcul : une révocation est immédiate et une réhabilitation reprend
la version statistique conservée sans nouvelle capture.

Les valeurs utilisées par les indicateurs publics sont séparées de la ligne
mutable : `action_statistical_versions` conserve la dernière version approuvée
et publiée. Les cinq actions historiques approuvées observées le 06/11/2026
avec `published_at = NULL` restent inchangées; aucune date de publication ni
composition de participants n'est inventée. Leur snapshot porte la
qualification `legacy_approved_unpublished`; les `forms` vides restent vides et
inchangés. Les fixtures de test restent
exclues par la provenance serveur et ne sont pas des preuves PostgreSQL
distantes.

**Statut : CURRENT pour l'orientation des outils.** Le runtime applicatif vit dans `apps/web/` et `apps/mobile/` ; les scripts Python historiques vivent dans `maintenance/python/`. La documentation et les dépendances Python sont propriétaires de [maintenance/python/README.md](../../maintenance/python/README.md).

| Opération | Chemin réel |
|---|---|
| Audit de nettoyage | `maintenance/python/scripts/ci_cleanup.py` |
| Moteur de l'audit | `maintenance/python/src/maintenance/cleanup_audit.py` |
| Contrôle UTF-8 | `maintenance/python/scripts/normalize_utf8.py` |
| Garde Git/SQLite | `maintenance/python/scripts/check_runtime_db_tracking.py` |
| Seed SQLite legacy | `maintenance/python/scripts/init_runtime_db.py` |
| Résolution DB SQLite legacy | `maintenance/python/src/database.py` |

Vérifications read-only depuis la racine du checkout :

```bash
python maintenance/python/scripts/ci_cleanup.py --root . --check
python maintenance/python/scripts/normalize_utf8.py --root . --check
python maintenance/python/scripts/check_runtime_db_tracking.py --root .
```

`ci_cleanup.py` retourne une erreur en mode `--check` seulement si une règle bloquante échoue. Ne pas utiliser les anciens chemins `src/` ou `scripts/ci_cleanup.py` à la racine. Les commandes Python mutantes (`--write`, `--seed`, `--reset-seeded-tables`) exigent un périmètre de données identifié et l'autorisation explicite adaptée.

Les anciens outils SQLite ne sont pas la source métier PostgreSQL/Supabase du web. `CLEANMYMAP_DB_PATH` et les chemins d'état hors dépôt ne doivent pas être interprétés comme une configuration Supabase. Ne pas déplacer les scripts Python legacy dans l'application.

## Opérations web et validations

Pour les changements web, suivre [TESTING.md](../development/TESTING.md) et le `package.json` réel : tests ciblés, lint, typecheck ou build proportionnés au lot. Le script `scripts/ci/run_checks.ps1` existe pour les contrôles Windows ; `scripts/dev/unblock_repo_access.ps1` modifie des ACL/attributs et ne doit pas être exécuté sans incident d'accès démontré.

## Géométries historiques — mutation distincte du diagnostic

`npm run data:geometry:backfill -w apps/web` est l'entrée de diagnostic à blanc prévue pour la qualification `PRESERVE / SAFE_UPDATE / AMBIGUOUS / INVALID`. `--apply` est une mutation séparée, réservée aux mises à jour sûres et autorisées après revue de la provenance persistée. `geometry_confidence` ne prouve pas la provenance ; ne jamais réécrire les lignes ambiguës par défaut.

## Preuves

Chemin existant ≠ commande exécutée ≠ DB modifiée ≠ production validée. Inscrire la commande, le périmètre, l'environnement et les résultats réellement observés ; utiliser les runbooks et les propriétaires spécialisés pour les incidents.
