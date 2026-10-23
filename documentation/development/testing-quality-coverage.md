# Couverture runtime et SonarQube

> Module associé à [testing-quality.md](./testing-quality.md). Statut : qualité.

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

Les étapes CI `Duplication ratchet` et `GitNexus cycle ratchet (skipped by
policy)` restent exécutées avec `continue-on-error: true` afin de conserver
leurs logs et preuves même lorsqu'une gate échoue. Le step final de résumé
valide ensuite chaque preuve : `PASS` et `PASS_WITH_GRACE` doivent être
rattachés au candidat courant et à une baseline ancêtre ; le cycle
`SKIPPED_BY_POLICY` est accepté uniquement comme suspension explicite et ne
contribue jamais à un score `PASS`. Un `FAIL`, une baseline obsolète, une
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
