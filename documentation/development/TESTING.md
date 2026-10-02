# Testing Guide

Guide canonique de validation du dépôt CleanMyMap.

## Principe

Une commande ne doit jamais être présentée comme « globale » si elle ne couvre qu'une partie du dépôt.

Le workflow Codex distingue exactement deux modes de validation : `RAPIDE` et
`COMPLET`. Les tests spécialisés restent des briques appelables séparément,
pas des modes supplémentaires.

## Niveau de preuve et contrats exécutés

Toujours distinguer :

```text
présence textuelle
≠ structure statique
≠ comportement exécuté
≠ propriété métier démontrée
```

Un test qui lit une migration SQL et vérifie des chaînes, des noms ou des
regex est un `STATIC_CONTRACT`. Il peut protéger la présence de RLS, grants,
revokes, fonctions, `search_path` ou clauses obligatoires, mais ne prouve pas
l'idempotence, l'atomicité, les contraintes à l'exécution, les effets de
triggers, les interactions RLS, la concurrence ou le résultat d'une RPC.

Les niveaux de preuve sont distincts et ne doivent pas être interchangeables :

- `STATIC_CONTRACT` vérifie la source, la structure ou la configuration sans
  exécuter la frontière concernée ;
- `EXECUTED_BEHAVIOR` exécute le code applicatif et observe son comportement
  dans le harness correspondant ;
- `INTEGRATION_PROOF` exécute réellement une frontière externe ou persistante
  (par exemple PostgreSQL, Supabase, Storage ou HTTP) et en observe le résultat.

Un `EXECUTED_DB_CONTRACT` est une forme spécialisée d'`INTEGRATION_PROOF`.
Ainsi, `STATIC_CONTRACT` ≠ `EXECUTED_BEHAVIOR` ≠ `INTEGRATION_PROOF`.

Un `EXECUTED_DB_CONTRACT` exécute réellement le contrat dans l'environnement
de validation supporté et doit être nommé comme tel dans le compte rendu. Si
cette exécution n'est pas disponible dans le lot, rapporter
`DB_SEMANTICS_NOT_EXECUTED`; ne jamais présenter le test statique comme une
preuve équivalente.

## Seuils et qualité des assertions

Un test doit protéger un invariant identifiable et non reproduire la structure
actuelle de l'implémentation. Rechercher l'élément par son ID, sa clé ou son
prédicat métier ; `items[0]` ou `items[1]` n'est acceptable que lorsque l'ordre
fait partie du contrat testé.

Pour une règle à seuil, couvrir lorsque pertinent : juste sous le seuil,
exactement au seuil, juste au-dessus, absence ou valeur nulle, et interaction
avec le niveau de seuil supérieur. Une assertion doit nommer ou vérifier la
frontière qu'elle protège ; ajouter un second test avec les mêmes entrées et
les mêmes assertions n'est pas une nouvelle preuve. Il doit couvrir une autre
frontière, un autre contrat public ou être consolidé.

## Artefacts de validation

Les sorties locales et les candidates de contrôle ne sont pas des sources
documentaires :

- `artifacts/` contient les sorties générées ou régénérables ;
- `.artifacts/validation/prepush-candidate/<sha>/` contient les candidates
  temporaires matérialisées pour la validation dynamique et doit être nettoyé
  par son owner ;
- les audits durables sont conservés sous `documentation/`, dans le domaine
  concerné, et non dans `.artifacts/`.

Ne jamais versionner une preuve dans `.artifacts/` par commodité. Vérifier sa
provenance, sa reproductibilité et son emplacement documentaire avant de la
conserver.

Les anciens lanceurs Windows peuvent être conservés localement sous
`.local/root-wrappers/`. Ce dossier est ignoré et n'est pas une surface
versionnée ; les commandes du workspace mobile restent la référence
reproductible.

Pour un nettoyage local ponctuel, utiliser `npm run clean:temp`. La variante
`clean:temp:force` exige que les outils du dépôt soient fermés ; `npm run
dev:clean` combine le nettoyage et le redémarrage du développement.

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
scope ; ne pas les utiliser comme remèdes à un `403`. Une opération qui exige
un runtime conteneurisé local est `UNSUPPORTED_CONTAINER_RUNTIME` sur le poste
utilisateur.

Un runner CI hébergé et éphémère peut toutefois utiliser ce runtime uniquement
dans une CI explicitement dédiée au replay Supabase.

Ne pas lancer `supabase start`, `supabase status` ou `supabase db reset` dans le
workflow local canonique ; ces commandes restent réservées à cette CI de replay
explicitement dédiée.

