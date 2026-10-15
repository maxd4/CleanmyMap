# Suivi SonarCloud — lot vulnérabilités historiques du 15 octobre 2026

Source du triage : `CleanMyMap_SonarCloud_491_issues_2026-10-14.json`, sur la
révision historique `ed0e2659760e3bdd8d26fba0389c6a52701a8c18`. Les statuts
`FIXED_PENDING_SCAN` restent provisoires jusqu'à un nouveau scan SonarCloud.

| Identifiant | Règle / emplacement | Qualification | Décision et statut |
| --- | --- | --- | --- |
| `AaE3K8xjzHjHEPBoeRC0` | S1523 — `scripts/design/generate-design-system-board.mjs:115` | Risque plausible : le dépôt est l'entrée de l'outil, et une expression injectée pouvait être exécutée par `Function`. | Remplacé par une évaluation AST limitée aux littéraux de données ; les appels, spreads et propriétés calculées sont refusés. Test adverse ajouté. `FIXED_PENDING_SCAN`. |
| `AaE3K8sNzHjHEPBoeRBw` | S5443 — `scripts/dev/clean-local-temp.mjs:6` | Faux positif démontré pour l'usage observé : aucune donnée web ou chemin utilisateur n'est consommé ; seuls des noms de caches/fichiers explicitement allowlistés, anciens et non liés à un éditeur actif sont candidats. Les entrées symlink ne sont pas des candidats. | Aucun changement métier ; conservation de la limite de nettoyage et justification dans ce suivi. `FALSE_POSITIVE_PROVEN`. |
| `AaE3K8sNzHjHEPBoeRBx` | S5443 — même usage | Même preuve que l'identifiant précédent ; doublon SonarCloud sur la même expression. | Même décision. `FALSE_POSITIVE_PROVEN`. |
| `AaE3K8iCzHjHEPBoeQ_3` | S5145 — `scripts/audits/audit-clerk-supabase.mjs:738` | Faux positif démontré : le JSON journalisé est le résumé local de compteurs, booléens et horodatage généré ; aucune ligne Clerk, valeur de requête ou texte utilisateur n'est incluse. | Aucun changement ; le résumé reste vérifiable et sans contenu contrôlé par l'utilisateur. `FALSE_POSITIVE_PROVEN`. |
| `AaE3K8uBzHjHEPBoeRCN` | S5145 — `scripts/data/export-clerk-users.mjs:269` | Risque plausible : les chemins de sortie CLI pouvaient contenir des contrôles de ligne avant journalisation. | Ajout de `sanitizeLogValue` et test CR/LF/NUL ; les fichiers restent bornés à `artifacts`. `FIXED_PENDING_SCAN`. |
| `AaE3K8m2zHjHEPBoeRAv` | S8707 — `scripts/checks/check-public-e2e-artifact.mjs:49` | Exploitabilité démontrée au niveau du contrat CLI : la racine fournie devait être bornée avant lecture récursive. | Racine limitée à `artifacts/ci-public-evidence` et sous-répertoires ; test de chemin parent/traversal ajouté. `FIXED_PENDING_SCAN`. |
| `AaE3K8mAzHjHEPBoeRAg` | S8707 — `scripts/reports/assemble-impact-report.mjs:44` | Exploitabilité démontrée au niveau du contrat CLI : `--output` pouvait viser un chemin arbitraire et écraser un fichier local. | Sortie limitée à un fichier direct de `artifacts/assembled-reports` ; test de rejet du chemin parent ajouté. `FIXED_PENDING_SCAN`. |
| `AaE3K8g8zHjHEPBoeQ_w` | S2245 — `apps/mobile/lib/gps-point-identity.ts:5` | Risque plausible de collision/prédictibilité pour une identité synchronisée ; ce n'est pas une preuve d'authentification. | `crypto.randomUUID` avec fallback borné sans PRNG ; test d'identifiants distincts. `FIXED_PENDING_SCAN`. |
| `AaE3K8hQzHjHEPBoeQ_y` | S2245 — `apps/mobile/lib/storage.ts:38` | Faux positif démontré pour l'usage observé : clé locale de buffer, sans secret ni décision d'autorisation ; le besoin est seulement une séparation locale à durée bornée. | Générateur non cryptographique conservé, sans élargir sa portée. `FALSE_POSITIVE_PROVEN`. |
| `AaE3K8NQzHjHEPBoeQ99` | S2245 — `apps/web/src/components/chat/hooks/use-chat-submit.helpers.ts:66` | Risque plausible de collision/prédictibilité sur un chemin d'upload client. | Remplacé par l'identifiant crypto/fallback borné, en conservant le préfixe utilisateur et l'extension. `FIXED_PENDING_SCAN`. |
| `AaE3K8M8zHjHEPBoeQ96` | S2245 — `apps/web/src/components/chat/hooks/use-chat-submit.ts:57` | Risque plausible de collision sur l'identifiant d'opération optimiste. | Remplacé par l'identifiant crypto/fallback borné ; format sécurisé sans changement du flux métier. `FIXED_PENDING_SCAN`. |
| `AaE3K8LSzHjHEPBoeQ9q` | S2245 — `apps/web/src/components/ui/pdf-export/use-pdf-export.ts:115` | Risque plausible de collision dans l'historique d'export. | Remplacé par l'identifiant crypto/fallback borné en conservant le préfixe `CMM-PDF`. `FIXED_PENDING_SCAN`. |
| `AaE3K78rzHjHEPBoeQ8b` | S2245 — `apps/web/src/lib/actions/exports/export-form-history.ts:96` | Risque plausible de collision dans l'historique d'export. | Remplacé par l'identifiant crypto/fallback borné en conservant le préfixe `CMM-EXP`. `FIXED_PENDING_SCAN`. |
| `AaE3K78gzHjHEPBoeQ8a` | S2245 — `apps/web/src/lib/actions/exports/export-form-pdf.ts:82` | Risque plausible de collision dans l'identifiant embarqué du PDF. | Remplacé par l'identifiant crypto/fallback borné en conservant le préfixe `CMM-FORM`. `FIXED_PENDING_SCAN`. |
| `AaE3K79YzHjHEPBoeQ8g` | S2245 — `apps/web/src/lib/actions/signalement/signalement-media-client.ts:53` | Risque plausible de collision d'élément d'upload côté client. | `crypto.randomUUID` ou fallback séquentiel borné ; le chemin de traitement reste inchangé. `FIXED_PENDING_SCAN`. |
| `AaE3K7-BzHjHEPBoeQ8k` | S2245 — `apps/web/src/lib/actions/vision.ts:332` | Risque plausible de collision d'identifiant photo temporaire. | `crypto.randomUUID` ou fallback séquentiel borné ; test du flux vision conservé. `FIXED_PENDING_SCAN`. |
| `AaE3K8HLzHjHEPBoeQ9Z` | S2245 — `apps/web/src/lib/photo-upload.ts:64` | Risque plausible de collision dans un chemin de stockage client. | Remplacé par l'identifiant crypto/fallback borné ; bucket, action et extension sont conservés. `FIXED_PENDING_SCAN`. |
| `AaE3K8NHzHjHEPBoeQ97` | S5332 — `apps/web/src/components/chat/hooks/use-chat-data.ts:183` | Faux positif technique sur une base de parsing locale ; aucune connexion n'est faite vers `chat.local`. | Base de parsing passée à `https://chat.local`. `FIXED_PENDING_SCAN`. |
| `AaE3K8NHzHjHEPBoeQ98` | S5332 — `apps/web/src/components/chat/hooks/use-chat-data.ts:487` | Même usage de parsing local, sans réseau. | Base de parsing passée à `https://chat.local`. `FIXED_PENDING_SCAN`. |
| `AaE3K8M0zHjHEPBoeQ95` | S5332 — `apps/web/src/components/chat/hooks/use-chat-search.ts:100` | Même usage de parsing local, sans réseau. | Base de parsing passée à `https://chat.local`. `FIXED_PENDING_SCAN`. |
| `AaE3K79MzHjHEPBoeQ8e` | S5332 — `apps/web/src/lib/actions/exports/gpx-serializer.ts:44` | Faux positif prouvé par le contrat GPX 1.1 : l'URI `http://www.topografix.com/GPX/1/1` est un namespace XML normatif, pas une destination réseau. | Namespace conservé ; ne pas le réécrire en HTTPS. `FALSE_POSITIVE_PROVEN`. |

