# Couverture runtime et SonarQube

> Module associé à [testing-quality.md](./testing-quality.md). Statut : `CURRENT` — qualité et couverture.

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

## Politique de couverture fondée sur le risque — cibles futures

La politique canonique définit les familles de risque et leurs objectifs
futurs dans `scripts/checks/coverage-policy.mjs`. Ces valeurs décrivent une
cible de conception ; elles ne sont pas des résultats observés et ne sont pas
encore utilisées comme seuils bloquants par `quality:coverage`.

| Famille primaire | Instructions / lignes | Branches | Fonctions |
| --- | ---: | ---: | ---: |
| Sécurité, AuthN/AuthZ, validations sensibles (`security`) | 90 % | 85 % | 90 % |
| Métier, environnement, géométrie, calculs (`business`) | 85 % | 80 % | 85 % |
| API et persistance applicative sensibles (`api-persistence`) | 85 % | 80 % | 85 % |
| UI purement présentative (`ui-presentational`) | aucun minimum uniforme | aucun minimum | aucun minimum |
| Nouveau code non critique (`new-code-non-critical`) | minimum 80 % des lignes modifiées, cible 90 % | selon le risque | selon le risque |
| Risque non encore qualifié (`unclassified`) | aucune conformité annoncée | aucune conformité annoncée | aucune conformité annoncée |

L'implémentation attribue chaque fichier Web instrumentable à un owner primaire
déterministe : sécurité d'abord, puis API/persistance, métier, UI explicitement
présentative, les chemins explicitement qualifiés non critiques, ou
`unclassified` lorsque la qualification manque. Les règles sont ordonnées dans
le moteur unique ; un fichier peut correspondre à plusieurs préfixes
historiques, mais une seule famille de risque reçoit ses métriques.
Les routes `src/app/api/**` restent donc dans la mesure et sont attribuées à
`api-persistence`, sauf les routes d'account qui relèvent prioritairement de la
sécurité. La projection historique `persistence` conserve son préfixe API pour
ne pas invalider la baseline actuelle ; elle reste une vue informative de
compatibilité et ne doit pas être additionnée aux familles de risque.
La vue historique `actions` peut conserver son préfixe large
`src/components/actions/` pour la compatibilité des baselines ; ce préfixe ne
gouverne plus l'attribution primaire ni les seuils de risque.

Les propriétaires sensibles connus sont explicitement qualifiés dans le moteur,
notamment le fournisseur de jetons Clerk/Supabase, les contrats runtime Chat,
la gestion des rôles d'administration, la préparation métier SPOGOMI et la
transition de modération. Le préfixe large `src/components/actions/` n'est
plus assimilé au métier : seuls les sous-chemins de calcul ou de préparation
explicitement identifiés le sont ; les autres restent à qualifier.

Les fichiers instrumentables non reconnus par une règle explicite sont
comptabilisés dans `unclassified`, avec une attribution
`requires-risk-qualification`. Ils restent présents dans les métriques et les
diagnostics, mais ne reçoivent jamais par défaut le seuil
`new-code-non-critical`. Une ligne modifiée non qualifiée conserve son ratio
LCOV et son fichier dans le rapport, mais produit
`RISK_CLASSIFICATION_REQUIRED` au lieu d'une mesure de conformité. Si un
domaine est `ENFORCE`, la présence d'un fichier non qualifié est bloquante ;
elle ne peut pas abaisser silencieusement le seuil actif. Les chemins réellement
non critiques doivent être ajoutés explicitement aux règles après qualification.
Les fichiers non instrumentables restent documentés par le périmètre technique
existant : tests et `__tests__`, déclarations `.d.ts`, fichiers générés, points
d'entrée App Router (`page`, `layout`, `loading`, `error`, `not-found`,
`robots`, `sitemap`, `template`, `default`) et fichiers de types purs
explicitement listés. Un fichier n'est jamais exclu pour cause de faible
couverture.

Cette évolution incrémente l'empreinte de classification risque. Les rapports
Web existants deviennent donc incompatibles jusqu'à une nouvelle mesure fiable,
tandis que les baselines historiques et leurs domaines de compatibilité restent
inchangés ; aucune baseline n'est relevée ou remplacée par ce correctif.

