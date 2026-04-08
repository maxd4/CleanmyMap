# ðŸŒ¿ Clean my Map â€¢ Plateforme citoyenne pour les actions bÃ©nÃ©voles de dÃ©pollution

https://github.com/maxd4/CleanmyMap

**Clean my Map** est une solution bÃ©nÃ©vole engagÃ©e en faveur de l'environnement. Son objectif principal est de mutualiser les rÃ©sultats des actions bÃ©nÃ©voles de dÃ©pollution des rues (cleanwalk). La visualisation se fait sur une carte interactive.
D'autres fonctionnalitÃ©s permettent un engagement et un partage sur l'Ã©cologie, mais aussi sur l'aide humanitaire et sociale et le dÃ©veloppement durable.

Cet outil transforme chaque ramassage bÃ©nÃ©vole en donnÃ©e scientifique utile pour inciter Ã  l'action.

## âœ… Mises Ã  jour rÃ©centes
- **Moteur de routage IA v2** : itinÃ©raires sÃ©lectifs (MÃ©gots vs DÃ©chets) et adaptation au groupe.
- **Protocole scientifique simplifiÃ©** : inventaire par macro-catÃ©gories pour gagner du temps terrain.
- **Espace dÃ©cision** : export de jeux de donnÃ©es pour chercheurs et gÃ©nÃ©rateur de courriers officiels.
- Les indicateurs **S** et **C** ont Ã©tÃ© rÃ©alignÃ©s sur les **frÃ©quences physiques**.

## ðŸš€ Vision et impact
L'objectif est de rendre visible l'invisible. Un seul mÃ©got pollue jusqu'Ã  1000 litres d'eau ; **Clean my Map** permet de mesurer prÃ©cisÃ©ment l'impact de chaque action citoyenne et d'accompagner les collectivitÃ©s vers des solutions durables.

### Fondamentaux du projet
- **Engagement** : valorisation des bÃ©nÃ©voles et des partenaires locaux ("MÃ©daille Verte").
- **Science** : export de donnÃ©es anonymisÃ©es aux standards E-PRTR pour la recherche (Surfrider, ADEME).
- **Intelligence** : prÃ©diction des flux de pollution par analyse topographique (ruissellement).

---

## ðŸ—ï¸ Architecture du systÃ¨me

```mermaid
graph TD
    User((Citoyen)) -->|Declare une action| Web[Next.js Web App]
    Web -->|API| Api[/api/actions + /api/actions/map]
    Api -->|Lecture/ecriture| DB[(Supabase: actions/spots)]
    Api -->|Fusion locale| Local[(data/local-db/*.json)]
    Web -->|Affiche| Map[Carte interactive]

    subgraph "Structure du projet"
        web[apps/web/ - Frontend + API Next.js]
        docs[docs/ - Documentation]
        scripts[scripts/ - Outillage]
        data[data/ - Seeds et artefacts]
    end
```

### Structure des fichiers
- `apps/web/` : application Next.js (routes, API, composants, Supabase migration).
- `apps/web/data/local-db/` : stores locaux `test`, `real`, `validated`.
- `docs/` : runbooks, wiki, architecture, maintenance.
- `scripts/` : utilitaires CI/maintenance.
- `tests/` : tests Python + E2E.
---

## ðŸ› ï¸ Installation et dÃ©ploiement

### 1. Cloner le projet
```bash
git clone https://github.com/votre-compte/cleanmymap-app.git
cd cleanmymap-app
```

### 2. Installer les dÃ©pendances
```bash
pip install -r requirements.txt
```

### 3. Lancer l'application
```bash
npm --prefix apps/web run dev
```

---

## ðŸ" SÃ©curitÃ© et configuration
L'application utilise une authentification Google (OIDC) pour l'accÃ¨s administrateur.
Configurez vos secrets via `apps/web/.env.local` :

- `CLEANMYMAP_ADMIN_SECRET_CODE` : code de double authentification.
- `CLEANMYMAP_SHEET_URL` : source de donnÃ©es historique (Google Sheets).
- `SENDGRID_API_KEY` : envoi de la Gazette automatisÃ©e.

---

## ðŸ¤ Contribution et science citoyenne
Les donnÃ©es de **Clean my Map** sont ouvertes Ã  la communautÃ© scientifique. Les administrateurs peuvent gÃ©nÃ©rer un export anonymisÃ© dans l'onglet Admin pour les besoins de recherche environnementale.

---
*Projet propulsÃ© par les Brigades Vertes - Veiller ensemble sur notre territoire.*

## ðŸ§ª Clone de travail local (`APPLI`)
Pour travailler sur une copie locale dÃ©diÃ©e, un clone du repo peut Ãªtre crÃ©Ã© dans `/workspace/APPLI` :

```bash
git clone /workspace/CleanmyMap /workspace/APPLI
```

## Journal de changements, monitoring UX et E2E
- Journal de changements produit : visible directement dans l'app (bloc repliable).
- Monitoring UX : suivi en base des erreurs de validation et des actions cassÃ©es.
- Dashboard admin : indicateurs UX (30 jours) + journal des Ã©vÃ©nements.
- Tests E2E Playwright : flux critiques dÃ©claration, carte, rapport.

### Lancer les tests E2E
```bash
npx.cmd playwright test --config tests/e2e/playwright.config.cjs
```

Configuration : `tests/e2e/playwright.config.cjs`  
Specs : `tests/e2e/specs/critical-flows.spec.js`

## SÃ©curitÃ© admin
- `CLEANMYMAP_ADMIN_SECRET_CODE` : secret requis pour l'espace admin.
- `CLEANMYMAP_ADMIN_EMAILS` : liste d'emails Google autorisÃ©s (sÃ©parÃ©s par des virgules).
- `CLEANMYMAP_ADMIN_REQUIRE_ALLOWLIST` : `1` (dÃ©faut) impose une allowlist admin non vide.
- Si l'allowlist est absente ou vide, l'accÃ¨s admin est bloquÃ© (deny by default) avec message explicite.
- `CLEANMYMAP_ADMIN_MAX_ATTEMPTS` : nombre max de tentatives avant verrouillage temporaire.
- `CLEANMYMAP_ADMIN_LOCKOUT_MINUTES` : durÃ©e de verrouillage en minutes.
- `CLEANMYMAP_ADMIN_BACKOFF_MAX_SECONDS` : attente exponentielle max entre tentatives.

