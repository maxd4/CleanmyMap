# Matrice de couverture des Quality Checks

Statut documentaire : `SNAPSHOT`

- SHA de référence : `4f996bc9f26567189475f40711f625b992f82d7c`
- Date de l'inventaire : `2026-10-22`
- Source de l'inventaire : `git ls-files` du SHA de référence

Cette matrice est une photographie vérifiable de la configuration effective au
SHA indiqué. Elle n'est pas une nouvelle source normative : les scripts,
configurations, workflows et documents canoniques liés ci-dessous restent les
sources de vérité. Une cellule `✓` décrit une analyse directe configurée et
applicable au périmètre ; elle ne signifie pas que le contrôle a été exécuté
avec succès sur ce SHA.

Légende des cellules : `✓` = analyse directe configurée et applicable ; `◐` =
analyse conditionnelle, partielle ou dépendante d'une preuve/exécution ; `↗` =
agrégation ou projection indirecte, sans nouveau scan ; `⊘` = configuration
indisponible ou mesure non vérifiée ; `—` = non-applicable au périmètre.

## 1. Inventaire Git des types observés

Les colonnes de la matrice sont des familles de périmètre, et non de simples
extensions. Une même extension est séparée lorsque le sous-arbre ou le
traitement effectif diffère.

| Famille de colonne | Périmètre Git observé | Extensions observées | Volume indicatif |
|---|---|---|---:|
| Web typed source | `apps/web/src/` | `.ts`, `.tsx` | 3 765, dont 1 377 fichiers de test |
| Mobile typed source | `apps/mobile/` hors `vendor/` | `.ts`, `.tsx` | 77 |
| Scripts typed source | `scripts/` | `.ts`, `.tsx` | 43 |
| E2E et configuration typed | `e2e/` et racine | `.ts` | 29 |
| Web/tooling JavaScript | `apps/web/` hors `src/`, configurations et scripts | `.js`, `.mjs` | 63 |
| Mobile JavaScript | `apps/mobile/` hors `vendor/` | `.js`, `.mjs` | 105 |
| Scripts et E2E JavaScript | `scripts/`, `e2e/` | `.js`, `.mjs` | 268 |
| Python | `maintenance/python/` et racine | `.py`, `.ini`, `.txt` associés | 57 `.py`, 1 `.ini`, 4 `.txt` |
| SQL | `apps/web/supabase/`, `e2e/`, documentation | `.sql` | 342 |
| Documentation textuelle | `documentation/`, `e2e/`, `apps/*`, racine | `.md`, `.txt`, `.bib`, `.tex`, `.mmd` | 641 `.md`, 7 `.txt`, autres détaillés en annexe |
| Manifestes et configuration | racine, `apps/*`, `scripts/`, `.github/` | `.json`, `.toml`, `.ini`, `.properties`, `.lock`, `.example`, `.context` et dotfiles | voir annexe |
| CI et scripts shell | `.github/`, `scripts/`, `.githooks/` | `.yml`, `.yaml`, `.ps1`, hooks sans extension | 21 `.yml`, 15 `.ps1`, 2 hooks |
| CSS | `apps/web/src/` | `.css` | 19 |
| HTML/SVG | `apps/web/`, `documentation/` | `.html`, `.svg` | 3 `.html`, 6 `.svg` |
| Assets et autres binaires | tous sous-arbres | `.png`, `.webp`, `.jpeg`, `.ico`, `.pdf`, `.mp3`, `.ogg`, `.wav`, `.xlsx`, `.csv`, `.snap` | détaillé en annexe |
| Sans extension et licences | racine et `apps/mobile/vendor/` | `LICENSE`, `.githooks/*` et autres noms sans extension | 8 |

Types non observés dans l'inventaire Git : `.jsx`, `.cjs`, `.jsonc`, `.mdx`,
`.scss`, `.htm` et `.sh`. Leur présence dans une configuration future ne crée
pas, à elle seule, une couverture actuelle.