## Deux modes canoniques

Boucle normale, avec sélection selon le blast radius du `WORKTREE` :

```bash
npm run checks:fast
```

Le mode `RAPIDE` est borné à 180 secondes. Il exécute le diff check, l'audit
des secrets et les contrôles pertinents pour les fichiers concernés : tests
ciblés, typecheck, lint, sécurité/AuthZ, qualité, gouvernance documentaire,
pages_site, scripts ou migrations. Les suites lourdes non nécessaires sont
`NOT_RUN` avec leur raison ; elles ne sont pas relancées par redondance.

Clôture complète d'un changement transversal ou sensible :

```bash
npm run checks:full
```

Le mode `COMPLET` n'a plus de budget global fixe et réutilise la même détection
des domaines concernés que `RAPIDE` : il ne rend pas automatiquement tous les
domaines pertinents. Il renforce les preuves à l'intérieur du scope détecté
(gouvernance, sécurité, typecheck, lint, Vitest Web, quality, migrations, tests
de scripts/Python ou build de production lorsque le domaine le justifie). Une
preuve déjà couverte par `RAPIDE` sur le même candidat et la même configuration
est indiquée `ALREADY_PROVEN` au lieu d'être relancée ; toute modification du
candidat l'invalide.

Chaque exécution produit un rapport avec `VALIDATION_MODE`, `CANDIDATE_SCOPE`,
`ELAPSED_SECONDS`, `TIME_BUDGET_SECONDS` (`none` pour `COMPLET`),
`CHECKS_PASSED`, `CHECKS_FAILED`,
`CHECKS_NOT_RUN` et `VERDICT`. `TIME_BUDGET_EXCEEDED` et
`NOT_RUN_TIME_BUDGET` restent des résultats explicites pour les modes qui ont
un budget, jamais des succès.

Les alias historiques suivants restent disponibles pour compatibilité :

```bash
npm run checks:changed
npm run checks
```

Ils convergent respectivement vers `RAPIDE` et `COMPLET`. Les commandes
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
Les modes `RAPIDE` et `COMPLET`, ainsi que la CI qui appellent ce lint,
conservent ce même contrat.

Les scopes Git `WORKTREE`, `STAGED`, `PUSH_CANDIDATE` et
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

## Triage des échecs CI

Avant d'attribuer un échec au lot courant, comparer le workflow, le job, le
step et l'environnement avec un run antérieur pertinent.

- Si le même step était déjà rouge avant le lot et qu'aucun fichier causal
  n'est touché, classer l'échec `PREEXISTING_CI_FAILURE` et ne pas corriger ce
  défaut dans le lot courant sauf demande explicite.
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

## Couverture runtime et ratchet

La couverture est mesurée par le provider officiel V8 correspondant à la
version de Vitest installée (`@vitest/coverage-v8@4.1.11`). La commande :

```bash
npm run test:coverage
```

exécute la suite Vitest Web complète et produit le résumé JSON ignoré par Git
dans `apps/web/coverage/coverage-summary.json`. Le périmètre instrumenté est
le runtime testable sous `apps/web/src`. Les tests, déclarations `.d.ts`,
fichiers générés, les fichiers de types purs explicitement référencés dans la
configuration Vitest et les conventions d'entrée App Router Next (`page`,
`layout`, `loading`, `error`, `not-found`, `robots`, `sitemap`, `template`,
`default`, etc.) sont exclus. Les routes API et les modules métier restent
inclus ; aucune exclusion n'est motivée par une couverture faible.

La commande de contrôle est :

```bash
npm run quality:coverage
```

Elle compare les quatre métriques globales — statements, branches, functions
et lines — au baseline réel de `main` dans
`scripts/checks/coverage-baseline.json`. La baseline a été mesurée sur le SHA
`a900d227041b1dcd39cf9a971b4fa31d8eb1e643`, le 18 septembre 2026, sans seuil
arbitraire : statements `56.86 %`, branches `47.22 %`, functions `57.19 %` et
lines `57.39 %`. Le ratchet quotidien applique une stabilisation court terme :
une baisse bornée peut être classée `PASS_WITH_GRACE`, tandis qu'une baisse
au-delà de l'enveloppe reste `FAIL`. La marge globale est de `0.25` point de
pourcentage ; pour chaque métrique, la marge effective est le maximum entre
cette valeur et une unité mesurée (`100 / baseline.total`). Les ratios exacts
`covered / total` sont comparés, et non les pourcentages JSON arrondis.