## Setup test reproductible
- Installer l'environnement : `powershell -ExecutionPolicy Bypass -File scripts/setup_test_env.ps1`
- ExÃ©cuter tous les checks : `powershell -ExecutionPolicy Bypass -File scripts/run_checks.ps1`

## DÃ©blocage accÃ¨s repo (Windows)
- Commande unique de dÃ©blocage des accÃ¨s et vÃ©rifications d'Ã©criture :
  - `powershell -ExecutionPolicy Bypass -File scripts/unblock_repo_access.ps1 -Root .`
- Ce script :
  - arrÃªte les process du repo (optionnel),
  - retire le flag read-only hors `.git`,
  - rÃ©-applique les ACL FullControl pour l'utilisateur courant,
  - active `git core.longpaths` et ajoute le repo en `safe.directory`,
  - valide l'accÃ¨s lecture/Ã©criture sur des fichiers clÃ©s.

## Maintenance UI et cleanup (portable)

### Commandes principales
- RÃ©gÃ©nÃ©rer la baseline UI (action mainteneur, commit intentionnel) :
  - `python -m scripts.ui_inventory regenerate --write-baseline`
- VÃ©rifier la dÃ©rive UI (lecture seule) :
  - `python -m scripts.ui_inventory check --baseline docs/wiki/ui_inventory.baseline.json`
- Diagnostic cleanup non destructif :
  - `python -m scripts.ui_inventory cleanup --dry-run`

### Artefacts canoniques
- Baseline versionnÃ©e : `docs/wiki/ui_inventory.baseline.json`
- Snapshot runtime (non versionnÃ©) : `artifacts/ui_inventory.current.json`
- Diff runtime (non versionnÃ©) : `artifacts/ui_inventory.diff.md`

### Quand exÃ©cuter quoi
- `regenerate --write-baseline` : aprÃ¨s changement intentionnel de structure UI (onglets, renderers, admin components).
- `check` : avant PR et automatiquement en CI (`.github/workflows/ui-inventory.yml`).
- `cleanup --dry-run` : pour identifier les rÃ©fÃ©rences UI orphelines/manquantes sans modifier les fichiers.
- `python scripts/ci_cleanup.py --root . --check` : vÃ©rification hygiÃ¨ne explicite dans la CI principale (`.github/workflows/ci.yml`).
- `python scripts/normalize_utf8.py --root . --check` : vÃ©rification explicite encodage UTF-8 (sans BOM) + dÃ©tection mojibake dans la CI principale.
- `python scripts/normalize_utf8.py --root . --write` : normalisation locale non destructive des fichiers texte versionnÃ©s.

### DiffÃ©rence baseline vs cleanup
- `scripts.ui_inventory regenerate --write-baseline` : met Ã  jour la rÃ©fÃ©rence.
- `scripts.ui_inventory check` : compare l'Ã©tat courant Ã  la rÃ©fÃ©rence (dÃ©rive = code retour 3).
- `scripts.ui_inventory cleanup --dry-run` : rapport de nettoyage non destructif.

### Action UI "maintenance"
- Emplacement : onglet `Espace CollectivitÃ©s`, section `maintenance & sauvegarde`.
- Usage : cliquer sur `Lancer un diagnostic maintenance (sans modification)`.
- Comportement :
  - affiche un statut global `Conforme` / `Points Ã  corriger`,
  - dÃ©taille les rÃ¨gles en langage mÃ©tier + actions recommandÃ©es,
  - applique un cache court (5 min) et un cooldown session (~45s),
  - n'efface, ne rÃ©Ã©crit et ne modifie aucun fichier.

## Documentation requirements (mandatory)

## Temporary Documentation Freeze (Token-Saving)

Status: ACTIVE (re-enabled after documentation refresh, 2026-04-02).

During this temporary freeze, documentation updates are paused to save tokens for all files except `plan.txt` at the repository root.

- Deferred documentation items are tracked in: `plan.txt` (section "Documentation freeze backlog").
- Documentation updates resume only when this explicit event occurs:
  - Functional milestone reached and confirmed: `pytest -v` passes and critical integration flows (map, report, CSV export) are validated.

Documentation is a **deliverable**, not an optional follow-up. A change is not complete until both locations below are updated.

- Every new feature, bug fix, behavioral change, configuration change, UX/UI change, architectural change, or significant implementation update must be documented in:
  - this `README.md` (user-facing summary + entry in "Latest documented update"),
  - the software wiki under `docs/wiki/` (structured technical entry with all required fields).
- Documentation must be clear, accurate, up to date, consistent across both locations, and useful to both end users and developers.
- If one location is missing, the change is considered undocumented.

### Documentation checklist (mandatory before closing any task)

```text
[ ] README: "Latest documented update" entry added
[ ] Wiki CHANGELOG: structured entry added (What / Why / Where / Validation / Compatibility)
[ ] If user-facing: usage described for end users
[ ] If dev-facing: maintenance/extension guidance present
[ ] No contradictions between README and wiki
[ ] Dedicated wiki page created/updated if change is architectural
```

### Wiki index
- Index: `docs/wiki/README.md`
- Policy (full checklist): `docs/wiki/DOCUMENTATION_POLICY.md`
- Changelog: `docs/wiki/CHANGELOG.md`
- Maintenance commands: `docs/wiki/MAINTENANCE.md`
- UI Inventory contract: `docs/wiki/UI_INVENTORY.md`
- Navigation architecture: `docs/wiki/NAVIGATION_ARCHITECTURE.md`

