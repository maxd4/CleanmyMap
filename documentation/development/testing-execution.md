# Testing — exécution et CI

Ce module porte l'installation, les modes de validation, les preuves CI, le triage et les commandes d'exécution.

[Retour au guide canonique](./TESTING.md).

## Installation

```bash
npm install
```

Pour l'application mobile :

```bash
npm install -w apps/mobile
```

Pour les tests E2E Playwright :

```bash
npx playwright install chromium
```

Pour une modification de motion/reveal, exécuter le scénario public dédié
avec Chromium et WebKit :

```bash
npx playwright install webkit
npx playwright test e2e/homepage-reveal.spec.ts --project="homepage chromium" --project="homepage webkit"
```

Le scénario utilise `devices["Desktop Safari"]`, vérifie la visibilité après
hydratation, après scroll et avec `prefers-reduced-motion: reduce`, puis tente
le rendu SSR public avec JavaScript désactivé. Si Next/React conserve la
frontière client streamée avec l'attribut `hidden` dans ce mode, le contrôle
SSR est explicitement `SKIPPED` avec sa cause ; il ne doit pas être confondu
avec un échec de visibilité GSAP. WebKit ne peut être déclaré validé que si
son projet a réellement été exécuté. Cette procédure reste publique et
n'utilise aucun identifiant de production.

Toute modification d’une primitive Motion, d’`IntersectionObserver`, d’une
opacity initiale, d’un reveal ou d’un CSS global de visibilité doit déclencher
au minimum :

- `npm run check:motion` ;
- les tests ciblés de la primitive ou des consommateurs concernés ;
- le scénario WebKit ci-dessus lorsque le comportement navigateur ou le
  calcul de visibilité est concerné.

Le garde `check:motion` doit rester vert avant commit ; il refuse les états
Framer Motion essentiels initialement invisibles et accepte uniquement les
overlays, éléments conditionnels, toasts et décorations explicitement
identifiés.

Les validations Supabase courantes utilisent `npx supabase` contre le projet
distant explicitement lié. Depuis `apps/web`, vérifier d'abord l'accès puis
utiliser les contrôles read-only suivants :

```bash
npx supabase projects list
npx supabase branches list --project-ref <project-ref> --output json
npx supabase migration list --linked
npx supabase db push --dry-run
```

Une commande CLI authentifiée réussie suffit pour `CLI_AUTH=PASS`, même si
`SUPABASE_ACCESS_TOKEN` n'est pas présent dans l'environnement ; rapporter la
source séparément dans `CLI_AUTH_SOURCE`. L'authentification CLI et celle du
plugin/MCP sont indépendantes.

Le plugin/MCP est privilégié pour l'inventaire Advisors structuré. Récupérer
séparément `security` et `performance`, avec `ERROR`, `WARN` et `INFO`. Le
fallback CLI exhaustif utilise les options explicites suivantes :

```bash
npx supabase db advisors --linked --type security --level info --fail-on none --output-format json
npx supabase db advisors --linked --type performance --level info --fail-on none --output-format json
```

La sortie CLI par défaut ne constitue pas un inventaire complet. Le garde
`backend:supabase:advisors` reste le contrôle contractuel RLS/security du
dépôt ; il ne remplace pas l'inventaire MCP security + performance.

Le garde applicatif des advisors s'exécute avec
`npm run backend:supabase:advisors:linked` depuis `apps/web` ;
`npm run backend:supabase:advisors` reste son alias compatible. Un retour non
nul avec des constats RLS `INFO` est un résultat de contrôle de sécurité, pas
un `403` d'authentification ; distinguer les deux diagnostics.

Pour diagnostiquer un `403`, vérifier la commande authentifiée, son
`CLI_AUTH_SOURCE`, l'identité CLI via `npx supabase projects list`, puis la
visibilité du projet et de son organisation. Si le projet n'est pas visible,
conclure à un mauvais compte, une mauvaise organisation ou une permission
insuffisante. Un scoped PAT doit seulement disposer de la capacité requise :
`Advisors Read` pour les advisors, `Logs Read` pour les logs et
`Migrations Read-write` pour appliquer des migrations ; Owner/Admin n'est pas
intrinsèquement requis.

