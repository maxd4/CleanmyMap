# Testing Guide

Guide canonique de validation du dépôt CleanMyMap.

## Principe

Une commande ne doit jamais être présentée comme « globale » si elle ne couvre qu'une partie du dépôt.

Le workflow CleanMyMap distingue trois modes de validation : `DEVELOPMENT`,
`FULL` et `RELEASE`. Les tests spécialisés restent des briques appelables
séparément, pas des modes supplémentaires.

Les quality/security gates distinguent `PASS` (aucune anomalie bloquante ni
avertissement), `PASS_WITH_WARNINGS` (contrôle exécuté, avertissements visibles
et motivés, sans anomalie bloquante), `FAIL` (violation démontrée) et `BLOCKED`
(contrôle impossible ou preuve indisponible). Un avertissement reste présent
dans le JSON de preuve et les résumés CI ; il ne devient jamais un succès
silencieux. `BLOCKED` n'est ni exécuté avec succès ni accepté comme passage.
Les défauts secondaires documentaires peuvent avertir ; les violations de
gouvernance canonique, secrets, migrations, skills ou données privées restent
bloquantes selon le contrat spécialisé.

## Attribution, scopes et preuves de livraison

Au démarrage, chaque exécution capture sa référence initiale (`HEAD`,
`origin/main`, index, chemins tracked dirty et untracked) et l'allowlist de ses
fichiers attribués. Référence et périmètre restent gelés jusqu'à la clôture.
Un worktree dirty n'arrête pas les opérations indépendantes. Chaque commit
contient uniquement les changements explicitement attribués et validés pour
son lot ; les changements étrangers staged, unstaged ou untracked sont
préservés et exclus. Plusieurs lots ne partagent un commit qu'avec attribution
et validation explicites pour chacun. Une écriture concurrente sur le même
chemin est une collision à préserver et signaler ; elle bloque seulement les
opérations dépendant de ce chemin.

Une évolution ultérieure de `HEAD`, `origin/main`, de l'index ou du worktree ne
déclenche ni extension de périmètre, ni resynchronisation fonctionnelle, ni
rejeu de preuve, ni nouvelle validation globale. Les validations globales
utilisent les candidats immuables des mécanismes existants dans `scripts/ci`
(arbre statique par SHA ou `DYNAMIC_CANDIDATE`). Une preuve issue du worktree
mutable ne peut être attribuée à un SHA. Le rapport conserve tout échec observé
sur le candidat vérifié : corriger uniquement les causes attribuables au lot,
et signaler séparément les défauts préexistants ou étrangers.

Les règles universelles R01–R12 ont une source unique dans la gouvernance
racine. Le
périmètre d'un commit (lot courant attribué) est distinct du périmètre d'un push
(tous les commits locaux validés en avance sur `origin/main`, quel que soit
leur writer). L'attribution de publication couvre explicitement les lots de
tous ces commits ; elle ne se déduit jamais de la seule présence au démarrage.
Avant chaque décision de publication, fetcher puis vérifier la divergence ;
si aucun commit n'est en avance, constater la convergence sans lancer de push.
La clôture suit validation du candidat exact, commit attribué, push des commits
validés en avance et vérification post-fetch de la convergence. Les hooks,
contrôles de sécurité, protections et fast-forward ne sont pas contournables.

Les provenances sont distinctes et doivent être affichées : `WORKTREE_LIVE`
pour le checkout mouvant, `STAGED` pour l'index exact, `COMMITTED_SNAPSHOT`
pour un arbre Git immuable identifié par SHA, et `PUSH_CANDIDATE` pour les refs
réellement transmises au push. Une mesure `WORKTREE_LIVE` est informative si
le checkout évolue et ne constitue jamais une preuve reproductible d'un SHA.
Les exigences de candidat exact pour `FULL`, SonarQube, les releases et le push
restent obligatoires au moment de leur opération ; elles ne bloquent pas les
diagnostics locaux.

Les états `COMMIT_READY`, `PUSH_READY`, `PUBLISHED`, `INTEGRATION_VALIDATED`,
`RELEASE_READY` et `COMPLETED` ont des préconditions distinctes définies en
R03. Les scopes ci-dessus décrivent la provenance d'une preuve, pas l'état de
livraison. `PUBLISHED` exige un push conforme; un bypass est recevable uniquement
pour l'update explicitement autorisé par le ruleset à l'identité courante, puis
un fetch qui prouve la convergence de `HEAD` et `origin/main`; il ne signifie ni intégration
runtime, ni release, ni réception finale. Un statut `BLOCKED` contient le
contrôle exécuté, son résultat, sa cause, le périmètre et l'action requise
(R05). Une exigence impossible à mesurer est `NOT_RUN` ou `BLOCKED`, jamais
`PASS`.