### Latest documented update
- `2026-04-02`: **Maintainability & Preventive Quality Hardening** - Routing/admin contracts aligned, allowlist policy wiring fixed, Supabase/admin secret handling hardened, deprecated references removed from active scripts, and preventive guardrails added (static checks, root hygiene, module import sweep, runtime DB seed robustness). CI now includes explicit bootstrap smoke (`python -c "import app"`).
- `2026-03-28`: **AI Routing Engine v2 & Selective Missions** â€" upgraded to a greedy TSP algorithm with priority targeting (MÃ©gots/DÃ©chets), neighborhood geocoding, and group-size logistics.
- `2026-03-28`: **Simplified Participatory Science Protocol** â€" switch to macro-category auditing (Plastique, Verre, MÃ©tal, Papier) and streamlined brand identification for faster volunteer field operations.
- `2026-03-28`: **Institutional Dashboard & Research Export** â€" added research-grade CSV exports and official mayoral letter generator (PDF) with localized impact statistics.
- `2026-03-28`: **Documentation policy strengthened** â€" `docs/wiki/DOCUMENTATION_POLICY.md` fully rewritten with per-field content requirements, quality rules, prohibited patterns, and a 12-item delivery checklist. Documentation is now treated as a mandatory deliverable for every change.
- `2026-03-28`: **Navigation architecture refactored** â€" 6 piliers (19 tabs) restructured into 5 piliers (16 visibles + 2 par URL) aligned on user intent: Tableau de bord / Agir / Explorer / Mon espace / Coordination. MÃ©tÃ©o moved into Agir (1 click from declaration). Sidebar extended to 3 quick-access buttons. Full reference in `docs/wiki/NAVIGATION_ARCHITECTURE.md`.
- `2026-03-27`: volunteer feedback form added to the declaration flow (suggestions + bug reports, validation, DB persistence).
- `2026-03-28`: maintenance diagnostic UI switched to a shared read-only audit engine (`src/maintenance/cleanup_audit.py`) used by both UI and `scripts/ci_cleanup.py`, with FR-first summaries, cache TTL, and session cooldown.
- `2026-03-28`: admin UI refactor continued with sub-components (`auth`, `map_review`, `moderation`, `exports`) under `src/ui/admin_components/`, reducing dependency injection width in `ui/admin.py`.
- `2026-03-28`: UI inventory commands unified under `python -m scripts.ui_inventory` with new baseline contract (`docs/wiki/ui_inventory.baseline.json`), dedicated warn-only workflow (`.github/workflows/ui-inventory.yml`), and backward-compatible regeneration shim.
- `2026-03-28`: P1 security pass completed: centralized popup sanitation (`sanitize_popup_row`) now applies to map popups/tooltips (including secondary map generator), with XSS regression tests.
- `2026-03-28`: community validation now consumes `PendingPublicPreview` redacted contracts only (no public exposure of pending `adresse`/`association`/`date`).
- `2026-03-28`: E2E Playwright suite expanded with end-to-end security regression scenarios (map XSS payload, pending redaction, report/export visibility, maintenance diagnostic flow).
- `2026-03-28`: P2 robustness/performance pass: structured JSON logging (`src/logging_utils.py`), targeted exception handling in critical paths, vectorized map computations (`compute_score_series`, `calculate_trends`, `get_heatmap_data`, route filtering with vectorized haversine), and UTF-8 normalization CLI (`scripts/normalize_utf8.py`) wired as an explicit CI check.
- `2026-03-28`: E2E admin test-mode added for full critical flow testing via environment variables (`CLEANMYMAP_E2E_MODE`, `CLEANMYMAP_E2E_ADMIN_EMAIL`) with admin moderation + CSV/PDF export assertions in Playwright.
- `2026-03-28`: P2 hardening completion pass: explicit schema-migration logging in `src/database.py` (no silent migration fallback), stable map perf contract completed with `build_heatmap_series()` in `src/map_utils.py`, E2E admin fallback isolated in `src/services/admin_auth.py`, and stronger encoding CLI tests for `scripts/normalize_utf8.py` (`--check` / `--write`).
- `2026-03-28`: visual refresh inspired by a Figma-style civic dashboard direction (marine/cyan/green palette) applied in `inject_visual_polish()` to improve hierarchy, active states, and navigation emphasis while preserving existing UX structure.
- `2026-03-28`: public testing flow moved forward in navigation: `sandbox` grouped at the start with `home`, `declaration`, and `map` so users can test map/form behavior earlier in the journey.

## Runtime SQLite separation (P3)
- Official runtime DB routing variable: `CLEANMYMAP_DB_PATH`.
- Resolution order implemented:
  1. `CLEANMYMAP_DB_PATH`
  2. OS state directory outside the repository:
     - Windows: `%LOCALAPPDATA%/CleanMyMap/runtime/cleanmymap.db`
     - Linux/macOS: `${XDG_STATE_HOME:-~/.local/state}/cleanmymap/runtime/cleanmymap.db`
- Runtime folder is auto-created before SQLite connection.
- Effective runtime DB path is emitted via structured log event `db_path_resolved`.
- Runtime DB files are excluded from version control (`.gitignore`) and `data/cleanmymap.db` is removed from git index.

### Initialize runtime DB and anonymized seed
- Schema only:
  - `python scripts/init_runtime_db.py`
- Schema + anonymized seed:
  - `python scripts/init_runtime_db.py --seed data/seed/runtime_seed_anonymized.json`
- Override DB path explicitly:
  - `python scripts/init_runtime_db.py --db-path <path> --seed data/seed/runtime_seed_anonymized.json`
- Deterministic reset of seeded tables for dev/test:
  - `python scripts/init_runtime_db.py --db-path <path> --seed data/seed/runtime_seed_anonymized.json --reset-seeded-tables`

### CI guardrail
- Main CI now runs:
  - `python scripts/check_runtime_db_tracking.py --root .`
- This step fails if runtime SQLite files are tracked by git.
=# ðŸŒ¿ Clean my Map â€¢ Plateforme citoyenne pour les actions bÃ©nÃ©voles de dÃ©pollution

https://github.com/maxd4/CleanmyMap

**Clean my Map** est une solution bÃ©nÃ©vole engagÃ©e en faveur de l'environnement. Son objectif principal est de mutualiser les rÃ©sultats des actions bÃ©nÃ©voles de dÃ©pollution des rues (cleanwalk). La visualisation se fait sur une carte interactive.
D'autres fonctionnalitÃ©s permettent un engagement et un partage sur l'Ã©cologie, mais aussi sur l'aide humanitaire et sociale et le dÃ©veloppement durable.

Cet outil transforme chaque ramassage bÃ©nÃ©vole en donnÃ©e scientifique utile pour inciter Ã  l'action.