Le même ratchet est calculé pour les domaines mesurables `auth-authz`,
`actions`, `formalities`, `route-calculs` et `persistence`. Leurs valeurs de
départ et leurs chemins sont dans la baseline ; elles ne constituent pas des
objectifs historiques inventés. Les marges sont de `0.25` point pour
`auth-authz` et de `0.75` point pour chacun des quatre autres domaines, avec la
même règle d'unité mesurée. Une petite baisse bornée est reportée avec
`COVERAGE_GRACE <scope>.<metric>` et le statut `PASS_WITH_GRACE` ; elle ne
modifie jamais la baseline. L'accumulation des régressions finit donc par
dépasser l'enveloppe et bloquer. Une baseline malformée, obsolète, dont le
périmètre ne correspond plus à la policy, ou dont un domaine/métrique attendu
manque, échoue toujours strictement.

Une amélioration de la baseline doit être ratifiée par une modification
explicite de ce fichier et ne peut pas régresser silencieusement. Les métriques
historiques ne sont jamais recalculées automatiquement.

`checks:full` et la CI exécutent `quality:coverage` à la place du test Vitest
seul. `checks:fast` ne relance pas cette suite complète instrumentée afin de
respecter son budget et d'éviter une seconde exécution inutile des tests.

Le même moteur V8 mesure séparément le mobile :

```bash
npm run quality:mobile-coverage
```

Le périmètre mobile est `apps/mobile` hors tests, déclarations et vendor. Sa
baseline indépendante est `scripts/checks/coverage-mobile-baseline.json`,
mesurée sur le SHA `f0f39bdbdd8e0d30077768a9bc2b271ae22432a8` : statements
`31.65 %` (`145/458`), branches `22.17 %` (`55/248`), functions `34.09 %`
(`30/88`) et lines `32.34 %` (`142/439`). Aucun pourcentage mobile n'est
agrégé avec le web et le mobile ne possède pas de domaines web artificiels.
Une baisse mobile est donc comparée indépendamment sur les quatre métriques.

## Complexité, longueur et ratchet legacy

La politique déterministe est centralisée dans
`scripts/checks/complexity-policy.mjs`, avec son ratchet versionné dans
`scripts/checks/complexity-baseline.json`. La preuve exhaustive se lance avec :

```bash
npm run quality:complexity
```

Le contrôle bloque les nouveaux dépassements de complexité et de longueur de
fonction définis par catégorie. `quality:complexity` ne mesure ni ne ratifie la
taille des fichiers : les seuils runtime/test/data-config, les entrées REVIEW et
les plafonds de taille sont exclusivement gouvernés par
`scripts/checks/check-top-heavy-files.mjs`, `scripts/checks/top-heavy-policy.mjs`
et `scripts/checks/heavy-files-baseline.json`. Les dépassements historiques de
complexité ou de longueur utilisent un plafond individuel : une croissance
échoue, une baisse est signalée comme amélioration à ratifier explicitement, et
une baseline absente, malformée ou obsolète échoue.

L'identité fonctionnelle ratchetée suit exactement la version `v2` de
`FUNCTION_IDENTITY_SCHEME` (`scripts/checks/complexity-policy.mjs`) : chemin
canonique sous `apps/web/` ou `apps/mobile/`, rôle sémantique (`named`,
`constructor`, variable ou propriété, callback avec callee/index/titre), puis
occurrence déterministe du même rôle dans le fichier. Les fragments syntaxiques
sont représentés par des tokens AST canoniques, sans trivia ni fin de ligne,
tandis que les littéraux restent discriminants. Le numéro de ligne reste une
information de diagnostic uniquement ; déplacer une fonction sans modifier son
contenu ne change donc pas son identité ni son plafond.

`checks:fast` exécute la variante `--changed-only` pour les changements Web et
reste borné pour le mobile. `checks:full` et la CI exécutent la mesure
exhaustive des deux roots. `quality:top-heavy` réutilise lui aussi les roots
`apps/web/src` et `apps/mobile` avec la même politique KIND ; il reste la
source canonique du ratchet de taille des fichiers et de ses seuils
`REVIEW_REQUIRED`/`HARD`.

Pour un lot de modularisation de routes API ou de services backend, répéter la
preuve après chaque sous-domaine compilable, puis sur le candidat final :

```bash
npm run quality:complexity -- --changed-only
npm run quality:dead-code
npm run quality:duplication
npm run quality:top-heavy -- --enforce
```

