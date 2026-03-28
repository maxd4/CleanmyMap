# Maintenance Commands and UI Diagnostic

## Scope

This page documents the productized UI inventory workflow:
- baseline regeneration,
- drift checks,
- cleanup diagnostics,
- CI behavior,
- and the non-destructive maintenance action in the app UI.

## Shared cleanup audit engine

Single source of truth for cleanup verification:
- module: `src/maintenance/cleanup_audit.py`
- entrypoint: `run_cleanup_audit(root_path: Path) -> CleanupAuditReport`

Both CLI and UI now use this same read-only engine.

Current rule families:
- runtime artifacts protection (gitignore/runtime hygiene),
- UTF-8 BOM detection on text files,
- required README/wiki wiring checks.

Dedicated encoding normalization CLI:
- `scripts/normalize_utf8.py`
- modes:
  - `--check`: fail when tracked text files are not normalized,
  - `--write`: normalize tracked text files to UTF-8 (no BOM) and apply deterministic mojibake fixes.

## Canonical artifacts

- Baseline (committed): `docs/wiki/ui_inventory.baseline.json`
- Current runtime snapshot (non-committed): `artifacts/ui_inventory.current.json`
- Drift report (non-committed): `artifacts/ui_inventory.diff.md`

## Command surface (cross-platform)

Primary CLI module:
- `python -m scripts.ui_inventory`

Subcommands:
- `regenerate`:
  - default: writes current snapshot only
  - with `--write-baseline`: updates committed baseline
- `check`:
  - compares baseline vs current inventory
  - exit code `0` when no drift
  - exit code `3` when drift is detected
- `cleanup`:
  - diagnostic only by default (`--dry-run`)
  - reports stale/orphan UI references
  - does not mutate source files in dry-run mode

Standard exit codes:
- `0`: success / no drift
- `3`: drift detected
- `>=10`: runtime, parsing, or configuration error

## Backward compatibility shim

Legacy command still works and delegates to the new CLI:
- `python scripts/regenerate_ui_inventory_baseline.py --root .`

Deprecation note is printed and the equivalent command is:
- `python -m scripts.ui_inventory regenerate --write-baseline`

## Recommended workflow

- Developers/maintainers run:
  - `python -m scripts.ui_inventory regenerate --write-baseline`
  - only for intentional UI structure changes.
- Local pre-PR checks:
  - `python -m scripts.ui_inventory check`
- Optional hygiene diagnostic:
  - `python -m scripts.ui_inventory cleanup --dry-run`

## Repo access unblock (Windows)

When local tooling reports `Access denied` or files appear locked:
- Run:
  - `powershell -ExecutionPolicy Bypass -File scripts/unblock_repo_access.ps1 -Root .`
- The script performs:
  - optional stop of repo-scoped `python/node/streamlit` processes,
  - read-only attribute cleanup outside `.git`,
  - ACL FullControl grant for current user on repo tree,
  - git hardening (`core.longpaths=true`, `safe.directory`),
  - read/write probes on key files.

## Difference between commands

- `regenerate --write-baseline` updates the reference contract.
- `check` validates current code against this contract.
- `cleanup --dry-run` explains what should be cleaned without rewriting files.

## CI integration

Main CI workflow (hard check):
- `.github/workflows/ci.yml`
- explicit step: `python scripts/ci_cleanup.py --root . --check`
- explicit step: `python scripts/normalize_utf8.py --root . --check`
- script behavior: read-only cleanup verification using shared engine, non-zero only on error rules.

Dedicated UI inventory workflow (warn-only drift):
- `.github/workflows/ui-inventory.yml`
- runs: `python -m scripts.ui_inventory check`
- behavior:
  - drift (`exit 3`) creates warning annotation and uploads artifacts,
  - runtime/parser/config errors (`>=10`) fail the job.

## UI maintenance action for non-technical colleagues

- Location: `Espace Collectivites` > `maintenance & sauvegarde`
- Action: `Lancer un diagnostic maintenance (sans modification)`
- Behavior:
  - runs a read-only maintenance diagnostic,
  - displays business-friendly status (`Conforme` / `Points a corriger`),
  - displays plain-language rule outcomes and recommended actions,
  - hides raw technical details by default (optional expander),
  - uses short cache TTL (5 min) and per-session cooldown (~45s),
  - never deletes, rewrites, or alters project files.

## Runtime SQLite separation (P3)

### Official runtime DB contract
- Env variable: `CLEANMYMAP_DB_PATH`
- Resolution order in `src/database.py`:
  1. `CLEANMYMAP_DB_PATH`
  2. OS state path outside repository:
     - Windows: `%LOCALAPPDATA%/CleanMyMap/runtime/cleanmymap.db`
     - Linux/macOS: `${XDG_STATE_HOME:-~/.local/state}/cleanmymap/runtime/cleanmymap.db`
- Parent directory is created automatically before SQLite connection.
- Effective path is logged once per process via structured event `db_path_resolved`.

### Runtime DB initialization and anonymized seed
- Script: `scripts/init_runtime_db.py`
- Commands:
  - `python scripts/init_runtime_db.py`
  - `python scripts/init_runtime_db.py --seed data/seed/runtime_seed_anonymized.json`
  - `python scripts/init_runtime_db.py --db-path <path> --seed data/seed/runtime_seed_anonymized.json`
  - `python scripts/init_runtime_db.py --db-path <path> --seed data/seed/runtime_seed_anonymized.json --reset-seeded-tables`
- Seed file (versioned): `data/seed/runtime_seed_anonymized.json`
- Runtime DB data remains non-versioned.

### CI guardrail (hard fail)
- Script: `scripts/check_runtime_db_tracking.py`
- Main CI step:
  - `python scripts/check_runtime_db_tracking.py --root .`
- Fails clearly if runtime SQLite files are tracked in git.