## âœ… Mises Ã  jour rÃ©centes
- **Moteur de routage IA v2** : itinÃ©raires sÃ©lectifs (MÃ©gots vs DÃ©chets) et adaptation au groupe.
- **Protocole scientifique simplifiÃ©** : inventaire par macro-catÃ©gories pour gagner du temps terrain.
- **Espace dÃ©cision** : export de jeux de donnÃ©es pour chercheurs et gÃ©nÃ©rateur de courriers officiels.
- Les indicateurs **S** et **C** ont Ã©tÃ© rÃ©alignÃ©s sur les **frÃ©quences physiques**.

## ðŸš€ Vision et impact
L'objectif est de rendre visible l'invisible. Un seul mÃ©got pollue jusqu'Ã  1000 litres d'eau ; **Clean my Map** permet de mesurer prÃ©cisÃ©ment l'impact de chaque action citoyenne et d'accompagner les collectivitÃ©s vers des solutions durables.

### Fondamentaux du projet
- **Engagement** : valorisation des bÃ©nÃ©voles et des partenaires locaux ("MÃ©daille Verte").
- **Science** : export de donnÃ©es anonymisÃ©es aux standards E-PRTR pour la recherche (Surfrider, ADEME).
- **Intelligence** : prÃ©diction des flux de pollution par analyse topographique (ruissellement).

---

## ðŸ—ï¸ Architecture du systÃ¨me

```mermaid
graph TD
    User((Citoyen)) -->|Declare une action| Web[Next.js Web App]
    Web -->|API| Api[/api/actions + /api/actions/map]
    Api -->|Lecture/ecriture| DB[(Supabase: actions/spots)]
    Api -->|Fusion locale| Local[(data/local-db/*.json)]
    Web -->|Affiche| Map[Carte interactive]

    subgraph "Structure du projet"
        web[apps/web/ - Frontend + API Next.js]
        docs[docs/ - Documentation]
        scripts[scripts/ - Outillage]
        data[data/ - Seeds et artefacts]
    end
```

### Structure des fichiers
- `apps/web/` : application Next.js (routes, API, composants, Supabase migration).
- `apps/web/data/local-db/` : stores locaux `test`, `real`, `validated`.
- `docs/` : runbooks, wiki, architecture, maintenance.
- `scripts/` : utilitaires CI/maintenance.
- `tests/` : tests Python + E2E.
---

## ðŸ› ï¸ Installation et dÃ©ploiement

### 1. Cloner le projet
```bash
git clone https://github.com/votre-compte/cleanmymap-app.git
cd cleanmymap-app
```

### 2. Installer les dÃ©pendances
```bash
pip install -r requirements.txt
```

### 3. Lancer l'application
```bash
npm --prefix apps/web run dev
```

---

## ðŸ" SÃ©curitÃ© et configuration
L'application utilise une authentification Google (OIDC) pour l'accÃ¨s administrateur.
Configurez vos secrets via `apps/web/.env.local` :

- `CLEANMYMAP_ADMIN_SECRET_CODE` : code de double authentification.
- `CLEANMYMAP_SHEET_URL` : source de donnÃ©es historique (Google Sheets).
- `SENDGRID_API_KEY` : envoi de la Gazette automatisÃ©e.

---

## ðŸ¤ Contribution et science citoyenne
Les donnÃ©es de **Clean my Map** sont ouvertes Ã  la communautÃ© scientifique. Les administrateurs peuvent gÃ©nÃ©rer un export anonymisÃ© dans l'onglet Admin pour les besoins de recherche environnementale.

---
*Projet propulsÃ© par les Brigades Vertes - Veiller ensemble sur notre territoire.*

## ðŸ§ª Clone de travail local (`APPLI`)
Pour travailler sur une copie locale dÃ©diÃ©e, un clone du repo peut Ãªtre crÃ©Ã© dans `/workspace/APPLI` :

```bash
git clone /workspace/CleanmyMap /workspace/APPLI
```

## Journal de changements, monitoring UX et E2E
- Journal de changements produit : visible directement dans l'app (bloc repliable).
- Monitoring UX : suivi en base des erreurs de validation et des actions cassÃ©es.
- Dashboard admin : indicateurs UX (30 jours) + journal des Ã©vÃ©nements.
- Tests E2E Playwright : flux critiques dÃ©claration, carte, rapport.

### Lancer les tests E2E
```bash
npx.cmd playwright test --config tests/e2e/playwright.config.cjs
```

Configuration : `tests/e2e/playwright.config.cjs`  
Specs : `tests/e2e/specs/critical-flows.spec.js`

## SÃ©curitÃ© admin
- `CLEANMYMAP_ADMIN_SECRET_CODE` : secret requis pour l'espace admin.
- `CLEANMYMAP_ADMIN_EMAILS` : liste d'emails Google autorisÃ©s (sÃ©parÃ©s par des virgules).
- `CLEANMYMAP_ADMIN_REQUIRE_ALLOWLIST` : `1` (dÃ©faut) impose une allowlist admin non vide.
- Si l'allowlist est absente ou vide, l'accÃ¨s admin est bloquÃ© (deny by default) avec message explicite.
- `CLEANMYMAP_ADMIN_MAX_ATTEMPTS` : nombre max de tentatives avant verrouillage temporaire.
- `CLEANMYMAP_ADMIN_LOCKOUT_MINUTES` : durÃ©e de verrouillage en minutes.
- `CLEANMYMAP_ADMIN_BACKOFF_MAX_SECONDS` : attente exponentielle max entre tentatives.

## Setup test reproductible
- Installer l'environnement : `powershell -ExecutionPolicy Bypass -File scripts/setup_test_env.ps1`
- ExÃ©cuter tous les checks : `powershell -ExecutionPolicy Bypass -File scripts/run_checks.ps1`

## DÃ©blocage accÃ¨s repo (Windows)
- Commande unique de dÃ©blocage des accÃ¨s et vÃ©rifications d'Ã©criture :
  - `powershell -ExecutionPolicy Bypass -File scripts/unblock_repo_access.ps1 -Root .`
- Ce script :
  - arrÃªte les process du repo (optionnel),
  - retire le flag read-only hors `.git`,
  - rÃ©-applique les ACL FullControl pour l'utilisateur courant,
  - active `git core.longpaths` et ajoute le repo en `safe.directory`,
  - valide l'accÃ¨s lecture/Ã©criture sur des fichiers clÃ©s.

