# Testing — qualité et audits

Ce module porte la couverture, les ratchets de qualité, les audits structurels et leurs artefacts.

[Retour au guide canonique](./TESTING.md).

## Couverture runtime et ratchet

La couverture est mesurée par le provider officiel V8 correspondant à la
version de Vitest installée (`@vitest/coverage-v8@4.1.11`). La commande :

```bash
npm run test:coverage
```

exécute la suite Vitest Web complète et produit le résumé JSON ignoré par Git
dans `apps/web/coverage/coverage-summary.json`, ainsi qu'une preuve liée au
candidat dans `apps/web/coverage/coverage-evidence.json`. Cette preuve contient
l'empreinte du candidat Git, de la configuration Vitest/coverage et de
l'environnement pertinent ; elle n'est réutilisable que si tous ces éléments
convergent. Le périmètre instrumenté est
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
lines `57.39 %`. La comparaison historique reste informative : une baisse
bornée peut être classée `PASS_WITH_GRACE`, tandis qu'une baisse au-delà de
l'enveloppe est classée `INFORMATIVE_REGRESSION`. Aucun de ces deux résultats
ne fait échouer la commande. La marge globale est de `0.25` point de
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
modifie jamais la baseline. Une baisse au-delà de l'enveloppe conserve tous ses
détails dans le rapport et le statut `INFORMATIVE_REGRESSION`, mais reste
non bloquante. Une baseline absente, malformée ou obsolète rend la comparaison
historique `UNAVAILABLE` sans invalider une mesure courante correctement
produite. En revanche, un résumé courant invalide, une preuve obligatoire
manquante ou une preuve ne correspondant plus au candidat échoue strictement.

Une amélioration de la baseline doit être ratifiée par une modification
explicite de ce fichier et ne peut pas régresser silencieusement. Les métriques
historiques ne sont jamais recalculées automatiquement.

`quality:coverage` réutilise automatiquement une preuve de couverture valide
du même candidat ; `npm run quality:coverage -- --from-existing-summary`
force explicitement le mode checker-only et échoue si la preuve manque ou ne
correspond plus. Ainsi `checks:full` peut consommer une couverture déjà
produite sans relancer Vitest, tandis qu'un candidat sans preuve recalcule la
suite complète. Dans la CI, `web-tests` produit la suite couverte et publie
l'artefact court terme ; `web-coverage` le télécharge puis exécute uniquement
la comparaison informative. `checks:fast` ne relance pas cette suite complète instrumentée afin
de respecter son budget et d'éviter une seconde exécution inutile des tests.

Les étapes CI `Duplication ratchet` et `GitNexus cycle ratchet` restent
exécutées avec `continue-on-error: true` afin de conserver leurs logs, preuves
et rapports même lorsqu'une gate échoue. Le step final de résumé valide ensuite
chaque preuve : seuls `PASS` et `PASS_WITH_GRACE` rattachés au candidat courant
et à une baseline ancêtre sont acceptés ; un `FAIL`, une baseline obsolète, une
preuve manquante, invalide ou rattachée à un autre SHA fait échouer
`web-quality`. Le job `web-coverage` télécharge la preuve produite par
`web-tests` et exécute directement la comparaison checker-only ; une baisse
numérique reste informative et ne relance pas Vitest. La génération de la
couverture, l'intégrité de la preuve et les rapports obligatoires restent
fail-closed et bloquants. Aucun de ces contrôles ne peut donc devenir vert par
simple masquage de son code de sortie.

Le même moteur V8 mesure séparément le mobile :

```bash
npm run quality:mobile-coverage
```

Le périmètre mobile est `apps/mobile` hors tests, déclarations et vendor. Sa
baseline indépendante est `scripts/checks/coverage-mobile-baseline.json`,
ratifiée sur le SHA `5c0a7bde2193fe4ac88241bc0f06aa5bab6068c2` avec une mesure
vérifiée : statements `47.56 %` (`420/883`), branches `40.41 %` (`196/485`),
functions `47.89 %` (`114/238`) et lines `49.25 %` (`396/804`). Aucun
pourcentage mobile n'est
agrégé avec le web et le mobile ne possède pas de domaines web artificiels.
Une baisse mobile est donc comparée indépendamment sur les quatre métriques.
Comme pour le Web, elle est reportée mais ne bloque ni CI, ni FULL, ni le scan
SonarQube ; l'échec des tests, de la production du rapport ou de sa validation
reste bloquant.

### Rapports de couverture importés par SonarQube Cloud

Le workflow manuel `sonarqube-manual.yml` produit quatre rapports distincts
avant le scan : les LCOV Web et mobile générés par Vitest, le LCOV Node généré
par `c8` à partir de la suite `node:test` des répertoires `scripts/` et
`apps/web/scripts/`, et le rapport Cobertura XML de `coverage.py` pour
`maintenance/python/src` et `maintenance/python/scripts`. Les tests, fixtures
et fichiers de test sont exclus du périmètre Node ; les tests Python ne sont
pas une source instrumentée.