`SUPABASE_ACCESS_TOKEN` reste un secret de tooling CLI uniquement : jamais
`NEXT_PUBLIC_*`, jamais runtime applicatif et jamais documenté avec sa valeur.

`npx supabase link --project-ref <project-ref>` configure la cible locale mais
ne prouve pas qu'une migration est appliquée. Seule la comparaison
`npx supabase migration list --linked` des identifiants `local` et `remote`
établit l'alignement de l'historique.

`npx supabase db push`, `npx supabase migration repair` et
`npx supabase db reset` ne corrigent pas un problème d'authentification ou de
scope ; ne pas les utiliser comme remèdes à un `403`. Le `db push` des
migrations canoniques est automatique après les précontrôles de
réconciliation ; `migration repair`, une DDL manuelle et `db reset` restent
des opérations séparées et non déléguées. Une opération qui exige un runtime
conteneurisé local est `UNSUPPORTED_CONTAINER_RUNTIME` sur le poste
utilisateur.

Un runner CI hébergé et éphémère peut toutefois utiliser ce runtime uniquement
dans une CI explicitement dédiée au replay Supabase.

Ne pas lancer `supabase start`, `supabase status` ou `supabase db reset` dans le
workflow local canonique ; ces commandes restent réservées à cette CI de replay
explicitement dédiée.

### Replay double pour une correction de migration historique

Lorsqu'un correctif doit fonctionner à la fois pour une base reconstruite et
pour une base qui a déjà appliqué une migration publiée, le plan de preuve
comporte deux parcours distincts :

1. **reconstruction complète** : appliquer toutes les migrations dans l'ordre
   canonique sur une base PostgreSQL éphémère autorisée ;
2. **mise à niveau incrémentale** : partir d'une base contenant le contenu
   historiquement publié jusqu'à la migration concernée, puis appliquer les
   migrations suivantes dans l'ordre.

Les deux parcours doivent observer le même contrat final, notamment pour les
RPC redéfinies, les triggers, les contraintes et les grants. Pour une
réconciliation transactionnelle, les scénarios minimaux sont : fait nouveau
après verrouillage historisé dans l'état prévu avec conflit explicite, réimport
d'une place conservant son identité et ses décisions, annulation/réactivation
ne modifiant pas silencieusement l'éligibilité protégée, rollback sans écriture
partielle et refus des rôles non autorisés.

La présence d'un fichier SQL, un test de chaînes, un audit d'arbre ou un
`db push --dry-run` reste un `STATIC_CONTRACT`. Si PostgreSQL n'est pas
effectivement exécuté sur les deux parcours, conserver explicitement
`DB_SEMANTICS_NOT_EXECUTED` ; le dry-run ne valide pas la convergence des bases.

En FULL, `scripts/ci/audit-supabase-release.mjs` résout
`SUPABASE_PROJECT_REF` dans cet ordre : argument `--project-ref`, variable
d'environnement du processus, puis, en exécution locale uniquement, la seule
clé de même nom dans `apps/web/.env.local`. Il ne charge pas les autres secrets
de ce fichier et ne déduit jamais la cible depuis une URL, un projet lié ou une
liste de projets. L'audit vérifie ensuite la visibilité du projet, les
branches, l'historique des migrations, le dry-run et les advisors security et
performance. La santé et les logs doivent être observés par une interface
autorisée puis fournis sous forme d'une preuve JSON liée au même project ref
via `SUPABASE_HEALTH_LOG_REPORT`. Sans référence valide, accès ou preuve
correspondante, le résultat est `BLOCKED_ACCESS` et `RELEASE_READY` reste `NO`.

## Trois modes canoniques

### DEVELOPMENT — défaut

La boucle normale sélectionne selon le blast radius du `WORKTREE` :

```bash
npm run checks:fast
```