## Maintenance UI et cleanup (portable)

### Commandes principales
- RÃ©gÃ©nÃ©rer la baseline UI (action mainteneur, commit intentionnel) :
  - `python -m scripts.ui_inventory regenerate --write-baseline`
- VÃ©rifier la dÃ©rive UI (lecture seule) :
  - `python -m scripts.ui_inventory check --baseline docs/wiki/ui_inventory.baseline.json`
- Diagnostic cleanup non destructif :
  - `python -m scripts.ui_inventory cleanup --dry-run`

### Artefacts canoniques
- Baseline versionnÃ©e : `docs/wiki/ui_inventory.baseline.json`
- Snapshot runtime (non versionnÃ©) : `artifacts/ui_inventory.current.json`
- Diff runtime (non versionnÃ©) : `artifacts/ui_inventory.diff.md`

### Quand exÃ©cuter quoi
- `regenerate --write-baseline` : aprÃ¨s changement intentionnel de structure UI (onglets, renderers, admin components).
- `check` : avant PR et automatiquement en CI (`.github/workflows/ui-inventory.yml`).
- `cleanup --dry-run` : pour identifier les rÃ©fÃ©rences UI orphelines/manquantes sans modifier les fichiers.
- `python scripts/ci_cleanup.py --root . --check` : vÃ©rification hygiÃ¨ne explicite dans la CI principale (`.github/workflows/ci.yml`).
- `python scripts/normalize_utf8.py --root . --check` : vÃ©rification explicite encodage UTF-8 (sans BOM) + dÃ©tection mojibake dans la CI principale.
- `python scripts/normalize_utf8.py --root . --write` : normalisation locale non destructive des fichiers texte versionnÃ©s.

### DiffÃ©rence baseline vs cleanup
- `scripts.ui_inventory regenerate --write-baseline` : met Ã  jour la rÃ©fÃ©rence.
- `scripts.ui_inventory check` : compare l'Ã©tat courant Ã  la rÃ©fÃ©rence (dÃ©rive = code retour 3).
- `scripts.ui_inventory cleanup --dry-run` : rapport de nettoyage non destructif.

### Action UI "maintenance"
- Emplacement : onglet `Espace CollectivitÃ©s`, section `maintenance & sauvegarde`.
- Usage : cliquer sur `Lancer un diagnostic maintenance (sans modification)`.
- Comportement :
  - affiche un statut global `Conforme` / `Points Ã  corriger`,
  - dÃ©taille les rÃ¨gles en langage mÃ©tier + actions recommandÃ©es,
  - applique un cache court (5 min) et un cooldown session (~45s),
  - n'efface, ne rÃ©Ã©crit et ne modifie aucun fichier.

## Documentation requirements (mandatory)

## Temporary Documentation Freeze (Token-Saving)

Status: ACTIVE (re-enabled after documentation refresh, 2026-04-02).

During this temporary freeze, documentation updates are paused to save tokens for all files except `plan.txt` at the repository root.

- Deferred documentation items are tracked in: `plan.txt` (section "Documentation freeze backlog").
- Documentation updates resume only when this explicit event occurs:
  - Functional milestone reached and confirmed: `pytest -v` passes and critical integration flows (map, report, CSV export) are validated.

Documentation is a **deliverable**, not an optional follow-up. A change is not complete until both locations below are updated.

- Every new feature, bug fix, behavioral change, configuration change, UX/UI change, architectural change, or significant implementation update must be documented in:
  - this `README.md` (user-facing summary + entry in "Latest documented update"),
  - the software wiki under `docs/wiki/` (structured technical entry with all required fields).
- Documentation must be clear, accurate, up to date, consistent across both locations, and useful to both end users and developers.
- If one location is missing, the change is considered undocumented.

### Documentation checklist (mandatory before closing any task)

```text
[ ] README: "Latest documented update" entry added
[ ] Wiki CHANGELOG: structured entry added (What / Why / Where / Validation / Compatibility)
[ ] If user-facing: usage described for end users
[ ] If dev-facing: maintenance/extension guidance present
[ ] No contradictions between README and wiki
[ ] Dedicated wiki page created/updated if change is architectural
```

### Wiki index
- Index: `docs/wiki/README.md`
- Policy (full checklist): `docs/wiki/DOCUMENTATION_POLICY.md`
- Changelog: `docs/wiki/CHANGELOG.md`
- Maintenance commands: `docs/wiki/MAINTENANCE.md`
- UI Inventory contract: `docs/wiki/UI_INVENTORY.md`
- Navigation architecture: `docs/wiki/NAVIGATION_ARCHITECTURE.md`