## 2. Matrice principale

Abréviations de colonnes : `W` = Web typed source, `M` = Mobile typed source,
`S` = Scripts typed source, `E` = E2E/root typed, `WJ` = Web/tooling JS,
`MJ` = Mobile JS, `SJ` = Scripts/E2E JS, `PY` = Python, `SQL` = SQL, `D` =
documentation textuelle, `C` = manifestes/configuration, `CI` = YAML/PS1/hooks,
`CSS`, `H/SVG` = HTML/SVG et `A` = assets/autres.

| Contrôle distinct | W | M | S | E | WJ | MJ | SJ | PY | SQL | D | C | CI | CSS | H/SVG | A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `quality:dead-code` (Knip) | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | — | — | — | ◐ | — | — | — | — |
| `quality:duplication` (jscpd) — runtime | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `quality:duplication` (jscpd) — tests | ◐ | ◐ | ✓ | — | — | — | ◐ | — | — | — | — | — | — | — | — |
| `quality:duplication` (jscpd) — fixtures/data | ◐ | — | ◐ | — | — | — | — | — | — | — | — | — | — | — | — |
| `quality:top-heavy` (Node.js / politique interne) | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `quality:complexity` (ESLint / politique interne) | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `quality:cycles` (GitNexus) | ◐ | ◐ | ◐ | — | ◐ | ◐ | ◐ | — | — | — | — | — | — | — | — |
| `quality:maintainability` / SonarJS sélectionné | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `quality:type-safety` (typescript-eslint typé) | ⊘ | ✓ | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `audit:quality` — hotspots | ◐ | ◐ | ◐ | — | — | — | — | — | — | — | — | — | — | — | — |
| `audit:quality` — testability | ◐ | ◐ | ◐ | — | — | — | — | — | — | — | — | — | — | — | — |
| `audit:quality` — coverage insights | ◐ | ◐ | ◐ | — | — | — | — | ◐ | — | — | — | — | — | — | — |
| `audit:quality -- all` — projection et ZIP | ↗ | ↗ | ↗ | ↗ | ↗ | ↗ | ↗ | ↗ | ↗ | ↗ | ↗ | ↗ | ↗ | ↗ | ↗ |
| Graphe d'imports architecture TypeScript | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `check:architecture-import-boundary` | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — | — | — |
| ESLint Web (`apps/web/src`) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| ESLint mobile (`apps/mobile`, vendor/expo exclus) | — | ◐ | — | — | — | ◐ | — | — | — | — | — | — | — | — | — |
| TypeScript Web (`apps/web/tsconfig.json`) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| TypeScript mobile (`apps/mobile/tsconfig.json`) | — | ✓ | — | — | — | — | — | — | — | — | — | — | — | — | — |
| Tests Node (`test:scripts`) | — | — | ◐ | — | ◐ | — | ◐ | — | — | — | — | — | — | — | — |
| Vitest Web | ◐ | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| Vitest mobile | — | ◐ | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `quality:coverage` Web | ◐ | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `quality:mobile-coverage` | — | ◐ | — | — | — | — | — | — | — | — | — | — | — | — | — |
| Couverture Node (`test:coverage:node`) | — | — | ◐ | — | ◐ | — | ◐ | — | — | — | — | — | — | — | — |
| Couverture Python (`test:coverage:python`) | — | — | — | — | — | — | — | ◐ | — | — | — | — | — | — | — |
| Mutation Stryker (`quality:mutation`) | ◐ | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| E2E Playwright | — | — | — | ◐ | — | — | ◐ | — | — | — | ◐ | — | — | — | — |
| `security:secrets` | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | — | — |
| `security:dependencies` / dependency review | — | — | — | — | — | — | — | — | — | ◐ | ✓ | — | — | — | — |
| Semgrep architectural et fixtures | ◐ | ◐ | — | — | — | — | — | — | — | — | — | — | — | — | — |
| CodeQL JavaScript/TypeScript | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | — | — | — | — | — | — | — | — |
| CodeQL Python | — | — | — | — | — | — | — | ✓ | — | — | — | — | — | — | — |
| CodeQL GitHub Actions | — | — | — | — | — | — | — | — | — | — | — | ✓ | — | — | — |
| Sécurité GitHub Actions / zizmor | — | — | — | — | — | — | — | — | — | — | — | ◐ | — | — | — |
| `check:documentation-governance` | — | — | — | — | — | — | — | — | — | ◐ | ◐ | ◐ | — | — | — |
| `check:utf8-fr` | ◐ | ◐ | ◐ | — | — | — | — | — | — | ◐ | — | ◐ | — | — | — |
| `check:file-naming` | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ |
| `check:stack-doc-drift` | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | — | ◐ | ◐ | — | — | — | — |
| `audit:pages-site-drift` / `check:pages-site-drift` | ◐ | — | — | — | — | — | — | — | — | ◐ | — | — | — | ◐ | — |
| `check:agent-governance` / `check:agent-skills` | — | — | — | — | — | — | — | — | — | ◐ | ◐ | ◐ | — | — | — |
| `check:lockfile-policy` | — | — | — | — | — | — | — | — | — | — | ✓ | — | — | — | — |
| `audit:supabase-migration-trees` | — | — | — | — | — | — | — | — | ✓ | — | — | — | — | — | — |
| `check:github-actions` | — | — | — | — | — | — | — | — | — | — | — | ✓ | — | — | — |
| `check:env-contract` | ◐ | — | — | — | ◐ | — | — | — | — | — | ◐ | — | — | — | — |
| `check:clerk-js-version` | ✓ | — | — | — | ◐ | — | — | — | — | — | ◐ | — | — | — | — |
| `check:actions-data-contract-boundary` | ✓ | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `check:report-model-boundary` | ✓ | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `check:learning-import-boundary` | ✓ | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `check:9c-public-facades` | ✓ | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `check:root-files` / `audit:repository-tree` | — | — | — | — | — | — | — | — | — | — | ◐ | ◐ | — | ◐ | — |
| `check:doc-visuals` | — | — | — | — | — | — | — | — | ◐ | — | — | — | ◐ | ◐ | — |
| Contrôles UI ciblés (`check:layout`, `check:forms`, `check:states`, etc.) | ✓ | — | — | — | — | — | — | — | — | — | — | — | ✓ | ◐ | — |
| Audit surface Vercel (`audit:vercel:*`, `audit:vercel:ci`) | ◐ | — | — | — | ◐ | — | — | — | — | — | ◐ | — | — | — | — |

