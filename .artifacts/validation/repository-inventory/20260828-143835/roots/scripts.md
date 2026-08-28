# `scripts/`

| Metrique | Valeur |
| --- | ---: |
| Taille recursive | 490,47 KiB (502239 octets) |
| Fichiers | 90 |
| Sous-dossiers | 9 |
| Profondeur maximale | 3 |
| Tracked | 90 |
| Untracked | 0 |
| Ignored | 0 |
| Other | 0 |
| Fichiers source inventories | 83 |
| Fichiers source tracked | 83 |
| Fichiers source tracked top-heavy | 1 |
| Max lignes source tracked | 1320 |

## Extensions

| Extension | Fichiers | Taille |
| --- | ---: | ---: |
| `.mjs` | 63 | 316,12 KiB |
| `.ps1` | 11 | 98,71 KiB |
| `.js` | 5 | 19,62 KiB |
| `.json` | 5 | 20,14 KiB |
| `.ts` | 4 | 32,48 KiB |
| `.md` | 2 | 3,39 KiB |

## 20 plus gros fichiers

| Fichier | Taille | Git |
| --- | ---: | --- |
| `scripts/audits/audit-repository-tree.ps1` | 62,12 KiB | tracked |
| `scripts/design/generate-design-system-board.mjs` | 23,30 KiB | tracked |
| `scripts/audits/audit-clerk-supabase.mjs` | 19,19 KiB | tracked |
| `scripts/reports/cicd-metrics-report.mjs` | 16,39 KiB | tracked |
| `scripts/reports/generate-vercel-surface-report.mjs` | 16,00 KiB | tracked |
| `scripts/reports/update-audit-stats.mjs` | 15,40 KiB | tracked |
| `scripts/checks/check-stack-doc-drift.mjs` | 13,55 KiB | tracked |
| `scripts/dev/codex-performance-diagnostic.ps1` | 12,57 KiB | tracked |
| `scripts/cleanup/utils.ts` | 12,07 KiB | tracked |
| `scripts/vercel-audit-core.mjs` | 10,96 KiB | tracked |
| `scripts/checks/lint-audit-direct.js` | 10,44 KiB | tracked |
| `scripts/checks/check-pages-site-route-drift.mjs` | 10,44 KiB | tracked |
| `scripts/checks/validation-policy.mjs` | 10,24 KiB | tracked |
| `scripts/checks/secret-audit.mjs` | 10,17 KiB | tracked |
| `scripts/ci/run_checks2.ps1` | 9,96 KiB | tracked |
| `scripts/data/summarize-jsonl.mjs` | 8,99 KiB | tracked |
| `scripts/dev/clean-workspace-safe.mjs` | 8,85 KiB | tracked |
| `scripts/audits/vercel-quota-audit-baseline.json` | 7,79 KiB | tracked |
| `scripts/cleanup/backup.ts` | 7,68 KiB | tracked |
| `scripts/cleanup/inventory.ts` | 7,67 KiB | tracked |

## 20 plus gros sous-arbres

| Dossier | Taille recursive | Fichiers | Dossiers |
| --- | ---: | ---: | ---: |
| `scripts/checks/` | 135,79 KiB | 30 | 0 |
| `scripts/audits/` | 109,93 KiB | 11 | 0 |
| `scripts/reports/` | 68,81 KiB | 11 | 0 |
| `scripts/dev/` | 46,42 KiB | 11 | 0 |
| `scripts/cleanup/` | 37,79 KiB | 6 | 0 |
| `scripts/data/` | 24,35 KiB | 6 | 0 |
| `scripts/design/` | 23,30 KiB | 1 | 0 |
| `scripts/ci/` | 22,61 KiB | 8 | 0 |
| `scripts/media/` | 2,63 KiB | 2 | 0 |

## Arborescence exhaustive

