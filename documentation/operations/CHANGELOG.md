# Change Log

## 2026-08-27

### Lots sécurité, performance et quotas — SEC-01, SEC-02, PERF-01, QUOTA-01

- **SEC-01 — finalisation des missions**
  - Commit : `8c1701f7950ac7160d767bc9cdf53cca36eeddfb`.
  - La finalisation calculée passe par le trigger `SECURITY INVOKER`
    `20260827100000_clerk_mission_completion_metrics_trigger.sql` lors du
    passage à `completed`.
  - Le client mobile garde le flush GPS avant l'UPDATE final et ne peut pas
    écrire directement `distance_m` ou `duration_s`.
  - La RPC authentifiée `compute_mission_distance(uuid)` n'est plus la surface
    de finalisation.

- **SEC-02 — résumés de votes de sondage**
  - Commit : `24405dbb309c305e180a1d048b29498b3e3e20d8`.
  - `get_my_chat_poll_vote_summaries(uuid[], text)` est invoker et exécutable
    uniquement par `service_role`.
  - Les routes déterminent l'identité exclusivement via Clerk, vérifient la
    visibilité avec le client Clerk-RLS, puis limitent l'appel privilégié à la
    liste autorisée. Les votes individuels et l'upsert/delete RLS restent
    protégés.

- **PERF-01 — Performance Advisor Supabase**
  - Commit : `1ba4339fb1579e844831ee952e78f8c723ed9144`.
  - Les policies signalées `auth_rls_initplan` évaluent les helpers Auth une
    fois par statement.
  - Seuls les doublons d'index explicitement ciblés ont été supprimés :
    `idx_actions_status_action_date_desc` et
    `idx_trash_spotter_spots_created_at_desc`; les index `unused_index` hors
    périmètre ont été conservés.

- **QUOTA-01 — homepage bornée**
  - Commit : `7c7d15f2017dba02186480738f1d3a5e1ef619a3`.
  - `loadLandingSummary()` remplace l'overview pilotage complet par la RPC
    agrégée `load_public_landing_action_summary(date)` et trois activités
    récentes.
  - Le loader demande `types=["action"]` et évite ainsi la lecture inutile de
    `trash_spotter_spots`. La migration est
    `20260827130000_public_landing_action_summary.sql` ; le snapshot utilise la
    clé `cleanmymap-landing-summary`, la version
    `landing-summary-2026.08-v1` et un TTL de 60 minutes.
  - Les tests ciblés du lot ont réussi : `5` fichiers, `28` tests ;
    `npm run typecheck`, lint ciblé et `npm run backend:supabase:quota-audit`
    ont également réussi.

### Vérifications production QUOTA-01

- La migration `20260827130000` a été appliquée à Supabase production dans
  une transaction et inscrite comme migration appliquée. La divergence
  d'historique a été traitée sans modifier les migrations parallèles : le
  dry-run signalait la migration distante `20260827171557`, absente du
  checkout.
- La RPC live est présente, `SECURITY INVOKER`, avec
  `search_path=pg_catalog, public`, `anon/authenticated EXECUTE=false` et
  `service_role EXECUTE=true`. L'appel privilégié a retourné exactement une
  ligne valide.
- Le déploiement Vercel
  `dpl_8xx3CCoNDWeNEffAvTwJqM6sVuQb` est `READY` sur
  `40a777add39329a7d4f6a367b3d7435bed422422`, descendant de QUOTA-01. Le
  smoke `GET https://cleanmymap.fr/` a retourné `200` entre
  `2026-08-27T18:06:40.912Z` et `2026-08-27T18:06:41.686Z`.
- Le snapshot attendu existait, mais `generated_at=2026-08-27T18:02:36.171Z`,
  antérieur au déploiement `READY` et au smoke. La page a été servie
  `PRERENDER` puis `HIT`; les logs Vercel de la fenêtre ne contenaient pas
  d'invocation runtime exploitable ni d'erreur liée à la RPC. La clôture
  runtime QUOTA-01 reste donc **partielle** : le chemin déployé et le `200`
  sont prouvés, mais pas une régénération post-déploiement du snapshot.