## Preuves du lot

- Les tests scripts ciblés passent : `18/18`, dont les expressions dynamiques,
  les racines de staging, la sortie de rapport et l'injection CR/LF/NUL.
- Les tests Web ciblés passent : `18/18` après la conservation des formats
  d'identifiants sécurisés.
- Les tests mobile ciblés passent : `16/16`.
- Les typechecks Web et mobile et le lint Web ciblé passent.
- L'exécution complète du générateur de design est `BLOCKED` par une dérive
  préexistante hors S1523 : `globals.css` ne contient plus le sélecteur `:root`
  attendu par `extractCssVars`. Le parsing des sources réelles et le rejet des
  syntaxes exécutables sont toutefois testés directement.
- Aucun nouveau scan SonarCloud n'a été exécuté ; les corrections restent donc
  `FIXED_PENDING_SCAN`.

## Lot L02 — exécution et configuration (`L02_ENV_CI_SECURITY`)

Ce triage reprend les 30 identifiants exacts de
`.artifacts/sonarqube/CleanMyMap_SonarQube_286_issues_2026-10-15.json`, dont
la révision analysée est `fd2e640683c23e876ff6924457946fabb763b322`. Les
sources locales ont été relues sur le `main` courant
`8ff3603850f89aa3535962f77310f7f9b7b2c18a` ; aucun scan distant n'a été
relancé.