### Latest documented update
- `2026-04-02`: **Maintainability & Preventive Quality Hardening** - Routing/admin contracts aligned, allowlist policy wiring fixed, Supabase/admin secret handling hardened, deprecated references removed from active scripts, and preventive guardrails added (static checks, root hygiene, module import sweep, runtime DB seed robustness). CI now includes explicit bootstrap smoke (`python -c "import app"`).
- `2026-03-28`: **AI Routing Engine v2 & Selective Missions** â€" upgraded to a greedy TSP algorithm with priority targeting (MÃ©gots/DÃ©chets), neighborhood geocoding, and group-size logistics.
- `2026-03-28`: **Simplified Participatory Science Protocol** â€" switch to macro-category auditing (Plastique, Verre, MÃ©tal, Papier) and streamlined brand identification for faster volunteer field operations.
- `2026-03-28`: **Institutional Dashboard & Research Export** â€" added research-grade CSV exports and official mayoral letter generator (PDF) with localized impact statistics.
- `2026-03-28`: **Documentation policy strengthened** â€" `docs/wiki/DOCUMENTATION_POLICY.md` fully rewritten with per-field content requirements, quality rules, prohibited patterns, and a 12-item delivery checklist. Documentation is now treated as a mandatory deliverable for every change.
- `2026-03-28`: **Navigation architecture refactored** â€" 6 piliers (19 tabs) restructured into 5 piliers (16 visibles + 2 par URL) aligned on user intent: Tableau de bord / Agir / Explorer / Mon espace / Coordination. MÃ©tÃ©o moved into Agir (1 click from declaration). Sidebar extended to 3 quick-access buttons. Full reference in `docs/wiki/NAVIGATION_ARCHITECTURE.md`.
- `2026-03-27`: volunteer feedback form added to the declaration flow (suggestions + bug reports, validation, DB persistence).
- `2026-03-28`: maintenance diagnostic UI switched to a shared read-only audit engine (`src/maintenance/cleanup_audit.py`) used by both UI and `scripts/ci_cleanup.py`, with FR-first summaries, cache TTL, and session cooldown.
- `2026-03-28`: admin UI refactor continued with sub-components (`auth`, `map_review`, `moderation`, `exports`) under `src/ui/admin_components/`, reducing dependency injection width in `ui/admin.py`.
- `2026-03-28`: UI inventory commands unified under `python -m scripts.ui_inventory` with new baseline contract (`docs/wiki/ui_inventory.baseline.json`), dedicated warn-only workflow (`.github/workflows/ui-inventory.yml`), and backward-compatible regeneration shim.
- `2026-03-28`: P1 security pass completed: centralized popup sanitation (`sanitize_popup_row`) now applies to map popups/tooltips (including secondary map generator), with XSS regression tests.
- `2026-03-28`: community validation now consumes `PendingPublicPreview` redacted contracts only (no public exposure of pending `adresse`/`association`/`date`).
- `2026-03-28`: E2E Playwright suite expanded with end-to-end security regression scenarios (map XSS payload, pending redaction, report/export visibility, maintenance diagnostic flow).
- `2026-03-28`: P2 robustness/performance pass: structured JSON logging (`src/logging_utils.py`), targeted exception handling in critical paths, vectorized map computations (`compute_score_series`, `calculate_trends`, `get_heatmap_data`, route filtering with vectorized haversine), and UTF-8 normalization CLI (`scripts/normalize_utf8.py`) wired as an explicit CI check.
- `2026-03-28`: E2E admin test-mode added for full critical flow testing via environment variables (`CLEANMYMAP_E2E_MODE`, `CLEANMYMAP_E2E_ADMIN_EMAIL`) with admin moderation + CSV/PDF export assertions in Playwright.
- `2026-03-28`: P2 hardening completion pass: explicit schema-migration logging in `src/database.py` (no silent migration fallback), stable map perf contract completed with `build_heatmap_series()` in `src/map_utils.py`, E2E admin fallback isolated in `src/services/admin_auth.py`, and stronger encoding CLI tests for `scripts/normalize_utf8.py` (`--check` / `--write`).
- `2026-03-28`: visual refresh inspired by a Figma-style civic dashboard direction (marine/cyan/green palette) applied in `inject_visual_polish()` to improve hierarchy, active states, and navigation emphasis while preserving existing UX structure.
- `2026-03-28`: public testing flow moved forward in navigation: `sandbox` grouped at the start with `home`, `declaration`, and `map` so users can test map/form behavior earlier in the journey.

## Runtime SQLite separation (P3)
- Official runtime DB routing variable: `CLEANMYMAP_DB_PATH`.
- Resolution order implemented:
  1. `CLEANMYMAP_DB_PATH`
  2. OS state directory outside the repository:
     - Windows: `%LOCALAPPDATA%/CleanMyMap/runtime/cleanmymap.db`
     - Linux/macOS: `${XDG_STATE_HOME:-~/.local/state}/cleanmymap/runtime/cleanmymap.db`
- Runtime folder is auto-created before SQLite connection.
- Effective runtime DB path is emitted via structured log event `db_path_resolved`.
- Runtime DB files are excluded from version control (`.gitignore`) and `data/cleanmymap.db` is removed from git index.

### Initialize runtime DB and anonymized seed
- Schema only:
  - `python scripts/init_runtime_db.py`
- Schema + anonymized seed:
  - `python scripts/init_runtime_db.py --seed data/seed/runtime_seed_anonymized.json`
- Override DB path explicitly:
  - `python scripts/init_runtime_db.py --db-path <path> --seed data/seed/runtime_seed_anonymized.json`
- Deterministic reset of seeded tables for dev/test:
  - `python scripts/init_runtime_db.py --db-path <path> --seed data/seed/runtime_seed_anonymized.json --reset-seeded-tables`

### CI guardrail
- Main CI now runs:
  - `python scripts/check_runtime_db_tracking.py --root .`
- This step fails if runtime SQLite files are tracked by git.
 -replace '(?s)### 3\. Lancer l[^\r\n]*\r?\n`ash\r?\n.*?\r?\n`',

### 3. Lancer l'application
```bash
npm --prefix apps/web run dev
```

---

## ðŸ" SÃ©curitÃ© et configuration
L'application utilise une authentification Google (OIDC) pour l'accÃ¨s administrateur.
Configurez vos secrets via `apps/web/.env.local` :

- `CLEANMYMAP_ADMIN_SECRET_CODE` : code de double authentification.
- `CLEANMYMAP_SHEET_URL` : source de donnÃ©es historique (Google Sheets).
- `SENDGRID_API_KEY` : envoi de la Gazette automatisÃ©e.

---

## ðŸ¤ Contribution et science citoyenne
Les donnÃ©es de **Clean my Map** sont ouvertes Ã  la communautÃ© scientifique. Les administrateurs peuvent gÃ©nÃ©rer un export anonymisÃ© dans l'onglet Admin pour les besoins de recherche environnementale.

---
*Projet propulsÃ© par les Brigades Vertes - Veiller ensemble sur notre territoire.*

## ðŸ§ª Clone de travail local (`APPLI`)
Pour travailler sur une copie locale dÃ©diÃ©e, un clone du repo peut Ãªtre crÃ©Ã© dans `/workspace/APPLI` :

```bash
git clone /workspace/CleanmyMap /workspace/APPLI
```

## Journal de changements, monitoring UX et E2E
- Journal de changements produit : visible directement dans l'app (bloc repliable).
- Monitoring UX : suivi en base des erreurs de validation et des actions cassÃ©es.
- Dashboard admin : indicateurs UX (30 jours) + journal des Ã©vÃ©nements.
- Tests E2E Playwright : flux critiques dÃ©claration, carte, rapport.

### Lancer les tests E2E
```bash
npx.cmd playwright test --config tests/e2e/playwright.config.cjs
```