- `pg_stat_statements` a fourni des compteurs historiques pour la RPC, sans
  timestamp permettant d'attribuer les lectures au smoke. L'absence de lecture
  `trash_spotter_spots` et de `limit=5001` n'est donc pas affirmée comme une
  mesure runtime directement attribuée à cette fenêtre.

### OPS-01 — rate limiting Upstash

- Aucun secret n'a été affiché, ajouté ou modifié.
- La présence et la connectivité Upstash n'ont pas été prouvées par une
  invocation runtime `verifyRateLimit` attribuable à cette séquence.
- OPS-01 reste `PARTIEL / À REVALIDER` tant qu'un smoke de production et ses
  logs ne démontrent pas le chemin distribué sans `not_configured`,
  `unavailable` ni fallback mémoire.

### Validation et état du workspace

- Le premier build local a échoué sur `CONTACT_EMAIL` invalide dans
  `.env.production.local`. Un override de processus temporaire avec l'adresse
  canonique a permis un build complet réussi sans modifier la configuration.
- Les contrôles généraux avaient aussi signalé des problèmes hors périmètre :
  une erreur lint dans `use-chat-submit.ts` et un secret de test détecté dans
  `apps/mobile/vendor/image-size/package.json`. Ces fichiers appartenaient à
  des chantiers parallèles et n'ont pas été modifiés.
- Aucun commit ni push n'a été créé pour la clôture runtime ; le déploiement
  utilisé reste rattaché au SHA exact indiqué ci-dessus. Les valeurs
  `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_TOKEN`,
  `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` ne sont pas
  documentées.

## 2026-08-23

### Audit de reproductibilité locale des GitHub Actions

- **What changed**
  - Documented the jobs and local command equivalents for:
    - `.github/workflows/ci.yml`
    - `.github/workflows/codeql.yml`
  - Added the local validation sequence and the required build variables.
  - Linked the guidance from the root, development and operations documentation indexes.

- **Why**
  - Distinguish the checks that can be run before a push from the GitHub-only
    orchestration and CodeQL publication steps.

- **Where**
  - `documentation/operations/github-governance.md`
  - `README.md`
  - `documentation/development/README.md`
  - `documentation/operations/README.md`

- **Validation**
  - `npm run check:github-actions`
  - Result: `OK: 2 workflow file(s) audited.`

- **Compatibility notes**
  - Documentation-only change. No workflow, script or runtime behavior changed.
  - `documentation/repo-docs/wiki/CHANGELOG.md` is referenced by the current
    documentation policy but is absent from this checkout; this existing
    changelog remains the operational source of truth.

## 2026-06-28

### Doctrine de mémoire persistante et cycle de travail autonome

- **What changed**
  - Added a consolidated memory/governance section in:
    - the operations memory/governance entry point
  - Added development-facing references in:
    - `documentation/development/AI_MINDSET_KAIZEN.md`
    - `documentation/development/AI_DEVELOPER_GUIDE.md`
  - Surfaced the new entry point in the documentation indexes:
    - `documentation/README.md`
    - `documentation/development/README.md`
    - `documentation/operations/README.md`

- **Why**
  - Make the expected work loop explicit: plan, decompose, execute, test, fix, learn, respond.
  - Centralize the persistent-memory guidance where agents already look for session and development rules.

- **Validation**
  - Documentation links reviewed after the update.

- **Compatibility notes**
  - Documentation-only change. No runtime behavior changed.

## 2026-06-12

### Notifications: suppression du proxy Vercel au profit du client Supabase