Ajouter les tests ciblés de la route ou du service après chaque extraction ;
ajouter `npm run test:security` lorsqu'une route, un scope ou une frontière
AuthN/AuthZ est touché. La baseline de complexité ne peut être ratifiée que
pour une baisse mesurée sur le candidat exact : on abaisse le plafond amélioré,
on n'augmente pas un ceiling et on n'ajoute pas d'exception pour faire passer
le contrôle.

## Dead code et ratchet Knip

La commande informative historique reste disponible :

```bash
npm run audit:dead-code
```

Le garde bloquant est :

```bash
npm run quality:dead-code
```

Il réutilise la configuration explicite de `scripts/knip.json` : entrées
Next.js et App Router détectées par le plugin, scripts lancés par les contrats
du dépôt, points d'entrée E2E et fichiers de sécurité mobile. Le vendor mobile
est explicitement exclu ; aucun wildcard global ne transforme les exports,
fixtures ou fichiers générés en dette invisible. Les exports publics et les
modules non référencés restent donc signalés tant qu'ils ne sont pas couverts
par une entrée ou une qualification vérifiable.

La dette constatée par l'audit de référence est versionnée dans
`scripts/checks/dead-code-baseline.json` avec son commit source, la version
Knip et l'identité stable de chaque finding. Les positions de ligne ne font
pas partie de l'identité. Un finding nouveau ou une aggravation échoue ; un
finding historique résolu est rapporté comme amélioration et devient un
nouveau plafond uniquement après ratification explicite de la baseline. La
commande est intégrée au FULL et à la CI Web, sans dupliquer la logique Knip.

Les findings historiques conservés par décision explicite sont recensés dans
`scripts/checks/dead-code-justifications.json`. Une entrée
`KEEP_JUSTIFIED` doit référencer exactement un ID de la baseline et fournir une
raison, une preuve vérifiable et un SHA complet de revue. Le rapport distingue
les findings historiques actionnables, les `KEEP_JUSTIFIED`, les historiques
résolus, les nouveaux findings et les `STALE_KEEP_JUSTIFIED`. Un KEEP disparu
ou dont l'identité change bloque jusqu'à revue ; un finding nouveau reste
`NEW_DEAD_CODE` bloquant même si une tentative d'entrée au registre existe.
Le registre ne modifie ni Knip ni `dead-code-baseline.json` et ne remplace
jamais une correction de configuration ou d'entrypoint Knip lorsqu'un finding
est un faux positif technique.

## Mutation ciblée des tests

La qualité des tests de quelques fonctions pures critiques est mesurée avec
Stryker `10.0.0` et son runner Vitest `10.0.0`. Le périmètre est explicitement
borné dans `apps/web/stryker.config.mjs` aux qualifications de formalités, aux
permissions, aux calculs d'impact et aux transitions de statut des actions ; il
ne mute pas tout `apps/web`. `formalities-workflow.ts` et
`route-operational-budget.ts` restent `NOT_MEASURED_YET` dans ce lot, car le
runner Babel de Stryker ne produit pas de code instrumenté fiable pour leur
syntaxe générique TypeScript 7. Cette incompatibilité est signalée, non
convertie en couverture nulle et ne justifie aucune modification métier.

La commande spécialisée est :

```bash
npm run quality:mutation
```

Son rapport distingue `Killed`, `Survived`, `NoCoverage`, `Timeout` et
`error`. Le baseline ratcheté est
`scripts/checks/mutation-baseline.json` : il a été mesuré sur l'état introduit
par le commit `6a0a420bf7313535788f3e0dcb297f0aaa13dd2c`, avec 329 mutants, 270 killed,
52 survived, 7 no coverage, 0 timeout/error et un score de `83.85 %` sur les
mutants exécutables. Une baisse du score, une augmentation de `NoCoverage`, un
timeout, une erreur d'exécution ou une baseline stale sont bloquants. Le score
n'est pas un objectif arbitraire de 100 % ; chaque survivant reste un élément
d'audit. Une assertion n'est ajoutée que lorsqu'elle protège un comportement
métier réel, jamais pour tuer artificiellement un mutant statique.

La mutation reste hors `checks:fast`, hors de la CI push quotidienne et hors du
FULL courant. Sa mesure réelle reste une validation manuelle/pré-release
explicite ; elle ne doit pas être rendue silencieusement non bloquante pour
entrer dans un mode quotidien.

## Duplication et cycles

