# Change Log

## 2026-04-09

### E09 destructive cleanup: Streamlit legacy removed

- **What changed**
  - Removed legacy Streamlit runtime surface and related references:
    - `app.py`
    - `src/ui/*`
    - `src/services/*`
    - legacy helper modules/tests/docs tied to this runtime
  - Removed obsolete UI inventory tooling/docs:
    - `scripts/ui_inventory.py`
    - `scripts/regenerate_ui_inventory_baseline.py`
    - UI inventory documentation/artifacts (now removed)
  - Updated active maintenance references to `python scripts/ci_cleanup.py --root . --check`.

- **Why**
  - Align the repository with the active Next.js runtime and reduce stale maintenance surface.
  - Eliminate broken references after legacy deletion.

- **Validation**
  - `pytest -q`
  - `npm --prefix apps/web run lint`
  - `npm --prefix apps/web run test`
  - `npm --prefix apps/web run build`

### Note on historical entries

- Older changelog entries intentionally reference now-deleted legacy files (`app.py`, `src/ui/*`, `src/services/*`) because they describe past changes.
- Entries related to legacy UI inventory tooling are also kept for audit traceability, even when files are no longer present.
- These historical entries are not part of the current Next.js runtime surface.

## 2026-03-28

### Navigation update: public sandbox moved to section 1

- **What changed**
  - Reordered primary navigation tab sequence in `app.py` so `sandbox` is surfaced at the top with first-journey public sections (`home`, `declaration`, `map`).
  - Added `history` back to `tab_specs` to keep this section reachable from the main navigation flow.
  - Updated top navigation guidance text to clarify that the first section now supports public map/form testing.

- **Why**
  - Make the public discovery/testing path easier and more immediate.
  - Reduce friction for first-time users who want to understand how map + form behave before deeper sections.

- **Validation**
  - `python -m py_compile app.py` passed
  - `pytest -q` passed (`71 passed`)

### Repo access unblock hardening (Windows)

- **What changed**
  - Added a dedicated unblock script:
    - `scripts/unblock_repo_access.ps1`
  - Applied immediate repo access hardening on the current workspace:
    - ACL FullControl for current user on repo tree,
    - `git core.longpaths=true`,
    - repo added to git `safe.directory`,
    - write-access probes validated on key files.

- **Why**
  - Remove recurring local `Access denied` blockers caused by process locks / permissions drift.
  - Provide one repeatable command for non-destructive recovery.

- **Validation**
  - `powershell -ExecutionPolicy Bypass -File scripts/unblock_repo_access.ps1 -Root .` passed
  - Read/write probes: `app.py`, `README.md`, `documentation/repo-docs/wiki/CHANGELOG.md` passed

### UX text cleanup pass (historical mojibake)

- **What changed**
  - Hardened runtime UI text repair in:
    - `src/text_utils.py`
  - Removed silent duplicate override of `_repair_mojibake_text` in:
    - `app.py`
  - Added stronger regression tests for double-encoded/degraded text and patched Streamlit labels/help:
    - `tests/test_text_utils.py`

- **Why**
  - Some historical UI strings were still readable but visually degraded.
  - The objective was to improve wording quality without changing business logic or critical flows.

- **Validation**
  - `py -3 -m pytest -q` passed
  - `npx.cmd playwright test tests/e2e/specs/critical-flows.spec.js` passed

### P2 robustness, vectorization, encoding, and E2E expansion

- **What changed**
  - Added structured JSON logging module:
    - `src/logging_utils.py`
  - Replaced broad/silent exception handlers in critical paths with targeted exceptions + explicit logs:
    - `app.py`
    - `src/map_utils.py`
    - `src/ui/map.py`
    - `src/ui/report.py`
    - `src/ui/admin_components/auth.py`
    - `src/services/sheet_actions.py`
    - `src/report_generator.py`
    - `src/data_loader.py`
  - Performance/vectorization pass:
    - added vectorized helpers in `src/map_utils.py`:
      - `compute_score_components`
      - `compute_score_series`
      - `haversine_distance_km`
    - vectorized:
      - `calculate_trends`
      - `get_heatmap_data`
      - `generate_ai_route` scoring path
      - route candidate distance filter in `app.py` (no `apply(axis=1)`).
  - Added encoding normalization command:
    - `scripts/normalize_utf8.py` (`--check`, `--write`)
    - explicit CI gate in `.github/workflows/ci.yml`.
  - Expanded E2E critical flow coverage:
    - `tests/e2e/specs/critical-flows.spec.js` adds declaration(seed) -> admin moderation -> CSV/PDF export scenario.
    - `tests/e2e/playwright.config.cjs` adds admin test-only env setup:
      - `CLEANMYMAP_E2E_MODE=1`
      - `CLEANMYMAP_E2E_ADMIN_EMAIL`
      - admin allowlist/secret test values.