Les chemins déclarés dans `sonar-project.properties` restent la source
canonique. `scripts/checks/prepare-sonarqube-coverage.mjs` possède deux modes.
Le mode `STRICT`, utilisé par les producteurs, échoue si un rapport est
absent, vide, pointe vers un fichier inexistant, ne contient aucune mesure de
ligne, ou si les sources et métriques LCOV ne correspondent pas à leur résumé
JSON. Le même contrôle vérifie les classes et mesures du rapport Python.

Le workflow manuel sépare la préparation des couvertures du scan. Les quatre
producteurs sont indépendants et un échec reste publié comme `FAIL`. Un rapport
n'est téléversé que si son producteur et sa validation stricte ont réussi ; un
LCOV partiellement écrit après un échec n'est jamais récupéré. Le job d'analyse
utilise le mode `SONAR_PARTIAL` : chaque rapport candidat est revalidé, les
rapports absents ou invalides sont explicitement omis, et une configuration
temporaire est dérivée des seuls chemins importables. Le mode partiel ne
tolère donc jamais l'intégrité douteuse d'un rapport effectivement importé et
ne fabrique ni métrique nulle, ni fichier LCOV vide.

Les résultats indépendants sont affichés sous la forme :

```text
SONAR_ANALYSIS_STATUS: COMPLETE | FAILED | NOT_RUN
SONAR_COVERAGE_STATUS: COMPLETE | PARTIAL | UNAVAILABLE
SONAR_TESTS_STATUS: PASS | FAIL | NOT_RUN
SONAR_INTEGRITY_STATUS: PASS | FAIL | NOT_RUN
ANALYZED_SHA: <sha>
```

Pour chaque domaine, la preuve indique le producteur, le validateur,
l'import ou l'omission et sa raison. Une analyse `COMPLETE` avec
`SONAR_TESTS_STATUS: FAIL` prouve uniquement que le scanner a terminé ; elle
ne constitue pas une preuve de release verte. `SONAR_INTEGRITY_STATUS: PASS`
exige que chaque rapport importé soit validé et rattaché au même SHA et au
même `run_id`; un rapport absent, corrompu, malformé ou d'une autre
provenance est omis, documenté dans le manifeste et produit
`SONAR_INTEGRITY_STATUS: FAIL` lorsqu'une preuve de rapport était attendue.
Le scanner peut donc terminer avec une configuration partielle, mais la
finalisation échoue tant que l'intégrité attendue n'est pas prouvée. Les
artefacts sont nommés avec le `run_id` et rattachés au SHA exact du workflow.
Le manifeste final permet de retrouver le SHA réellement analysé et les
couvertures effectivement transmises. Une couverture partielle ne peut pas
devenir, sans qualification, une nouvelle référence comparable pour la
couverture globale SonarQube Cloud.

Les rapports locaux sont des artefacts ignorés (`apps/*/coverage/`,
`scripts/coverage/` et `maintenance/python/coverage.xml`). Ils décrivent la
couverture observée par la candidate exécutée, pas le nouveau score SonarQube
Cloud : seul un scan réel peut confirmer l'import et le score final. Les
fichiers exécutables non chargés par les tests restent présents dans le
rapport Node avec une couverture nulle lorsque `c8 --all` les découvre ; les
scripts opérationnels nécessitant des services externes, et les modules
Python hors des deux racines instrumentées, restent des limites de preuve
explicites.

## Suivi historique de croissance du dépôt

Le suivi de croissance est une mesure descriptive et reproductible ; il ne
crée ni seuil bloquant, ni baseline, ni commit automatique. La commande
canonique est :

```bash
npm run metrics:repository-growth -- --ref=HEAD --compare=<sha> --branch=main --months=12
```

Elle lit les arbres Git des refs par SHA, sans checkout, clone, worktree,
service externe ou mutation Git, et écrit uniquement les sorties régénérables
dans `artifacts/repository-growth/` : `repository-growth.json` et
`repository-growth.md`. `--compare` est optionnel et utilise sinon le parent
de la ref courante ; `--as-of=YYYY-MM-DD` permet de fixer explicitement
l'ancre historique. Une série mensuelle conserve la SHA exacte du dernier
commit first-parent de `main` atteint à la fin UTC de chaque mois complet. Un
mois sans commit accessible ou une histoire trop courte reste explicitement
`MISSING_HISTORY` ou `INSUFFICIENT_HISTORY` ; aucune estimation n'est ajoutée.

Les catégories sont exclusives et leur somme couvre toutes les entrées de
l'arbre Git : web runtime, mobile runtime, tests web, tests mobile, E2E/tests
de scripts, documentation, scripts/CI, SQL/migrations, données/configuration,
médias/binaires, vendored/generated/lockfiles, autre texte et sous-modules.
Les bytes sont les bytes bruts des blobs Git. Les lignes physiques comptent
chaque CRLF, LF ou CR isolé comme un séparateur, avec une dernière ligne pour
un blob non terminé ; un fichier vide compte zéro. Ce compteur n'est pas un
LOC exécutable.

