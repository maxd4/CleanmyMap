# `maintenance/`

| Metrique | Valeur |
| --- | ---: |
| Taille recursive | 252,87 KiB (258936 octets) |
| Fichiers | 59 |
| Sous-dossiers | 9 |
| Profondeur maximale | 5 |
| Tracked | 57 |
| Untracked | 0 |
| Ignored | 2 |
| Other | 0 |
| Fichiers source inventories | 52 |
| Fichiers source tracked | 52 |
| Fichiers source tracked top-heavy | 1 |
| Max lignes source tracked | 2329 |

## Extensions

| Extension | Fichiers | Taille |
| --- | ---: | ---: |
| `.py` | 52 | 242,03 KiB |
| `.md` | 2 | 2,71 KiB |
| `.txt` | 2 | 313 B |
| `.env` | 1 | 103 B |
| `.ini` | 1 | 29 B |
| `.pyc` | 1 | 7,69 KiB |

## 20 plus gros fichiers

| Fichier | Taille | Git |
| --- | ---: | --- |
| `maintenance/python/src/report_generator.py` | 112,33 KiB | tracked |
| `maintenance/python/src/maintenance/cleanup_audit.py` | 11,39 KiB | tracked |
| `maintenance/python/scripts/generate_project_pdfs.py` | 9,98 KiB | tracked |
| `maintenance/python/src/database.py` | 9,32 KiB | tracked |
| `maintenance/python/scripts/import_sheet.py` | 8,04 KiB | tracked |
| `maintenance/python/src/services/partner_service.py` | 7,74 KiB | tracked |
| `maintenance/python/src/services/partner_service.cpython-312.pyc` | 7,69 KiB | ignored |
| `maintenance/python/scripts/normalize_utf8.py` | 7,03 KiB | tracked |
| `maintenance/python/src/fixtures/test_data.py` | 6,57 KiB | tracked |
| `maintenance/python/tests/test_cleanup_audit.py` | 4,81 KiB | tracked |
| `maintenance/python/src/repositories/community_repo.py` | 4,37 KiB | tracked |
| `maintenance/python/scripts/init_runtime_db.py` | 4,22 KiB | tracked |
| `maintenance/python/src/repositories/submissions_repo.py` | 4,01 KiB | tracked |
| `maintenance/python/src/text_utils.py` | 3,70 KiB | tracked |
| `maintenance/python/src/predictive_ai.py` | 3,33 KiB | tracked |
| `maintenance/python/src/repositories/admin_repo.py` | 2,96 KiB | tracked |
| `maintenance/python/src/mailer.py` | 2,94 KiB | tracked |
| `maintenance/python/tests/test_normalize_utf8.py` | 2,59 KiB | tracked |
| `maintenance/python/src/analytics.py` | 2,34 KiB | tracked |
| `maintenance/python/src/data_quality.py` | 2,16 KiB | tracked |

## 20 plus gros sous-arbres

| Dossier | Taille recursive | Fichiers | Dossiers |
| --- | ---: | ---: | ---: |
| `maintenance/python/` | 252,87 KiB | 59 | 8 |
| `maintenance/python/src/` | 193,33 KiB | 28 | 5 |
| `maintenance/python/scripts/` | 34,50 KiB | 9 | 0 |
| `maintenance/python/tests/` | 21,89 KiB | 16 | 0 |
| `maintenance/python/src/services/` | 15,43 KiB | 2 | 0 |
| `maintenance/python/src/maintenance/` | 12,77 KiB | 3 | 0 |
| `maintenance/python/src/repositories/` | 11,66 KiB | 5 | 0 |
| `maintenance/python/src/fixtures/` | 6,57 KiB | 1 | 0 |
| `maintenance/python/src/models/` | 1,85 KiB | 2 | 0 |

## Arborescence exhaustive