Le mode `DEVELOPMENT` est borné à 180 secondes. Il exécute les tests ciblés,
typecheck/lint pertinents, les contrôles secrets et sécurité/AuthN/AuthZ/RLS et
les contrats de migration. Une extraction, une création de module, une
modification d'import ou un refactor ne déclenche automatiquement aucun
`quality:cycles`, `quality:duplication`, `quality:complexity`,
`quality:dead-code` ou `quality:top-heavy`, y compris avant staging, commit,
push ou clôture. Codex reste responsable de la conception et peut lancer une
vérification ciblée lorsqu'un risque concret le justifie, sans en faire une
condition systématique. Les suites Web/mobile complètes, la couverture
globale, GitNexus, Knip, mutation testing, la campagne E2E complète et les
audits distants restent également hors DEVELOPMENT. Un contrôle différé est
`SKIPPED_BY_POLICY`, jamais `PASS`.

### FULL — préproduction exhaustive

`FULL` est déclenché uniquement sur demande explicite ou dans une préparation
Vercel explicitement demandée :

```bash
npm run checks:full
```

`checks:full` examine tous les domaines, indépendamment des fichiers modifiés :
suite Web complète avec `test:coverage` puis `quality:coverage`, tests mobile,
typecheck/lint, scripts/Python, qualité structurelle, sécurité, build, E2E,
Vercel, GitHub Security et Supabase. `test:security` et
`test:regression-gates` sont marqués `ALREADY_PROVEN` lorsqu'ils sont couverts
par la suite Web complète ; une modification du candidat invalide toute preuve
réutilisée. Les accès distants indisponibles restent `BLOCKED_ACCESS` et ne
peuvent jamais produire un FULL vert.

Lorsqu'un `FULL` est explicitement lancé, toute erreur actionnable de ses
contrôles devient une obligation de correction dans l'exécution courante,
même si les fichiers causaux n'appartiennent pas au lot initial. Un échec ne
peut pas être laissé rouge en le classant simplement
`PREEXISTING_CI_FAILURE` ou « hors périmètre ». Les blocages externes,
décisionnels ou d'environnement restent `BLOCKED_*`, doivent conserver leur
preuve et ne peuvent pas être masqués ni comptés comme un succès.

### Orchestration et progression de `checks:full`

Le runner affiche dès le démarrage le SHA observé, le scope, le mode, le
nombre exact de contrôles et la limite de concurrence. Chaque contrôle est
ensuite suivi avec son identifiant, sa catégorie (`Web`, `Mobile`, `Python`,
`Security`, `Governance`, `Quality`, `Build`, `E2E` ou `External`), son état,
sa durée et le compteur réel des contrôles terminés. Les états `PENDING`,
`RUNNING`, `PASS`, `FAIL`, `BLOCKED`, `REUSED` et `NOT_RUN` restent distincts.
En terminal interactif, la ligne de progression est rafraîchie ; en CI ou en
sortie redirigée, chaque événement est horodaté. Un contrôle silencieux émet
également un heartbeat toutes les 15 secondes, sans fabriquer d'ETA ni de
pourcentage autre que le ratio contrôles terminés / contrôles planifiés.

La limite par défaut est de deux contrôles simultanés. Pour diagnostiquer ou
reproduire strictement l'ordre historique, utiliser :

```bash
npm run checks:full -- --max-parallel=1
```

L'ordonnanceur ne chevauche que des contrôles déclarés compatibles et dont les
ressources sont disjointes. Les contrôles de couverture, mutation, ratchets
artefactés, GitNexus, mobile, build, E2E et services externes restent isolés ;
`quality:coverage` attend la preuve `test:coverage` (ou sa preuve exactement
réutilisée) et la couverture mobile attend le test mobile. Une erreur d'un
contrôle n'interrompt pas les contrôles indépendants déjà en cours ; les
dépendants deviennent explicitement `BLOCKED`. Un timeout, une interruption
ou un nettoyage de processus conserve son verdict et ne transforme jamais un
contrôle non exécuté en succès.

Le rapport final ajoute les durées par contrôle, triées par durée décroissante,
et la durée totale. Cette instrumentation mesure le coût observé ; elle ne
modifie ni le périmètre FULL, ni les seuils, ni les baselines, ni les
exclusions. Une amélioration de durée ne peut être annoncée qu'après une
comparaison reproductible avec `--max-parallel=1` sur une candidate et un
environnement comparables.

