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
`src/components/actions/` pour la compatibilité des baselines. Dans le moteur
de risque, ce préfixe qualifie explicitement les composants du workflow métier
des actions ; cette qualification est une attribution de responsabilité par
préfixe, pas une preuve détaillée indépendante pour chaque fichier. Les règles
plus spécifiques et l'ordre de priorité restent la source de l'attribution
primaire.

Les propriétaires sensibles connus sont explicitement qualifiés dans le moteur,
notamment le fournisseur de jetons Clerk/Supabase, les contrats runtime Chat,
la gestion des rôles d'administration, le langage d'autorisation serveur, la
préparation métier SPOGOMI et la transition de modération. Les primitives
`src/lib/time/civil-date.ts` et `src/lib/time/utc-runtime.ts` relèvent du
métier ; le répertoire `src/lib/time/` n'est donc pas qualifié globalement en
UI. Les services communautaires de pagination et de lecture sont attribués à
`api-persistence`, tandis que la similarité relève de `business` selon leurs
responsabilités exécutées.

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

La photographie exhaustive la plus récente, générée depuis les rapports
validés et conservant les limites de provenance, est publiée dans l'[audit de
référence de couverture du 26 octobre 2026](../operations/audits/coverage-reference-2026-10-26.md),
avec sa [matrice structurée par fichier](../operations/audits/coverage-reference-2026-10-26.json).
Cet audit est un `SNAPSHOT` descriptif : il ne remplace ni cette politique, ni
les baselines, ni une décision d'activation `ENFORCE`.

Cette évolution incrémente l'empreinte de classification risque. Les rapports
Web existants deviennent donc incompatibles jusqu'à une nouvelle mesure fiable,
tandis que les baselines historiques et leurs domaines de compatibilité restent
inchangés ; aucune baseline n'est relevée ou remplacée par ce correctif.

### Classification P2-A — photographie du 27 octobre 2026

La campagne P2-A a rejoué le classificateur canonique sur les 2 326 fichiers
Web du snapshot `coverage-reference-2026-10-26.json`, dont 1 445 étaient
`unclassified`. Les owners démontrés par les matrices de traçabilité, les
contrats sécurité et les modules runtime ont été ajoutés dans l'ordre
`security > api-persistence > business > ui-presentational`. Le résultat de la
reclassification est :

| Famille primaire | Fichiers après reclassification | Origine principalement qualifiée |
| --- | ---: | --- |
| `security` | 356 | chat, notifications, identité/account, admin, analytics, observabilité et langage d'autorisation |
| `api-persistence` | 366 | services serveur, adapters externes, stores, modules de données et lecture des rapports communautaires |
| `business` | 1 439 | actions, gamification, learning, SPOGOMI, rapports, pilotage, rubriques métier, dates et similarité |
| `ui-presentational` | 165 | navigation, contenu, formatage, documentation et surfaces sans effet métier |
| `unclassified` | 0 | aucune décision résiduelle dans ce snapshot |

Les 1 445 fichiers initialement non classifiés reçoivent désormais une famille
primaire ; aucun fichier n'est supprimé du corpus instrumentable et aucun
fichier n'est compté dans deux familles. Les quatre décisions démontrées sont
`domain-language.ts` → `security`, `civil-date.ts` → `business`,
`report-events.ts` → `api-persistence` et `feedback-similarity.ts` →
`business`.

Cette reclassification change l'attribution et l'empreinte
(`3c341077b40b736da099a047d87ba85dc6f668c0444f6021a5d1307410574bcd`) ; elle
ne constitue pas un gain de couverture. Le snapshot historique du 26 octobre
reste inchangé. Une couverture Web complète doit être régénérée sur le SHA
exact du candidat après cette évolution de l'empreinte ; un rapport WORKTREE
ou antérieur à cette reclassification ne constitue pas cette preuve.

Les métriques globales Web, mobile, Node et Python restent des indicateurs de
suivi ; cette politique ne crée aucun objectif global obligatoire de 70 % ou
80 %, et ne remplace aucune baseline sans nouvelle mesure fiable ratifiée.
Pour Supabase SQL, RLS, RPC et triggers, la couverture Vitest de lignes n'est
pas une preuve : les invariants critiques exigent un `EXECUTED_DB_CONTRACT`
réel, conformément aux niveaux de preuve de `TESTING.md`. En l'absence de cette
exécution, le compte rendu doit conserver `DB_SEMANTICS_NOT_EXECUTED`.