- **Tests**
  - Added/updated unit tests:
    - `tests/test_map_utils_vectorization.py`
    - `tests/test_normalize_utf8.py`
  - Updated E2E suite:
    - `tests/e2e/specs/critical-flows.spec.js`

### P2 completion pass (explicit contracts and residual cleanup)

- **What changed**
  - Removed silent schema-migration fallbacks in `src/database.py`:
    - `ALTER TABLE ...` retro-compat paths now go through `_alter_table_add_column(...)` with structured logging.
  - Finalized map performance contract in `src/map_utils.py`:
    - added `build_heatmap_series(df)` and aligned `get_heatmap_data(df)` to consume this vectorized contract.
  - Isolated E2E-only admin fallback in `src/services/admin_auth.py`:
    - `get_e2e_admin_email_fallback(...)` returns a fallback email only when `CLEANMYMAP_E2E_MODE=1`.
  - Hardened encoding maintenance script and coverage:
    - `scripts/normalize_utf8.py` improved deterministic mojibake repair strategy.
    - new tests validate `--check`/`--write` behavior.
  - UX wording cleanup (low-risk) in map popups:
    - replaced legacy degraded labels with clear wording in `src/map_utils.py`.

- **Tests**
  - Added/updated:
    - `tests/test_logging_utils.py`
    - `tests/test_admin_auth.py`
    - `tests/test_map_utils_vectorization.py`
    - `tests/test_normalize_utf8.py`
  - Validation run:
    - `pytest -q` passed
    - `python scripts/normalize_utf8.py --check` passed
    - `python scripts/ci_cleanup.py --root . --check` passed
    - `npx.cmd playwright test tests/e2e/specs/critical-flows.spec.js` passed

### P1 security and rerun-cost hardening

- **What changed**
  - Added centralized popup sanitizer in `src/map_utils.py`:
    - `sanitize_popup_row()` (+ `SanitizedPopupRow`) now normalizes null/NaN, truncates dynamic text, and provides escaped values for HTML interpolation.
  - Enforced sanitizer usage in map rendering paths:
    - `app.py` map builder now uses sanitized popup rows before popup/tooltip creation.
    - `src/map_generator.py` updated to sanitize tooltip/popup inputs.
  - Public community validation now consumes redacted previews only:
    - added `PendingPublicPreview` dataclass in `src/models/domain.py`
    - added `build_pending_public_previews()` in `src/services/community_validation.py`
    - `app.py` now passes redacted previews to `src/pages/community_validation.py`
    - removed public exposure of pending `adresse`, `association`, and precise `date`.
  - Admin allowlist behavior is now strict deny on empty config:
    - `src/services/admin_auth.py::is_allowed_admin_email` returns `False` when allowlist is empty.
  - Badge reliability hardened to avoid fictive KPI fallback:
    - added `evaluate_badges()` in `src/map_utils.py`
    - heavy-lifter badge is skipped when `total_kg` KPI is unavailable/invalid, with explicit warning.
  - Active-tab rerun optimization:
    - root tab blocks in `app.py` now gated by `if active == ...` to avoid execution of inactive sections.
    - global heavy dataset preload removed; public datasets are now loaded lazily via `load_public_data_bundle()` for relevant tabs only.

- **Tests**
  - Unit tests updated/added:
    - `tests/test_admin_auth.py`
    - `tests/test_map_utils_popup_security.py`
    - `tests/test_pending_public_preview.py`
    - `tests/test_map_generator_security.py`
    - `tests/test_domain_models.py`
  - E2E suite expanded:
    - `tests/e2e/specs/critical-flows.spec.js` now covers report flow, map XSS regression, pending redaction, and maintenance diagnostic behavior.

- **Validation**
  - `pytest -q` passed
  - `npx.cmd playwright test tests/e2e/specs/critical-flows.spec.js` passed

- **Compatibility notes**
  - Admin access remains blocked until `CLEANMYMAP_ADMIN_EMAILS` is configured when allowlist enforcement is enabled.
  - Community pending public cards intentionally show less context (security redaction by design).

### Maintenance diagnostic shared engine (CLI + UI)

