# Audits et preuves CI

> Module associé à [testing-quality.md](./testing-quality.md). Statut : `CURRENT` — provenance et preuves d'audit.

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
npm run audit:quality -- coverage
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
cyclomatique et la longueur de fonction. `type-safety` sépare strictement les
findings `TYPE_SAFETY` et `ASYNC_SAFETY`, sans double comptage dans l'index.
Une exception `fire-and-forget` exige à la fois une justification locale et
une expression AST commençant par `void`; le commentaire seul ne neutralise
pas une promesse flottante. Les suppressions ESLint justifiées sont reconnues
uniquement après extraction de leur justification explicite. `hotspots` mesure
l'activité Git du SHA audité
sur une fenêtre de 180 jours, les changements substantiels à partir de 20
lignes et l'activité élevée à partir de 5 commits ; ces seuils sont
descriptifs, sans ratchet ni score global opaque. Il corrèle activité, dette
structurelle, métriques de taille/complexité et couplage architectural quand la
preuve existe, tandis que la récurrence multi-run reste `NOT_MEASURED` sans
série attribuable. Le rapport sépare `trackedFilesExamined` (fichiers suivis
examinés), `filesReported` (lignes détaillées effectivement publiées),
`highActivityFiles`, `hotspotCandidates` et `structuralDebtFiles`. Une métrique
`functionLength` ne devient un signal de dette que si elle dépasse la cible
applicable de la politique de complexité ou si un finding `functionLength`
existe déjà. Sans rapports structurels exploitables, l'activité reste mesurée
mais la dette est `NOT_MEASURED`; `NONE` est réservé à une absence prouvée par
un ensemble complet de rapports exploitables. `testability` réutilise uniquement les métriques de modules,
couvertures et rapports de mutation attribuables au SHA exact ; l'absence,
l'obsolescence ou la non-attribution d'une preuve reste `NOT_MEASURED` et aucun
runner de test n'est relancé par l'audit.

`coverage` est une projection auxiliaire rapide et non bloquante : elle
réutilise les rapports existants Web, mobile, Node et Python après validation
en lecture seule, sans relancer Vitest, c8, pytest, Stryker ou les cinq
scanners. Elle conserve séparément `statements`, `branches`, `functions` et
`lines`, distingue `MEASURED`, `NOT_MEASURED`, `STALE_EVIDENCE`,
`EVIDENCE_UNVERIFIED` et `MEASUREMENT_FAILED`, et classe les branches LCOV
`BRDA` non couvertes par scope, fichier, ligne, bloc et branche. Cobertura est
agrégé à partir des conditions de branche réellement présentes ; aucune nature
de condition n'est inférée. Une alerte informative est émise strictement sous
80 % pour une métrique vérifiée et strictement au-dessus de 3 % pour la
duplication. Les valeurs exactes 80 % et 3 % restent propres ; aucun de ces
seuils ne modifie les verdicts, baselines, ratchets ou règles de publication
des cinq gates. Les rapports absents ou non attribuables produisent un
diagnostic de disponibilité, jamais une couverture à 0 %. Le rapport de
duplication est réutilisé quand il existe déjà dans le même run ; `jscpd` n'est
pas relancé.

`audit:quality -- all` produit en plus, après les triplets des cinq gates et
des auxiliaires présents, puis le triplet agrégé, une projection non normative
dans le même SHA :
`quality-index--<runId>--index.json` et
`quality-index--<runId>--summary.md`, ainsi qu'un ZIP complet du run :
`quality-index--<runId>--bundle.zip`. Cette projection est une vue par fichier,
domaine et relation prouvée ; elle réutilise les résultats déjà calculés et la
fonction de corrélation du radar. Elle distingue `PRESENT`, `NONE`,
`NOT_MEASURED`, `NOT_APPLICABLE` et `OUT_OF_INSTRUMENTATION`, conserve les deux vues top-heavy (verdict
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

Il ne faut pas confondre cette vue avec `audit:modularity` ou
`analyze:heavy-files` : ces deux rapports réutilisent le périmètre typé de
`quality:top-heavy` (`apps/web/src` et `apps/mobile`) et conservent des
sections distinctes pour runtime/data-config, tests et generated. `audit:architecture`
garde son inventaire élargi des sources `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs` et
`.cjs`, notamment sous `scripts`.

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
`PASS_WITH_GRACE`, `FAIL` ou `SKIPPED_BY_POLICY`, les métriques et les compteurs
de findings. Une
preuve manquante, invalide ou rattachée à un autre SHA est `NOT_RUN` dans le
Job Summary et ne devient jamais implicitement `PASS`.

Le dernier step de `web-quality` publie un tableau lisible dans le Job Summary
et conserve uniquement ces JSON compacts pendant trois jours. Les rapports
bruts temporaires de jscpd restent supprimés par leur owner et ne sont pas
publiés systématiquement. Les gates restent indépendants : la production de
l'évidence et du résumé ne neutralise jamais leur code de sortie bloquant.
