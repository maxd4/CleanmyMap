# Maintenance — commandes et frontières réelles

**Statut : CURRENT pour l'orientation des outils.** Le runtime applicatif vit dans `apps/web/` et `apps/mobile/` ; les scripts Python historiques vivent dans `maintenance/python/`. La documentation et les dépendances Python sont propriétaires de [maintenance/python/README.md](../../maintenance/python/README.md) et de son [AGENTS.md](../../maintenance/python/AGENTS.md).

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