- **What changed**
  - Added shared read-only audit engine:
    - `src/maintenance/cleanup_audit.py`
  - Updated CLI check script to use this engine directly:
    - `scripts/ci_cleanup.py`
  - Updated UI maintenance action to use the same engine (no shell call):
    - `app.py` (Espace Collectivites)
  - Added cache/cooldown controls for UI usage:
    - short cache TTL (5 min),
    - per-session cooldown (~45s).
  - Added tests:
    - `tests/test_cleanup_audit.py`
    - `tests/test_ci_cleanup_cli.py`
    - updated `tests/test_maintenance_service.py`
    - E2E coverage added in `tests/e2e/specs/critical-flows.spec.js` (maintenance scenario).

- **Why**
  - Ensure one diagnostic logic for both CI and UI.
  - Keep diagnostics non-destructive and understandable for non-technical users.
  - Protect app usage from repeated expensive reruns.

- **Validation**
  - `pytest -q tests/test_cleanup_audit.py tests/test_ci_cleanup_cli.py tests/test_maintenance_service.py tests/test_ui_inventory_cli.py` passed
  - `python scripts/ci_cleanup.py --root . --check` passed
  - `npx.cmd playwright test tests/e2e/specs/critical-flows.spec.js -g \"Flux maintenance\"` skipped in this environment when CTA is not rendered.

### UI inventory CLI unified + baseline migration + dedicated workflow

- **What changed**
  - Added unified cross-platform CLI module:
    - `scripts/ui_inventory.py`
    - subcommands: `regenerate`, `check`, `cleanup`
  - Added Python module entry support for scripts:
    - `scripts/__init__.py`
  - Migrated canonical baseline path to a wiki artifact (historical, removed in later cleanup).
  - Kept backward compatibility with a deprecation shim:
    - `scripts/regenerate_ui_inventory_baseline.py` now delegates to `python -m scripts.ui_inventory regenerate --write-baseline`
  - Added dedicated warn-only inventory workflow:
    - `.github/workflows/ui-inventory.yml`
  - Added npm aliases for developer UX:
    - `ui:inventory:regen`, `ui:inventory:check`, `ui:inventory:cleanup`
  - Added CLI-focused test coverage:
    - `tests/test_ui_inventory_cli.py`

- **Why**
  - Replace implicit/legacy command usage with one explicit command surface.
  - Keep inventory checks portable and automation-friendly.
  - Make drift visible in CI without blocking delivery while policy is warn-only.

- **Where**
  - `scripts/ui_inventory.py`
  - `scripts/regenerate_ui_inventory_baseline.py`
  - `scripts/__init__.py`
  - `.github/workflows/ui-inventory.yml`
  - `src/services/maintenance.py`
  - `tests/test_ui_inventory_cli.py`
  - `tests/test_maintenance_service.py`
  - `README.md`
  - `documentation/repo-docs/wiki/MAINTENANCE.md`
  - historical UI inventory docs (removed)

- **Validation**
  - `pytest -q tests/test_ui_inventory_cli.py tests/test_maintenance_service.py`
  - `python -m scripts.ui_inventory regenerate --write-baseline`
  - `python -m scripts.ui_inventory check`

- **Compatibility notes**
  - Legacy regeneration command still works but is deprecated.
  - Drift exit code is standardized to `3` for the new inventory CLI.
  - Runtime artifacts are now written under `artifacts/` and excluded via `.gitignore`.

### Maintenance commands productized + CI integration + UI diagnostic

- **What changed**
  - Added a shared maintenance service: `src/services/maintenance.py`.
  - Added portable baseline regeneration command:
    - `python scripts/regenerate_ui_inventory_baseline.py --root .`
  - Added explicit cleanup check command:
    - `python scripts/ci_cleanup.py --root . --check`
  - Added baseline file (historical, removed in later cleanup).
  - Added explicit cleanup check step to primary CI pipeline:
    - `.github/workflows/ci.yml` (`Cleanup diagnostic check (non-destructive)`).
  - Added UI maintenance action in `Espace Collectivités`:
    - button `diagnostic maintenance (lecture seule)` with read-only report.
  - Added tests for maintenance diagnostic behavior:
    - `tests/test_maintenance_service.py`.
  - Updated documentation in both `README.md` and wiki (`documentation/repo-docs/wiki/MAINTENANCE.md`).

- **Why**
  - Clarify and stabilize project hygiene workflow.
  - Remove Windows-only command coupling (`set PYTHONPATH=%CD% ...`).
  - Make cleanup verification explicit and visible in main CI logs.
  - Provide a non-technical, non-destructive diagnostic path from the UI.