### Lecture des cellules importantes

- `quality:complexity` et `quality:maintainability` lisent les mêmes sources
  TypeScript/TSX Web et mobile mais mesurent des propriétés distinctes : la
  complexité cyclomatique et la longueur restent dans le premier contrôle ; la
  complexité cognitive et les défauts locaux sélectionnés restent dans le
  second.
- `quality:top-heavy` applique son gate uniquement à `apps/web/src` et
  `apps/mobile`, sur les fichiers `.ts` et `.tsx` après ses exclusions. La
  fonction `collectArchitectureRows()` du même module appartient à un
  inventaire architectural distinct ; elle n'étend pas la baseline ni le
  ratchet de `quality:top-heavy` aux fichiers JavaScript ou aux autres formats.
- `quality:type-safety` conserve le Web comme source éligible, mais sa mesure
  typée est `UNSUPPORTED_CONFIGURATION` / `NOT_MEASURED` au SHA de référence
  (`TypeScript 7.0.2` hors de la peer range de `typescript-eslint 8.71.2`). Le
  Mobile reste mesuré par projet compatible ; cela ne se confond ni avec
  l'ESLint Web général ni avec le typecheck Web.
- `quality:duplication` ne couvre pas le dépôt sans distinction : ses trois
  scopes sont explicitement runtime, tests et `fixtures/data`, avec des
  patterns et exclusions différents.
