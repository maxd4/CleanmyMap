# Complexité, dead-code et mutation

> Module associé à [testing-quality.md](./testing-quality.md). Statut : ratchets.

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
  justification locale explicite et que l'opérateur `void` correspond à la
  plage exacte du diagnostic ; une expression voisine sur la même ligne ne
  peut pas le neutraliser.

Les rapports conservent le chemin canonique, la règle, la position, le
message, la sévérité, la fonction lorsque résolue, la provenance, la couverture
effective et le statut `HISTORICAL` ou `NEW_CANDIDATE_UNVERIFIED`. Les
directives TypeScript ou ESLint non justifiées sont inventoriées séparément ;
les exceptions documentées restent visibles. La mesure initiale ne crée pas de
baseline permissive ni de ratchet bloquant. Une version TypeScript hors de la
peer range déclarée par `typescript-eslint` est marquée
`UNSUPPORTED_CONFIGURATION`/`NOT_MEASURED`, jamais considérée comme couverte.

Chaque entrée `coverage` conserve aussi les chemins `scopedFilePaths`,
`measuredFilePaths`, `failedFilePaths` et `ignoredFilePaths`, ainsi que les
raisons de non-mesure par fichier (`PARSER_FAILED`, `ESLINT_IGNORED`,
`ESLINT_NOT_ANALYZED` ou `UNSUPPORTED_CONFIGURATION`). L'index par fichier peut ainsi distinguer un
fichier Mobile analysé sans finding (`NONE`) d'un fichier Web resté
`UNSUPPORTED_CONFIGURATION` (`NOT_MEASURED`) ou d'un fichier Mobile dont le
parser a échoué (`PARSER_FAILED`, jamais `NONE`), même lorsque le rapport
global reste en `MEASUREMENT_FAILED`. Un rapport historique qui ne contient
pas cet inventaire ne permet aucune déduction négative et reste
`NOT_MEASURED` par fichier. Les compteurs globaux sont conservés séparément.

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