Configuration : `tests/e2e/playwright.config.cjs`  
Specs : `tests/e2e/specs/critical-flows.spec.js`

## SÃ©curitÃ© admin
- `CLEANMYMAP_ADMIN_SECRET_CODE` : secret requis pour l'espace admin.
- `CLEANMYMAP_ADMIN_EMAILS` : liste d'emails Google autorisÃ©s (sÃ©parÃ©s par des virgules).
- `CLEANMYMAP_ADMIN_REQUIRE_ALLOWLIST` : `1` (dÃ©faut) impose une allowlist admin non vide.
- Si l'allowlist est absente ou vide, l'accÃ¨s admin est bloquÃ© (deny by default) avec message explicite.
- `CLEANMYMAP_ADMIN_MAX_ATTEMPTS` : nombre max de tentatives avant verrouillage temporaire.
- `CLEANMYMAP_ADMIN_LOCKOUT_MINUTES` : durÃ©e de verrouillage en minutes.
- `CLEANMYMAP_ADMIN_BACKOFF_MAX_SECONDS` : attente exponentielle max entre tentatives.

## Setup test reproductible
- Installer l'environnement : `powershell -ExecutionPolicy Bypass -File scripts/setup_test_env.ps1`
- ExÃ©cuter tous les checks : `powershell -ExecutionPolicy Bypass -File scripts/run_checks.ps1`

## DÃ©blocage accÃ¨s repo (Windows)
- Commande unique de dÃ©blocage des accÃ¨s et vÃ©rifications d'Ã©criture :
  - `powershell -ExecutionPolicy Bypass -File scripts/unblock_repo_access.ps1 -Root .`
- Ce script :
  - arrÃªte les process du repo (optionnel),
  - retire le flag read-only hors `.git`,
  - rÃ©-applique les ACL FullControl pour l'utilisateur courant,
  - active `git core.longpaths` et ajoute le repo en `safe.directory`,
  - valide l'accÃ¨s lecture/Ã©criture sur des fichiers clÃ©s.

## Maintenance UI et cleanup (portable)

### Commandes principales
- RÃ©gÃ©nÃ©rer la baseline UI (action mainteneur, commit intentionnel) :
  - `python -m scripts.ui_inventory regenerate --write-baseline`
- VÃ©rifier la dÃ©rive UI (lecture seule) :
  - `python -m scripts.ui_inventory check --baseline docs/wiki/ui_inventory.baseline.json`
- Diagnostic cleanup non destructif :
  - `python -m scripts.ui_inventory cleanup --dry-run`

### Artefacts canoniques
- Baseline versionnÃ©e : `docs/wiki/ui_inventory.baseline.json`
- Snapshot runtime (non versionnÃ©) : `artifacts/ui_inventory.current.json`
- Diff runtime (non versionnÃ©) : `artifacts/ui_inventory.diff.md`

### Quand exÃ©cuter quoi
- `regenerate --write-baseline` : aprÃ¨s changement intentionnel de structure UI (onglets, renderers, admin components).
- `check` : avant PR et automatiquement en CI (`.github/workflows/ui-inventory.yml`).
- `cleanup --dry-run` : pour identifier les rÃ©fÃ©rences UI orphelines/manquantes sans modifier les fichiers.
- `python scripts/ci_cleanup.py --root . --check` : vÃ©rification hygiÃ¨ne explicite dans la CI principale (`.github/workflows/ci.yml`).
- `python scripts/normalize_utf8.py --root . --check` : vÃ©rification explicite encodage UTF-8 (sans BOM) + dÃ©tection mojibake dans la CI principale.
- `python scripts/normalize_utf8.py --root . --write` : normalisation locale non destructive des fichiers texte versionnÃ©s.

### DiffÃ©rence baseline vs cleanup
- `scripts.ui_inventory regenerate --write-baseline` : met Ã  jour la rÃ©fÃ©rence.
- `scripts.ui_inventory check` : compare l'Ã©tat courant Ã  la rÃ©fÃ©rence (dÃ©rive = code retour 3).
- `scripts.ui_inventory cleanup --dry-run` : rapport de nettoyage non destructif.

### Action UI "maintenance"
- Emplacement : onglet `Espace CollectivitÃ©s`, section `maintenance & sauvegarde`.
- Usage : cliquer sur `Lancer un diagnostic maintenance (sans modification)`.
- Comportement :
  - affiche un statut global `Conforme` / `Points Ã  corriger`,
  - dÃ©taille les rÃ¨gles en langage mÃ©tier + actions recommandÃ©es,
  - applique un cache court (5 min) et un cooldown session (~45s),
  - n'efface, ne rÃ©Ã©crit et ne modifie aucun fichier.

## Documentation requirements (mandatory)

## Temporary Documentation Freeze (Token-Saving)

Status: ACTIVE (re-enabled after documentation refresh, 2026-04-02).

During this temporary freeze, documentation updates are paused to save tokens for all files except `plan.txt` at the repository root.

- Deferred documentation items are tracked in: `plan.txt` (section "Documentation freeze backlog").
- Documentation updates resume only when this explicit event occurs:
  - Functional milestone reached and confirmed: `pytest -v` passes and critical integration flows (map, report, CSV export) are validated.

Documentation is a **deliverable**, not an optional follow-up. A change is not complete until both locations below are updated.

- Every new feature, bug fix, behavioral change, configuration change, UX/UI change, architectural change, or significant implementation update must be documented in:
  - this `README.md` (user-facing summary + entry in "Latest documented update"),
  - the software wiki under `docs/wiki/` (structured technical entry with all required fields).
- Documentation must be clear, accurate, up to date, consistent across both locations, and useful to both end users and developers.
- If one location is missing, the change is considered undocumented.

### Documentation checklist (mandatory before closing any task)

```text
[ ] README: "Latest documented update" entry added
[ ] Wiki CHANGELOG: structured entry added (What / Why / Where / Validation / Compatibility)
[ ] If user-facing: usage described for end users
[ ] If dev-facing: maintenance/extension guidance present
[ ] No contradictions between README and wiki
[ ] Dedicated wiki page created/updated if change is architectural
```

