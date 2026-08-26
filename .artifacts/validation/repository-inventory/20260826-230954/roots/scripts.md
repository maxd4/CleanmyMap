# `scripts/`

| Metrique | Valeur |
| --- | ---: |
| Taille recursive | 464,74 KiB (475892 octets) |
| Fichiers | 83 |
| Sous-dossiers | 2 |
| Profondeur maximale | 3 |
| Tracked | 83 |
| Untracked | 0 |
| Ignored | 0 |
| Other | 0 |
| Fichiers source inventories | 77 |
| Fichiers source tracked | 77 |
| Fichiers source tracked top-heavy | 1 |
| Max lignes source tracked | 1320 |

## Extensions

| Extension | Fichiers | Taille |
| --- | ---: | ---: |
| `.mjs` | 52 | 267,83 KiB |
| `.ps1` | 11 | 98,31 KiB |
| `.js` | 10 | 47,17 KiB |
| `.json` | 6 | 18,66 KiB |
| `.ts` | 4 | 32,76 KiB |

## 20 plus gros fichiers

| Fichier | Taille | Git |
| --- | ---: | --- |
| `scripts/audit-repository-tree.ps1` | 62,12 KiB | tracked |
| `scripts/generate-design-system-board.mjs` | 23,30 KiB | tracked |
| `scripts/audit-clerk-supabase.mjs` | 19,72 KiB | tracked |
| `scripts/cicd-metrics-report.mjs` | 16,39 KiB | tracked |
| `scripts/generate-vercel-surface-report.mjs` | 15,99 KiB | tracked |
| `scripts/update-audit-stats.mjs` | 15,39 KiB | tracked |
| `scripts/codex-performance-diagnostic.ps1` | 12,57 KiB | tracked |
| `scripts/cleanup/utils.ts` | 12,07 KiB | tracked |
| `scripts/vercel-audit-core.mjs` | 10,96 KiB | tracked |
| `scripts/lint-audit-direct.js` | 10,44 KiB | tracked |
| `scripts/check-pages-site-route-drift.mjs` | 10,44 KiB | tracked |
| `scripts/validation-policy.mjs` | 10,23 KiB | tracked |
| `scripts/upgrade-map-ui.js` | 10,18 KiB | tracked |
| `scripts/secret-audit.mjs` | 10,16 KiB | tracked |
| `scripts/run_checks2.ps1` | 9,79 KiB | tracked |
| `scripts/summarize-jsonl.mjs` | 8,99 KiB | tracked |
| `scripts/cleanup/inventory.ts` | 7,84 KiB | tracked |
| `scripts/cleanup/backup.ts` | 7,79 KiB | tracked |
| `scripts/clean-workspace-safe.mjs` | 7,77 KiB | tracked |
| `scripts/export-clerk-users.mjs` | 7,61 KiB | tracked |

## 20 plus gros sous-arbres

| Dossier | Taille recursive | Fichiers | Dossiers |
| --- | ---: | ---: | ---: |
| `scripts/cleanup/` | 38,20 KiB | 6 | 0 |
| `scripts/media/` | 2,44 KiB | 2 | 0 |

## Arborescence exhaustive