## Exécution substantielle des macro-lots de couverture

Cette section s'applique à tout lot de couverture qui vise plusieurs fonctions,
routes, services, propriétaires runtime ou invariants métier. Elle ne transforme
pas une correction locale en campagne globale et ne s'applique pas à un simple
changement documentaire ou à une régression isolée sans objectif de couverture.

### Matrice d'acceptation obligatoire

Avant la première modification, le lot établit une matrice bornée, à partir du
`main` réellement inspecté, des instructions de dépôt applicables, des contrats `CURRENT`
et des tests existants. Pour chaque objectif ou invariant retenu, la matrice
contient au minimum :

| Champ | Contenu attendu |
| --- | --- |
| Objectif / invariant | propriété métier ou technique à démontrer |
| Owner runtime | fichier ou module canonique qui prend la décision |
| Preuve existante | tests, assertions et niveau de preuve réellement exécuté |
| Lacune | scénario absent, assertion trop faible ou branche non exercée |
| Risque | impact sécurité, données, métier, concurrence ou confidentialité |
| Validation | suite ciblée, mesure, contrat PostgreSQL ou autre preuve requise |

La présence d'un fichier de test ne vaut pas couverture comportementale : la
matrice examine les assertions, les effets observables et les chemins réellement
exécutés. Elle inclut, lorsque le contrat le requiert, les chemins positifs et
négatifs, l'identité ou le rôle insuffisant, la ressource étrangère, l'entrée
invalide, les erreurs de dépendance et de persistance, la reprise, le retry,
l'idempotence, la concurrence, les projections et l'absence d'effets indus.

### Règle d'exécution complète

Un défaut corrigé, une suite existante passée, un commit publié ou une mesure
ciblée ne clôturent pas à eux seuls un macro-lot. Après chaque correction, le
lot revient à sa matrice pour :

1. identifier les invariants et propriétaires encore non traités ;
2. compléter les tests des autres chemins directement concernés ;
3. exécuter les validations applicables et rattacher les résultats au candidat
   mesuré ;
4. mesurer à nouveau le même périmètre lorsque la couverture est un objectif ;
5. vérifier la `STOP CONDITION` globale avant tout verdict `terminé`.

Une publication intermédiaire peut être nécessaire pour isoler une correction,
mais elle est alors rapportée comme étape partielle et non comme clôture du
macro-lot.

### Tests à valeur métier

Chaque invariant retenu doit être protégé par des assertions sur le résultat,
les mutations, les effets secondaires et les données exposées. Les tests ne
doivent pas seulement vérifier la présence d'un helper, d'un mock, d'un client
privilégié ou d'un texte attendu. Les tests redondants, tautologiques ou ajoutés
uniquement pour augmenter le compteur sont interdits.

Pour une règle numérique, couvrir les limites pertinentes, notamment la valeur
nulle ou absente, zéro observé, valeur négative, dénominateur absent et valeurs
juste avant, sur et après le seuil lorsque ces états appartiennent au contrat.
Pour une mutation, vérifier aussi le refus, l'absence d'écriture privilégiée,
la reprise après erreur et l'idempotence lorsque ces propriétés sont requises.

### Mesure comparable et limites de preuve

Lorsqu'une mesure avant/après est demandée ou disponible, elle utilise le même
projet, le même périmètre, les mêmes exclusions, la même méthode et une
provenance explicite. Le rapport conserve le SHA exact et les quatre métriques
`covered / total` : statements, branches, functions et lines. Il distingue la
couverture ciblée de la couverture globale et liste les fichiers et branches
critiques encore insuffisamment exercés.

Il est interdit de modifier une baseline, un seuil, un dénominateur ou une
exclusion pour améliorer le résultat. Une mesure ciblée ne remplace pas une
mesure globale lorsque celle-ci fait partie de l'objectif. Rapportées
explicitement, les situations `NOT_MEASURED`, `NOT_RUN`, `BLOCKED_*`, `FAIL` et
`DB_SEMANTICS_NOT_EXECUTED` ne deviennent jamais un succès par défaut.

### Porte de clôture et livrable

Avant `VERDICT_REVIEW: terminé`, le compte rendu répond explicitement à ces
questions :