- **Where**
  - `src/services/maintenance.py`
  - `scripts/regenerate_ui_inventory_baseline.py`
  - `scripts/ci_cleanup.py`
  - historical UI inventory baseline artifact (removed)
  - `.github/workflows/ci.yml`
  - `scripts/run_checks.ps1`
  - `app.py` (collectivités maintenance section)
  - `tests/test_maintenance_service.py`
  - `README.md`
  - `documentation/repo-docs/wiki/MAINTENANCE.md`
  - `documentation/repo-docs/wiki/README.md`

- **Validation**
  - `python scripts/regenerate_ui_inventory_baseline.py --root .` passed
  - `python scripts/ci_cleanup.py --root . --check` passed
  - `pytest -q tests/test_maintenance_service.py` passed

- **Compatibility notes**
  - Baseline file must be intentionally regenerated when UI inventory changes are expected.
  - The UI maintenance action is read-only and should not alter runtime behavior outside diagnostics.

### Admin UI decomposition into sub-components

- **What changed**
  - Split `src/ui/admin.py` into dedicated sub-components:
    - `src/ui/admin_components/auth.py`
    - `src/ui/admin_components/map_review.py`
    - `src/ui/admin_components/moderation.py`
    - `src/ui/admin_components/exports.py`
  - Reduced `AdminTabContext` width in `src/ui/admin.py` by moving domain dependencies into sub-components.
  - Kept orchestration centralized in `src/ui/admin.py`.

- **Why**
  - Reduce coupling in admin UI and improve maintainability.
  - Make responsibilities explicit and easier to evolve/test independently.

- **Where**
  - `src/ui/admin.py`
  - `src/ui/admin_components/auth.py`
  - `src/ui/admin_components/map_review.py`
  - `src/ui/admin_components/moderation.py`
  - `src/ui/admin_components/exports.py`
  - `app.py` (updated `AdminTabContext` wiring)

- **Validation**
  - `python -m py_compile app.py src/ui/admin.py src/ui/admin_components/*.py` (equivalent per-file runs) passed
  - `pytest -q` passed
  - `npx.cmd playwright test` passed

- **Compatibility notes**
  - No intended behavior change in admin flows (auth, map review, moderation, exports).
  - A non-blocking Tornado `WebSocketClosedError` may appear when Playwright closes the server connection at teardown.

## 2026-03-27

### UI modular split + explicit domain models

- **What changed**
  - Extracted major UI blocks from `app.py` into dedicated modules:
    - `src/ui/map.py`
    - `src/ui/report.py`
    - `src/ui/admin.py`
  - Added typed context objects for these UI modules (`MapTabContext`, `ReportTabContext`, `AdminTabContext`) to make dependencies explicit.
  - Added domain dataclasses in `src/models/domain.py`:
    - `CriticalZoneStat`
    - `ImpactPeriodStats`
    - `SubmissionPrecheck`
    - `SheetActionRecord`
  - Wired service layer to use these models in critical paths (`impact_reporting`, `sheet_actions`).

- **Why**
  - Continue reducing `app.py` monolith size and coupling.
  - Improve readability, maintainability, and testability of UI and business flows.
  - Replace implicit dict-only contracts with explicit typed structures.

- **Where**
  - `app.py`
  - `src/ui/map.py`
  - `src/ui/report.py`
  - `src/ui/admin.py`
  - `src/models/domain.py`
  - `src/models/__init__.py`
  - `src/services/impact_reporting.py`
  - `src/services/sheet_actions.py`
  - `tests/test_domain_models.py`

- **Validation**
  - `python -m py_compile app.py src/ui/map.py src/ui/report.py src/ui/admin.py src/models/domain.py src/services/impact_reporting.py src/services/sheet_actions.py` passed
  - `pytest -q` passed
  - `npx.cmd playwright test` passed

- **Compatibility notes**
  - No public UI behavior intentionally changed.
  - `app.py` now delegates tab rendering to UI modules through explicit context injection.

### App monolith split (dedicated pass)

- **What changed**
  - Extracted impact/reporting logic from `app.py` into `src/services/impact_reporting.py`.
  - Extracted Google Sheet ingestion and address matching logic from `app.py` into `src/services/sheet_actions.py`.
  - Kept thin wrappers in `app.py` (`build_public_pdf`, `load_sheet_actions`) to preserve runtime behavior while reducing coupling.
  - Added new unit tests for both service modules.

- **Why**
  - Reduce `app.py` size and coupling between UI, data import, and reporting concerns.
  - Improve testability and long-term maintainability of critical business logic.