- `quality:coverage`, mutation et les rapports SonarQube ne couvrent que des
  fichiers instrumentés, mutés ou importés par un rapport valide. Une absence
  de rapport est `NOT_MEASURED`, pas une couverture nulle.
- `audit:quality -- all` orchestre les cinq gates historiques et les cinq
  auxiliaires, puis produit l'index et le ZIP du même SHA/runId. Le symbole `↗`
  indique une agrégation/projection indirecte : cette ligne ne déclare aucune
  nouvelle couverture directe des fichiers et ne transforme pas un rapport
  importé en preuve de scan.
- Une exécution E2E Playwright prouve l'exécution de scénarios dans les
  chemins concernés ; elle peut toucher indirectement une base SQL, mais elle
  n'analyse pas statiquement les fichiers `.sql` du dépôt. Fichier lu comme
  entrée, source analysée, code instrumenté, comportement exécuté et rapport
  importé restent des preuves distinctes.
- Les cellules `◐` de secret audit indiquent un périmètre conditionnel : le
  scanner dépend du scope Git (`WORKTREE`, `STAGED`, `REF` ou
  `PUSH_CANDIDATE`), des extensions texte et des exclusions générées/tiers.
- Les assets binaires ne sont pas artificiellement déclarés couverts par des
  analyseurs de code. Ils restent concernés seulement par les contrôles de
  chemin, de présence, de workflow ou de gouvernance qui les nomment
  réellement.

## 3. Traçabilité des contrôles

Les chemins sont relatifs à la racine du dépôt. Les modes indiqués décrivent
la disponibilité ou le déclenchement ; ils ne constituent pas une preuve
d'exécution pour le SHA de cette photographie.

