# Maintenance Commands and Project Diagnostic

## Scope

This page documents the active maintenance workflow:
- repository hygiene checks,
- UTF-8 normalization policy,
- runtime SQLite safeguards,
- CI integration.

## Shared cleanup audit engine

Single source of truth for cleanup verification:
- module: `src/maintenance/cleanup_audit.py`
- entrypoint: `run_cleanup_audit(root_path: Path) -> CleanupAuditReport`

Current rule families:
- runtime artifacts protection (gitignore/runtime hygiene),
- UTF-8 BOM detection on text files,
- required README/wiki wiring checks.

## Command surface (cross-platform)

Primary command:
- `python scripts/ci_cleanup.py --root .`

Strict check mode (non-zero on error rules):
- `python scripts/ci_cleanup.py --root . --check`

UTF-8 normalization helper:
- `python scripts/normalize_utf8.py --root . --check`
- `python scripts/normalize_utf8.py --root . --write`

Standard exit codes for `ci_cleanup.py`:
- `0`: success / no blocking error rules
- `1`: check mode failed on blocking rules

## Recommended workflow

- Local quick gate:
  - `powershell -ExecutionPolicy Bypass -File scripts/run_checks.ps1 -Scope changed -SkipE2E -SkipEncodingAutofix`
- Full Python suite when touching `src/*` or `tests/*`:
  - `pytest -q`
- Web gates when touching `apps/web/*`:
  - `npm --prefix apps/web run lint`
  - `npm --prefix apps/web run test`
  - `npm --prefix apps/web run build`

## Repo access unblock (Windows)

When local tooling reports `Access denied` or files appear locked:
- Run:
  - `powershell -ExecutionPolicy Bypass -File scripts/unblock_repo_access.ps1 -Root .`
- The script performs:
  - optional stop of repo-scoped `python/node` processes,
  - read-only attribute cleanup outside `.git`,
  - ACL FullControl grant for current user on repo tree,
  - git hardening (`core.longpaths=true`, `safe.directory`),
  - read/write probes on key tracked files.

## CI integration

Main CI workflow hard checks include:
- `python scripts/ci_cleanup.py --root . --check`
- `python scripts/normalize_utf8.py --root . --check`
- `python scripts/check_runtime_db_tracking.py --root .`

## Runtime SQLite separation

### Official runtime DB contract
- Env variable: `CLEANMYMAP_DB_PATH`
- Resolution order in `src/database.py`:
  1. `CLEANMYMAP_DB_PATH`
  2. OS state path outside repository:
     - Windows: `%LOCALAPPDATA%/CleanMyMap/runtime/cleanmymap.db`
     - Linux/macOS: `${XDG_STATE_HOME:-~/.local/state}/cleanmymap/runtime/cleanmymap.db`

### Runtime DB initialization and anonymized seed
- Script: `scripts/init_runtime_db.py`
- Commands:
  - `python scripts/init_runtime_db.py`
  - `python scripts/init_runtime_db.py --seed data/seed/runtime_seed_anonymized.json`
  - `python scripts/init_runtime_db.py --db-path <path> --seed data/seed/runtime_seed_anonymized.json`
  - `python scripts/init_runtime_db.py --db-path <path> --seed data/seed/runtime_seed_anonymized.json --reset-seeded-tables`

### CI guardrail
- Script: `scripts/check_runtime_db_tracking.py`
- Fails if runtime SQLite files are tracked in git.