```text
scripts/ [490,47 KiB | 90 files | 9 dirs]
├── audits/ [109,93 KiB | 11 files | 0 dirs]
│   ├── audit-clerk-supabase.mjs [19,19 KiB | tracked]
│   ├── audit-gitnexus.mjs [1,86 KiB | tracked]
│   ├── audit-gitnexus.test.mjs [743 B | tracked]
│   ├── audit-quiz-quality.mjs [361 B | tracked]
│   ├── audit-quiz-sources.mjs [382 B | tracked]
│   ├── audit-repository-tree.ps1 [62,12 KiB | tracked]
│   ├── audit-supabase-migration-trees.mjs [6,51 KiB | tracked]
│   ├── audit-vercel-ci.mjs [2,25 KiB | tracked]
│   ├── audit-vercel-quota.mjs [6,78 KiB | tracked]
│   ├── audit-vercel-surface.mjs [1,97 KiB | tracked]
│   └── vercel-quota-audit-baseline.json [7,79 KiB | tracked]
├── checks/ [135,79 KiB | 30 files | 0 dirs]
│   ├── check_changed_quick.ps1 [2,68 KiB | tracked]
│   ├── check-9c-public-facades.mjs [3,33 KiB | tracked]
│   ├── check-actions-data-contract-boundary.mjs [2,03 KiB | tracked]
│   ├── check-agent-governance.mjs [7,16 KiB | tracked]
│   ├── check-agent-governance.test.mjs [4,13 KiB | tracked]
│   ├── check-agent-skill-mirrors.mjs [5,26 KiB | tracked]
│   ├── check-agent-skill-mirrors.test.mjs [3,27 KiB | tracked]
│   ├── check-doc-visuals.mjs [2,26 KiB | tracked]
│   ├── check-documentation-governance.mjs [5,45 KiB | tracked]
│   ├── check-github-actions-security.mjs [2,51 KiB | tracked]
│   ├── check-github-actions-security.test.mjs [807 B | tracked]
│   ├── check-gitnexus-hygiene.mjs [2,32 KiB | tracked]
│   ├── check-gitnexus-hygiene.test.mjs [1,78 KiB | tracked]
│   ├── check-learning-import-boundary.mjs [2,11 KiB | tracked]
│   ├── check-lockfile-policy.mjs [1,28 KiB | tracked]
│   ├── check-pages-site-route-drift.mjs [10,44 KiB | tracked]
│   ├── check-report-model-boundary.mjs [2,69 KiB | tracked]
│   ├── check-root-file-hygiene.mjs [4,72 KiB | tracked]
│   ├── check-root-file-hygiene.test.mjs [2,06 KiB | tracked]
│   ├── check-stack-doc-drift.mjs [13,55 KiB | tracked]
│   ├── check-stack-doc-drift.test.mjs [6,81 KiB | tracked]
│   ├── check-top-heavy-files.mjs [4,71 KiB | tracked]
│   ├── check-utf8-fr-files.mjs [2,25 KiB | tracked]
│   ├── heavy-files-baseline.json [20 B | tracked]
│   ├── lint-audit-direct.js [10,44 KiB | tracked]
│   ├── lint-audit-direct.test.js [1,30 KiB | tracked]
│   ├── secret-audit.allowlist.json [7,40 KiB | tracked]
│   ├── secret-audit.mjs [10,17 KiB | tracked]
│   ├── validation-policy.mjs [10,24 KiB | tracked]
│   └── validation-policy.test.mjs [2,64 KiB | tracked]
├── ci/ [22,61 KiB | 8 files | 0 dirs]
│   ├── install_git_hooks.ps1 [560 B | tracked]
│   ├── pre_push_guard.ps1 [1,95 KiB | tracked]
│   ├── pre-release-check.mjs [3,90 KiB | tracked]
│   ├── pre-release-check.test.mjs [926 B | tracked]
│   ├── run_checks.ps1 [3,40 KiB | tracked]
│   ├── run_checks2.ps1 [9,96 KiB | tracked]
│   ├── run_focus.ps1 [1,70 KiB | tracked]
│   └── setup_test_env.ps1 [248 B | tracked]
├── cleanup/ [37,79 KiB | 6 files | 0 dirs]
│   ├── backup.ts [7,68 KiB | tracked]
│   ├── inventory.ts [7,67 KiB | tracked]
│   ├── run-backup.js [4,88 KiB | tracked]
│   ├── tsconfig.json [436 B | tracked]
│   ├── types.ts [5,06 KiB | tracked]
│   └── utils.ts [12,07 KiB | tracked]
├── data/ [24,35 KiB | 6 files | 0 dirs]
│   ├── export-clerk-users.mjs [7,62 KiB | tracked]
│   ├── export-clerk-users.test.mjs [1,29 KiB | tracked]
│   ├── split-bibliography.mjs [4,26 KiB | tracked]
│   ├── summarize-jsonl.mjs [8,99 KiB | tracked]
│   ├── summarize-jsonl.test.mjs [533 B | tracked]
│   └── test-cigarette-conversion.js [1,66 KiB | tracked]
├── design/ [23,30 KiB | 1 files | 0 dirs]
│   └── generate-design-system-board.mjs [23,30 KiB | tracked]
├── dev/ [46,42 KiB | 11 files | 0 dirs]
│   ├── clean-dev-cache.mjs [599 B | tracked]
│   ├── clean-local-temp.mjs [3,73 KiB | tracked]
│   ├── clean-workspace-safe.mjs [8,85 KiB | tracked]
│   ├── clean-workspace-safe.test.mjs [3,25 KiB | tracked]
│   ├── codex-performance-diagnostic.ps1 [12,57 KiB | tracked]
│   ├── context-budget-check.mjs [3,02 KiB | tracked]
│   ├── dev-with-fallback-port.mjs [4,68 KiB | tracked]
│   ├── report-local-dev-processes.mjs [3,24 KiB | tracked]
│   ├── session_bootstrap.mjs [617 B | tracked]
│   ├── unblock_repo_access.ps1 [2,25 KiB | tracked]
│   └── update_session_memory.mjs [3,64 KiB | tracked]
├── media/ [2,63 KiB | 2 files | 0 dirs]
│   ├── resize_homepage.js [1,34 KiB | tracked]
│   └── resize_image.ps1 [1,29 KiB | tracked]
├── reports/ [68,81 KiB | 11 files | 0 dirs]
│   ├── analyze-heavy-files.mjs [2,83 KiB | tracked]
│   ├── analyze-heavy-files.test.mjs [988 B | tracked]
│   ├── cicd-metrics-report.mjs [16,39 KiB | tracked]
│   ├── cicd-metrics-report.test.mjs [549 B | tracked]
│   ├── generate-modularization-report.mjs [3,64 KiB | tracked]
│   ├── generate-modularization-report.test.mjs [804 B | tracked]
│   ├── generate-vercel-surface-report.mjs [16,00 KiB | tracked]
│   ├── normalize-report-language.mjs [4,54 KiB | tracked]
│   ├── normalize-scientific-typography.mjs [3,99 KiB | tracked]
│   ├── top-heavy-files.mjs [3,74 KiB | tracked]
│   └── update-audit-stats.mjs [15,40 KiB | tracked]
├── AGENTS.md [1,73 KiB | tracked]
├── README.md [1,65 KiB | tracked]
├── vercel-api-routes-baseline.json [4,50 KiB | tracked]
└── vercel-audit-core.mjs [10,96 KiB | tracked]
```