La duplication est mesurée par `jscpd` 5.3.0 avec des baselines natives
séparées pour le runtime, les tests et les data/fixtures, ainsi qu'une baseline
métrique dans `scripts/checks/duplication-metrics-baseline.json`. Cette dernière
contient le fingerprint SHA-256 de la politique courante. Toute modification de
l'outil, de sa version, des seuils, des scopes, des patterns ou des exclusions
rend la baseline métrique stale ; son évolution doit être ratifiée explicitement.
Les snapshots, fichiers générés, vendors et duplications de fixtures
volontairement répétitives ne sont pas traités comme de la dette runtime. Les
baselines natives jscpd sont des ratchets versionnés : elles représentent
l'ensemble des fingerprints acceptés à un commit donné et ne sont jamais mises
à jour automatiquement par `quality:duplication`. La commande :

```bash
npm run quality:duplication
```

réutilise les fingerprints natifs jscpd et compare aussi les blocs, les lignes
et les tokens dupliqués à la baseline métrique. Tout nouveau fingerprint de
clone (`NEW_CLONE_FINGERPRINTS > 0`) est bloquant pour le runtime et les tests ;
les fixtures/data restent strictes. Les clones déjà présents dans les baselines
natives restent historiques. Une réduction validée est acquise explicitement
sur le commit mesuré avec `--baseline <baseline-file> --update-baseline`, en
conservant exactement les mêmes scopes, patterns, seuils, ignores et version
jscpd. Un fingerprint supprimé qui réapparaît ensuite devient un nouveau
fingerprint bloquant. Le fingerprint de politique
(`DUPLICATION_POLICY_FINGERPRINT`) reste un invariant distinct et strict.
Un clone historique reste donc une dette et ne constitue pas une justification
implicite. Une duplication volontaire nécessitant une protection doit faire
l'objet d'une décision explicite et d'un garde-fou dédié, sans exclusion,
relèvement de seuil ou abstraction artificielle ajoutée uniquement pour
satisfaire jscpd. Les décisions `KEEP_INTENTIONAL` sont enregistrées dans
`scripts/checks/duplication-justifications.json` avec le fingerprint natif, une
raison, une preuve et un SHA complet de revue. Le contrôle vérifie que le
fingerprint existe dans la baseline native et dans le rapport CURRENT SARIF ;
une justification disparue produit `STALE_KEEP_INTENTIONAL` et bloque. Ce
registre ne neutralise jamais `NEW_CLONE_FINGERPRINTS_BLOCKING` : un nouveau
fingerprint reste bloquant même lorsqu'un registre de KEEP existe.

La stabilisation court terme de la CI quotidienne distingue trois résultats :
`PASS`, `PASS_WITH_GRACE` et `FAIL`. `PASS_WITH_GRACE` accepte uniquement une
hausse des métriques absolues calculée contre la même baseline historique et
dans l'enveloppe versionnée : runtime `+0,05` point de pourcentage et `+80`
lignes / `+800` tokens ; tests `+0,15` point et `+150` lignes / `+1 500`
tokens. Cette grâce ne s'applique jamais aux nouveaux fingerprints ni aux
fixtures/data ; elle est non cumulative et ne modifie ni ne renouvelle la
baseline. Dépasser une seule limite redevient bloquant (`FAIL`). Aucune hausse
de baseline, de seuil ou d'exclusion ne peut servir à faire passer un lot.

La sortie expose par scope le statut, les nouveaux fingerprints et les deltas
réels de lignes, tokens et pourcentages. Les `KEEP_INTENTIONAL` restent
présents dans la baseline native et sont documentés séparément dans
`scripts/checks/duplication-justifications.json` ; ils ne peuvent jamais
autoriser un nouveau fingerprint. Aucun seuil, ignore ou grace ne peut être
relevé pour masquer une régression.

Le contrôle de cycles réutilise l'analyseur GitNexus existant. La CI installe
explicitement la version épinglée `1.6.12` puis initialise son index en mode
`--index-only`, car `.gitnexus/` reste un état local ignoré :

```bash
npm run quality:cycles
```

Il exige un rapport complet et stable, plafonne les cycles historiques
identifiés et échoue sur tout nouveau cycle ou baseline obsolète. Les deux
gates sont exécutés en `COMPLET` et dans la CI ; ils ne sont pas ajoutés à
`RAPIDE` pour éviter une analyse globale à chaque changement ciblé.

## Regression gates

La commande canonique est :

```bash
npm run test:regression-gates
```

La composition exacte de cette suite est définie par le code courant dans :

```text
scripts/checks/validation-policy.mjs
```

Ne pas maintenir dans la documentation une deuxième liste de fichiers de test.

Cette suite protège notamment les contrats à fort risque autour :

- du contrat unifié des actions ;
- de la cohérence registry/navigation ;
- des invariants Vercel explicitement couverts ;
- des routes protégées et du proxy.