| Contrôle ou famille | Invocation / moteur | Configuration canonique et périmètre | Exclusions ou limites principales | Mode / provenance des cellules |
|---|---|---|---|---|
| Gates Quality Audit | `npm run audit:quality -- <mode>` ; runner Node | [`run-quality-audit.mjs`](../../scripts/audits/run-quality-audit.mjs), policies `scripts/checks/*` ; cinq gates et cinq auxiliaires | artefacts liés au SHA ; baseline et justification restent propriétaires des gates ; `all` ne rescane pas indépendamment | manuel, `FULL`/audit ; rapport et manifeste du même SHA/runId |
| Dead code | `npm run quality:dead-code` ; Knip | [`dead-code-policy.mjs`](../../scripts/checks/dead-code-policy.mjs), [`knip.json`](../../scripts/knip.json) ; entrées et exports du workspace configuré | ignorements Knip et qualifications `CURRENT` ; pas de SQL/Markdown comme code exécutable | gate Quality ; provenance du rapport Knip |
| Duplication | `npm run quality:duplication` ; jscpd | [`duplication-policy.mjs`](../../scripts/checks/duplication-policy.mjs), [`check-duplication.mjs`](../../scripts/checks/check-duplication.mjs) ; `package.json`/`package-lock.json` déclarent et résolvent `5.4.1`, tandis que `DUPLICATION_TOOL_VERSION` et le message d'absence de runner restent `5.3.0` | vendor, generated, coverage, snapshots ; tests et data changent de scope ; la version effectivement exécutée n'est pas prouvée dans cette photographie | gate Quality ; baselines/fingerprints associés à la politique `5.3.0` |
| Taille / top-heavy | `npm run quality:top-heavy` ; Node.js | [`check-top-heavy-files.mjs`](../../scripts/checks/check-top-heavy-files.mjs), [`top-heavy-measurement.mjs`](../../scripts/checks/top-heavy-measurement.mjs), [`top-heavy-policy.mjs`](../../scripts/checks/top-heavy-policy.mjs) ; `apps/web/src` et `apps/mobile`, `.ts/.tsx` via `collectMeasuredRows()` | seuils REVIEW/HARD et baseline existante ; `generated` seulement sur provenance démontrée ; `collectArchitectureRows()` reste hors du gate | gate Quality ; rapport de politique |
| Complexité cyclomatique / longueur | `npm run quality:complexity` ; ESLint + politique interne | [`check-complexity-policy.mjs`](../../scripts/checks/check-complexity-policy.mjs), [`complexity-baseline.json`](../../scripts/checks/complexity-baseline.json) ; Web/mobile TS/TSX | scripts, E2E et documentation hors roots par défaut ; seuils et baseline ne sont pas recalculés ici | gate Quality ; rapport de policy |
| Complexité cognitive / maintenabilité locale | `npm run quality:maintainability` ; ESLint, `typescript-eslint`, `eslint-plugin-sonarjs` | [`check-maintainability.mjs`](../../scripts/checks/check-maintainability.mjs) ; `apps/web/src` et `apps/mobile`, `.ts/.tsx` ; règles SonarJS sélectionnées seulement | pas de `recommended` SonarJS complet ; mesure informative, sans ratchet historique bloquant | audit auxiliaire ; `WORKTREE_LIVE`, avec relation aux métriques complexity |
| Sûreté TypeScript | `npm run quality:type-safety` ; ESLint typé via `typescript-eslint` | [`check-type-safety.mjs`](../../scripts/checks/check-type-safety.mjs), tsconfig Web/mobile | Web `UNSUPPORTED_CONFIGURATION` / `NOT_MEASURED` au SHA de référence ; Mobile compatible ; findings classés `TYPE_SAFETY`/`ASYNC_SAFETY` ; ESLint Web général et typecheck restent distincts | audit auxiliaire ; inventaires `scopedFilePaths`/`measuredFilePaths` du rapport typé |
| Cycles et architecture | `npm run audit:gitnexus:cycles`, `npm run quality:cycles`, `npm run audit:architecture-import-graph`, `npm run check:architecture-import-boundary` | [`audit-gitnexus.mjs`](../../scripts/audits/audit-gitnexus.mjs), [`quality-audit-policy.mjs`](../../scripts/audits/quality-audit-policy.mjs), [`generate-architecture-import-graph.mjs`](../../scripts/reports/generate-architecture-import-graph.mjs), baseline de frontières | L'analyse GitNexus des cycles est officiellement `SKIPPED_BY_POLICY` jusqu'à réactivation ; le graphe interne TypeScript n'est pas une preuve de test runtime | gate Quality / audit architecture ; la suspension et sa provenance sont explicites dans les rapports |
| Hotspots / testabilité | `npm run audit:quality -- hotspots|testability` ; Node.js + Git historique / rapports existants | [`quality-audit-signals.mjs`](../../scripts/reports/quality-audit-signals.mjs), [`generate-module-test-metrics.mjs`](../../scripts/reports/generate-module-test-metrics.mjs) ; sources Web/mobile/scripts et domaines critiques | fenêtre hotspots de 180 jours ; aucune correspondance fichier/test inventée ; couverture/mutation absentes = `NOT_MEASURED` | audit auxiliaire ; SHA audité, historique réel ou preuve attribuable |
| Couverture | `npm run quality:coverage`, `npm run quality:mobile-coverage`, `npm run test:coverage:node`, `npm run test:coverage:python` | [`coverage-policy.mjs`](../../scripts/checks/coverage-policy.mjs), [`coverage-evidence.mjs`](../../scripts/checks/coverage-evidence.mjs), configurations Vitest et Cobertura Python | seulement sources instrumentées et rapports valides ; stale/autre SHA = non mesuré ; ne relance pas un test dans l'index offline | CI, `FULL`, audit auxiliaire ; rapports LCOV/JSON/Cobertura attribués |
| Tests et mutation | `npm test`, `npm run mobile:test`, `npm run test:e2e`, `npm run quality:mutation` ; Vitest, Playwright, Stryker | `apps/web/vitest.config.mts`, `apps/mobile/vitest.config.ts`, [`apps/web/stryker.config.mjs`](../../apps/web/stryker.config.mjs), `playwright.config.ts` | tests exécutent des scénarios ; mutation bornée à des fonctions Web critiques ; fixture E2E et tests ne prouvent pas tous les services externes | DEVELOPMENT ciblé, FULL/CI ; preuve d'exécution séparée de la couverture |
| Secrets | `npm run security:secrets` ; scanner Node interne | [`secret-audit.mjs`](../../scripts/checks/secret-audit.mjs), allowlist ; extensions texte `.ts/.tsx/.js/.jsx/.mjs/.cjs/.json/.md/.mdx/.html/.htm/.yml/.yaml/.py/.sql/.toml/.ini/.sh/.ps1` | portée Git explicite ; generated, vendor, caches, artifacts, lockfiles et chemins tiers exclus selon le script ; masque les diagnostics | pre-commit/pre-push/CI ; `STAGED`, `REF` ou `PUSH_CANDIDATE` exact |
| Dépendances | `npm run security:dependencies`, dependency review GitHub, SonarQube manuel | [`audit-dependencies.mjs`](../../scripts/security/audit-dependencies.mjs), `package-lock.json`, manifests ; SonarQube lit aussi les rapports de couverture validés | analyse de manifestes/lockfiles et graphes de dépendances, pas de couverture du code applicatif ; résultats distants distincts | CI ou manuel ; provenance npm/GitHub/Sonar séparée |
| Semgrep | `npm run check:semgrep` et `npm run test:semgrep` ; Semgrep `1.180.0` | [`check-semgrep-architecture.mjs`](../../scripts/checks/check-semgrep-architecture.mjs), règles [`cleanmymap.yml`](../../scripts/security/semgrep/cleanmymap.yml) ; Web/mobile | fixtures exclues du scan architectural ; tests Semgrep écrivent temporairement des fixtures puis nettoient | CI / ciblé ; `NOT_RUN` si host Semgrep requis absent |
| CodeQL | workflow [`codeql.yml`](../../.github/workflows/codeql.yml) | JavaScript/TypeScript first-party, JavaScript/TypeScript vendored mobile, Python et Actions | first-party JS/TS ignore `apps/mobile/vendor`; job vendor ne couvre que ce chemin ; configuration workflow ≠ preuve d'exécution | CI planifiée/push/PR ; provenance SARIF GitHub |
| GitHub Actions sécurité | `npm run check:github-actions`, workflow `zizmor.yml` | [`check-github-actions-security.mjs`](../../scripts/checks/check-github-actions-security.mjs), `.github/workflows/*.yml` | contrôle des permissions, SHA d'actions, secrets et artefacts ; ne scanne pas le code source | CI ; analyse de YAML/workflows |
| Gouvernance documentaire | `npm run check:doc-governance` ; Node.js | [`check-documentation-governance.mjs`](../../scripts/checks/check-documentation-governance.mjs) ; `.md/.mdx/.txt/.yml/.yaml/.html/.htm` suivis par Git | règles et chemins exclus du script ; gouvernance de contenu, pas taille/structure générale | pre-commit/CI ; `COMMITTED_SNAPSHOT` ou scope du runner |
| UTF-8 | `npm run check:utf8-fr` ; Node.js | [`check-utf8-fr-files.mjs`](../../scripts/checks/check-utf8-fr-files.mjs) ; texte sous `apps/web/src`, `apps/mobile`, `documentation`, `scripts` | extensions textuelles définies par `TEXT_EXTENSIONS`, vendor/caches/generated exclus ; BOM non bloquant | CI / ciblé ; contenu Git suivi |
| Nommage et fichiers | `npm run check:file-naming`, `check:root-files`, `audit:repository-tree` | [`check-file-naming.mjs`](../../scripts/checks/check-file-naming.mjs), baselines et audit PowerShell de l'arbre | exceptions explicites ; contrôle de chemins et métadonnées, pas analyse sémantique complète | pre-push/CI/manual ; inventaire Git ou arbre candidat |
| Contrats document/code | `check:stack-doc-drift`, `audit:pages-site-drift`, `check:env-contract`, `check:clerk-js-version`, frontières actions/learning/report/facades | scripts `scripts/checks/check-*.mjs` correspondants ; sources Web, docs, manifests et routes selon chaque owner | chaque script a un sous-périmètre ; aucune cellule n'est étendue à un fichier simplement importé | CI / ciblé ; rapport du script propriétaire |
| Migrations Supabase | `npm run audit:supabase-migration-trees` ; audit SQL interne | [`audit-supabase-migration-trees.mjs`](../../scripts/audits/audit-supabase-migration-trees.mjs) ; `apps/web/supabase/migrations` et contrats associés | contrôle d'ordre/arbre et de contrats ; ne prouve pas RLS, transaction, trigger ou concurrence exécutés | pre-commit/CI ; preuve statique distincte de PostgreSQL |
| Gouvernance UI | `check:layout`, `check:forms`, `check:states`, `check:actions`, `check:data-display`, `check:motion`, `check:icons`, `check:overlays`, `check:indicators`, `check:page-header`, `check:readable-typography`, `check:surfaces`, `check:white-text` | scripts `scripts/checks/check-*-governance.mjs` et sources `apps/web/src` | contrôles ciblés de conventions UI ; pas de preuve navigateur ou d'exécution mobile | ciblé/CI selon le planner ; chemins Web lus par le script |
| Vercel / surface produit | `audit:vercel:*`, `audit:product-surface`, `audit:vercel:ci` | scripts `scripts/audits` et `scripts/reports`, routes/configuration Web | inventaire statique de routes, imports, headers ou options ; ne prouve pas production ni déploiement | manuel/CI ; rapport lié au SHA si généré |

