# CleanMyMap : bilan SonarQube Cloud du 14 octobre 2026 et comparaison avec la baseline initiale

> **Statut : SNAPSHOT / AUDIT READ-ONLY** — export SonarCloud du **14 octobre 2026 à 17:30:48 UTC** ; dernière analyse disponible dans l'export : **17:01:01 UTC**.
> **Commit analysé :** `ed0e2659760e3bdd8d26fba0389c6a52701a8c18`.
> **Comparaison historique :** [bilan du 13 octobre 2026](./CleanMyMap_SonarQube_Bilan_2026-10-13.md), commit `87415b54d2c1cb15edbeabda08e4e26114bca902`, analysé à **21:31:32 UTC**.
> **Projet :** [SonarQube Cloud `maxd4_CleanmyMap`](https://sonarcloud.io/project/overview?id=maxd4_CleanmyMap).
> **Fraîcheur :** ce document décrit le scan daté, **pas** le `main` ultérieur (`221c36b17e20` au moment de sa préparation). Ni un résultat de production, ni une validation AuthZ/RLS/PostgreSQL.

## Synthèse exécutive

- **Nouveauté vérifiée :** le scanner reçoit désormais les rapports **LCOV Web et Mobile** et fournit une couverture globale SonarCloud de **51,5 %**. Le scan SonarQube s'est achevé avec `ANALYSIS SUCCESSFUL` / `EXECUTION SUCCESS` dans [GitHub Actions 38602365150](https://github.com/maxd4/CleanmyMap/actions/runs/38602365150) ; le workflow est cependant **FAIL**, car l'étape finale restitue l'échec préexistant du ratchet de couverture Web. Un scan transmis n'implique pas un Quality Gate vert.
- **Quality Gate : ERROR**, après un état Green à la baseline ; **4 conditions sur 6 échouent** sur le **nouveau code** : fiabilité, sécurité, couverture et duplication.
- **Issues ouvertes : 491**, contre **466** dans le rapport initial (**+25 nettes**). Les vulnérabilités signalées passent de **118 à 124**, les bugs de **192 à 207**, les code smells de **156 à 160**. Ce sont des **findings Sonar**, pas des exploits ou bugs reproductibles démontrés.
- **Périmètre non constant :** Sonar mesure **2 776 fichiers et 366 639 NCLOC**, contre **4 061 fichiers et 500 782 NCLOC**. La configuration `sonar-project.properties` a été ajoutée entre les deux commits, et des profils qualité JS/TS ont changé ; l'amélioration des totaux de complexité n'est **pas imputable exclusivement** à une réduction de complexité du code.
- **Couverture historique : NON MESURÉE** dans le premier export, donc aucune progression de couverture calculable entre les deux scans.

## Bilan chiffré avant / après

| Mesure | 13 octobre — baseline | 14 octobre — nouveau scan | Delta brut |
|---|---:|---:|---:|
| Fichiers source mesurés | 4 061 | 2 776 | -1 285 |
| NCLOC | 500 782 | 366 639 | -134 143 |
| Issues ouvertes | 466 | 491 | +25 |
| Bugs | 192 | 207 | +15 |
| Vulnérabilités | 118 | 124 | +6 |
| Code smells | 156 | 160 | +4 |
| Blocker | 21 | 22 | +1 |
| Critical | 83 | 90 | +7 |
| Major | 266 | 278 | +12 |
| Minor | 96 | 101 | +5 |
| Duplication (%) | 4,9 | 5,6 | +0,7 pp |
| Lignes dupliquées | 27 409 | 22 777 | -4 632 |
| Blocs dupliqués | 1 477 | 1 129 | -348 |
| Complexité cyclomatique | 76 636 | 60 928 | -15 708 |
| Complexité cognitive | 41 222 | 39 738 | -1 484 |
| Dette maintenabilité (min) | 2 058 | 2 123 | +65 |
| Couverture globale SonarCloud | NON MESURÉE | **51,5 %** | Non comparable |
| Couverture lignes SonarCloud | NON MESURÉE | **49,9 %** | Non comparable |
| Couverture branches SonarCloud | NON MESURÉE | **53,7 %** | Non comparable |
| Hotspots de sécurité | 0 | 0 | 0 |
| Quality Gate | OK (nouveau code) | **ERROR (nouveau code)** | Dégradation du gate |

Les pourcentages sont exprimés en **points de pourcentage** pour la duplication. La dette de maintenabilité estimée (`sqale_index`) passe de **2 058 à 2 123 minutes**, soit **34 h 18 → 35 h 23** : elle n'est **pas** le coût total de correction des 491 findings.

### Effet déterminant du changement de périmètre

- **−1 285 fichiers** (**−31,6 %**) et **−134 143 NCLOC** (**−26,8 %**) dans le **périmètre Sonar** : ne pas présenter ces valeurs comme des fichiers ou lignes supprimés du dépôt.
- Complexité cyclomatique brute : **76 636 → 60 928** (**−20,5 %**), mais **par 1 000 NCLOC** : **153,0 → 166,2** (**hausse**).
- Complexité cognitive brute : **41 222 → 39 738** (**−3,6 %**), mais **par 1 000 NCLOC** : **82,3 → 108,4** (**hausse**).
- Les lignes dupliquées diminuent en volume (**27 409 → 22 777**), tandis que leur proportion passe de **4,9 à 5,6 %** : **pas d'amélioration démontrée** à périmètre constant.
- Entre les deux SHA, la configuration `sonar-project.properties` a été **introduite**. La séparation des fichiers source/test, les exclusions des artefacts et la disponibilité LCOV rendent la comparaison non iso-périmètre ; les changements de profils qualité JavaScript/TypeScript peuvent également affecter le nombre d'alertes.

## Quality Gate et couverture

| Condition sur le nouveau code | Seuil SonarCloud | Mesure | Verdict |
|---|---:|---:|---|
| Fiabilité du nouveau code | A | D (4) | FAIL |
| Sécurité du nouveau code | A | C (3) | FAIL |
| Maintenabilité du nouveau code | A | A (1) | PASS |
| Couverture du nouveau code | ≥ 80 % | 42,9 % | FAIL |
| Duplication du nouveau code | ≤ 3 % | 3,2 % | FAIL |
| Hotspots de nouveau code examinés | 100 % | 100 % | PASS |

**Période de nouveau code :** `previous_version`, début indiqué au **13 octobre 2026 à 21:21:16 UTC**. Ce point de départ **n'est pas identique** à l'horodatage du scan de comparaison (**21:31:32 UTC**) ; le delta des issues globales et les métriques « new code » ne représentent donc pas exactement la même fenêtre.

**Mesures de couverture (trois périmètres différents) :**

- **SonarCloud monorepo :** `coverage=51,5 %`, `line_coverage=49,9 %`, `branch_coverage=53,7 %` ; **85 794 lignes** à couvrir, **42 975 non couvertes**. Le périmètre inclut des sources hors Web et Mobile (scripts, SQL, Python, etc.).
- **Ratchet Web (Vitest/V8, dans GitHub Actions) :** statements **63,53 %**, branches **53,79 %**, functions **64,70 %**, lines **65,42 %**. Il reste **FAIL sur neuf critères** (dont quatre globaux et quatre `persistence`) vis-à-vis de la baseline Web propre au dépôt ; ne pas rapprocher directement ces pourcentages des **51,5 %** SonarCloud.
- **Ratchet Mobile (Vitest/V8, dans GitHub Actions) :** statements **55,28 %**, branches **46,75 %**, functions **49,90 %**, lines **61,07 %** — **PASS**. LCOV normalisés : **2 085 fichiers Web** et **36 Mobile**, puis scan Sonar transmis avec succès.

Sur le nouveau code, la couverture combinée Sonar est **42,9 %** (seuil **80 %**) ; la couverture des lignes nouvelles est **34,78 %** et celle des branches nouvelles **59,71 %**. **1 232 lignes nouvelles** et **365 conditions nouvelles** restent non couvertes selon Sonar.

## Qualité et exhaustivité de l'export

- `files`: **2776/2776**, `complete=true`.
- `issues.unresolved`: **491/491**, `complete=true` ; **toutes OPEN** dans le snapshot.
- `issues.resolved`: **4/4**, `complete=true` ; **4 FIXED**, datées du **14 octobre à 17:01 UTC**.
- `hotspots`: **0/0**, `complete=true` ; revue des hotspots **100 %**. Zéro hotspot détecté ne signifie pas absence de vulnérabilité.
- `analyses`: **2 résultats**, 13 et 14 octobre, chacun lié à un SHA exact ; historique des métriques globales disponible sur ces deux scans, mais **sans valeur de couverture antérieure**.
- `newCodePeriod`: **null**, suite à un seul avertissement d'API `période nouveau code: HTTP 404`. Les informations de période du Quality Gate sont néanmoins disponibles ; l'export n'est donc **pas sans erreur**, mais les 4 listes paginées sont complètes.
- L'API restitue les issues ouvertes **au moment de l'export**, et non une liste exhaustive d'issues capturée séparément sur chaque SHA. On **ne peut pas** reconstruire toutes les transitions individuelles d'issues entre scans sans deux exports complets horodatés. Les dates de création/clôture donnent une indication partielle.

## Répartition par sous-arbre

Les catégories reprennent l'organisation du bilan initial. Les colonnes indiquent **ancien → nouveau** ; elles dépendent du périmètre Sonar de chaque date.

| Domaine | Fichiers | NCLOC | Issues ouvertes | Vulnérabilités signalées |
|---|---:|---:|---:|---:|
| Web runtime/tests | 3 341 → 2 188 | 403 866 → 284 133 | 198 → 205 | 12 → 12 |
| Scripts racine | 241 → 177 | 38 258 → 29 750 | 195 → 212 | 70 → 75 |
| Migrations SQL | 259 → 263 | 26 608 → 27 169 | 0 → 0 | 0 → 0 |
| Scripts Web | 49 → 38 | 8 601 → 7 691 | 25 → 25 | 5 → 5 |
| Mobile | 68 → 35 | 6 817 → 4 021 | 6 → 6 | 2 → 2 |
| Maintenance | 52 → 34 | 5 100 → 4 335 | 1 → 1 | 0 → 0 |
| Documentation | 8 → 8 | 4 575 → 4 575 | 10 → 10 | 0 → 0 |
| E2E | 23 → 12 | 3 571 → 1 437 | 2 → 2 | 0 → 0 |
| GitHub Actions | 6 → 7 | 968 → 1 055 | 29 → 30 | 29 → 30 |
| Autres | 14 → 14 | 2 418 → 2 473 | 0 → 0 | 0 → 0 |

**Concentration actuelle :** sur **124 vulnérabilités** signalées, **110** se situent dans `scripts/` racine (**75**), `apps/web/scripts/` (**5**) et `.github/` (**30**). Cette localisation rappelle l'importance des chemins CLI/CI, sans établir une exploitation ni justifier une modification massive des scripts.

## Familles de findings : comparaison

| Famille d'alertes | 13 octobre | 14 octobre | Delta | Règles Sonar |
|---|---:|---:|---:|---|
| Branches conditionnelles identiques | 82 | 82 | +0 | `S3923` |
| Environnement PATH | 68 | 73 | +5 | `S4036` |
| Regex à complexité potentiellement superlinéaire | 88 | 92 | +4 | `S8786` |
| Tri sans comparateur explicite | 74 | 81 | +7 | `S2871` |
| Scripts/installations GitHub Actions | 29 | 30 | +1 | `S6505, S8543, S8541` |
| Tests signalés comme vides | 16 | 17 | +1 | `S2187` |

Les familles sont des regroupements de signalements, **pas** des causes racines indépendantes. Les branches identiques ou les tris sans comparateur peuvent être valides selon le contrat ; la complexité regex dépend des bornes des entrées ; un test `node:test` ou une fixture peut être légitimement traité à tort comme un fichier de tests vide. Qualifier les chemins d'exécution avant de modifier le code.

### Sévérité des issues ouvertes

| Gravité Sonar | 13 octobre | 14 octobre | Delta |
|---|---:|---:|---:|
| BLOCKER | 21 | 22 | +1 |
| CRITICAL | 83 | 90 | +7 |
| MAJOR | 266 | 278 | +12 |
| MINOR | 96 | 101 | +5 |

## Nouveaux signalements et corrections identifiables

**Nouveau code selon le Quality Gate :** **8 bugs**, **8 vulnerabilities**, **4 code smells** (20 signalements). Dans la liste des issues actuellement ouvertes, **20** ont une `creationDate` **postérieure** au scan initial de **21:31:32 UTC**. Ce recoupement ne remplace pas un véritable diff d'identifiants entre deux snapshots complets.

Exemples de signalements récents à **qualifier** :

| Fichier ou zone | Règle | Sens du signalement |
|---|---|---|
| `scripts/ci/diagnose-supabase-start.mjs:144` | `javascript:S2871` | Tri non explicitement lexical, niveau CRITICAL (analyse statique). |
| `scripts/checks/check-architecture-import-boundary.mjs:20` | `javascript:S2871` | Tri sans comparateur explicite. |
| `scripts/reports/generate-architecture-import-graph.mjs:41` | `javascript:S4036` | Environnement PATH à qualifier sur ce script. |
| `scripts/reports/architecture-audit.mjs:107` | `javascript:S8786` | Complexité potentiellement superlinéaire d’une expression régulière. |
| `apps/web/src/app/api/chat/route.post.ts:90` | `typescript:S4822` | Gestion d’une promesse dans un `try`, chemin d’exécution à vérifier. |
| `.github/workflows/e2e-supabase.yml:87` | `githubactions:S6505 / S8543` | Avertissements sur `npx` et versions d’installation. |
| `scripts/checks/fixtures/architecture-import-boundary/web/src/components/fixture.test.ts` | `typescript:S2187` | Fixture qualifiée comme fichier de test vide ; confirmer son rôle avant toute suppression. |

**Quatre issues présentes dans la liste `resolved`**, marquées `FIXED` et clôturées dans la nouvelle analyse :

| Règle | Chemin | Type | Date de clôture |
|---|---|---|---|
| `githubactions:S6505` | `.github/workflows/e2e-supabase.yml` | VULNERABILITY | 2026-10-14 |
| `githubactions:S8543` | `.github/workflows/e2e-supabase.yml` | VULNERABILITY | 2026-10-14 |
| `javascript:S5850` | `scripts/checks/top-heavy-measurement.mjs` | BUG | 2026-10-14 |
| `typescript:S7739` | `apps/web/src/app/api/chat/route.test.helpers.ts` | BUG | 2026-10-14 |

Cette liste de quatre n'implique pas que seulement quatre problèmes ont disparu entre scans : des règles, fichiers ou identités de findings peuvent évoluer avec les profils et le périmètre. De même, **+25 issues ouvertes nettes** n'est pas synonyme de « 25 bugs introduits ».

### Points qui demandent une lecture fonctionnelle avant correction

1. **CLI et GitHub Actions** : examiner les avertissements `npx`/installation et les chemins `PATH` selon les protections et versions réellement épinglées, plutôt que d'ajouter indistinctement `--ignore-scripts` ou de supprimer des commandes de validation.
2. **Regex et tri** : conserver la sémantique métier et les scénarios testés ; évaluer l'entrée non fiable, les bornes et les risques de complexité pathologique avant refactor.
3. **SPOGOMI / chat / GPS** : les findings des imports de listes, de promesses de routes ou d'identifiants GPS doivent être examinés à la lumière des contrats AuthN/AuthZ, de l'idempotence et des tests spécifiques.
4. **Fixtures et tests** : `S2187` dans une fixture n'implique pas l'absence de vraie couverture. Vérifier le rôle du fichier avant suppression ou modification de configuration.

## Priorités et plan d'exploitation

- **P0 — Sécurité/fiabilité exposées :** vérifier les **8 nouvelles vulnérabilités** et **8 nouveaux bugs** du Quality Gate en distinguant un flux réellement exploitable d'un warning de durcissement ou d'un faux positif. Ne pas confondre ce scanner avec **CodeQL** : leurs règles et états d'alertes sont distincts.
- **P1 — Couverture** : isoler les **1 232 nouvelles lignes non couvertes** et les chemins `persistence` en régression dans le ratchet Web, puis écrire des tests fonctionnels pertinents. Conserver le ratchet, ses marges et sa baseline ; ne pas ajuster le périmètre simplement pour afficher PASS.
- **P1 — Duplication sur le nouveau code** : **3,2 %**, à comparer au seuil de **3 %** ; rechercher la cause et mesurer à périmètre constant avant factorisation.
- **P2 — Analyse avant/après rigoureuse** : lancer un futur scan **sur la même configuration Sonar, mêmes profils qualité et périmètre**, puis conserver **deux exports datés** pour comparer les clés d'issues, les fichiers, les résultats de tests et l'évolution de couverture de manière fiable.
- **Ne pas faire** : déclarer les 124 vulnérabilités exploitables, considérer la complexité agrégée en baisse comme une victoire isolée, fusionner les résultats CodeQL/Semgrep/Sonar en un total de risques, masquer le Quality Gate ou assouplir les seuils sans justification.

## Provenance et limites de preuve

1. **Export utilisateur** : `CleanMyMap_SonarCloud_2026-10-14T17-30-53.json`, schéma `cleanmymap-sonarcloud-export-v1`, généré le **2026-10-14T17:30:48.550Z**. Statut des listes paginées et erreur d'API consignés ci-dessus.
2. **Baseline historique** : [`CleanMyMap_SonarQube_Bilan_2026-10-13.md`](./CleanMyMap_SonarQube_Bilan_2026-10-13.md), snapshot du premier scan et de son export ; le périmètre et les chiffres ne sont pas réinventés.
3. **Scan GitHub** : [run SonarQube manuel 38602365150](https://github.com/maxd4/CleanmyMap/actions/runs/38602365150), `head_sha=ed0e2659760e3bdd8d26fba0389c6a52701a8c18`, scanner exécuté avec succès et workflow échoué au **ratchet Web** réappliqué après le scan.
4. **Sources de configuration** : [`sonar-project.properties`](../../../sonar-project.properties) et [`.github/workflows/sonarqube-manual.yml`](../../../.github/workflows/sonarqube-manual.yml), vérifiés sur le commit scanné. Référentiel de méthode : [`documentation/development/repo-quality-rules.md`](../../development/repo-quality-rules.md).
5. **Limites** : aucune vérification de production, aucun rerun de tests applicatifs par ChatGPT, aucun rapprochement exhaustif des IDs de findings entre deux fichiers d'export, aucun statut `CURRENT` revendiqué pour le dépôt après ce scan.

**Décision :** conserver ce document comme **AUDIT / SNAPSHOT** daté, distinct du bilan du 13 octobre et des contrats `CURRENT`. La prochaine comparaison de qualité devra se faire à configuration constante et avec une preuve d'issues complète pour les deux scans.