Lorsqu'un chantier migre un contrat déjà protégé par ces gates :

1. ajouter ou adapter le garde-fou ;
2. préférer un changement additif et compatible lorsque la migration l'exige ;
3. migrer les consommateurs par périmètre cohérent ;
4. supprimer l'ancien chemin uniquement après validation du contrat cible.

Une baseline, une fixture ou un test de garde ne doit pas être modifié uniquement
pour faire disparaître un échec. Vérifier d'abord si le changement fonctionnel
attendu justifie réellement l'évolution de la preuve.

## E2E

Lister les E2E locaux sans persistence Supabase :

```bash
npm run test:e2e:list
```

Exécuter :

```bash
npm run test:e2e
```

Ces commandes sélectionnent uniquement les projets Playwright locaux qui ne
requièrent pas de base Supabase mutable. Les E2E persistants — partage
d'action, parcours authentifié de recrutement et signalement/Storage — ne sont
pas une obligation pour chaque petit commit et sont exécutés par la lane
GitHub Actions dédiée. Les anciens lanceurs locaux des campagnes persistantes
restent des gardes explicites et échouent sans appeler Docker ni le cycle de
vie Supabase :

```bash
npx playwright test --list --project="action sharing" --project="authenticated campaign" --project="signalement campaign 2"
```

La lane `.github/workflows/e2e-supabase.yml` utilise un runner Linux GitHub
hébergé et éphémère. Elle démarre Supabase, applique les migrations
`apps/web/supabase/migrations/`, charge `apps/web/supabase/seed.sql`, lance
Next.js contre cette instance locale du runner, puis arrête la stack. Elle
utilise exclusivement des identifiants Clerk Development ; l'absence de ces
identifiants fait échouer la lane avant tout E2E. Aucun projet Supabase distant,
URL de production ou clé de production ne doit être injecté dans cette lane.

Cette lane utilise donc Clerk Development réel et une instance Supabase
éphémère. Les sorties Playwright authentifiées restent locales au runner pour le
diagnostic et ne sont jamais téléversées. L'artefact public est construit dans
`artifacts/ci-public-evidence/`, limité par allowlist, puis contrôlé par
`scripts/checks/check-public-e2e-artifact.mjs`; il ne contient qu'un résumé
synthétique ou une capture explicitement autorisée, jamais de `storageState`,
cookie, trace, HAR, vidéo, header ou token.

Les commandes `supabase start`, `supabase status`, `supabase db reset` et
`supabase stop` sont donc réservées à cette CI éphémère explicitement dédiée au
replay ; elles ne font pas partie du workflow local.

Ou via le script PowerShell :

```bash
powershell -ExecutionPolicy Bypass -File scripts/ci/run_checks2.ps1 -Scope full -IncludeE2E
```

Le premier périmètre E2E doit rester limité aux parcours à fort risque :

- pages publiques essentielles ;
- health endpoints ;
- frontière admin ;
- absence d'indexation des surfaces privées ;
- parcours authentifiés critiques quand un `storageState` sécurisé est disponible.

## TypeScript

Commande standard :

```bash
npm run typecheck
```

Diagnostic détaillé :

```bash
npx tsc --noEmit --pretty false
```

Pour exclure un résultat issu du cache TypeScript web :

```bash
npx tsc --noEmit --pretty false --skipLibCheck --incremental false
```

Sortie complète :

```bash
npx tsc --noEmit --pretty false --noErrorTruncation > typescript-errors.txt
```

Méthode :

1. lire la sortie ;
2. grouper les erreurs par cause ;
3. corriger le blocage commun ;
4. relancer le typecheck ;
5. ne pas remplacer mécaniquement `any` par `unknown` sans narrowing.

## Build

Ordre recommandé :

1. lire l'erreur complète ;
2. classer : TypeScript, import, route, Next.js, Vercel, env, Supabase, bundler ;
3. lancer typecheck, lint et tests ciblés ;
4. corriger un lot cohérent ;
5. lancer un seul build complet.

Commandes :

```bash
npm run typecheck
npm run test:regression-gates
npm run build
npm run audit:vercel-quota
```

Si le build semble utiliser un cache incohérent :

```bash
npm run build:clean -w apps/web
```

Ne jamais fabriquer manuellement un fichier interne `.next`.

## Application mobile

Minimum obligatoire :

```bash
npm run mobile:typecheck
npm run mobile:test
npm run mobile:security
npm run mobile:lint
npm run quality:mobile-coverage
```