## 4. Lacunes de couverture réellement établies

Une case vide n'est pas une lacune en soi : elle peut simplement être hors
domaine du contrôle. Les lacunes ci-dessous sont limitées aux écarts qui ont
une conséquence technique ou une incertitude vérifiable à partir des sources
lues.

| Type / famille | Contrôles absents ou partiels | Conséquence réelle | Priorité | Recommandation bornée |
|---|---|---|---|---|
| `.mdx`, `.htm`, `.scss`, `.jsx`, `.cjs`, `.jsonc`, `.sh` non observés | Aucun résultat courant possible car aucun fichier suivi de ces types n'existe au SHA inventorié | Si un type apparaît plus tard, il faudra requalifier les scopes ; la matrice actuelle ne constitue pas une promesse de couverture future | informative | Réactualiser cette photographie lors de l'apparition d'un de ces types ; ne pas créer de scanner pour un type absent |
| Scripts Node `scripts/*.mjs`/`*.js` | ESLint Web/mobile et `quality:complexity` ne les analysent pas ; `test:scripts` et couverture Node restent ciblés par leurs tests et sources configurés | Des défauts de style/type ou de complexité hors tests peuvent rester hors de ces gates, même si plusieurs contrôles de sécurité les lisent | P2 | Conserver l'owner Node existant ; décider séparément d'un lint/typecheck scripts si un contrat l'exige, sans étendre une configuration par défaut |
| SQL et migrations | TypeScript/ESLint/complexité/mutation ne sont pas applicables ; l'audit d'arbre est statique | RLS, transactions, triggers et concurrence ne sont pas prouvés par l'analyse de fichier ou par un dry-run | P1 pour les migrations sensibles, sinon informative | Utiliser les preuves PostgreSQL/Supabase autorisées pour les lots concernés ; conserver `DB_SEMANTICS_NOT_EXECUTED` en leur absence |
| HTML/SVG/assets | Pas d'analyse de code général ; gouvernance documentaire, secrets ou contrôles ciblés seulement selon le chemin | Les propriétés visuelles, accessibilité et contenu binaire ne sont pas couvertes par les Quality Audit gates | P2 si un asset ou document public change | Utiliser le contrôle UI ou une preuve navigateur quand le changement le justifie ; ne pas transformer l'asset en code |
| Mobile `vendor/` | ESLint mobile ignore `vendor/`; CodeQL le traite dans un job séparé ; la couverture mobile l'exclut | Les backports tiers ne sont pas soumis aux mêmes règles que le first-party, mais leurs contrôles de dépendances et fixtures restent distincts | informative | Conserver la frontière vendor et ses justifications exactes ; ne pas masquer un finding de dépendance |
| Couverture et mutation sans artefact valide | `quality:coverage`, testability et projections restent `NOT_MEASURED` ou partielles | Il est impossible d'attribuer une couverture ou une qualité de test à un fichier sans rapport du même candidat | P1 pour les domaines critiques, sinon informative | Produire ou réutiliser uniquement une preuve valide pour le SHA ; ne pas déduire l'absence de test d'un nom de fichier voisin |
| GitNexus / SonarQube / CodeQL externes | Disponibles en CI ou manuel, non garantis par une exécution locale de cette matrice | La configuration et les liens prouvent un périmètre, pas un résultat d'analyse sur ce SHA | informative | Vérifier le manifeste/SARIF/rapport du run lorsqu'une décision dépend de la preuve ; ne pas marquer PASS localement |