- **What changed**
  - Removed the Vercel API route:
    - `apps/web/src/app/api/notifications/route.ts`
  - Moved notification loading and mark-as-read logic to the browser using Supabase + RLS:
    - `apps/web/src/lib/notifications/client.ts`
    - `apps/web/src/components/navigation/notification-bell.tsx`
  - Removed the obsolete protected-route entry:
    - `apps/web/src/lib/auth/protected-routes.ts`
  - Updated the API route baseline and generated Vercel reports/docs.

- **Why**
  - This route was a thin relay around `app_notifications`, and RLS already allows users to read and update their own rows.
  - Removing the proxy reduces Vercel invocations and keeps the source of access control in Supabase.

- **Validation**
  - `npm run audit:vercel:api-routes`
  - `npm run test:regression-gates -w apps/web`
  - `npm run report:vercel-surface`
  - `npm run audit:vercel-quota`

- **Compatibility notes**
  - The notification UI keeps the same behavior, but it now depends on the browser Supabase client instead of a Vercel API hop.

### Doctrine de stockage Supabase et garde-fous produit

- **What changed**
  - Added and connected a Supabase storage doctrine across the documentation:
    - `documentation/development/supabase-quota-guide.md`
    - `documentation/database/supabase-quota-audit.md`
    - `documentation/backend/local-storage-vs-supabase-audit.md`
    - `documentation/development/performance-quotas-vercel-checklist.md`
  - Updated the documentation indexes:
    - `documentation/README.md`
    - `documentation/development/README.md`
    - `documentation/database/README.md`

- **Why**
  - Make the product rule explicit: every new feature must say where data lives, how many writes/reads it creates, and what limits it has.
  - Keep pedagogical content in Git, quizzes local by default, volunteer forms to one write, aggregates for dashboards, and generated PDFs on demand.

- **Validation**
  - Documentation links reviewed after the update.

- **Compatibility notes**
  - Documentation-only change. No runtime behavior changed.

### CI Vercel: garde-fous critiques et audits en warnings

- **What changed**
  - Added a non-blocking CI audit runner for Vercel-sensitive surfaces:
    - `scripts/audit-vercel-ci.mjs`
    - `npm run audit:vercel:ci`
  - Integrated Vercel governance into the existing GitHub Actions CI:
    - `npm run test:regression-gates -w apps/web` for critical failures
    - `npm run audit:vercel:ci` for warnings only
  - Documented the CI behavior in:
    - `documentation/development/vercel-quota-governance.md`

- **Why**
  - Fail only on the regressions that must block a PR.
  - Keep the rest of the Vercel surface visible as warnings so the team can review cost risk without creating noise.

- **Validation**
  - `npm run audit:vercel:ci`
  - `npm run test:regression-gates -w apps/web`
  - `npm run check:doc-governance`

- **Compatibility notes**
  - The new CI audit is non-blocking by design.
  - Critical gates still fail the pipeline when they regress.

### Guide Codex pour développer sans gonfler les quotas Vercel

- **What changed**
  - Added a Codex-facing development guide focused on avoiding unnecessary Vercel quota growth:
    - `documentation/development/codex-vercel-development-guide.md`
  - Linked the guide from the documentation entry points:
    - `documentation/README.md`
    - `documentation/development/README.md`

- **Why**
  - Give agents a concrete checklist for Next.js, cache, Server Components, Clerk, Supabase, Leaflet and PDF flows before they add a new feature.
  - Reduce the chance of creating avoidable `Invocations`, `Edge Requests` or origin transfer growth.

- **Validation**
  - `npm run check:doc-governance` passed

- **Compatibility notes**
  - Documentation-only change. No runtime behavior changed.

### Stratégie de répartition Vercel, Supabase et navigateur

- **What changed**
  - Added a dedicated strategy guide for distributing load between:
    - Vercel
    - Supabase
    - the browser
  - Added a fast-placement table for:
    - quiz answers
    - display preferences
    - drafts
    - open documentation
    - counters and badges
    - user images and generated PDFs
    - dynamic maps
    - PDF generation
  - Moved the explorer badge counter to a direct browser-side Supabase read:
    - `apps/web/src/components/gamification/ExplorerBadgeWrapper.tsx`
  - Linked the guide from the main documentation entry points:
    - `documentation/README.md`
    - `documentation/development/README.md`
    - `documentation/development/vercel-quota-governance.md`
    - `documentation/development/vercel-anti-regression-playbook.md`