Les métriques globales Web, mobile, Node et Python restent des indicateurs de
suivi ; cette politique ne crée aucun objectif global obligatoire de 70 % ou
80 %, et ne remplace aucune baseline sans nouvelle mesure fiable ratifiée.
Pour Supabase SQL, RLS, RPC et triggers, la couverture Vitest de lignes n'est
pas une preuve : les invariants critiques exigent un `EXECUTED_DB_CONTRACT`
réel, conformément aux niveaux de preuve de `TESTING.md`. En l'absence de cette
exécution, le compte rendu doit conserver `DB_SEMANTICS_NOT_EXECUTED`.

### Garde progressive et activation explicite

Le moteur unique porte aussi `COVERAGE_ENFORCEMENT_POLICY`, versionné dans
`scripts/checks/coverage-policy.mjs`. Chaque périmètre possède un état explicite
:

- `OBSERVE` mesure, expose les quatre ratios exacts `covered / total` et
  chiffre l'écart à l'objectif ; il ne constitue pas une conformité et ne fait
  pas échouer la commande ;
- `ENFORCE` n'est applicable qu'après une modification explicite de la
  politique. Son entrée doit conserver sa `policyVersion` et une activation
  portant une version et le SHA complet du commit source. Une activation
  incomplète ou non versionnée est invalide.

Pour un périmètre `ENFORCE`, le résumé courant doit être lisible, valide,
complet et cohérent avec son périmètre instrumenté et sa politique. Un rapport
absent, invalide, obsolète, incomplet, rattaché à un autre candidat ou une
classification incompatible produit un échec ; aucune baseline ni exclusion
ne peut être ajustée automatiquement pour retrouver un succès. La comparaison
historique conserve ses statuts de compatibilité (`PASS`, `PASS_WITH_GRACE`,
`INFORMATIVE_REGRESSION`, `UNAVAILABLE`), mais son statut informatif ne
neutralise jamais `COVERAGE_ENFORCEMENT_STATUS: FAIL`. Toute mesure obligatoire
`NOT_MEASURED`, une comparaison obligatoire `UNAVAILABLE` ou une preuve absente
fait échouer le périmètre `ENFORCE` ; `NOT_MEASURED` n'est jamais un succès dans
cet état. La commande retourne alors un code non nul. Une activation sans seuil
numérique et mesure effectivement implémentée est refusée ; Node et Python
restent donc `OBSERVE`. Tant que les objectifs actuels ne sont pas ratifiés et
atteints, les familles restent `OBSERVE`.

Web et mobile sont contrôlés séparément. Les rapports Node (`scripts/coverage/`)
et Python (`maintenance/python/coverage.xml`) restent des producteurs distincts
suivis séparément ; le moteur ne fabrique pas de couverture monorepo agrégée.
Les invariants Supabase SQL, RLS, RPC et triggers continuent d'exiger des tests
PostgreSQL exécutés, et non une couverture Vitest de lignes.

### Preuve de publication et rattachement au candidat

La publication Codex et le pré-push utilisent le même contrôle
`scripts/ci/coverage-publication.mjs`. Il ne mesure pas une seconde fois la
couverture : il vérifie la preuve produite par le rapport, son empreinte de
fichiers, le hash du résumé et du LCOV, la configuration lue dans l'arbre Git
du candidat et le SHA complet du candidat. La validation canonique est
également appliquée aux rapports Web matérialisés dans l'artefact de
publication ; une simple empreinte de manifeste ne suffit donc pas. Une preuve `WORKTREE` n'est acceptée
que si `HEAD`, `refs/heads/main` et le worktree sont cohérents ; une preuve
`DYNAMIC_CANDIDATE` provient de l'arbre Git éphémère exact. Une preuve absente,
illisible, falsifiée, périmée ou rattachée à un autre SHA échoue lorsqu'un
domaine est `ENFORCE`.