## 5. Limites et non-déductions

- La matrice ne déclare aucun scan exécuté, aucun verdict de qualité et aucune
  couverture positive pour le SHA de référence.
- Les cinq gates historiques conservent leurs owners, verdicts, seuils,
  baselines et exclusions. Les projections Quality Audit ne recompte pas un
  finding comme une nouvelle gate.
- Les workflows GitHub, les actions épinglées et les commandes npm décrivent
  des possibilités d'exécution. La preuve d'exécution reste attachée au
  rapport, au manifeste, au SARIF ou à l'artefact du run correspondant.
- Pour jscpd, `package.json` et `package-lock.json` au SHA de référence
  déclarent/résolvent `5.4.1`, alors que la politique et son fingerprint restent
  explicitement en `5.3.0`. Cette matrice ne lance pas jscpd et ne prétend donc
  pas établir la version effectivement exécutée ; l'écart de politique est un
  sujet séparé, sans modification de baseline dans ce lot.
- Les fichiers non suivis, les artefacts générés et le dirty state du checkout
  ne font pas partie de cet inventaire du SHA publié.

## Annexe — inventaire exhaustif des extensions Git observées

Comptage issu de `git ls-files` au SHA de référence. Les extensions absentes ne
sont pas ajoutées à la matrice.

| Extension / forme | Nombre | Extension / forme | Nombre |
|---|---:|---|---:|
| `.ts` | 2 881 | `.tsx` | 1 043 |
| `.mjs` | 333 | `.js` | 105 |
| `.json` | 63 | `.md` | 641 |
| `.sql` | 342 | `.css` | 19 |
| `.yml` | 21 | `.py` | 57 |
| `.ps1` | 15 | `.txt` | 7 |
| `.svg` | 6 | `.html` | 3 |
| `.csv` | 13 | `.ogg` | 228 |
| `.wav` | 32 | `.webp` | 55 |
| `.png` | 17 | `.pdf` | 4 |
| `.mp3` | 5 | `.xlsx` | 2 |
| `.tex` | 3 | `.bib` | 2 |
| `.mmd` | 2 | `.jpeg` | 1 |
| `.ico` | 1 | `.snap` | 1 |
| `.toml` | 2 | `.ini` | 1 |
| `.properties` | 1 | `.lock` | 1 |
| `.example` | 2 | `.context` | 1 |
| `.gitignore` | 5 | `.vercelignore` | 2 |
| `.editorconfig` | 1 | `.gitattributes` | 1 |
| `.codexignore` | 1 | `.keep` | 2 |
| sans extension (`LICENSE`, hooks et licences vendor) | 8 | — | — |