- **Where**
  - `app.py`
  - `src/services/impact_reporting.py`
  - `src/services/sheet_actions.py`
  - `tests/test_impact_reporting_service.py`
  - `tests/test_sheet_actions_service.py`
  - `tests/e2e/specs/critical-flows.spec.js` (regex hardened for encoding variants)

- **Validation**
  - `python -m py_compile (rg --files -g \"*.py\")` passed
  - `pytest -q` passed
  - `npx.cmd playwright test` passed

- **Compatibility notes**
  - `build_public_pdf` now routes through service layer and explicitly receives UI language via wrapper.
  - No breaking API change in app call sites; wrapper signatures preserved.

### Security hardening and badge reliability updates

- **What changed**
  - Escaped dynamic user fields in map popups to reduce stored XSS exposure.
  - Added explicit admin allowlist configuration guard (`CLEANMYMAP_ADMIN_REQUIRE_ALLOWLIST`, default enabled).
  - Replaced hardcoded badge fallback (`total_kg = 10`) with real per-user impact stats from DB.

- **Why**
  - Remove implicit unsafe HTML rendering paths.
  - Avoid permissive admin access due to missing configuration.
  - Keep gamification outputs tied to real observed data.

- **Where**
  - `src/map_utils.py` (`create_premium_popup`)
  - `app.py` (admin access guard and badge stats source)
  - `src/services/admin_auth.py` (`is_allowlist_config_valid`)
  - `src/database.py` (`get_user_impact_stats`)
  - `tests/test_map_utils_popup_security.py`
  - `tests/test_database_user_impact.py`
  - `tests/test_admin_auth.py`

- **Validation**
  - `pytest -q` passed (updated suite with new tests)

- **Compatibility notes**
  - If `CLEANMYMAP_ADMIN_EMAILS` is empty and `CLEANMYMAP_ADMIN_REQUIRE_ALLOWLIST=1` (default), admin tab access is blocked until configured.
  - Popup rendering now escapes HTML input, so previously injected HTML snippets are displayed as text.

### Volunteer feedback form added at bottom of declaration flow

- **What changed**
  - Added a second form for volunteers to submit website improvement suggestions and bug reports.
  - Added free-text input, French labels, submit button, and empty-input validation.
  - Persisted feedback in database table `volunteer_feedback`.

- **Why**
  - Enable field users to report friction, propose improvements, and surface bugs directly from the action declaration experience.

- **Where**
  - `app.py` (new feedback form in declaration tab)
  - `src/data_quality.py` (`validate_feedback_input`)
  - `src/database.py` (`volunteer_feedback` table and data access functions)
  - `tests/test_data_quality.py` (validation tests)

- **Validation**
  - `pytest -q` passed
  - `npx.cmd playwright test` passed

- **Compatibility notes**
  - Non-breaking UI addition.
  - Requires DB initialization path (`init_db`) to run so the new table/index exist.

### P3 strict separation: code vs runtime SQLite

- **What changed**
  - Runtime DB path resolver added in `src/database.py` with priority:
    1. `CLEANMYMAP_DB_PATH`
    2. OS fallback outside repository state directory.
  - Runtime DB parent folder creation is automatic before `sqlite3.connect(...)`.
  - Effective DB path is logged as structured event `db_path_resolved`.
  - Runtime DB git hygiene enforced:
    - `.gitignore` updated for SQLite runtime files (`.db`, `-wal`, `-shm` patterns and runtime folder).
    - `data/cleanmymap.db` removed from git index (forward-only, local file preserved).
  - New deterministic runtime init/seed flow:
    - script: `scripts/init_runtime_db.py`
    - seed dataset: `data/seed/runtime_seed_anonymized.json`
  - Utility script alignment:
    - `scripts/check_db.py` now uses resolved runtime DB path.
  - CI hard guardrail added:
    - `scripts/check_runtime_db_tracking.py`
    - wired in `.github/workflows/ci.yml`.

- **Tests**
  - Added:
    - `tests/test_database_path_resolution.py`
    - `tests/test_init_runtime_db.py`
    - `tests/test_runtime_db_tracking.py`

### UI refresh aligned with Figma-style direction

- **What changed**
  - Updated visual tokens in `app.py` (`inject_visual_polish`) to a civic eco-dashboard direction:
    - deep navy + cyan + forest green palette,
    - refined background gradients and section shells,
    - stronger active states for rubric pills and tabs,
    - improved CTA button gradients and shadows.
  - No business logic changes; only presentation-level CSS adjustments.

- **Why**
  - Improve readability, visual hierarchy, and navigation clarity while keeping the existing information architecture and workflow intact.

- **Validation**
  - `python -m py_compile app.py` passed
  - `pytest -q` passed