Les preuves sont écrites sous `artifacts/coverage-publication/<SHA>/<scope>/`
et restent ignorées par Git. Elles sont réutilisées pour le même SHA et le
même périmètre ; elles ne changent jamais automatiquement une baseline, une
classification ou une exclusion. Les changements documentaires seuls, y
compris un Markdown sous `apps/web/`, n'exigent aucune suite de couverture.
Les changements Web instrumentables et les changements techniques qui peuvent
modifier la politique, le classificateur, l'instrumentation, le ciblage ou le
gate produisent ou vérifient la preuve Web lorsqu'une activation Web est
concernée. Les changements Web, mobile, scripts/Node et Python produisent
chacun leur rapport séparé lorsque leur périmètre est concerné ; SQL reste
réservé à la preuve PostgreSQL du lot suivant.

Dans GitHub Actions, `web-tests` téléverse les rapports Web et la preuve de
publication dans une archive commune ; `web-coverage` la télécharge à la
racine du checkout afin de restaurer simultanément
`apps/web/coverage/**` et `artifacts/coverage-publication/**`. Il vérifie ces
emplacements avant d'exécuter `quality:coverage`. Un changement de la
politique ou du gate ne peut donc pas être utilisé pour éviter le contrôle
actif par absence de fichier `apps/web/**`.

Le flux durable est donc : changement exécutable → tests adaptés → rapport de
couverture → correction d'une violation → validation → commit/push. `OBSERVE`
reste un diagnostic chiffré ; il ne peut pas être présenté comme une
conformité. `ENFORCE` est bloquant avant l'envoi normal. La CI post-push vérifie
le SHA publié et publie ses artefacts, mais ne peut pas empêcher
rétroactivement un push ; une garantie serveur exige une protection GitHub
appropriée activée séparément.

La couverture des lignes ajoutées ou modifiées est préparée par la combinaison
d'un diff Git et du LCOV du même candidat :

```bash
node scripts/checks/check-coverage.mjs --base-ref=<commit-ou-ref> --current-ref=<commit-ou-ref>
```

La base Git est obligatoire et doit être une révision vérifiable ; elle n'est
jamais devinée. Sans base, sans ligne instrumentable ou sans mesure LCOV
complète, le résultat est `COVERAGE_CHANGED_LINES_STATUS: NOT_MEASURED`, et non
`0 %`. Une ligne LCOV avec `DA:<ligne>,0` est au contraire une mesure réelle à
`0 %`. Les lignes non critiques visent 80 % minimum et 90 % en cible ; les
lignes critiques visent 90 %. Une ligne `unclassified` reste `NOT_MEASURED`
pour la conformité jusqu'à sa qualification explicite. Les commentaires,
accolades et déclarations TypeScript non exécutables absents du LCOV sont
exclus du dénominateur seulement lorsque la source du candidat permet de les
identifier ; une ligne exécutable absente reste une mesure incomplète. Le
ratio `covered / total` est comparé sans arrondi ; l'arrondi est réservé à
l'affichage. Cette méthode reste `OBSERVE` tant que son coût, sa reproductibilité
et son rattachement au candidat n'ont pas été ratifiés.

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

Le même ratchet historique est calculé pour les domaines mesurables
`auth-authz`, `actions`, `formalities`, `route-calculs` et `persistence`. Leurs
valeurs de départ et leurs chemins sont dans la baseline ; elles ne constituent
pas des objectifs historiques inventés ni les nouvelles familles de risque.
Les marges sont de `0.25` point pour
`auth-authz` et de `0.75` point pour chacun des quatre autres domaines, avec la
même règle d'unité mesurée. Une petite baisse bornée est reportée avec
`COVERAGE_GRACE <scope>.<metric>` et le statut `PASS_WITH_GRACE` ; elle ne
modifie jamais la baseline. Une baisse au-delà de l'enveloppe conserve tous ses
détails dans le rapport et le statut `INFORMATIVE_REGRESSION`, mais reste
non bloquante. Une baseline absente, malformée ou obsolète rend la comparaison
historique `UNAVAILABLE` sans invalider une mesure courante correctement
produite en `OBSERVE`. En `ENFORCE`, cette mesure historique obligatoire reste
un échec fail-closed. En revanche, un résumé courant invalide, une preuve obligatoire
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