Le rapport expose aussi le ratio de volume lignes tests/runtime. Ce ratio ne
mesure pas la couverture. Le nombre de fichiers au-dessus de REVIEW, HARD et
dans la zone préventive réutilise la politique `quality:top-heavy` existante.
Les historiques complexity, cycles, duplication et dead-code restent
`NOT_MEASURED` lorsqu'une preuve exacte par SHA n'est pas disponible ; une
baseline ou un résultat courant ne devient jamais une amélioration historique.

La commande est volontairement manuelle pour éviter un coût récurrent et ne
publie aucun commit de statistiques. Pour une comparaison entre deux refs,
vérifier les SHAs et conserver le JSON produit avec l'artefact de validation
du lot concerné si une preuve éphémère est nécessaire.

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

`checks:fast` reste ciblé pour les changements Web et mobile sans déclencher
automatiquement les ratchets structurels. `checks:full` et la CI FULL exécutent
la mesure exhaustive des deux roots. `quality:top-heavy` réutilise lui aussi les roots
`apps/web/src` et `apps/mobile` avec la même politique KIND ; il reste la
source canonique du ratchet de taille des fichiers et de ses seuils
`REVIEW_REQUIRED`/`HARD`.

Pour un lot de modularisation de routes API ou de services backend, valider
pendant DEVELOPMENT les contrats et tests directement concernés. En FULL,
répéter les ratchets structurels sur le candidat final :