| Identifiant | Règle / emplacement | Vérification exacte | Décision |
| --- | --- | --- | --- |
| `AaFAZtkxhODAnNC5cfiO` | `githubactions:S8541` — `.github/workflows/sonarqube-manual.yml:72` | `fpdf==1.7.2` est le contrat legacy utilisé par `maintenance/python/src/report_generator.py` et est verrouillé dans `maintenance/python/requirements*.txt`. L'index courant ne fournit aucune distribution binaire pour cette version (`pip download --no-deps --only-binary=:all: fpdf==1.7.2` : `No matching distribution found`). | Aucune substitution artificielle par `--only-binary`; installation source épinglée conservée. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K79MzHjHEPBoeQ8e` | `typescript:S5332` — `apps/web/src/lib/actions/exports/gpx-serializer.ts:44` | `http://www.topografix.com/GPX/1/1` est l'identifiant de namespace XML normatif GPX 1.1, réutilisé dans `xsi:schemaLocation`; il n'est pas une destination réseau. Le test GPX vérifie déjà ce namespace exact. | Namespace et schéma conservés. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8sNzHjHEPBoeRBy` | `javascript:S4036` — `scripts/dev/clean-local-temp.mjs:28` | À la révision courante, la ligne 28 est un calcul lexical `path.relative(...)` après le durcissement L01 ; elle n'exécute aucune commande. | Finding historique non aligné sur le source courant. `STALE`. |
| `AaE3K8dzzHjHEPBoeQ_Y` | `javascript:S4036` — `apps/web/scripts/supabase-performance-advisors.mjs:386` | Les options sont des constantes (`npx supabase db advisors --linked`), le wrapper Windows ne reçoit pas de fragment de commande externe et la sortie est consultative/read-only. Aucun argument utilisateur n'est interprété comme programme. | Aucun changement mécanique ; warning non exploitable dans ce caller fixe. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8f9zHjHEPBoeQ_p` | `javascript:S4036` — `apps/web/scripts/supabase-preview-branch.mjs:38` | `runCommand` appelle PowerShell avec des arguments contrôlés par le script ; chaque valeur est échappée entre quotes simples. Les commandes appelantes sont limitées à `git`/`npx supabase` et le projet/ref provient du contrat CLI ou du fichier de liaison. Aucun fragment shell libre n'est injecté. | Aucun changement mécanique ; wrapper contrôlé conservé. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8gRzHjHEPBoeQ_r` | `javascript:S4036` — `apps/web/scripts/supabase-quota-audit-cli.mjs:62` | Les arguments sont `supabase db advisors/lint` et les valeurs sont échappées pour PowerShell ; `dbUrl` est passé comme valeur de donnée. Sous Windows, le wrapper npx est résolu depuis l'installation Node courante. | Aucun changement ; frontière et usage bornés. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8fVzHjHEPBoeQ_l` | `javascript:S4036` — `apps/web/scripts/supabase-security-advisors.mjs:260` | Les options d'advisor sont des constantes du script (`npx supabase db advisors --linked`), sans entrée de commande utilisateur ; aucun shell libre n'est concaténé depuis un appelant externe. | Aucun changement ; usage read-only lié au projet explicite. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8fgzHjHEPBoeQ_m` | `javascript:S4036` — `apps/web/scripts/vercel-sync-env.mjs:116` | Les clés, valeurs et branche sont transformées en arguments PowerShell quotés ; les cibles sont allowlistées (`development`, `preview`, `production`) et `.env.local` est refusé pour production. Aucun nom d'exécutable fourni par l'utilisateur. | Aucun changement ; garde-fous d'environnement conservés. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8iSzHjHEPBoeQ_4` | `javascript:S4036` — `scripts/audits/audit-gitnexus.mjs:135` | `execFileSync("git", ["rev-parse", "HEAD"])` utilise des arguments fixes, sans shell, dans le dépôt d'audit courant. | Aucun changement. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8iSzHjHEPBoeQ_5` | `javascript:S4036` — `scripts/audits/audit-gitnexus.mjs:147` | `execFileSync("git", ["status", "--porcelain", "--untracked-files=all"])` est read-only, sans shell et sans donnée de commande contrôlée. | Aucun changement. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8irzHjHEPBoeRAG` | `javascript:S4036` — `scripts/audits/audit-supabase-migration-trees.mjs:95` | `git rev-list` reçoit une ref de comparaison et un chemin de migration canonique comme arguments séparés à `execFileSync`; aucune concaténation shell. | Aucun changement ; audit historique read-only conservé. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8irzHjHEPBoeRAH` | `javascript:S4036` — `scripts/audits/audit-supabase-migration-trees.mjs:105` | `git show` reçoit le commit et le chemin sous forme d'arguments séparés ; l'appel ne lance pas de shell et ne modifie pas l'arbre. | Aucun changement. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8ifzHjHEPBoeQ_6` | `javascript:S4036` — `scripts/audits/generate-product-surface-collection.mjs:23` | Le helper Git ne lance que l'exécutable fixe `git` avec les arguments du collecteur ; le répertoire de travail est la racine canonique résolue. | Aucun changement. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8kVzHjHEPBoeRAL` | `javascript:S4036` — `scripts/audits/run-quality-audit.mjs:57` | Même helper read-only : exécutable fixe, arguments séparés, racine de dépôt résolue ; aucune commande issue du contenu audité. | Aucun changement. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaFAZsg5hODAnNC5cfiK` | `javascript:S4036` — `scripts/checks/check-file-naming.mjs:202` | `git ls-files -z --` ne lit que l'index Git et utilise des arguments fixes via `execFileSync`; aucun fichier n'est exécuté. | Aucun changement. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8qUzHjHEPBoeRBd` | `javascript:S4036` — `scripts/checks/lint-audit-direct.js:312` | La chaîne est constante (`npx eslint src --max-warnings=1000`) et le cwd est toujours `apps/web`; aucun argument utilisateur ni contenu de rapport n'est interpolé dans la commande. | Aucun changement fonctionnel ; warning non exploitable dans ce caller fixe. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8qszHjHEPBoeRBk` | `javascript:S4036` — `scripts/checks/validation-policy.mjs:324` | La branche Windows construit une ligne npx avec arguments quotés et la branche POSIX utilise `spawnSync` avec tableau ; les groupes et fichiers viennent des allowlists de validation. | Aucun changement ; politique de validation conservée. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaFAZtQBhODAnNC5cfiN` | `javascript:S4036` — `scripts/ci/prepare-gitnexus-native.mjs:107` | Les scripts npm exécutés sont strictement allowlistés et les paquets/version/scripts sont vérifiés avant exécution ; sous Windows npm passe par le Node et `npm-cli.js`. Le root global est uniquement un répertoire de dépendances validé. | Aucun changement ; intégrité GitNexus conservée. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8upzHjHEPBoeRCZ` | `javascript:S4036` — `scripts/ci/validation-process.mjs:21` | `taskkill` reçoit uniquement le PID d'un processus enfant créé par le scheduler, avec `/PID /T /F` fixes ; aucun nom de commande ou argument utilisateur n'est repris. | Aucun changement. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8t3zHjHEPBoeRCL` | `javascript:S4036` — `scripts/data/attribute-codex-usage.mjs:94` | `git -C` reçoit un répertoire canonique découvert localement et des arguments Git séparés ; l'outil attribue des artefacts et ne lance pas de commande issue de leur contenu. | Aucun changement. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8r4zHjHEPBoeRBu` | `javascript:S4036` — `scripts/dev/clean-workspace-safe.mjs:189` | `git ls-files -z` est read-only, sans shell et avec la racine de dépôt résolue ; il sert à déterminer les chemins versionnés avant le nettoyage borné. | Aucun changement ; les bornes de nettoyage L01 restent intactes. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8sWzHjHEPBoeRBz` | `javascript:S4036` — `scripts/dev/report-local-dev-processes.mjs:76` | PowerShell est appelé par `execFileSync` avec un script généré uniquement depuis une liste de motifs constants ; le script observe les processus et ne les exécute ni ne les modifie. | Aucun changement. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8sDzHjHEPBoeRBv` | `javascript:S4036` — `scripts/dev/session_bootstrap.mjs:31` | `git branch --show-current` est un appel read-only à arguments fixes dans la racine résolue. | Aucun changement. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE7ZAMDkxkMFlGl5f2-` | `javascript:S4036` — `scripts/reports/architecture-audit.mjs:36` | Le rapport exécute seulement les sous-commandes Git read-only via `execFileSync`, sans shell ni entrée de commande issue du graphe. | Aucun changement. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE7ZASVkxkMFlGl5f3B` | `javascript:S4036` — `scripts/reports/generate-architecture-import-graph.mjs:41` | Même helper Git read-only avec arguments séparés et racine canonique ; les imports analysés ne sont jamais réinterprétés comme commande. | Aucun changement. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8lPzHjHEPBoeRAU` | `javascript:S4036` — `scripts/reports/generate-modularity-radar.mjs:57` | Les commandes Git sont fixes et exécutées sans shell pour produire les métriques ; aucun contenu de source n'est passé comme programme. | Aucun changement. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaFAZrw4hODAnNC5cfh_` | `javascript:S4036` — `scripts/reports/generate-module-test-metrics.mjs:27` | Le collecteur utilise un exécutable Git fixe et des arguments séparés pour lire l'historique ; aucune donnée de test ne devient une commande. | Aucun changement. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8khzHjHEPBoeRAM` | `javascript:S4036` — `scripts/reports/repository-growth.mjs:69` | `git rev-list`/`git log` sont read-only, avec arguments séparés et buffer borné ; le contenu historique n'est pas réexécuté. | Aucun changement. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8k5zHjHEPBoeRAQ` | `javascript:S4036` — `scripts/reports/update-audit-stats.mjs:220` | `git rev-list --count` utilise une commande et des arguments fixes pour compter l'historique ; pas de shell ni de chaîne de commande externe. | Aucun changement. `REVIEWED_NOT_EXPLOITABLE`. |
| `AaE3K8k5zHjHEPBoeRAR` | `javascript:S4036` — `scripts/reports/update-audit-stats.mjs:227` | `git log` utilise la même frontière read-only et des arguments séparés ; les statistiques produites ne sont pas exécutées. | Aucun changement. `REVIEWED_NOT_EXPLOITABLE`. |