```text
scripts/ [464,74 KiB | 83 files | 2 dirs]
├── cleanup/ [38,20 KiB | 6 files | 0 dirs]
│   ├── backup.ts [7,79 KiB | tracked]
│   ├── inventory.ts [7,84 KiB | tracked]
│   ├── run-backup.js [5,00 KiB | tracked]
│   ├── tsconfig.json [441 B | tracked]
│   ├── types.ts [5,06 KiB | tracked]
│   └── utils.ts [12,07 KiB | tracked]
├── media/ [2,44 KiB | 2 files | 0 dirs]
│   ├── resize_homepage.js [1,23 KiB | tracked]
│   └── resize_image.ps1 [1,21 KiB | tracked]
├── analyze-heavy-files.mjs [2,83 KiB | tracked]
├── analyze-heavy-files.test.mjs [988 B | tracked]
├── audit-clerk-supabase.mjs [19,72 KiB | tracked]
├── audit-quiz-quality.mjs [345 B | tracked]
├── audit-quiz-sources.mjs [366 B | tracked]
├── audit-repository-tree.ps1 [62,12 KiB | tracked]
├── audit-supabase-migration-trees.mjs [6,51 KiB | tracked]
├── audit-vercel-ci.mjs [2,25 KiB | tracked]
├── audit-vercel-quota.mjs [6,76 KiB | tracked]
├── audit-vercel-surface.mjs [1,97 KiB | tracked]
├── check_changed_quick.ps1 [2,68 KiB | tracked]
├── check-agent-skill-mirrors.mjs [5,26 KiB | tracked]
├── check-agent-skill-mirrors.test.mjs [3,24 KiB | tracked]
├── check-doc-visuals.mjs [2,26 KiB | tracked]
├── check-documentation-governance.mjs [5,98 KiB | tracked]
├── check-github-actions-security.mjs [2,51 KiB | tracked]
├── check-github-actions-security.test.mjs [807 B | tracked]
├── check-lockfile-policy.mjs [1,32 KiB | tracked]
├── check-pages-site-route-drift.mjs [10,44 KiB | tracked]
├── check-root-file-hygiene.mjs [3,95 KiB | tracked]
├── check-root-file-hygiene.test.mjs [750 B | tracked]
├── check-stack-doc-drift.mjs [3,46 KiB | tracked]
├── check-top-heavy-files.mjs [4,70 KiB | tracked]
├── check-utf8-fr-files.mjs [2,25 KiB | tracked]
├── cicd-metrics-report.mjs [16,39 KiB | tracked]
├── cicd-metrics-report.test.mjs [549 B | tracked]
├── clean-dev-cache.mjs [596 B | tracked]
├── clean-local-temp.mjs [3,73 KiB | tracked]
├── clean-workspace-safe.mjs [7,77 KiB | tracked]
├── clean-workspace-safe.test.mjs [2,44 KiB | tracked]
├── codex-performance-diagnostic.ps1 [12,57 KiB | tracked]
├── context-budget-check.mjs [2,62 KiB | tracked]
├── dev-with-fallback-port.mjs [4,68 KiB | tracked]
├── export-clerk-users.mjs [7,61 KiB | tracked]
├── export-clerk-users.test.mjs [1,29 KiB | tracked]
├── fix_forms_and_map.js [3,56 KiB | tracked]
├── generate-design-system-board.mjs [23,30 KiB | tracked]
├── generate-modularization-report.mjs [3,62 KiB | tracked]
├── generate-modularization-report.test.mjs [804 B | tracked]
├── generate-vercel-surface-report.mjs [15,99 KiB | tracked]
├── heavy-files-baseline.json [20 B | tracked]
├── inject_skeletons.js [2,59 KiB | tracked]
├── install_git_hooks.ps1 [557 B | tracked]
├── lint-audit-direct.js [10,44 KiB | tracked]
├── lint-audit-direct.test.js [1,30 KiB | tracked]
├── migrate-phase-4.js [7,39 KiB | tracked]
├── normalize-report-language.mjs [4,54 KiB | tracked]
├── normalize-scientific-typography.mjs [3,98 KiB | tracked]
├── package.json [363 B | tracked]
├── pre_push_guard.ps1 [1,80 KiB | tracked]
├── pre-release-check.mjs [3,90 KiB | tracked]
├── pre-release-check.test.mjs [926 B | tracked]
├── refactor_ui.js [3,82 KiB | tracked]
├── report-local-dev-processes.mjs [3,25 KiB | tracked]
├── run_checks.ps1 [3,40 KiB | tracked]
├── run_checks2.ps1 [9,79 KiB | tracked]
├── run_focus.ps1 [1,70 KiB | tracked]
├── secret-audit.allowlist.json [7,22 KiB | tracked]
├── secret-audit.mjs [10,16 KiB | tracked]
├── session_bootstrap.mjs [837 B | tracked]
├── setup_test_env.ps1 [248 B | tracked]
├── split-bibliography.mjs [4,26 KiB | tracked]
├── summarize-jsonl.mjs [8,99 KiB | tracked]
├── summarize-jsonl.test.mjs [533 B | tracked]
├── test-cigarette-conversion.js [1,66 KiB | tracked]
├── top-heavy-files.mjs [3,74 KiB | tracked]
├── unblock_repo_access.ps1 [2,25 KiB | tracked]
├── update_session_memory.mjs [3,64 KiB | tracked]
├── update-audit-stats.mjs [15,39 KiB | tracked]
├── upgrade-map-ui.js [10,18 KiB | tracked]
├── validation-policy.mjs [10,23 KiB | tracked]
├── validation-policy.test.mjs [2,64 KiB | tracked]
├── vercel-api-routes-baseline.json [4,50 KiB | tracked]
├── vercel-audit-core.mjs [10,96 KiB | tracked]
└── vercel-quota-audit-baseline.json [6,12 KiB | tracked]
```