```bash
npm run quality:complexity
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

### Complexité cognitive et maintenabilité locale

Le Quality Audit conserve les cinq moteurs de gate existants et ajoute le moteur
auxiliaire non bloquant `maintainability`, exécuté par `audit:quality -- all` ou
isolément par `quality:maintainability`. Il utilise `eslint-plugin-sonarjs`
`4.2.2` avec une sélection explicite de règles :

- `sonarjs/cognitive-complexity`, mesurée par fonction avec un seuil de règle
  technique `0` afin d'inventorier les valeurs positives ; la cible de
  référence `15` est informative tant qu'aucune dette actuelle n'a été
  mesurée et qualifiée ;
- `sonarjs/no-redundant-boolean` pour les littéraux booléens redondants ;
- `sonarjs/no-duplicated-branches` pour les branches identiques ;
- `sonarjs/no-collapsible-if` pour les `if` imbriqués fusionnables ;
- `sonarjs/nested-control-flow` avec une profondeur de référence `3`.

La configuration `recommended` SonarJS n'est pas activée. Les findings restent
informatifs et ne modifient pas les verdicts des cinq moteurs. Le rapport par
fichier sépare explicitement la complexité cyclomatique de `quality:complexity`,
la complexité cognitive, la longueur de fonction et les défauts locaux de
maintenabilité. Chaque mesure conserve fichier, fonction, position, règle,
valeur ou motif, cible éventuelle, gravité et relation avec les métriques
cyclomatiques/longueur lorsqu'elles sont disponibles. Un ratchet cognitif ou
local ne peut être défini qu'après mesure de la dette actuelle ; aucun seuil
bloquant universel ni ratification automatique des violations historiques
n'est créé par ce moteur.

Lorsqu'un ratchet de longueur de fonction ou de poids de fichier bloque un
contrôle `FULL` ou une vérification ciblée explicitement justifiée, la réparation validée
doit inclure une extraction substantielle vers un nouveau fichier portant une
responsabilité cohésive, avec migration des consommateurs et tests associés.
Une condensation, un reformatage ou une réduction artificielle destinée à
passer juste sous la limite ne constitue pas une correction acceptable. Si
aucune frontière sûre n'existe, le résultat est `BLOCKED` jusqu'à une décision
de modularisation ; il ne faut ni relever/abaisser la baseline, ni modifier le
seuil ou l'exclusion pour obtenir un succès.

### Sûreté typée et asynchrone

L'audit auxiliaire `type-safety` est lançable isolément par
`quality:type-safety` et est projeté dans `audit:quality -- all` après mesure
de son coût. Il réutilise `typescript-eslint` 8.71.2 et les `tsconfig` réels
des workspaces. Les familles sont séparées :

- `TYPE_SAFETY` : `no-unsafe-assignment`, `no-unsafe-member-access`,
  `no-unsafe-call`, `no-unsafe-return` et `no-explicit-any` seulement sur
  Mobile, où la configuration ESLint locale le désactive déjà ; Web conserve
  sa couverture ESLint existante pour `no-explicit-any` afin d'éviter un
  diagnostic équivalent ;
- `ASYNC_SAFETY` : `no-floating-promises` et `no-misused-promises` ; un
  `void Promise...` n'est accepté comme fire-and-forget que s'il porte une
  justification locale explicite.

Les rapports conservent le chemin canonique, la règle, la position, le
message, la sévérité, la fonction lorsque résolue, la provenance, la couverture
effective et le statut `HISTORICAL` ou `NEW_CANDIDATE_UNVERIFIED`. Les
directives TypeScript ou ESLint non justifiées sont inventoriées séparément ;
les exceptions documentées restent visibles. La mesure initiale ne crée pas de
baseline permissive ni de ratchet bloquant. Une version TypeScript hors de la
peer range déclarée par `typescript-eslint` est marquée
`UNSUPPORTED_CONFIGURATION`/`NOT_MEASURED`, jamais considérée comme couverte.

Le contrôle est non bloquant pour les cinq moteurs de gate historiques. Son
rapport reste cependant en attention lorsqu'une dette ou un diagnostic de
mesure est observé. Il ne modifie ni les contrats runtime, ni les types
publics, ni les contrôles Clerk/Supabase.

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

Les futurs lots dead-code visent indicativement la correction de 60 à 100
findings actionnables par lot, lorsque le périmètre et le risque le permettent.
Les `KEEP_JUSTIFIED` n'entrent pas dans cette cible. Ce volume reste un repère
de lot et ne remplace jamais la qualification individuelle, la vérification des
consommateurs ni la requalification explicite d'un finding devenu stale.

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
clone non qualifié (`NEW_CLONE_FINGERPRINTS > 0`) est bloquant pour le runtime et
les tests ; les fixtures/data restent strictes. Un fingerprint CURRENT nouveau
peut toutefois être qualifié dans `duplication-justifications.json` si ses deux
occurrences réelles sont relues et couvertes par la preuve ; cette qualification
ne modifie aucune baseline et le compteur `NEW_CLONE_FINGERPRINTS` est alors
calculé sur les fingerprints non qualifiés. Les clones déjà présents dans les
baselines natives restent historiques. Une réduction validée est acquise explicitement
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
fingerprint existe dans la baseline native ou dans le rapport CURRENT SARIF,
et que la preuve couvre les deux occurrences CURRENT ; une justification
disparue produit `STALE_KEEP_INTENTIONAL` ou `STALE_NO_ACTION_NOISE` et bloque.
Un fingerprint nouveau et non qualifié reste bloquant ; une qualification
explicite ne relève ni seuil, ni baseline, ni exclusion.

Dans la CI FULL, le step `quality:duplication` du job `web-quality` doit produire
sa preuve sur tout candidat concerné dès que le checkout, Node et `npm ci` ont
réussi et que le job n'est pas annulé. Il reste exécutable même lorsqu'un
ratchet structurel précédent du même job a échoué ; son propre échec reste
`FAIL` et doit faire échouer `web-quality`. Un environnement non préparé ou une
annulation produit `SKIPPED`, jamais une validation implicite. Un jscpd non
exécuté ne doit donc jamais être présenté comme `PASS` ou comme une preuve
acquise.

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
explicitement la version épinglée `1.6.12`, puis passe par l'audit observable
qui initialise l'index en mode `--index-only` et enregistre une preuve de
statut liée au même candidat. `quality:cycles` réutilise alors l'analyse et le
statut valides avant d'exécuter son propre rapport de cycles ; `.gitnexus/`
reste un état local ignoré :

```bash
npm run quality:cycles
```

Il exige un rapport complet et stable, plafonne les cycles historiques
identifiés et échoue sur tout nouveau cycle ou baseline obsolète. Ces gates,
comme `quality:duplication`, `quality:complexity`, `quality:dead-code` et
`quality:top-heavy`, sont obligatoires sur le candidat final en `FULL` et dans
la CI FULL ; ils ne sont pas déclenchés automatiquement en `DEVELOPMENT` par
une extraction, un module, un import ou un refactor. Toute modification du
code après leur exécution impose d'actualiser les preuves concernées.

### GitNexus ciblé pendant DEVELOPMENT

GitNexus est un accélérateur facultatif de découverte et d'analyse d'impact ;
il ne constitue ni une source de vérité, ni un remplacement de la lecture du
code, de TypeScript, des tests, des contrats métier ou de la documentation.
Pour une correction locale simple, ne pas l'imposer. Pour une modification
transversale, l'utiliser seulement lorsqu'il apporte une valeur concrète, avec
la séquence bornée suivante :

1. identifier la responsabilité, son owner canonique, les consommateurs et le
   SHA candidat ;
2. vérifier l'index utilisé : dépôt, `lastCommit`, version, configuration et
   fraîcheur par rapport au SHA candidat ;
3. si l'index est périmé, ne jamais interpréter une absence de résultat comme
   une absence de dépendance ; privilégier `rg`, les imports, les callers, les
   contrats et les tests actuels ;
4. interroger `query` pour retrouver les symboles ou les processus pertinents,
   puis `context` et `impact` uniquement sur les symboles retenus ; tenir
   compte des limites FTS et de l'absence éventuelle de recherche vectorielle ;
5. utiliser `trace` ou `detect_changes` seulement lorsque leur contrat et leur
   fonctionnement ont été vérifiés pour l'index courant ; leurs résultats
   restent des signaux à confronter au code réel ;
6. fixer le périmètre réel du changement après confrontation aux
   implémentations, consommateurs, tests et documentation.

La décision de fraîcheur est déterministe :

- `INDEX_CURRENT` : `lastCommit` est le SHA candidat, le runner et les
  métadonnées attendues sont compatibles, et aucun changement local ne rend
  l'arbre ambigu ; les requêtes contextuelles peuvent orienter l'analyse ;
- `INDEX_PARTIALLY_STALE` : le SHA indexé est celui du candidat mais des
  modifications locales existent ; le graphe ne sert qu'à orienter la recherche
  et toute relation pertinente doit être confirmée dans le code courant ;
- `INDEX_STALE` : le graphe vise un autre commit ou des métadonnées incompatibles
  ; une absence de consumer, d'impact ou de cycle ne peut jamais être conclue ;
- `INDEX_UNAVAILABLE` : index, runner ou MCP indisponible ; utiliser `rg`, Git,
  TypeScript et les tests ciblés sans bloquer `DEVELOPMENT` pour cette seule
  raison.

Un index `INDEX_STALE` ou `INDEX_PARTIALLY_STALE` ne déclenche pas `FULL` et ne
justifie pas une réindexation automatique. Une réindexation est une action
explicite, réservée à une analyse transversale importante ou au candidat final
stabilisé de `FULL`, après contrôle de la licence, des processus concurrents et
de la séparation staged/unstaged. Les états `INDEX_CURRENT` et les preuves
réutilisées doivent toujours appartenir au même candidat ; aucun `PASS` ne peut
provenir d'un autre SHA.

Une réindexation locale n'est jamais automatique avant un commit. Elle ne peut
être envisagée que pour une analyse importante, après séparation explicite des
changements staged/unstaged et vérification de l'absence de processus qui
pourrait rendre l'index ambigu ; la propreté n'est pas requise pour poursuivre
les autres validations. Elle ne doit jamais écraser, restaurer ou modifier les
fichiers staged ou unstaged préexistants.
Les cycles globaux restent contrôlés par `quality:cycles` en `FULL` ; aucune
requête GitNexus d'impact ne devient un contrôle bloquant de pré-commit ou de
pré-push.

#### Qualification d'usage GitNexus

L'intégration observée utilise GitNexus `1.6.12`, soumis à la licence
[PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0).
Pour le périmètre déclaré par le porteur du projet — projet étudiant à but non
lucratif consacré à la protection de l'environnement — l'usage courant est
qualifié `LICENSE_AUTHORIZED_FOR_CURRENT_USE`. La licence autorise les usages
non commerciaux et prévoit explicitement un usage permis par les établissements
éducatifs et les organisations de protection de l'environnement, quelle que
soit la source du financement ou les obligations qui en découlent.

Cette qualification est limitée à l'usage local de développement et d'analyse
décrit ici. Elle ne vaut pas autorisation commerciale générale et doit être
réévaluée si le projet, son opérateur, son financement ou sa finalité change.
La licence `AGPL-3.0-only` de CleanMyMap reste inchangée : elle ne couvre pas
GitNexus, mais il n'est pas nécessaire de modifier la licence du projet pour
utiliser cet outil tiers dans le périmètre autorisé. Aucun second index, hook,
plugin ou service n'est ajouté.

#### Mesure de valeur GitNexus

Une mesure comparative a été conduite sur `main` au SHA
`b0807967e7cf8516c3099621ffb86ebdf1bb7a7a`, sans `FULL`, sans modification de
fonctionnalité et sans rejouer artificiellement l'état historique des commits.
Les cas retenus sont des changements réels de l'historique :

| Cas | Commit étudié | Responsabilité | Méthode ordinaire | Résultat GitNexus vérifié par le code |
| --- | --- | --- | --- | --- |
| A | `2be248e545b8f70e189f971b797ab792aa3760af` | contrat cartographique `/api/actions/map`, DTO, cache, UI et tests | `0,435 s`; 17 fichiers modifiés; 10 fichiers contenant `fetchMapActions`, 13 l'URL de route et 9 `ActionMapResponse` | `NOT_DETECTED` pour la route et `buildMapActionsRouteResult`; aucun consommateur pertinent; route mapping absent |
| B | `e853005e4f70d0f3eac606d7d1a40d307b423c80` | extraction Chat serveur/client | `0,469 s`; 16 fichiers modifiés; 4 modules `route.post-*`, 19 fichiers avec `useChatShell` | `NOT_DETECTED` pour `POST`; 3 processus `SignalementMedia` hors sujet observés en faux positifs |
| C | `915df2d7592d3d15c804df6f9fb0cf2e0b404727` | migration RLS Supabase de `action_geometry_contributions` | `0,410 s`; 5 fichiers modifiés; 17 références de table, 2 références RPC et 3 références de policy | `NOT_DETECTED` pour `recordActionGeometryContribution`; 5 processus `POST` hors sujet observés en faux positifs |

Les temps ordinaires mesurent les commandes Git et `rg` de découverte, pas le
temps de lecture humaine. Les nombres de fichiers sont des ancres retournées
par les recherches, pas une prétention de mesurer les tokens ou le coût interne
de Codex. Les relations importantes ont été confirmées dans le code :

- A : `map-http.ts:423` définit `fetchMapActions`,
  `use-map-feed-data.ts:113` l'appelle, et `app/api/actions/map/route.ts:47`
  appelle `buildMapActionsRouteResult` ;
- B : `app/api/chat/route.post.ts:10-24` importe les quatre modules extraits,
  tandis que `components/chat/chat-shell.tsx:7-107` importe et appelle les
  hooks de shell ;
- C : `action-geometry-contribution-workflow.ts:3,114` utilise le propriétaire
  RPC défini dans `record-action-geometry-contribution.ts:61-65`, et la
  migration `20261003000010_optimize_action_geometry_contributions_rls.sql:4`
  modifie explicitement la policy service-only.

La première passe GitNexus a utilisé l'index `13476c59a44df4839155714b9871931b5cf54d6e`,
classé `INDEX_STALE` avec deux commits de retard. Une réindexation locale
explicitement déclenchée pour mesurer son coût a pris `132,2 s` de temps mur
(`44,9 s` annoncées par l'analyseur), pour `66 020` nœuds, `198 091` arêtes,
`1 507` communautés et `1 068` flux. Elle a rendu l'index courant sur
`b0807967…`, mais la construction FTS/BM25 a échoué sur
`Property.property_fts`, avec `embeddings: 0`, et la recherche textuelle a été
désactivée. Après cette opération, le transport MCP s'est fermé ; les appels
suivants sont donc `BLOCKED_ACCESS`, et non des preuves d'absence de relations.

Statuts de preuve :

- `CONFIRMED` : les relations décrites ci-dessus sont vérifiées par imports,
  appels, contrats ou migration dans le checkout courant ;
- `NOT_DETECTED` : GitNexus n'a pas retrouvé la relation ciblée ; avec FTS
  désactivé, un index fraîchement écrit mais un MCP indisponible, ce statut ne
  signifie pas « aucun consumer » ;
- `FALSE_POSITIVE` : les processus hors domaine listés dans B et C n'étaient
  pas liés aux fichiers des commits étudiés ;
- `NOT_COMPARABLE` : un graphe au HEAD ne rejoue pas les consommateurs tels
  qu'ils existaient avant ou après chacun des commits historiques ;
- aucun consommateur important n'a été trouvé uniquement par GitNexus dans
  cette mesure.

Décision : `AUDIT_ONLY`. Les outils ordinaires sont actuellement plus rapides,
plus explicables et plus fiables pour les trois catégories mesurées. GitNexus
reste disponible pour `FULL` et pour une analyse ciblée exceptionnelle lorsque
son index est `INDEX_CURRENT`, que le MCP et les métadonnées sont sains, et que
chaque relation est ensuite confirmée par le code. Cette mesure ne justifie ni
un usage généralisé en `DEVELOPMENT`, ni une réindexation avant chaque lot.

### Audits qualité et artefacts locaux

Le runner borné `scripts/audits/run-quality-audit.mjs` orchestre les engines
existants sans recopier leurs algorithmes :

```bash
npm run audit:quality -- dead-code
npm run audit:quality -- duplication
npm run audit:quality -- top-heavy
npm run audit:quality -- complexity
npm run audit:quality -- cycles
npm run audit:quality -- maintainability
npm run audit:quality -- type-safety
npm run audit:quality -- hotspots
npm run audit:quality -- testability
npm run audit:quality -- all
```

Les audits capturent immédiatement `auditedHead` et peuvent démarrer dans un
checkout dirty, avec des fichiers untracked, des commits locaux non publiés,
`HEAD != origin/main` ou un autre writer actif. Aucun de ces états ne bloque
le runner. `manifest.json` conserve notamment `baselineStable`, l’état dirty
initial, `worktreeChanged`, le statut de chaque engine et la provenance de
lecture : `COMMITTED_SNAPSHOT` pour un arbre Git immuable explicitement ciblé,
`WORKTREE_LIVE` pour le checkout courant. Une modification détectée pendant
l’exécution conserve les résultats mais les classe `INFORMATIVE` lorsque la
lecture live n’est plus reproductible ; les échecs restent `FAILURE`.

Les artefacts locaux régénérables sont écrits sous
`artifacts/quality-audits/<auditedHead>/` avec les noms plats
`<audit>--<runId>--manifest.json`, `<audit>--<runId>--report.json` et
`<audit>--<runId>--summary.md` : `manifest.json`
contient la baseline descriptive, la provenance et le statut, `report.json`
conserve le résultat brut de la gate et `summary.md` en est la projection
lisible. Le mode `all` ajoute le même triplet avec `audit=all`. Aucun
sous-dossier d’exécution ou de moteur n’est créé. Le `runId`, l’écriture
atomique et le même verrou de rétention coordonne l’enregistrement des
marqueurs avec l’inventaire, la migration et la suppression ; un démarrage ne
peut donc pas se glisser entre le dernier contrôle d’inactivité et une
suppression. Un marqueur dont l’owner du même hôte est démontré absent peut
être récupéré ; l’ancienneté seule ne suffit jamais et les owners ambigus ou
invérifiables sont préservés avec diagnostic. Après chaque audit, le runner classe les SHA par `generatedAt`, migre
les variantes legacy reconnues et conserve au plus les trois SHA les plus
récents hors exécutions actives. Les fichiers inconnus, liens symboliques,
collisions et archives sont préservés avec un diagnostic explicite. Le radar
exige les cinq manifestes et rapports du même `runId` et du même `auditedHead`,
en privilégiant le run complet, reproductible et le plus récent ; en l’absence
de preuve, il conserve `NOT_MEASURED`. Ces artefacts ne sont pas versionnés et
ne sont pas une source de
vérité ; les baselines, justifications et seuils des engines restent les
seules sources normatives. Une sortie `REPRODUCIBLE` locale ne remplace pas
une preuve `PUSH_CANDIDATE` ou FULL, et aucune baseline ou justification n’est
mise à jour automatiquement. `attentionRequired: false` signifie qu’aucun
delta top-heavy ni REVIEW non qualifié nécessitant une nouvelle analyse n’a
été observé, pas que la dette historique de fichiers volumineux est absente.

Les audits auxiliaires restent non bloquants et ne modifient pas les verdicts
des cinq gates historiques. `maintainability` distingue la complexité
cognitive, les défauts locaux et leurs relations avec la complexité
cyclomatique et la longueur de fonction. `type-safety` sépare
`TYPE_SAFETY` et `ASYNC_SAFETY`. `hotspots` mesure l'activité Git du SHA audité
sur une fenêtre de 180 jours, les changements substantiels à partir de 20
lignes et l'activité élevée à partir de 5 commits ; ces seuils sont
descriptifs, sans ratchet ni score global opaque. Il corrèle activité, dette
structurelle, métriques de taille/complexité et couplage architectural quand la
preuve existe, tandis que la récurrence multi-run reste `NOT_MEASURED` sans
série attribuable. `testability` réutilise uniquement les métriques de modules,
couvertures et rapports de mutation attribuables au SHA exact ; l'absence,
l'obsolescence ou la non-attribution d'une preuve reste `NOT_MEASURED` et aucun
runner de test n'est relancé par l'audit.

`audit:quality -- all` produit en plus, après les triplets des cinq gates et
des auxiliaires présents, puis le triplet agrégé, une projection non normative
dans le même SHA :
`quality-index--<runId>--index.json` et
`quality-index--<runId>--summary.md`, ainsi qu'un ZIP complet du run :
`quality-index--<runId>--bundle.zip`. Cette projection est une vue par fichier,
domaine et relation prouvée ; elle réutilise les résultats déjà calculés et la
fonction de corrélation du radar. Elle distingue `PRESENT`, `NONE`,
`NOT_MEASURED` et `NOT_APPLICABLE`, conserve les deux vues top-heavy (verdict
initial et réévaluation dérivée), et ne transforme pas une erreur de gate en
mesure nulle. Une projection ne peut pas modifier les rapports, manifestes,
baselines, justifications ou seuils. Si un run de développement est incomplet,
le runner conserve les gates et expose l'erreur de projection ; la projection
offline, elle, refuse tout run incomplet ou incohérent et exige l'identité
exacte du couple demandé, sans exiger artificiellement une reproductibilité
ou un `origin/main` égal au SHA audité.

Le mode `all` conserve aussi dans le rapport agrégé une dimension documentaire
non bloquante, calculée sur les fichiers Markdown et MDX suivis par Git du SHA
audité. Elle mesure les lignes, octets, titres, profondeur, sections, liens
internes et références invalides vérifiables, puis classe les documents selon
les marqueurs de cycle de vie explicitement présents (`CURRENT`, `PLAN`,
`AUDIT`, `HISTORY`, `SNAPSHOT`, `ADR`, `GENERATED`). Un statut absent reste
`NOT_STATED` ; aucune scission ou modification du document audité n'est
automatique. Les seuils documentaires expérimentaux sont `SURVEILLANCE` à
partir de 601 lignes, `REVIEW_REQUIRED` à partir de 1 001 et
`ARCHITECTURE_REVIEW` à partir de 1 501. Un run historique sans cette
dimension est projeté en `NOT_MEASURED`.

En mode `all`, l'index enrichit également chaque fichier et domaine avec le
graphe TypeScript canonique de `generate-architecture-import-graph.mjs`, lu sur
le SHA Git exact du run, et l'évaluation des frontières de
`check-architecture-import-boundary.mjs` avec la baseline correspondante. Les
relations conservent les chemins, formes, lignes, spécifieurs, domaines et
couches ; les fan-in/fan-out distinguent runtime, type-only et tests. Les
imports inter-domaines, traversées de couches, accès aux façades et imports
internes non résolus restent attribués aux fichiers concernés. La centralité
est informative : seuls les nouveaux ou réintroduits findings des règles de
frontière explicitement interdites sont bloquants dans cette projection. Une
erreur de construction du graphe ne modifie pas les cinq verdicts ni le ZIP ;
elle produit un état architectural `NOT_MEASURED` avec son diagnostic.

L'index sépare `auditCategories` (familles de contrôles),
`functionalDomains` (classifications issues d'une source canonique compatible
avec le SHA audité) et `candidateGroups` (relations prouvées par duplication ou
cycles). Les anciens rapports sans classification fonctionnelle portent
`functionalDomains.state: NOT_MEASURED` ; aucune appartenance métier n'est
déduite d'une proximité de chemin. Les vues top-heavy `INITIAL` et `DERIVED`
restent distinctes, et chaque finding dérivé est attribué au fichier avec sa
provenance et ses plafonds.

Pour projeter un run existant sans relancer de scanner :

```bash
npm run report:quality-index -- --offline --sha=<SHA> --run-id=<runId>
npm run report:quality-index -- --offline --sha=<SHA> --run-id=<runId> --bundle
```

Le mode `--offline` lit exclusivement les cinq rapports de gate, les rapports
auxiliaires présents (`maintainability`, `type-safety`, `hotspots`,
`testability`), leurs manifestes et
le rapport agrégé du couple exact `SHA/runId`. Il conserve la provenance
`COMMITTED_SNAPSHOT`, `WORKTREE_LIVE` ou `MIXED` et les limites de reproductibilité
du run ; il accepte donc un run informatif avec `origin/main` absent ou différent
et `reproducible: false`, sans le requalifier en preuve `COMMITTED_SNAPSHOT`.
Il ne relit pas le HEAD courant, ne recalcule aucune métrique et ne ratifie
aucune baseline. Il refuse uniquement les mélanges d'identité, de SHA, de
runId, de verdicts ou les rapports incomplets. Le `--bundle` écrit un ZIP dans le même dossier avec
les trente fichiers originaux d'un run complet et les deux projections, chemins plats
préservés, sans écraser un fichier existant. Les contrôles de rétention
reconnaissent ces trois artefacts de projection sans les confondre avec les
triplets des engines uniquement lorsqu'un manifeste `all` valide du même SHA
et du même `runId` les rattache au run : ils sont alors stockés dans le dossier
SHA et suivent la suppression atomique de ce SHA lorsqu'il sort des trois
versions conservées. Une projection orpheline, ou un rapport/résumé classique
sans manifeste correspondant, rend l'inventaire ambigu ; le SHA entier est
préservé, sans suppression partielle, avec le chemin de l'artefact dans le
diagnostic. Aucun ZIP système n'est stocké hors des dossiers SHA ; un éventuel
fichier extérieur ou artefact de nom inconnu reste préservé et diagnostiqué,
sans nettoyage implicite. Un verrou actif, un owner ambigu, une collision ou
une suppression incertaine conserve l'artefact et expose un diagnostic explicite
(`LOCK_ACTIVE`, `ACTIVE_MARKER_AMBIGUOUS_PRESERVED` ou `DELETE_FAILED`).

Le résultat du runner expose séparément `projectionStatus` et l'erreur exacte ;
la CLI affiche `QUALITY_AUDIT_PROJECTION_STATUS` et
`QUALITY_AUDIT_PROJECTION_ERROR` lorsque l'index ou le ZIP ne sont pas produits.

L’audit architectural ponctuel est distinct du radar top-heavy :

```bash
npm run audit:architecture
```

Il lit l’arbre Git du SHA audité et écrit un artefact local régénérable sous
`artifacts/architecture/<SHA>/architecture.json`. Son inventaire first-party
mesure les sources `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs` et `.cjs` de `apps/web`,
`apps/mobile` et `scripts`, avec une classification séparée des tests et des
fichiers générés. Les chemins `vendor` et tiers sont exclus de l’inventaire ;
les imports locaux vers ces chemins sont comptés séparément. Le graphe reste
une analyse statique des imports relatifs et alias : il ne prouve ni les
imports dynamiques, ni les consommateurs externes, ni les dépendances
indirectes.

La couverture Web n’est déclarée disponible par cet audit que si
`apps/web/coverage/coverage-evidence.json` passe le validateur canonique, si
son `gitHead`, sa configuration, son empreinte de candidat et son résumé
convergent vers le SHA audité, et si le worktree permet cette vérification. Un
résumé présent sur disque ne constitue pas seul une preuve fraîche. Pour le
mobile, l’absence actuelle de producteur de preuve dédié reste explicitement
`EVIDENCE_NOT_PRODUCED` et ne signifie ni couverture nulle ni mesure exécutée.
Les références historiques non rejouées sont `UNVERIFIABLE_HISTORICAL_REFERENCE`.

### Évidence compacte des gates de qualité

Le job CI `web-quality` écrit une projection JSON compacte après chaque gate,
dans `artifacts/quality-evidence/`. Cette projection est produite à partir du
résultat déjà calculé par le processus `quality:dead-code`,
`quality:complexity`, `quality:duplication` ou `quality:cycles` ; elle ne relance
ni Knip, ni ESLint, ni jscpd, ni GitNexus. Chaque fichier porte le
`candidateSha`, l'identité de baseline disponible, le statut `PASS`,
`PASS_WITH_GRACE` ou `FAIL`, les métriques et les compteurs de findings. Une
preuve manquante, invalide ou rattachée à un autre SHA est `NOT_RUN` dans le
Job Summary et ne devient jamais implicitement `PASS`.

Le dernier step de `web-quality` publie un tableau lisible dans le Job Summary
et conserve uniquement ces JSON compacts pendant trois jours. Les rapports
bruts temporaires de jscpd restent supprimés par leur owner et ne sont pas
publiés systématiquement. Les gates restent indépendants : la production de
l'évidence et du résumé ne neutralise jamais leur code de sortie bloquant.