### Wiki index
- Index: `docs/wiki/README.md`
- Policy (full checklist): `docs/wiki/DOCUMENTATION_POLICY.md`
- Changelog: `docs/wiki/CHANGELOG.md`
- Maintenance commands: `docs/wiki/MAINTENANCE.md`
- UI Inventory contract: `docs/wiki/UI_INVENTORY.md`
- Navigation architecture: `docs/wiki/NAVIGATION_ARCHITECTURE.md`

### Latest documented update
- `2026-04-02`: **Maintainability & Preventive Quality Hardening** - Routing/admin contracts aligned, allowlist policy wiring fixed, Supabase/admin secret handling hardened, deprecated references removed from active scripts, and preventive guardrails added (static checks, root hygiene, module import sweep, runtime DB seed robustness). CI now includes explicit bootstrap smoke (`python -c "import app"`).
- `2026-03-28`: **AI Routing Engine v2 & Selective Missions** â€" upgraded to a greedy TSP algorithm with priority targeting (MÃ©gots/DÃ©chets), neighborhood geocoding, and group-size logistics.
- `2026-03-28`: **Simplified Participatory Science Protocol** â€" switch to macro-category auditing (Plastique, Verre, MÃ©tal, Papier) and streamlined brand identification for faster volunteer field operations.
- `2026-03-28`: **Institutional Dashboard & Research Export** â€" added research-grade CSV exports and official mayoral letter generator (PDF) with localized impact statistics.
- `2026-03-28`: **Documentation policy strengthened** â€" `docs/wiki/DOCUMENTATION_POLICY.md` fully rewritten with per-field content requirements, quality rules, prohibited patterns, and a 12-item delivery checklist. Documentation is now treated as a mandatory deliverable for every change.
- `2026-03-28`: **Navigation architecture refactored** â€" 6 piliers (19 tabs) restructured into 5 piliers (16 visibles + 2 par URL) aligned on user intent: Tableau de bord / Agir / Explorer / Mon espace / Coordination. MÃ©tÃ©o moved into Agir (1 click from declaration). Sidebar extended to 3 quick-access buttons. Full reference in `docs/wiki/NAVIGATION_ARCHITECTURE.md`.
- `2026-03-27`: volunteer feedback form added to the declaration flow (suggestions + bug reports, validation, DB persistence).
- `2026-03-28`: maintenance diagnostic UI switched to a shared read-only audit engine (`src/maintenance/cleanup_audit.py`) used by both UI and `scripts/ci_cleanup.py`, with FR-first summaries, cache TTL, and session cooldown.
- `2026-03-28`: admin UI refactor continued with sub-components (`auth`, `map_review`, `moderation`, `exports`) under `src/ui/admin_components/`, reducing dependency injection width in `ui/admin.py`.
- `2026-03-28`: UI inventory commands unified under `python -m scripts.ui_inventory` with new baseline contract (`docs/wiki/ui_inventory.baseline.json`), dedicated warn-only workflow (`.github/workflows/ui-inventory.yml`), and backward-compatible regeneration shim.
- `2026-03-28`: P1 security pass completed: centralized popup sanitation (`sanitize_popup_row`) now applies to map popups/tooltips (including secondary map generator), with XSS regression tests.
- `2026-03-28`: community validation now consumes `PendingPublicPreview` redacted contracts only (no public exposure of pending `adresse`/`association`/`date`).
- `2026-03-28`: E2E Playwright suite expanded with end-to-end security regression scenarios (map XSS payload, pending redaction, report/export visibility, maintenance diagnostic flow).
- `2026-03-28`: P2 robustness/performance pass: structured JSON logging (`src/logging_utils.py`), targeted exception handling in critical paths, vectorized map computations (`compute_score_series`, `calculate_trends`, `get_heatmap_data`, route filtering with vectorized haversine), and UTF-8 normalization CLI (`scripts/normalize_utf8.py`) wired as an explicit CI check.
- `2026-03-28`: E2E admin test-mode added for full critical flow testing via environment variables (`CLEANMYMAP_E2E_MODE`, `CLEANMYMAP_E2E_ADMIN_EMAIL`) with admin moderation + CSV/PDF export assertions in Playwright.
- `2026-03-28`: P2 hardening completion pass: explicit schema-migration logging in `src/database.py` (no silent migration fallback), stable map perf contract completed with `build_heatmap_series()` in `src/map_utils.py`, E2E admin fallback isolated in `src/services/admin_auth.py`, and stronger encoding CLI tests for `scripts/normalize_utf8.py` (`--check` / `--write`).
- `2026-03-28`: visual refresh inspired by a Figma-style civic dashboard direction (marine/cyan/green palette) applied in `inject_visual_polish()` to improve hierarchy, active states, and navigation emphasis while preserving existing UX structure.
- `2026-03-28`: public testing flow moved forward in navigation: `sandbox` grouped at the start with `home`, `declaration`, and `map` so users can test map/form behavior earlier in the journey.

## Runtime SQLite separation (P3)
- Official runtime DB routing variable: `CLEANMYMAP_DB_PATH`.
- Resolution order implemented:
  1. `CLEANMYMAP_DB_PATH`
  2. OS state directory outside the repository:
     - Windows: `%LOCALAPPDATA%/CleanMyMap/runtime/cleanmymap.db`
     - Linux/macOS: `${XDG_STATE_HOME:-~/.local/state}/cleanmymap/runtime/cleanmymap.db`
- Runtime folder is auto-created before SQLite connection.
- Effective runtime DB path is emitted via structured log event `db_path_resolved`.
- Runtime DB files are excluded from version control (`.gitignore`) and `data/cleanmymap.db` is removed from git index.

### Initialize runtime DB and anonymized seed
- Schema only:
  - `python scripts/init_runtime_db.py`
- Schema + anonymized seed:
  - `python scripts/init_runtime_db.py --seed data/seed/runtime_seed_anonymized.json`
- Override DB path explicitly:
  - `python scripts/init_runtime_db.py --db-path <path> --seed data/seed/runtime_seed_anonymized.json`
- Deterministic reset of seeded tables for dev/test:
  - `python scripts/init_runtime_db.py --db-path <path> --seed data/seed/runtime_seed_anonymized.json --reset-seeded-tables`

### CI guardrail
- Main CI now runs:
  - `python scripts/check_runtime_db_tracking.py --root .`
- This step fails if runtime SQLite files are tracked by git.