Dans la CI GitHub, `workflow_dispatch` avec `validation_mode=FULL` sélectionne
explicitement tous les domaines et ne dérive aucun périmètre à partir d'un
diff ; le checkout et les preuves restent liés à `github.sha`. Les événements
`push` utilisent `before`/`sha` et les `pull_request` utilisent les SHA base/head
pour le ciblage DEVELOPMENT. Un `workflow_dispatch` DEVELOPMENT ne disposant
pas de référence de base conserve un périmètre vide explicite et ne devient pas
automatiquement FULL.

### RELEASE — publication contrôlée

Après un FULL vert sur le SHA exact, vérifier :

```bash
npm run release:check -- --sha=<sha-valide> --target=production
```

La commande exige un worktree propre, une preuve FULL v2 persistée pour le SHA
exact, la couverture de tous les contrôles FULL requis sans échec ni résultat
préexistant, une provenance `origin/main` dont le SHA distant correspond au
candidat, et une cible Vercel `web` / `apps/web` avec une cible attendue
`production` explicitement égale à la cible réellement fournie par
`--target`. `git.deploymentEnabled: false` reste requis pour empêcher les
déploiements Git automatiques. Elle n'exécute aucun déploiement. Une commande
Vercel explicite reste nécessaire après cette preuve.

Chaque exécution produit un rapport avec `VALIDATION_MODE`, `CANDIDATE_SCOPE`,
`ELAPSED_SECONDS`, `TIME_BUDGET_SECONDS` (`none` pour `FULL`),
`CHECKS_PASSED`, `CHECKS_FAILED`,
`CHECKS_NOT_RUN` et `VERDICT`. `TIME_BUDGET_EXCEEDED` et
`NOT_RUN_TIME_BUDGET` restent des résultats explicites pour les modes qui ont
un budget, jamais des succès.

Les alias historiques suivants restent disponibles pour compatibilité ; ils ne
constituent pas une autorisation implicite de lancer `FULL` :

```bash
npm run checks:changed
npm run checks
```

Ils convergent respectivement vers `DEVELOPMENT` et `FULL`. Les commandes
spécialisées restent utiles pour une preuve isolée :

```bash
npm run typecheck
npm run lint
npm run test:scripts
npm run test
npm run test:coverage
npm run quality:coverage
npm run build
npm run quality:dead-code
```

La commande canonique `npm run lint` utilise le seuil natif ESLint
`--max-warnings=0` : tout nouveau warning est bloquant, comme toute erreur.
Les modes `DEVELOPMENT` et `FULL`, ainsi que la CI qui appellent ce lint,
conservent ce même contrat.

Les états de contrôle sont `PASS`, `FAIL`, `SKIPPED_BY_POLICY`, `NOT_RUN`,
`BLOCKED_ACCESS`, `BLOCKED_ENVIRONMENT` et `BLOCKED_DECISION`. Pendant FULL,
aucun état autre que `PASS` ou `ALREADY_PROVEN` ne peut contribuer à
`RELEASE_READY: YES`. Les scopes Git `WORKTREE`, `STAGED`, `PUSH_CANDIDATE` et
`DYNAMIC_CANDIDATE` décrivent le candidat contrôlé ; ils ne constituent pas de
nouveaux modes.

La lane maintenance reste disponible à part, comme compatibilité spécialisée :

```bash
npm run checks:maintenance
```

Ou directement :

```bash
powershell -ExecutionPolicy Bypass -File scripts/ci/run_checks.ps1 -Scope full
```

Les E2E ne sont pas lancés automatiquement par défaut.

## Preuves des contrôles de sécurité CI

Les contrôles de sécurité existants conservent chacun leur propre sémantique et
leur propre niveau de preuve. Ils peuvent produire `PASS`, `FAIL`,
`SKIPPED_BY_SCOPE` ou `NOT_RUN` ; aucun de ces états n'est converti en score
global de cybersécurité. Les tests AuthN/AuthZ/API restent des tests
comportementaux et ne sont pas transformés en scanners.

