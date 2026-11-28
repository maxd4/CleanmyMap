# Gouvernance GitHub du dépôt

Ce mémo résume les garde-fous GitHub à garder en place pour CleanMyMap.

## Runbook de maintenance GitHub — `CURRENT`

### Contrat durable

Les règles universelles de livraison R01–R12 ont une source canonique unique.
La branche de développement canonique est `main`. Les branches techniques
Dependabot peuvent exister pour leurs PR ; elles ne constituent pas des
branches de chantier des writers.

- Les mises à jour Dependabot de version sont autorisées dans une veille
  hebdomadaire bornée, regroupée par familles compatibles. Les limites de PR
  de version sont déclarées dans `.github/dependabot.yml` par écosystème
  (npm, GitHub Actions et pip) ; elles ne sont pas un plafond global des PR
  de sécurité ni des branches encore présentes.
- Les groupes `patch`/`minor` restent séparés entre runtime mobile, runtime Web,
  runtime partagé et outillage ; les mises à jour majeures restent des PR
  distinctes pour une revue explicite. Les security updates restent actives et
  ne sont pas masquées par ces limites.
- Aucun automerge Dependabot n'est configuré.
- L'état distant des rulesets est volatile et doit être relu avant une
  publication concernée ; les observations datées ci-dessous ne constituent
  pas une garantie de configuration future.
- Une alerte CodeQL se corrige dans le code, puis doit être vérifiée par un run
  GitHub réussi sur le SHA publié exact.
- Secret Scanning et Push Protection sont des réglages distants à relire ; un
  check local ne constitue pas une simulation de leur état GitHub.

### Séquence minimale d'audit

Exécuter dans cet ordre, en limitant chaque lecture à la preuve utile :

```text
REMOTE_BASELINE
→ PR/branches
→ ruleset/protection
→ Dependabot
→ CodeQL
→ Secret Scanning
→ corrections locales nécessaires
→ validation finale
→ relecture distante
```

Lire l'état distant avant toute exploration large du checkout. Utiliser les
anciens commits uniquement pour établir une cause ou une régression. Pendant
l'itération, lancer les validations ciblées ; réserver le full/pre-push au
candidat final et ne le relancer qu'après une modification qui invalide sa
preuve. La fermeture d'une PR ou la suppression d'une branche est une mutation
distante et nécessite l'autorisation explicite de l'utilisateur.

### Bilan d'exécution des prompts PR

Lorsqu'un lot est déclenché par un prompt citant une PR, conserver un bilan
lié au SHA dans le dossier d'audits opérationnels. Le bilan doit séparer :

- la proposition de la PR et la candidate réellement intégrée ;
- les validations locales et les workflows GitHub réellement observés ;
- les états `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN` et `UNVERIFIED` ;
- la publication Git (`commit`, branche, convergence) et l'état de la PR ;
- les preuves qui restent externes : production, fournisseur, appareil réel,
  PostgreSQL/RLS, déploiement ou ingestion.

Le registre historique et son format sont conservés dans
[`pr-prompt-execution-bilans-2026-10-14.md`](./audits/pr-prompt-execution-bilans-2026-10-14.md).
Un bilan ne doit contenir aucun secret, identifiant Production, token ou donnée
personnelle, et `INTEGRATED` ne signifie ni merge, ni déploiement, ni preuve de
production.

### STOP CONDITION

Arrêter le chantier dès que les invariants demandés sont prouvés. Ne pas
poursuivre vers des upgrades, refactors ou nettoyages sans rapport avec ces
invariants.

## Éléments à conserver

- `SECURITY.md` à la racine du dépôt.
- Template de PR avec description, fichiers touchés et vérifications.
- Templates d'issues pour bug, UI, sécurité, dette technique, `refactor`, `supabase`, `vercel` et `quota`.
- Labels de tri: `security`, `quota`, `ui`, `supabase`, `vercel`, `docs`, `refactor`.
- Milestones pour les grandes étapes de travail.

## Protection de `main`