### Preuves d'environnement et limites

- Le PATH effectif a été inspecté sur le runner local : `git`, `node`,
  `powershell.exe`, `cmd.exe` et `taskkill.exe` se résolvent respectivement
  vers `C:\Program Files\Git\cmd`, `C:\Program Files\nodejs` et
  `C:\Windows\System32`. Le répertoire d'override utilisateur est présent
  dans PATH mais ne contient aucun homonyme de ces exécutables ; aucune
  injection effective n'a donc été observée dans ce checkout.
- Les appels présentant une branche Windows restent limités par leurs
  callers : valeurs PowerShell échappées, commandes fixes ou arguments
  séparés, et absence de transformation d'un contenu audité en programme.
  Cette preuve est locale au runner et ne prétend pas certifier un PATH de
  production ou un futur runner compromis.
- Les tests GPX existants vérifient le namespace normatif exact. Le contrôle
  GitHub Actions de workflow n'a pas été lancé car `.github/workflows/` n'a
  pas été modifié ; `checks:full` et tout scan SonarCloud distant restent
  `NOT_RUN` conformément au périmètre L02.

## Lot L04 — périmètre generated/fixture (`L04_GENERATED_FIXTURE_SCOPE`)

L'inventaire source est
`.artifacts/sonarqube/CleanMyMap_SonarQube_286_issues_2026-10-15.json`, analysé
sur `fd2e640683c23e876ff6924457946fabb763b322`. La relecture locale a été
faite sur `main` à la révision `9ca437ff7565d9f26c3a094dc8c836122ce897c7`.
Les deux HTML du board appartiennent au livrable documentaire `GENERATED` :
`design-system:board` consomme le HTML statique comme template et produit la
copie dynamique et les données à partir du script de génération. Aucun des
deux fichiers ne contient de source runtime, de code métier ou d'indicateur
produit. Leurs contrôles sont des échantillons natifs sans gestionnaire de
workflow ; ils ne constituent pas une surface applicative métier à maintenir.