## Niveau de preuve et contrats exécutés

Toujours distinguer :

```text
présence textuelle
≠ structure statique
≠ comportement exécuté
≠ propriété métier ou d'intégration démontrée
```

Chaque campagne choisit ses validations selon les risques réels (et non selon
leur facilité ou rapidité), exécute les chemins de production concernés,
contrôle la fidélité des fixtures, assertions, scénarios négatifs et résultats
persistants (y compris l'absence d'effets interdits), et distingue explicitement
les preuves exécutées, réussies, manquantes et encore en cours. Les tests
mockés et le `typecheck` ne remplacent jamais les preuves PostgreSQL, RLS,
transactions, triggers ou concurrence lorsque le risque l'exige.

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

Pour un lot touchant un invariant transactionnel ou RLS, la preuve est planifiée
**avant le premier prompt** : scénarios positifs et négatifs, permissions,
reprise, conflits et concurrence pertinents. Préférer l'environnement PostgreSQL
éphémère déjà autorisé par les workflows du dépôt lorsqu'il peut réellement
exécuter ces scénarios, en vérifiant ses déclencheurs et secrets requis.
La présence d'un workflow, sa configuration ou un `db push --dry-run` ne prouve
pas l'exécution de ces scénarios sur le SHA candidat. En cas d'indisponibilité,
conserver `DB_SEMANTICS_NOT_EXECUTED` et traiter explicitement la limite de
preuve dans la décision de clôture, sans déployer ni appliquer une migration
distante implicitement.

### Validation syntaxique SQL avant Git

Les fichiers SQL modifiés sous `apps/web/supabase/migrations/`,
`apps/web/supabase/tests/` et `e2e/` passent le contrôle déterministe :

```bash
node scripts/ci/validate-sql-syntax.mjs --staged
node scripts/ci/validate-sql-syntax.mjs --ref=<sha> --changed-file=<path.sql>
```

Le contrôle utilise `pg-query-emscripten` (port WASM de `libpg_query`) pour
parser les instructions multiples, les dollar-quotes, les CTE et les
définitions de fonctions PostgreSQL. Il rapporte le fichier, la ligne, la
colonne et l'erreur du parseur. Il inspecte en plus l'AST pour refuser un CTE
modificateur (`INSERT`, `UPDATE`, `DELETE` ou `MERGE`) imbriqué dans une
expression ou une sous-requête : PostgreSQL n'autorise ce CTE qu'au niveau de
l'instruction top-level. Les commandes méta `psql` (`\\copy`, `\\i`, etc.) ne
font pas partie du langage SQL et sont hors de ce contrôle ; les corps
PL/pgSQL dollar-quotés sont validés comme syntaxe de leur instruction
`CREATE FUNCTION`, tandis que leur sémantique et leur exécution restent une
preuve PostgreSQL.

Le pre-commit lit uniquement l'index staged et sélectionne les contrôles selon
les fichiers stagés (tout en conservant systématiquement sentinelles canoniques,
audit des secrets et `git diff --cached --check`). Le pre-push et la CI lisent
l'arbre du SHA candidat et seulement les fichiers SQL modifiés dans sa plage.
Un résultat `PASS` est donc un `STATIC_CONTRACT` de syntaxe/structure, pas un
`EXECUTED_DB_CONTRACT`. La suite pgTAP complète reste exécutée par la lane
PostgreSQL éphémère après replay des migrations ; ce garde ne la remplace pas.

La preuve PostgreSQL des contrats SQL existants est produite par la lane
Supabase éphémère hébergée `.github/workflows/supabase-sql-proof.yml`, après
rejeu des migrations canoniques et du seed (indépendamment de `.github/workflows/e2e-supabase.yml`
et du backup/restore). Le runner
`scripts/ci/run-supabase-sql-proof.mjs` inventorie et trace séparément les
fichiers pgTAP, les scripts SQL contractuels et les scénarios multi-sessions
existants. Il exige un plan pgTAP complet ou un marqueur de fin contractuel ;
un fichier présent, une commande interrompue ou une sortie incomplète ne
produit jamais `INTEGRATION_PROOF`. Pour les preuves nécessaires à une
application sensible, la validité repose sur les empreintes exactes (SHA-256)
des migrations, tests, dépendances et contrats SQL pertinents : un commit
indépendant sur `main` n'invalide pas une preuve dont toutes les entrées
restent identiques. Les migrations ordinaires compatibles appliquées par la
CLI Supabase liée ne sont pas bloquées par le succès préalable d'un replay
intégral.