```text
maintenance/ [252,87 KiB | 59 files | 9 dirs]
└── python/ [252,87 KiB | 59 files | 8 dirs]
    ├── scripts/ [34,50 KiB | 9 files | 0 dirs]
    │   ├── __init__.py [44 B | tracked]
    │   ├── check_db.py [806 B | tracked]
    │   ├── check_runtime_db_tracking.py [1,89 KiB | tracked]
    │   ├── ci_cleanup.py [1,78 KiB | tracked]
    │   ├── generate_project_pdfs.py [9,98 KiB | tracked]
    │   ├── import_sheet.py [8,04 KiB | tracked]
    │   ├── init_runtime_db.py [4,22 KiB | tracked]
    │   ├── normalize_utf8.py [7,03 KiB | tracked]
    │   └── test_db_direct.py [738 B | tracked]
    ├── src/ [193,33 KiB | 28 files | 5 dirs]
    │   ├── fixtures/ [6,57 KiB | 1 files | 0 dirs]
    │   │   └── test_data.py [6,57 KiB | tracked]
    │   ├── maintenance/ [12,77 KiB | 3 files | 0 dirs]
    │   │   ├── __init__.py [285 B | tracked]
    │   │   ├── _common.py [1,10 KiB | tracked]
    │   │   └── cleanup_audit.py [11,39 KiB | tracked]
    │   ├── models/ [1,85 KiB | 2 files | 0 dirs]
    │   │   ├── __init__.py [285 B | tracked]
    │   │   └── domain.py [1,57 KiB | tracked]
    │   ├── repositories/ [11,66 KiB | 5 files | 0 dirs]
    │   │   ├── __init__.py [47 B | tracked]
    │   │   ├── admin_repo.py [2,96 KiB | tracked]
    │   │   ├── community_repo.py [4,37 KiB | tracked]
    │   │   ├── submissions_repo.py [4,01 KiB | tracked]
    │   │   └── submissions_repository.py [283 B | tracked]
    │   ├── services/ [15,43 KiB | 2 files | 0 dirs]
    │   │   ├── partner_service.cpython-312.pyc [7,69 KiB | ignored]
    │   │   └── partner_service.py [7,74 KiB | tracked]
    │   ├── __init__.py [62 B | tracked]
    │   ├── analytics.py [2,34 KiB | tracked]
    │   ├── config.py [1,93 KiB | tracked]
    │   ├── data_loader.py [1,15 KiB | tracked]
    │   ├── data_quality.py [2,16 KiB | tracked]
    │   ├── database.py [9,32 KiB | tracked]
    │   ├── logging_utils.py [2,16 KiB | tracked]
    │   ├── mailer.py [2,94 KiB | tracked]
    │   ├── main.py [1,10 KiB | tracked]
    │   ├── posthog_client.py [423 B | tracked]
    │   ├── predictive_ai.py [3,33 KiB | tracked]
    │   ├── report_generator.py [112,33 KiB | tracked]
    │   ├── security_utils.py [1,41 KiB | tracked]
    │   ├── text_utils.py [3,70 KiB | tracked]
    │   └── utils.py [713 B | tracked]
    ├── tests/ [21,89 KiB | 16 files | 0 dirs]
    │   ├── __init__.py [85 B | tracked]
    │   ├── conftest.py [1,70 KiB | tracked]
    │   ├── test_ci_cleanup_cli.py [1,74 KiB | tracked]
    │   ├── test_cleanup_audit.py [4,81 KiB | tracked]
    │   ├── test_data_quality.py [1,01 KiB | tracked]
    │   ├── test_database_path_resolution.py [925 B | tracked]
    │   ├── test_database_user_impact.py [1,37 KiB | tracked]
    │   ├── test_domain_models.py [1,22 KiB | tracked]
    │   ├── test_encoding_final.py [1,69 KiB | tracked]
    │   ├── test_init_runtime_db.py [1,07 KiB | tracked]
    │   ├── test_logging_utils.py [662 B | tracked]
    │   ├── test_normalize_utf8.py [2,59 KiB | tracked]
    │   ├── test_report_generator.py [767 B | tracked]
    │   ├── test_runtime_db_tracking.py [658 B | tracked]
    │   ├── test_security_utils.py [723 B | tracked]
    │   └── test_text_utils.py [968 B | tracked]
    ├── .env [103 B | ignored]
    ├── AGENTS.md [1,30 KiB | tracked]
    ├── pytest.ini [29 B | tracked]
    ├── README.md [1,41 KiB | tracked]
    ├── requirements-dev.txt [34 B | tracked]
    └── requirements.txt [279 B | tracked]
```