Pour un changement de code mobile, le mode RAPIDE sélectionne ces quatre
contrôles mobiles ainsi que les garde-fous communs de secrets et de Semgrep.
Le mode COMPLET ajoute les contrôles partagés Knip, jscpd et cycles GitNexus.
Un changement mobile seul ne déclenche pas les validations web de build,
Vercel ou Playwright.

Le mobile est `CURRENT / ACTIVE DEVELOPMENT` depuis le lot M0, mais reste
`NOT_PRODUCTION_READY`. Les contrats Clerk, RLS et la finalisation des métriques
par trigger invoker sont finalisés et invariants. La baseline de tests couvre :

- restauration d'une mission active ;
- buffer offline ;
- refus des permissions GPS ;
- finalisation d'une mission ;
- erreurs Supabase ;
- propriété d'une mission ;
- cohérence identité Clerk → Supabase ;
- absence d'écriture client directe de `distance_m` et `duration_s`.

Cette lane est une validation de code et de contrats. Elle ne constitue pas un
test sur téléphone réel, une validation du background headless ou une preuve de
préparation à la production.

## QA UI

Pour une page visible modifiée, seulement lorsque demandé :

1. lancer localement ;
2. capturer le rendu desktop ;
3. exporter `.MD this page` ;
4. comparer visuel et sémantique ;
5. vérifier CTA, titres, statistiques, sources, états et accessibilité.

Référence : la section `Vérification UI` de `documentation/pages_site/README.md`.

```text
documentation/pages_site/README.md
```

## Smoke de production

Après déploiement significatif :

```text
/sign-in
/dashboard
/admin
/actions/new
/actions/map
/reports
/api/health
/api/uptime
```

Vérifier :

- auth ;
- admin ;
- pages métier ;
- export si concerné ;
- `criticalStatus: "ok"` sur `/api/uptime`.

## Clerk local

Avant toute validation navigateur, classifier la surface :

- `PUBLIC` : navigateur intégré ou Playwright public, sans bypass ;
- `PROTECTED_SERVER_ONLY` : launcher local canonique, `CMM_DEV_AUTH_BYPASS=1`,
  rôle minimal, port 3000 préféré avec fallback et URL effectivement annoncée ;
- `PROTECTED_CLERK_CLIENT` : si la route consomme `useUser`, `useAuth`, l'UI
  Clerk, `SignedIn`/`SignedOut` ou une vraie session navigateur, le bypass
  serveur est insuffisant. Utiliser le harness Playwright Clerk Development,
  `localhost:3000` strict, `CMM_DISABLE_DEV_AUTH_BYPASS=1` et le
  `storageState`/la session du global setup. `/onboarding` est un exemple ;
- `PROD_SMOKE` : session Clerk Production réelle selon le playbook, sans
  bypass ;
- `E2E_MUTABLE_SUPABASE` : uniquement la lane CI éphémère dédiée, jamais
  Docker/Supabase local.

GitHub Codespaces est un environnement interactif Development : il utilise une
vraie AuthN Clerk avec les credentials Development fournis hors dépôt et ne
peut jamais activer `CMM_DEV_AUTH_BYPASS`, même si `CODESPACES=true` et si un
lanceur a laissé cette variable. Si les credentials Clerk requis manquent, le
démarrage doit échouer avec une erreur de configuration explicite. Le bypass
synthétique reste réservé au launcher Codex localhost explicite.

Le launcher manuel/Codex utilise `3000` de préférence et peut basculer sur un
port libre ; reprendre l'URL annoncée. Le harness Clerk doit libérer l'ancien
serveur et rester strict sur `3000`. Ne jamais lancer Playwright Clerk contre
un serveur bypass, ni supposer `localhost:3000` après un fallback.

La configuration Playwright utilise `http://localhost:3000` par défaut, en
cohérence avec la configuration Clerk Development locale. Pour lancer
explicitement le scénario sans fallback de port :

```powershell
$env:PLAYWRIGHT_BASE_URL = "http://localhost:3000"
$env:DEV_HOST = "localhost"
$env:CMM_DISABLE_DEV_AUTH_BYPASS = "1"
npx playwright test --project="soft-gate authentication"
```

`PLAYWRIGHT_BASE_URL` est refusée pour toute origine distante, tout protocole
autre que HTTP ou tout port différent de `3000`.

### Tester le redirect automatique de Clerk