Observation en lecture seule effectuée le 2026-11-28 avec `gh api` pour
`maxd4/CleanMyMap` (identité CLI `maxd4`, rôle collaborateur `admin`). Deux
rulesets actifs ciblent `main` : `23565928` interdit suppression et
non-fast-forward sans bypass ; `25034548` (`main — owner-only updates`) impose
la règle `update` et accorde un bypass `always` au rôle repository admin et à
l'intégration `1144995`. L'API a indiqué `current_user_can_bypass: always` pour
la règle d'update et `never` pour la règle de protection contre suppression et
non-fast-forward. La protection classique de branche n'était pas configurée
(endpoint `branches/main/protection` renvoyait 404). Aucun check obligatoire,
approbation ou exigence de Pull Request n'a été observé dans le ruleset actif.

Le bypass de la règle `update` est une autorisation explicite du ruleset pour
les acteurs désignés (`RepositoryRole` admin et l'intégration `1144995`). Au
contrôle du 2026-11-28, `maxd4` est administrateur et l'API retourne
`current_user_can_bypass: always`. Le message GitHub `Bypassed rule violations`
est donc attendu lorsqu'il ne liste que l'interdiction d'update de cette
protection. Cette autorisation ne s'étend pas aux hooks, aux contrôles de
sécurité, ni aux règles indépendantes contre suppression et non-fast-forward,
qui n'accordent aucun bypass. Un push de `main` est conforme lorsque ces gardes
passent et que la convergence est ensuite vérifiée. Ne pas modifier les
rulesets.

Les règles actives observées interdisent également :

- la suppression de `main` ;
- les mises à jour non fast-forward et les force-push.

Le publisher établit un SHA candidat immuable après le `fetch` et prépare le
refspec `${candidateSha}:refs/heads/main`. Il relit `HEAD` et
`refs/heads/main` avant le push et après sa vérification ; un nouveau commit
local apparu entre ces étapes bloque la publication et impose une nouvelle
réconciliation des fichiers, commits et validations. Il ne peut donc pas
adopter silencieusement le dernier `HEAD`.

Si un autre writer publie pendant une tentative, le publisher attend de façon
bornée, refetch `origin/main`, relit le candidat inchangé et réessaie après une
intégration fast-forward distante explicitement vérifiée. Une divergence, un
conflit ou une erreur de permission reste visible et bloque la publication ;
aucune tentative ne contourne les protections distantes.

L'auteur exact de l'événement de push antérieur n'a pas été établi par les
événements GitHub consultés ; l'identité active et les droits courants ne
permettent pas de l'affirmer. Relire ces règles avant toute décision future.
Les contrôles CI et CodeQL restent disponibles pour les runs GitHub et les
revues, sans remplacer la validation locale du candidat.

Checks conservés pour la revue manuelle GitHub :

- `scope`
- `web-governance`
- `web-static`
- `web-quality`
- `web-tests`
- `web-coverage`
- `web-vercel-audit` et `web-build` lorsque `build_relevant == 'true'`
- `mobile-validation` si le planificateur sélectionne le périmètre Mobile ou si le mode FULL est explicitement demandé
- `sonarqube-manual` : préparation indépendante des quatre couvertures puis
  analyse SonarQube sur le SHA exact uniquement si `SONAR_FULL` valide les
  quatre rapports ; une préparation incomplète conserve ses diagnostics mais
  bloque le scanner canonique
- `CodeQL`
- `Vercel`

## Sécurité du dépôt public

Les réglages GitHub attendus et conservés sont :

- Secret Scanning activé ;
- Push Protection activée ;
- mises à jour de sécurité Dependabot activées ;
- workflow CodeQL versionné conservé ; le `default setup` CodeQL reste distinct
  de ce workflow et n'est pas configuré par ce lot.

Les secrets restent uniquement dans les stores GitHub Actions, Vercel, Clerk et
Supabase. Cette documentation ne contient aucune valeur secrète.

## CI et maintenance

- Garder `permissions: {}` au niveau workflow, puis ouvrir uniquement ce qui est nécessaire au niveau job.
- Adapter `concurrency` et `cancel-in-progress` à la nature du workflow :
  une campagne obsolète peut être annulée, mais les preuves PostgreSQL, de
  restauration et les opérations sérialisées doivent garder leurs contrats
  propres. Une annulation n'est jamais une réussite.
- Garder un cache npm explicite sur `package-lock.json`.
- Grouper les mises à jour Dependabot compatibles, y compris les security
  updates, pour limiter le bruit sans mélanger tout le monorepo dans une seule
  PR.
- Le workflow manuel `sonarqube-manual` sépare `coverage-preparation` et
  `sonarqube`. La matrice de préparation utilise `fail-fast: false` ; un
  producteur ou un validateur en échec reste en échec, tandis que le job
  d'analyse utilise `always() && !cancelled()` et son propre checkout du
  `github.sha`.
- Le scanner ne reçoit une configuration canonique que si `SONAR_FULL` confirme
  les quatre producteurs, validations, rapports importables et la provenance du
  `run_id`/SHA courant. Les rapports absents, invalides ou d'un autre SHA sont
  conservés comme diagnostics mais bloquent le scanner canonique. Les statuts
  `SONAR_ANALYSIS_STATUS`, `SONAR_COVERAGE_STATUS`, `SONAR_TESTS_STATUS`,
  `SONAR_INTEGRITY_STATUS` et `ANALYZED_SHA` doivent être lus séparément ; un
  scan terminé ne transforme jamais un échec de tests, de couverture ou
  d'intégrité en preuve de release verte. `SONAR_PARTIAL` reste réservé à un
  diagnostic indépendant et ne suffit pas à publier une nouvelle mesure
  canonique.

## Reproductibilité locale des workflows

Inventaire historique initial du `2026-08-23`, corrigé sur les points de
sélection de tests et de périmètre vérifiés le `2026-11-26` sur les workflows versionnés [`ci.yml`](../../.github/workflows/ci.yml) et [`codeql.yml`](../../.github/workflows/codeql.yml).

Le workflow GitHub est une orchestration : les commandes npm sont principalement
reproductibles localement, tandis que le runner GitHub, les conditions calculées
à partir de l'événement et l'analyse CodeQL ne le sont pas à l'identique.

| Workflow / job | Commandes locales correspondantes | Prérequis et limites | Reproductible localement |
| --- | --- | --- | --- |
| `ci.yml` / `scope` | Détecte `docs_only`, `web_code_relevant`, `mobile_code_relevant`, `dependencyGraphRelevant`, `dependencyAuditRelevant` et `securityToolingRelevant` depuis le planner `scripts/checks/validation-policy.mjs` et une paire `base/head` | Node.js requis pour le planner; permissions `contents: read`. Le job est indépendant des validations applicatives. | Oui pour le calcul; non pour l'orchestration exacte GitHub. |
| `ci.yml` / `secret-audit` | `npm run security:secrets -- --ref=HEAD` | Job indépendant sur l'arbre candidat ; il produit une evidence non sensible et un résumé séparé. Son échec reste bloquant ; aucun rapport brut de secrets n'est téléversé. | Oui pour la commande; non pour l'orchestration exacte GitHub. |
| `ci.yml` / `dependency-audit` | `node --test scripts/security/audit-dependencies.test.mjs` puis `npm run security:dependencies` | Job exécuté sur chaque `push` vers `main` et chaque Pull Request ciblant `main`, indépendamment du graphe de fichiers ; l'échec High/Critical reste bloquant et la preuve provient uniquement de l'exécution réelle. | Oui pour les commandes; non pour l'orchestration exacte GitHub. |
| `ci.yml` / `web-governance` | `npm run check:root-files`; `npm run check:doc-governance`; `npm run check:stack-doc-drift`; `npm run check:github-actions` | Node.js 24.x lu depuis `apps/web/.nvmrc` et `package-lock.json`. `check:github-actions` produit une evidence du nombre de workflows et d'issues de policy ainsi qu'un résumé propre au job. | Oui pour les commandes; non pour l'orchestration exacte GitHub. |
| `ci.yml` / `web-static` | `npm run check:semgrep`; `npm run check:lockfile-policy`; `npm run typecheck`; `npm run check:utf8-fr`; `npm run lint`; conditionnellement `node --test scripts/security/workflow-security-contract.test.mjs scripts/security/zap-baseline-contract.test.mjs` lorsque `securityToolingRelevant == true` | Job indépendant après `scope`, avec son propre checkout, Node et `npm ci`. Il participe aussi lorsque `securityToolingRelevant` sélectionne un outil sous `scripts/security/`, et exécute alors les contrats workflow/ZAP ; `audit-dependencies.test.mjs` reste propriétaire de `dependency-audit`, tandis que les fixtures/règles Semgrep restent couvertes par `npm run check:semgrep`. Aucun build Web n'est déclenché par ce seul signal. | Oui pour les commandes; non pour l'orchestration exacte GitHub. |
| `ci.yml` / `web-quality` | `npm run quality:top-heavy`; `npm run quality:dead-code`; `npm run quality:complexity`; `npm run quality:duplication`; installation puis `npm run audit:gitnexus`; `npm run quality:cycles` (`SKIPPED_BY_POLICY`); résumé `node scripts/ci/write-quality-summary.mjs` | Job réservé à `workflow_dispatch` avec `validation_mode=FULL`; l'analyse GitNexus des cycles est suspendue jusqu'à réactivation explicite ; les contrôles globaux restent hors de la CI DEVELOPMENT ordinaire. | Oui pour les commandes; non pour l'orchestration exacte GitHub. |
| `ci.yml` / `web-tests` | Tests ciblés quand `web_code_relevant` ou FULL. `npm run test:coverage` et publication de la preuve quand `web_coverage_relevant` ou FULL ; `--assert-full-suite` en FULL seulement. | Les ratchets qualité globaux restent réservés à FULL ; la couverture Web peut aussi être produite sur un candidat DEVELOPMENT pertinent. L'artefact est de courte durée et lié au SHA candidat exact. | Oui pour les commandes; non pour l'orchestration exacte GitHub. |
| `ci.yml` / `web-coverage` | téléchargement de l'artefact Web; `npm run quality:coverage -- --from-existing-summary` | Le job compare les métriques sur l'artefact correspondant. Une régression numérique ou une baseline historique indisponible est informative ; la génération, l'intégrité de la preuve et les rapports obligatoires restent bloquants. Le job ne relance pas Vitest. | Oui pour les commandes; non pour l'orchestration exacte GitHub. |
| `ci.yml` / `full-coverage-gate` | téléchargement des artefacts Web, mobile, Node et Python; `node scripts/ci/full-coverage-gate.mjs` | Réservé à `workflow_dispatch` avec `validation_mode=FULL`. Les cinq jobs attendus (`web-tests`, `web-coverage`, `mobile-validation`, `node-coverage`, `python-validation`) doivent réussir et les quatre preuves doivent être valides sur le `github.sha` exact ; un domaine `skipped`, annulé, absent ou incohérent fait échouer le gate. | Oui pour le script; non pour l'orchestration exacte GitHub. |
| `ci.yml` / `web-vercel-audit` | `npm run audit:vercel:ci` lorsque `build_relevant == 'true'` | Job indépendant après `scope`; il est `SKIPPED_SCOPE` sinon. | Oui pour la commande; non pour l'orchestration exacte GitHub. |
| `ci.yml` / `web-build` | `npm run build` lorsque `build_relevant == 'true'` | Job indépendant après `scope`; les variables publiques de build sont injectées uniquement dans ce job. | Oui pour la commande; non pour l'orchestration exacte GitHub. |
| `ci.yml` / `mobile-validation` | `npm ci`; `npm run check:semgrep` lorsque le Web n'est pas concerné; sécurité mobile; typecheck; tests Vitest; couverture; lint | Node.js 24.x lu depuis `apps/web/.nvmrc`, `package-lock.json`. Le job dépend de `mobile_code_relevant` ou FULL ; la mesure de couverture suit le périmètre pertinent. Le résumé Semgrep reste séparé lorsque ce contrôle conditionnel est réellement exécuté. | Oui. |
| `sonarqube-manual` / `coverage-preparation` | Producteurs `npm run test:coverage`, `npm run quality:mobile-coverage`, `npm run test:coverage:node` et `npm run test:coverage:python`, puis `prepare-sonarqube-coverage.mjs --mode=STRICT` par domaine | Matrice `fail-fast: false`, artefacts rattachés au `github.run_id` et au `github.sha`; un producteur ou un validateur en échec reste bloquant pour la préparation et n'autorise pas l'import de son rapport. | Oui pour les producteurs et le validateur; non pour l'orchestration exacte GitHub. |
| `sonarqube-manual` / `sonarqube` | Téléchargement des artefacts valides; `prepare-sonarqube-coverage.mjs --mode=SONAR_FULL`; SonarSource scan action; publication des statuts indépendants | Job exécuté avec `always() && !cancelled()` après la préparation. Le scanner canonique ne démarre que si les quatre rapports strictement validés du même SHA/run sont importables. `SONAR_PARTIAL` reste un mode de diagnostic non canonique. | Partiellement : la configuration effective et les validations sont locales; le runner, le token et le résultat SonarQube Cloud restent externes. |
| `codeql.yml` / `analyze` | Aucun script npm équivalent direct : `actions/checkout`, `github/codeql-action/init`, `autobuild` et `analyze` | Runner GitHub, bundle CodeQL et permission `security-events: write` pour publier les résultats. | Non à l'identique; ce contrôle reste GitHub-dépendant. |

Les modes locaux `DEVELOPMENT`/`FULL`/`RELEASE` conservent la politique
canonique de validation. La CI ordinaire sélectionne les gates statiques,
de sécurité, typecheck/lint, tests ciblés et couvertures selon le périmètre
réel. Un diff Web instrumentable peut donc produire la suite Web couverte
sans demander FULL. Les validations globales supplémentaires et ratchets
restent soumis à leur politique propre. Un job annulé, ignoré ou non
exécuté ne constitue pas une preuve `PASS`.
La condition actuelle de `web-governance` est `docs_only || web_code_relevant` :
le nom du job ne garantit pas que tous les changements documentaires mixtes
ou toutes les configurations GitHub sont contrôlés. Vérifier le plan et les
jobs observés, pas uniquement la couleur globale du workflow.

Les contrôles de sécurité ne produisent pas de score global cybersécurité. Les
evidences et résumés exposent uniquement le statut et les compteurs propres à
chaque contrôle (`PASS`, `FAIL`, `SKIPPED_BY_SCOPE`, `NOT_RUN`) ; CodeQL reste
exclusivement gouverné par son workflow et son SARIF natifs.

### Séquence locale recommandée

Pour un changement applicatif, cette séquence couvre les contrôles des gates
Web et, si nécessaire, de `mobile-validation` :

```bash
npm ci
node scripts/checks/check-node-version-contract.mjs
npm run security:secrets
npm run check:root-files
npm run check:doc-governance
npm run check:stack-doc-drift
npm run check:github-actions
npm run check:lockfile-policy
npm run typecheck
npm run check:utf8-fr
npm run quality:top-heavy
npm run lint
npm run test
npm run test:regression-gates
npm run audit:vercel:ci
npm run test:security
```

La compilation de production nécessite les trois variables utilisées par CI :

```bash
NEXT_PUBLIC_SUPABASE_URL="<valeur locale>" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="<valeur locale>" \
CONTACT_EMAIL="<valeur locale>" \
npm run build
```

Le contrôle local des workflows lui-même est :

```bash
npm run check:github-actions
```

Le nombre de workflows audités doit être lu dans la sortie de la commande
sur le candidat courant. L'ancien résultat sur deux workflows ne vaut pas
preuve sur l'inventaire actuel.

Cette procédure ne remplace pas l'exécution GitHub de CodeQL, la publication des
résultats de sécurité ou la vérification des conditions propres à l'événement
`push` / `pull_request`.

## Point de vigilance

Les réglages de protection de branche, les labels et les milestones vivent dans
GitHub, pas dans le dépôt. Le contrat distant doit être relu dans GitHub ou via
l'API avant de conclure qu'il est toujours présent ; les checks locaux ne
simulent pas cette lecture distante.