- **Why**
  - Make the "Vercel serves the interface, Supabase serves the data, browser keeps non-critical state" principle explicit and reusable.
  - Reduce future regressions caused by moving too much logic to the wrong layer.

- **Validation**
  - Documentation links reviewed after the update.

- **Compatibility notes**
  - Documentation-only change. No runtime behavior changed.

### Playbook anti-régression Vercel et prévention des erreurs récurrentes

- **What changed**
  - Added a dedicated anti-regression playbook for Vercel-sensitive development:
    - `documentation/development/vercel-anti-regression-playbook.md`
  - Linked the playbook from the main documentation entry points:
    - `documentation/README.md`
    - `documentation/development/README.md`
    - `documentation/development/performance-quotas-vercel-checklist.md`
    - `documentation/development/vercel-quota-governance.md`

- **Why**
  - Capture the mistakes that already increased Vercel cost risk, then make the safer patterns easy to reuse.
  - Reduce the chance of reintroducing `force-dynamic`, `revalidate = 0`, `no-store`, or unbounded polling without justification.

- **Validation**
  - Documentation links reviewed after the update.

- **Compatibility notes**
  - Documentation-only change. No runtime behavior changed.

## 2026-06-06

### Rapport automatique des surfaces Vercel

- **What changed**
  - Added an automatic Vercel surface report generator:
    - `scripts/generate-vercel-surface-report.mjs`
  - Added a canonical generated report:
    - `documentation/development/vercel-surface-report.md`
  - Exposed the report command in the root package scripts:
    - `npm run report:vercel-surface`

- **Why**
  - Keep the current API, dynamic page, middleware and provider surface visible in one report.
  - Make the Vercel cost drivers explicit with a risk estimate for invocations, edge requests and origin transfer.

- **Validation**
  - Pending: run the report generator after the script lands.

## 2026-06-05

### Documentation par route et cache des documents markdown

- **What changed**
  - Added a route-by-route Vercel cost audit:
    - `documentation/development/vercel-route-cost-audit.md`
  - Added the route audit to the documentation entry points:
    - `documentation/README.md`
    - `documentation/development/README.md`
    - `README.md`
  - Improved the markdown document download route:
    - `apps/web/src/app/api/documentation/[slug]/route.ts`
  - Added a regression test for the cache headers:
    - `apps/web/src/app/api/documentation/[slug]/route.test.ts`

- **Why**
  - Make the most expensive routes explicit before PR review.
  - Reduce unnecessary origin hits for static markdown downloads.

- **Validation**
  - Pending: run the targeted route test after the cache header change.

- **Compatibility notes**
  - The documentation download route still serves the same files and attachment names.
  - Only cache headers changed; the payload format is unchanged.

### Gouvernance Vercel: audit statique des régressions de coût

- **What changed**
  - Added a dedicated Vercel quota governance guide:
    - `documentation/development/vercel-quota-governance.md`
  - Added a static audit script and baseline:
    - `scripts/audit-vercel-quota.mjs`
    - `scripts/vercel-quota-audit-baseline.json`
  - Wired the audit into the pre-push guardrail:
    - `scripts/pre_push_guard.ps1`
  - Exposed the audit command in the root README:
    - `npm run audit:vercel-quota`

- **Why**
  - Detect cost regressions early when a future feature adds dynamic pages, no-store fetches, export routes, or crons.
  - Make Vercel quota growth visible before it reaches production usage dashboards.

- **Validation**
  - Pending: run the new audit script after the baseline file is generated.

- **Compatibility notes**
  - The audit is additive and read-only.
  - The baseline must be refreshed intentionally when a new hotspot is accepted.

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