En cas d'échec, l'artefact public conserve le chemin de la suite, sa catégorie,
la phase `PROOF_PHASE` (ou `PERSONAL_AI_PHASE`) et le SQLSTATE observé. Pour
pgTAP, seuls les numéros des assertions `not ok` sont conservés dans
`failedAssertions` ; les libellés TAP ne sont pas publiés. Un test peut aussi fournir un
nom de contrainte `PROOF_CONSTRAINT`, un code d'erreur allowlisté
`PROOF_ERROR_CODE` ou le nom de routine `PROOF_ROUTINE` pour isoler une
violation. Le runner ne conserve que ces champs structurés et des extraits
assainis, sans les sorties SQL brutes ni la stack trace.

Pour pgTAP, le runner accepte deux formats réellement produits par la commande
`supabase test db` : le flux TAP détaillé lorsqu'il est disponible, et le
résumé `pg_prove` (`Files=1`, `Tests=N`, `Result: PASS`) pour un fichier unique.
Dans les deux cas, `N` doit correspondre au `plan(N)` du SQL source. Le rapport
conserve `verificationMode` (`tap-detailed` ou `pg-prove-summary`) et ne
fabrique jamais de lignes `ok` à partir d'un résumé. Un résultat absent,
contradictoire, incomplet, échoué ou multi-fichiers reste un échec de preuve.

Le runner bloque toute preuve SQL destructive tant que les deux marqueurs
d'autorisation explicite de l'environnement éphémère ne sont pas présents :
`CMM_SUPABASE_TEST_ENVIRONMENT=ephemeral` et
`CMM_SUPABASE_EPHEMERAL_TEST_AUTHORIZATION=I_UNDERSTAND_EPHEMERAL_ONLY`.
Lorsqu'une URL est fournie, elle doit être locale (`localhost` ou `127.0.0.1`).
Une URL Supabase liée ou de production, même accompagnée d'identifiants
disponibles, est refusée ; un test local de calcul ou de conversion doit rester
unitaire, mocké ou fixture et ne devient pas une écriture métier réelle.