1. Tous les objectifs et propriétaires du périmètre ont-ils été traités ?
2. Quels nouveaux tests protègent chaque invariant retenu ?
3. Quelles branches critiques restent sans preuve ?
4. Quels fichiers runtime ont réellement gagné en couverture ?
5. Quels échecs sont préexistants, parallèles, introduits ou bloquants ?
6. Les validations et niveaux de preuve sont-ils correctement qualifiés ?
7. Le candidat publié et la convergence du `main` ont-ils été vérifiés ?

Si un objectif important ou une preuve indispensable reste non traité, le
verdict est `PARTIEL` ou `BLOQUÉ`, même si les tests exécutés sont verts et que
le commit est publié. Le livrable conserve au minimum :

- objectifs initiaux et matrice invariants → nouveaux tests ;
- fichiers modifiés et propriétaires couverts ;
- mesures avant/après comparables, ou diagnostic de leur indisponibilité ;
- commandes réellement exécutées et résultats ;
- échecs préexistants ou blocages ;
- invariants encore sans preuve ;
- commit, push et convergence du `main` lorsqu'ils sont demandés ;
- verdict final `TERMINÉ`, `PARTIEL` ou `BLOQUÉ`.

Cette porte de clôture reste proportionnée : elle n'impose ni `FULL`, ni une
quantité arbitraire de tests, ni une nouvelle abstraction de harness. Elle
interdit seulement de présenter un sous-ensemble validé comme l'achèvement
d'un objectif de couverture plus large.

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
La mesure produit également `apps/mobile/coverage/coverage-evidence.json` et
une preuve de publication mobile sous
`artifacts/coverage-publication/<SHA>/mobile/`. Cette preuve est liée au SHA
exact du candidat, à l'empreinte de configuration mobile, au résumé JSON et au
LCOV ; le gate vérifie ces éléments séparément du Web. Une preuve mobile d'un
autre candidat, un résumé ou LCOV modifié, une configuration divergente, une
mesure absente ou incomplète ne peut donc pas être réutilisée comme succès.
Les preuves valides du même candidat sont réutilisées sans relancer Vitest.
Comme pour le Web, la comparaison historique mobile reste reportée mais ne
bloque ni CI, ni FULL, ni le scan SonarQube ; l'échec des tests, de la
production du rapport ou de sa validation reste bloquant lorsqu'un périmètre
est activé.

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
canonique utilise le mode `SONAR_FULL` : les quatre producteurs, les quatre
validations, les rapports importables et leur provenance du même SHA/run sont
nécessaires avant d'autoriser le scanner. Le mode `SONAR_PARTIAL` reste
disponible pour un diagnostic indépendant, mais il n'autorise plus une nouvelle
publication sur le projet SonarQube canonique.

En mode `FULL` explicite de `ci.yml`, le garde-fou final attend les cinq jobs
`web-tests`, `web-coverage`, `mobile-validation`, `node-coverage` et
`python-validation` en état `success`. Il télécharge les preuves Web, mobile,
Node et Python du candidat, puis vérifie leur présence, leur structure, leur
SHA et leur provenance. Un job absent, `skipped`, annulé ou en échec, un rapport
manquant ou une provenance divergente font échouer le garde-fou ; aucune
couverture partielle n'est promue en couverture complète.

Les résultats indépendants sont affichés sous la forme :

```text
SONAR_ANALYSIS_STATUS: COMPLETE | FAILED | NOT_RUN
SONAR_COVERAGE_STATUS: COMPLETE | PARTIAL | UNAVAILABLE
SONAR_TESTS_STATUS: PASS | FAIL | NOT_RUN
SONAR_INTEGRITY_STATUS: PASS | FAIL | NOT_RUN
ANALYZED_SHA: <sha>
```

Pour chaque domaine, la preuve indique le producteur, le validateur,
l'import ou l'omission et sa raison. Une analyse `COMPLETE` avec une couverture
`PARTIAL`, des tests `FAIL` ou une intégrité `FAIL` est refusée par la
finalisation et ne constitue pas une publication canonique valide.
`SONAR_INTEGRITY_STATUS: PASS` exige que chaque rapport importé soit validé et
rattaché au même SHA et au même `run_id`; un rapport absent, corrompu, malformé
ou d'une autre provenance est omis, documenté dans le manifeste et empêche le
mode `SONAR_FULL`. Les artefacts sont nommés avec le `run_id` et rattachés au
SHA exact du workflow.
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