Pour prouver le retour produit par le composant Clerk `<SignIn>`, exercer le
formulaire UI sur le parcours `PROTECTED_CLERK_CLIENT` : depuis la route
anonyme, cliquer le CTA, vérifier l'URL `/sign-in?redirect_url=...`, terminer
une vraie connexion Clerk Development puis attendre le `waitForURL` de la route
cible. Ne pas appeler `page.goto()` vers la cible après la connexion : cela
masquerait un redirect cassé. `clerk.signIn()` et un `storageState` servent à
préparer une session pour tester une route protégée ; ils ne prouvent pas le
callback de navigation du composant `<SignIn>`.

Pour une connexion par code email en Development, le setup Playwright utilise
l'adresse `+clerk_test` et le code de test `424242`. Attendre `clerk.loaded`,
utiliser le formulaire Clerk et attendre la réponse `attempt_first_factor`.
Dans le widget actuel, la saisie complète du code lance elle-même la
vérification et désactive le bouton principal pendant le traitement : ne pas
cliquer une seconde fois. `setupClerkTestingToken({ page })` ne crée pas de
session et ne remplace pas l'authentification ; il prépare les requêtes Clerk
au test navigateur.

Après la réponse Clerk, vérifier dans cet ordre : session et utilisateur
présents sur `window.Clerk`, URL cible exacte, gate anonyme absent, contenu
authentifié visible. Une réponse HTTP 200 seule ne prouve pas une session. Si la
réponse FAPI indique `status: "complete"` et un premier facteur `verified`,
mais que `window.Clerk.session` reste absent, classer d'abord le blocage comme
`AUTH_SESSION` ; le redirect du composant n'a pas encore été isolé. Éviter de
modifier `forceRedirectUrl` tant qu'une session active n'est pas observée.

Commande ciblée du scénario de retour :

```bash
npx playwright test --project="soft-gate authentication" --grep="returns to the canonical route"
```

Le projet dépend du global setup Clerk et de son teardown qui supprime
l'utilisateur de développement géré. Exécuter ce parcours seul, sans test
parallèle utilisant le même harness.

Annoncer avant le test :

```text
AUTH_SURFACE: PUBLIC | PROTECTED_SERVER_ONLY | PROTECTED_CLERK_CLIENT
BROWSER_HARNESS: INTEGRATED_BROWSER | PLAYWRIGHT_CLERK
AUTH_MODE: NONE | DEV_BYPASS | CLERK_DEVELOPMENT
HOST_URL: URL réellement utilisée
ROLE: rôle réel/simulé
PERSISTENCE: NONE | REMOTE_READONLY | CI_EPHEMERAL
```

Les rôles de bypass canoniques sont `benevole`, `coordinateur`,
`scientifique`, `entreprise`, `elu`, `admin` et `max`. Ne jamais utiliser de
clé Clerk Production sur localhost et ne jamais committer session, token ou
secret.

## Critères de réussite

Une validation est réussie seulement si :

- toutes les commandes réellement exécutées passent ;
- aucune erreur critique n'est masquée ;
- les contrôles non exécutés sont explicitement signalés ;
- le niveau de validation correspond au niveau de risque du changement.

## Protocole manuel des formulaires Actions

Avant de tester les formulaires Actions sur le terrain :

1. Verrouiller le scénario de test : une action terrain réelle ou quasi réelle,
   un flux d'action à créer ou modifier, un flux `Rejoindre une action` à
   ouvrir, rejoindre ou modérer, et un objectif de validation par flux.
2. Préparer les comptes : un admin, un créateur d'action, deux à trois
   bénévoles et un compte déjà rejoint pour tester les états déjà inscrits.
   Vérifier que les pseudos et profils sont propres, car ils apparaissent dans
   les journaux et files d'attente.
3. Vérifier les chemins critiques : création et édition admin d'une action,
   journal des modifications, publication/validation, ouverture/fermeture du
   flux de groupe, file d'attente, acceptation/refus, accès admin direct et
   reprise mobile.
4. Faire un test à blanc avec des données factices. Noter ce qui casse, ce qui
   est trop long et ce qui n'est pas compréhensible ; corriger les textes
   ambigus avant d'impliquer les bénévoles.
5. Préparer un protocole terrain avec cinq tâches courtes, un critère de
   réussite par tâche et un canal de retour rapide. Définir qui valide quoi et
   à quel moment.
6. Sécuriser le suivi : journal des erreurs et retours, possibilité de revenir
   en arrière après une modération ou une modification, et vérification du
   pseudo de l'admin dans les journaux.

À confirmer manuellement : affichage du journal sur la fiche action,
lisibilité mobile, états vide/chargement/erreur et droits d'accès du créateur,
de l'admin et du bénévole.