Le rapport porte le SHA exact du checkout CI et distingue
`INTEGRATION_PROOF` (exécution PostgreSQL observée), `NOT_RUN` (preuve non
atteinte ou volontairement non déclenchée) et `DB_SEMANTICS_NOT_EXECUTED`
(protocole absent ou environnement incapable d'exécuter la sémantique DB).
Une nouvelle extension `.sql` non enregistrée fait échouer le runner plutôt
que de devenir silencieusement une preuve. Les contrats non pgTAP ne sont pas
convertis en pgTAP : chacun conserve son protocole, et les scénarios de
concurrence restent exécutés par leurs scripts multi-sessions existants.
Le même artefact consigne aussi les étapes `bootstrap`, `dbReset`, `migrations`,
`seed`, `schemaSeedValidation` et `sqlProofRunner` avec les statuts `PASS`, `FAIL`, `NOT_RUN` ou
`INCONCLUSIVE`. L'absence d'une étape réussie invalide cette attestation
éphémère pour les migrations sensibles qui en dépendent, même si les
enregistrements pgTAP ou SQL restants paraissent valides. Les sorties CLI
complètes restent dans des journaux privés bornés ; seuls une catégorie, un
SQLSTATE observé et une provenance démontrée peuvent être publiés. Un numéro
de plan/assertion TAP n'est jamais traité comme une ligne SQL. Le runbook de
convergence décrit la procédure CLI liée et les diagnostics par étape.

## Gouvernance des preuves pour les changements sensibles

Avant toute modification substantielle ou sensible, le lot doit identifier
les contrats métier et techniques effectivement touchés, distinguer les
exigences issues des sources canoniques des comportements seulement déduits
du code, puis prévoir des scénarios positifs, négatifs et de limite adaptés à
ces contrats. Un test structurel, mocké ou textuel peut protéger une
propriété de source ; il ne devient pas une preuve d'AuthZ, de RLS, de
transaction, de concurrence ou de service externe exécuté.

Le résultat doit séparer explicitement :

- l'absence de preuve (`HOOK_NOT_AVAILABLE`, `NOT_RUN`, `NOT_MEASURED` ou un `BLOCKED_*` explicite) ;
- l'échec d'une preuve (`FAIL`) ;
- le comportement effectivement validé (`PASS` avec sa provenance).

Un contrôle absent ou indisponible (`HOOK_NOT_AVAILABLE`, `NOT_RUN`,
`NOT_MEASURED`) n'est jamais assimilé à un `PASS`. En particulier, pour une
contribution documentaire ou un candidat d'intégration (`CANDIDATE`) publié par
ChatGPT en mode `DIRECT_GITHUB_PUBLICATION` via les API GitHub (`CHATGPT.md`),
l'indisponibilité technique des hooks Git locaux est déclarée
`HOOK_NOT_AVAILABLE` et compensée par les contrôles équivalents accessibles
(secrets, intégrité, changements concurrents, fast-forward et relecture du SHA
publié) ainsi que les validations CI pertinentes. Les contributions effectuées
depuis le checkout local conservent les hooks locaux obligatoires, et tout code
runtime ou migration conserve ses exigences complètes de validation.

Une preuve d'un autre SHA, une validation périmée ou une erreur qualifiée
`PREEXISTING_PARALLEL_FAILURE` reste visible et ne peut jamais produire un
`PASS` de livraison. Une collision ou une dérive du candidat invalide son
attestation sans relancer la campagne. Les exigences et tests canoniques ne doivent pas être
réécrits pour ratifier implicitement l'implémentation candidate ; une
évolution légitime du contrat doit être documentée et accompagnée de la
preuve correspondante dans son owner canonique.

Pour les macro-lots de couverture couvrant plusieurs propriétaires, la matrice
d'acceptation, la mesure comparable et la porte de clôture obligatoires sont
définies dans [`testing-quality-coverage.md`](./testing-quality-coverage.md).
Un test ciblé passé ou un commit publié ne suffit pas à déclarer le macro-lot
terminé si un objectif important de cette matrice reste sans preuve.

## Seuils et qualité des assertions

### Boucle de couverture runtime obligatoire

Pour chaque fichier runtime Web instrumentable créé ou modifié, le cycle requis
est : implémentation → tests comportementaux → mesure ciblée V8 → inspection
des éléments non couverts → ajout des tests utiles manquants → nouvelle mesure,
répétée jusqu'à conformité par fichier. Les seuils de risque sont définis dans
[`testing-quality-coverage.md`](./testing-quality-coverage.md). Le périmètre est
dérivé du diff Git exact base→candidat par `coverage-publication.mjs` ; aucun
argument contenant une liste de fichiers ne peut l'autoriser ou le réduire.
Un résultat global moyen ne compense pas un fichier sous seuil. `NOT_MEASURED`
exige une impossibilité d'instrumentation démontrée, des tests comportementaux
compensatoires et reste distinct d'un `PASS`. La preuve exacte et conforme est
requise avant la publication normale du runtime concerné. Les preuves
PostgreSQL/RLS, concurrence et E2E restent indépendantes de V8.

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
- `artifacts/validation/prepush-candidate/<sha>/` contient les candidates
  temporaires matérialisées pour la validation dynamique et doit être nettoyé
  par son owner ;
- les audits durables sont conservés sous `documentation/`, dans le domaine
  concerné, et non dans `artifacts/`.

Ne jamais versionner une preuve dans `artifacts/` par commodité. Vérifier sa
provenance, sa reproductibilité et son emplacement documentaire avant de la
conserver.

Les lanceurs Windows locaux sont conservés directement sous `/.bat/`, dossier
ignoré et jamais versionné. Aucun sous-dossier `root-wrappers` ni lanceur `.bat`
à la racine Git n'est autorisé ; les commandes du workspace mobile restent la
référence reproductible.

Pour un nettoyage local ponctuel, utiliser `npm run clean:temp`. La variante
`clean:temp:force` exige que les outils du dépôt soient fermés ; `npm run
dev:clean` combine le nettoyage et le redémarrage du développement.

## Guide modulaire

Les contrats communs et les niveaux de preuve restent dans ce fichier. Les procédures spécialisées sont réparties selon leur responsabilité :

- [Exécution et CI](./testing-execution.md) — installation, modes `DEVELOPMENT`/`FULL`/`RELEASE`, sécurité CI, triage et commandes ciblées ;
- [Qualité et audits](./testing-quality.md) — couverture, croissance, complexité, dead code, mutation, duplication, cycles et Quality Audit ;
- [Surfaces et intégration](./testing-platforms.md) — regression gates, E2E, TypeScript, build, mobile, QA UI, smoke, Clerk et protocole manuel Actions.

Chaque module conserve les contrats spécialisés et doit être lu avec les règles scoped applicables.