La fixture `fixture.test.ts` est un `FIXTURE_GRAPH_INPUT`, consommé par
`scripts/checks/architecture-import-boundary.test.mjs` pour vérifier une arête
type-only. Son suffixe `.test.ts` la fait classer comme test par Sonar, mais le
fichier ne porte aucune suite exécutable et sa suppression ou son déplacement
changerait le graphe synthétique testé. Le contrat réel reste couvert par le
harness Node canonique.

| Identifiant | Règle / chemin exact | Qualification | Décision locale | Statut |
| --- | --- | --- | --- | --- |
| `AaE3K8zJzHjHEPBoeRC-`, `AaE3K8zJzHjHEPBoeRC_`, `AaE3K8zJzHjHEPBoeRDA`, `AaE3K8zJzHjHEPBoeRDB` | `Web:InputWithoutLabelCheck` — `documentation/design-system/generated/board/design-system-board.dynamic.html` | `GENERATED` documentaire | Exclusion Sonar au chemin exact ; aucune source runtime, test contractuel ou métrique métier masquée. | `REVIEWED_NOT_EXPLOITABLE` |
| `AaE3K8zdzHjHEPBoeRDC`, `AaE3K8zdzHjHEPBoeRDD`, `AaE3K8zdzHjHEPBoeRDE`, `AaE3K8zdzHjHEPBoeRDF` | `Web:InputWithoutLabelCheck` — `documentation/design-system/generated/board/design-system-board.html` | `GENERATED` documentaire | Exclusion Sonar au chemin exact ; aucune source runtime, test contractuel ou métrique métier masquée. | `REVIEWED_NOT_EXPLOITABLE` |
| `AaE7ZAYrkxkMFlGl5f3D` | `typescript:S2187` — `scripts/checks/fixtures/architecture-import-boundary/web/src/components/fixture.test.ts` | `FIXTURE_GRAPH_INPUT`, pas `TEST` exécutable | Exclusion Sonar au chemin exact ; le harness `architecture-import-boundary.test.mjs` et le graphe type-only restent analysés. | `REVIEWED_NOT_EXPLOITABLE` |

Les trois exclusions sont littérales dans `sonar-project.properties` et ne
couvrent aucun autre fichier. Le changement de périmètre rend les métriques
Sonar globales avant/après `NON_COMPARABLES` sans recalcul homogène : ne pas
interpréter une variation du nombre d'issues, de couverture ou de duplication
comme un effet isolé de ce lot. Aucun seuil, baseline, règle métier ou garde
de test n'a été affaibli.

Preuves du lot : test du contrat du générateur, vérification de la
configuration Sonar et test du harness d'architecture. L'exécution complète
de `design-system:board` reste à qualifier séparément si la dérive
préexistante de `globals.css` (absence de `:root` attendu par le générateur)
est toujours présente. Aucun scan SonarCloud distant n'est relancé
automatiquement ; ces décisions restent locales jusqu'à une nouvelle analyse.