`security:secrets`, `security:dependencies`, `check:github-actions` et
`check:semgrep` écrivent, à partir de leur exécution courante, une evidence JSON
compacte sous `artifacts/security-evidence/`, liée au `candidateSha`. L'audit
des secrets n'écrit que le nombre de findings et des métriques non sensibles ;
il ne téléverse aucun rapport brut. Les messages utiles d'une policy restent
dans les logs et les contrôles restent bloquants en cas d'échec.

Semgrep conserve deux preuves séparées : l'analyse architecturale et les tests
de fixtures. Un manque d'outil est `NOT_RUN`, une analyse exécutée avec des
findings est `FAIL`, et une fixture en échec ne devient pas un finding
architectural. CodeQL n'est pas dupliqué dans `ci.yml` : son workflow et son
SARIF natifs restent la source de preuve CodeQL.

Le planner continue de distinguer `dependencyGraphRelevant` et
`dependencyAuditRelevant` pour la sélection des contrôles locaux et des autres
jobs. Sur chaque `push` vers `main` et chaque `pull_request` ciblant `main`, le
job GitHub `dependency-audit` s'exécute toutefois indépendamment du scope et
produit uniquement la preuve de son exécution réelle. Il lance d'abord `node --test
scripts/security/audit-dependencies.test.mjs`, puis le véritable
`npm run security:dependencies`. Les Job Summaries sont produits dans les
jobs qui exécutent réellement ces contrôles et les JSON compacts sont
conservés à court terme ; aucun job final ne télécharge des rapports bruts
uniquement pour agréger un résultat.

Le même planner expose `securityToolingRelevant`. Un changement sous
`scripts/security/` sélectionne le job `web-static`, qui exécute alors
`node --test scripts/security/workflow-security-contract.test.mjs
scripts/security/zap-baseline-contract.test.mjs`. Le test
`audit-dependencies.test.mjs` reste exécuté par le job `dependency-audit`, et
les fixtures/règles Semgrep restent couvertes par `npm run check:semgrep`.
Ce signal ne devient pas `web_code_relevant` et ne déclenche pas de build Web
sans contrat applicatif modifié. De même, `mobile-validation` s'exécute sur
chaque `push` vers `main` et chaque `pull_request` ciblant `main`, avec ses
contrôles sécurité, typecheck, tests, couverture et lint ; `scope` reste
disponible pour les contrôles conditionnels des autres jobs.

## Triage des échecs CI

Avant d'attribuer un échec au lot courant, comparer le workflow, le job, le
step et l'environnement avec un run antérieur pertinent.

- Si le même step était déjà rouge avant le lot et qu'aucun fichier causal
  n'est touché, classer l'échec `PREEXISTING_CI_FAILURE` pour en conserver la
  provenance. Lorsqu'un `FULL` a été explicitement lancé, cette classification
  n'autorise toutefois pas à laisser l'erreur actionnable rouge : elle doit
  être corrigée dans l'exécution courante, quel que soit le périmètre initial.
- Si `npm ci` échoue sur Windows avec un fichier verrouillé ou `EPERM`, classer
  le blocage `HOST_ENVIRONMENT` et conserver le diagnostic exact : chemin,
  opération et erreur native.
- Un `npm install` réussi après cet incident ne constitue pas une preuve
  équivalente à `npm ci` ; signaler explicitement la différence.
- Un override npm qui force une version hors de la plage semver déclarée par
  un consommateur est une mitigation temporaire et doit être signalé comme
  dette, jamais présenté comme la résolution durable.
- Pour une erreur `server-only`, appliquer uniquement cette méthode de
  classification et comparer les runs pertinents. Ne pas transformer le bug
  observé en comportement attendu dans la documentation.

Les classes `PREEXISTING_CI_FAILURE` et `HOST_ENVIRONMENT` décrivent la preuve
du blocage ; elles ne rendent pas la validation courante verte et doivent
rester distinctes de `PASS`, `FAIL` et `NOT_RUN`.

## Commandes ciblées

```bash
npm run security:secrets
npm run check:root-files
npm run check:doc-governance
npm run check:stack-doc-drift
npm run check:agent-skills

npm run typecheck
npm run lint
npm run test:scripts
npm run test
npm run test:security
npm run test:regression-gates
npm run build

npm run typecheck -w apps/mobile
```
