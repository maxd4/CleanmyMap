# Gouvernance locale — `scripts`

Héritage : gouvernance racine → ce périmètre scripts. Ce fichier concerne les
contrôles, audits, helpers CI, nettoyage, données, design, développement,
médias et rapports présents sous `scripts/`.

## Intention des outils

- ne jamais affaiblir un check uniquement pour obtenir un résultat vert ;
- lorsqu'un garde-fou est modifié, conserver son intention et tester au moins
  un cas positif et un cas négatif lorsque cela est pertinent ;
- distinguer les scripts d'audit ou read-only des scripts pouvant muter une
  donnée, un artefact ou un environnement ;
- privilégier une validation ciblée avant une suite lourde.

Pour un lot local de scripts, appliquer la sobriété définie par la
gouvernance racine : prompts courts et bornés, lecture limitée aux callers,
consommateurs et tests pertinents, et arrêt dès que la `STOP CONDITION` est
atteinte. Ne pas recopier les contrats déjà canoniques ni relancer une suite
identique déjà réussie sur le même SHA sans justification liée au candidat ;
réserver les audits globaux aux changements transversaux. La relecture de
`main`, des règles scoped, du code et des tests concernés reste obligatoire.

### Modularité préventive des scripts

Avant d'ajouter un traitement substantiel à un script, décider
`EXTEND_EXISTING`, `CREATE_MODULE` ou `RESTRUCTURE_FIRST` en distinguant
l'orchestration CLI, le parsing, le traitement métier, les accès filesystem,
les processus externes et les diagnostics. Vérifier la taille et la croissance
du fichier, son owner, ses consommateurs, ses effets et ses tests. Une
responsabilité autonome rejoint directement son module définitif ; elle ne doit
pas grossir un runner historique ni être déplacée intacte dans un helper.

Après l'implémentation, relire les tailles avant/après, les fonctions et
processus touchés, les imports et consommateurs, puis vérifier qu'aucune
frontière autonome n'a été oubliée. Les seuils de qualité restent des signaux
de revue : cette règle ne crée ni nouveau seuil bloquant ni nouvelle baseline.

## Modèle canonique de développement

`MAIN-ONLY / MULTI-WRITER COORDONNÉ` est le workflow CURRENT pour les scripts
et leurs consommateurs : `CleanmyMap-main` reste sur `main`, plusieurs writers
peuvent travailler sur des fichiers distincts, et les analyses read-only
peuvent être parallèles. Les fichiers partagés, l’index et les références Git
doivent être relus et mutés de façon coordonnée. Tout fichier dirty préexistant
non explicitement attribué au lot courant est présumé appartenir à un autre
writer : il ne doit pas être nettoyé, restauré, supprimé, réécrit, stashed,
déplacé ou réconcilié par ce lot. La coordination des références Git ne permet
pas de modifier le contenu dirty étranger. Aucun nouveau worktree, clone, claim,
coordinateur persistant ou branche de chantier n'est créé.

Chaque lot capture d'abord l'état de `HEAD`, de `origin/main`, de l'index, du
worktree et des untracked, identifie son allowlist, puis peut commencer même
si le checkout est dirty, si des commits locaux ne sont pas publiés, si
`HEAD != origin/main` ou si un autre writer est actif. Une mutation d'un chemin
dirty étranger reste interdite sans autorisation, mais elle ne bloque pas les
scripts ni les validations indépendants. `git fetch origin main` et la
vérification des refs servent à requalifier une preuve ou à préparer la
publication ; ils ne sont pas des prérequis d'exécution locale. Une évolution
concurrente entraîne seulement la requalification ou le rejeu de la preuve
affectée. Chaque lot stage ensuite une allowlist, valide `STAGED` et crée un
commit local dont les fichiers et validations sont identifiés. Plusieurs
responsabilités peuvent être publiées ensemble si elles ont été explicitement
relues et validées.

Les scopes sont strictement séparés : `WORKTREE_LIVE` est le checkout mouvant,
`STAGED` l'index exact, `COMMITTED_SNAPSHOT` un arbre Git immuable par SHA, et
`PUSH_CANDIDATE` les refs effectivement transmises par le protocole Git. Une
mesure live ne peut jamais être présentée comme preuve reproductible d'un SHA.

### Dérogation explicite — push effectué par ChatGPT

Sur autorisation explicite de l'utilisateur dans le prompt courant, un push
effectué directement par ChatGPT peut ignorer les contrôles `STAGED` et
`PUSH_CANDIDATE`. Cette dérogation doit être bornée au push identifié dans la
demande et consignée comme `CHATGPT_AUTHORIZED_SKIP` ; elle ne peut jamais être
déduite d'un timeout, d'un outil indisponible, d'un checkout dirty, d'un échec
de contrôle ou d'une concurrence entre writers.

Le skip n'autorise ni `git add -A`, ni l'inclusion de fichiers étrangers, ni
la suppression ou l'écrasement de changements concurrents, ni le force-push,
ni le contournement d'un fast-forward ou de la vérification de convergence
distante. Les contrôles ignorés doivent être rapportés `NOT_RUN`, jamais
`PASS`, et la publication ne peut pas être présentée comme validée par les
scopes `STAGED` ou `PUSH_CANDIDATE`. Les contrôles restants, la revue de
l'allowlist et les protections de sécurité demeurent applicables sauf
autorisation distincte et explicite.

Hors mode de développement rapide :

```text
validation → commit isolé → push main → vérification de convergence
```

Mode de développement rapide explicitement activé :

```text
commit local selon son protocole, sans push tant que le mode reste actif
```

Lorsqu’un push concurrent échoue, le publisher attend de façon bornée, refetch
`origin/main`, relit les commits locaux et tente une synchronisation
non destructive avant de réessayer en fast-forward. Une divergence ou un
conflit non résolu est signalé explicitement ; aucun force-push ni contournement
des protections GitHub n’est permis.

### LEGACY / COMPATIBILITY

Les anciens noms `workspace:*`, `codex/*`, `publish/*`, les claims, locks,
worktrees liés et métadonnées de runs ne décrivent que la migration historique.
Ils ne gouvernent aucun nouveau lot et ne doivent pas être consommés par les
guards CURRENT.

## Portée Git des contrôles

### Audits quality dans le checkout canonique

`npm run audit:quality -- <mode>` peut démarrer dans un checkout dirty ou
concurrent, avec des fichiers untracked, des commits locaux non publiés ou
`HEAD != origin/main`. Le runner capture le SHA immédiatement, ne prend pas
ces états comme une autorisation d'attribuer le worktree au SHA, et conserve
dans chaque manifeste l'état initial, les changements observés, le statut de
l'engine et sa provenance de lecture. Les engines qui lisent un arbre Git
immuable portent `COMMITTED_SNAPSHOT`; ceux qui lisent le checkout courant
portent `WORKTREE_LIVE`. Une évolution du dépôt pendant l'exécution produit
une sortie informative ou en échec, jamais une suppression silencieuse des
résultats.

Les exécutions utilisent un `runId` dans des noms de fichiers plats sous
`artifacts/quality-audits/<SHA>/` :
`<audit>--<runId>--{report,manifest}.json` et
`<audit>--<runId>--summary.md`. Le mode `all` ajoute le même triplet avec
`audit=all`. Le `runId` et l'écriture atomique empêchent deux audits parallèles
de s'écraser. L'enregistrement et la lecture d'un marqueur d'exécution passent
par le même verrou borné que l'inventaire, la migration et la rétention, ce qui
empêche un démarrage de se glisser entre l'inventaire et une suppression. Un
owner du même hôte dont le PID est démontré absent peut être récupéré ; les
marqueurs anciens, ambigus ou invérifiables restent préservés avec diagnostic.
Après chaque audit terminé,
le runner conserve les trois SHA les plus récemment exécutés, sauf les SHA
encore actifs, et migre les artefacts legacy reconnus sans supprimer un fichier
inconnu, un lien symbolique ou une archive. Les informations de provenance et
les résultats auxiliaires restent descriptifs et non bloquants pour ce runner :
ils ne constituent pas une preuve de candidat publié et aucun audit ne modifie
automatiquement une baseline, une justification ou un seuil.

Pour `all`, les projections `quality-index--<runId>--{index.json,summary.md,bundle.zip}`
restent dans le dossier SHA et sont des artefacts système reconnus par le même
inventaire uniquement lorsqu'un manifeste `all` valide du même SHA et du même
`runId` les rattache au run. Une projection orpheline, comme un rapport ou
résumé classique sans manifeste correspondant, rend le SHA ambigu : aucune
preuve du dossier ne doit alors être migrée ou supprimée, et le diagnostic doit
identifier l'artefact concerné. Les projections valides sont supprimées avec
le dossier lorsqu'il sort des trois versions conservées. Aucun ZIP système
n'est stocké hors de ce périmètre ; les fichiers externes, noms inconnus,
preuves ambiguës et suppressions incertaines restent préservés avec un
diagnostic explicite. Une rétention différée par verrou ou protection active ne
modifie pas la limite de référence et expose son état (`LOCK_ACTIVE`, owner
ambigu ou `DELETE_FAILED`) au caller.

Le mode `all` ajoute aussi, dans le rapport agrégé et la projection consolidée,
une dimension documentaire non bloquante calculée sur les fichiers Markdown et
MDX suivis par Git du SHA audité. Elle mesure lignes, octets, titres, sections,
liens internes et cycle de vie explicitement attesté ; elle n'applique pas les
seuils du code TypeScript et ne modifie aucun document inspecté. Un ancien run
dont le rapport agrégé ne contient pas cette dimension reste `NOT_MEASURED` en
projection offline.

- les contrôles manuels de changements peuvent utiliser la portée `WORKTREE` :
  c’est l’état partagé et évolutif du checkout, qui peut inclure le dirty state
  et les untracked étrangers ; ce scope n’autorise pas à modifier un chemin
  étranger et ne constitue pas une preuve de commit ou de publication ;
- le contrôle de pré-commit doit utiliser exclusivement la portée `STAGED`,
  c’est-à-dire le contenu exact issu de `git diff --cached`, en ignorant le
  dirty state et les untracked étrangers ;
- le contrôle de pré-push réel doit utiliser exclusivement la portée
  `PUSH_CANDIDATE`, c’est-à-dire les références et commits effectivement
  transmis par le protocole pre-push Git ; il doit scanner les ranges réellement
  envoyés plutôt que `HEAD`, `origin/main` ou le checkout courant ;
- chaque check statique du pre-push doit recevoir `--ref=<local-sha>` et lire
  l'arbre Git exact correspondant, sans staged, unstaged, untracked ni commit
  local étranger. Les SHA identiques sont dédupliqués ; une ref supprimée n'a
  pas d'arbre candidat ;
- les cinq contrôles statiques critiques de la voie rapide sont invoqués par un
  seul `run-static-candidate-check.mjs` avec plusieurs `--script`. Le runner
  matérialise l'arbre du SHA exact une seule fois, exécute les checks dans
  l'ordre déclaré, vérifie qu'aucun check ne modifie cette source et nettoie la
  candidate dans son `finally`. L'invocation historique avec un seul
  `--script` reste compatible. Les métriques `STATIC_CANDIDATE_*` et
  `PREPUSH_*_SECONDS` rendent la durée et le nombre de matérialisations
  observables sans changer le périmètre de validation ;
- le pre-push courant conserve uniquement protocole Git, fast-forward,
  `git diff --check`, audit secrets et contrôles statiques critiques sur le
  `PUSH_CANDIDATE` exact. Il ne lance pas automatiquement `test:scripts`, lint,
  typecheck, Vitest, build ou Vercel et n'installe aucune dépendance ;
- les gates dynamiques lourdes du pre-push complet (`test:scripts`, lint,
  typecheck, Vitest et build) utilisent `DYNAMIC_CANDIDATE` et un arbre
  éphémère construit exclusivement depuis le SHA candidat sous
  `.artifacts/validation/prepush-candidate/<sha>/`. Elles ne doivent jamais
  lire le WORKTREE ni ses fichiers étrangers ; les gates compatibles invoquent
  le matérialiseur avec `--dependency-mode=reuse`, tandis que les builds
  npm/Vercel utilisent explicitement `--dependency-mode=isolated`. Cette voie
  complète est opt-in avec `npm run prepush:guard -- -Full`; les validations
  larges restent disponibles via les commandes de release canoniques ;
- `.artifacts/` est ignoré par Git et réservé aux candidates et sorties
  locales de validation ; une preuve durable doit être déplacée vers
  `documentation/` avant d'être versionnée ;
- les lifecycle de candidates doivent réutiliser le helper
  `scripts/ci/candidate-lifecycle.mjs` et la seule racine
  `.artifacts/validation/prepush-candidate/<sha>/`. Toute candidate porte un
  marqueur généré, est supprimée dans `finally` sur succès comme sur erreur,
  détache ses junctions/liens avant la racine et vérifie son absence ;
- aucun `publication-candidate`, clone, worktree ou copie persistante n'est
  autorisé ; le check read-only `check:candidate-lifecycle` signale les
  résidus sans les supprimer ;
- `npm run check:candidate-lifecycle -- --strict` applique le ratchet contre
  `scripts/checks/candidate-lifecycle-baseline.json` : toute nouvelle
  candidate générée, entrée canonique inconnue ou entrée ad hoc est bloquante.
  La baseline ne contient plus de résidu historique ; aucune entrée inconnue
  n'est supprimée automatiquement ;
- un rapport de script qui crée une candidate doit indiquer
  `CANDIDATE_CREATED`, `CANDIDATE_PATH` et `CANDIDATE_CLEANUP`. Un cleanup en
  échec est bloquant pour un verdict final `terminé` ;
- un outil ou une dépendance absente est un blocage `HOST_ENVIRONMENT` explicite,
  jamais un `SKIPPED_PARALLEL_CHANTIER`. Le fallback manuel matérialise `HEAD`
  comme candidat dynamique ;
- l'invocation manuelle du guard sans protocole peut utiliser le fallback
  `origin/main...HEAD`, affiché explicitement comme `manual-fallback`, mais
  ses checks statiques doivent utiliser `--ref=HEAD` ;
- le hook `.githooks/pre-commit` reste automatique et bloquant sur `STAGED` ; le
  hook `.githooks/pre-push` doit exécuter le garde rapide sur le
  `PUSH_CANDIDATE` exact transmis par Git ; les contrôles statiques du candidat
  doivent rester sans installation de dépendances. Si une ressource temporaire
  est indisponible, attendre puis réessayer avec un backoff borné (30 s, 60 s,
  120 s ; maximum environ 5 minutes) ; ne pas abandonner au premier échec
  transitoire ; si le blocage est structurel (outil absent,
  authentification/permission manquante ou contrat impossible à satisfaire),
  arrêter avec le diagnostic exact ; ne jamais contourner le garde ni pousser
  un candidat non validé. Les validations larges relèvent de la CI ou d'une
  préparation explicite de release ;
- `npm run checks:changed` reste l'alias `WORKTREE` du mode `DEVELOPMENT` de
  développement et ne constitue pas une preuve de publication. Un échec
  attribuable à un chantier parallèle peut être classé
  `SKIPPED_PARALLEL_CHANTIER` si `STAGED` et `PUSH_CANDIDATE` restent verts ;
  une violation du candidat demeure bloquante et aucun fichier étranger ne doit
  être modifié pour faire disparaître l’échec ;
- `STAGED` et `PUSH_CANDIDATE` sont distincts : le premier décrit le contenu
  exact candidat du commit, le second les refs et commits effectivement
  publiés par le push ;
- toute modification d'un hook ou d'un script de scope doit préserver ces
  frontières, ne jamais utiliser `git add -A` et tester au moins un fichier du
  candidat et un fichier étranger hors candidat lorsque pertinent.

## Trois modes canoniques de validation

Le workflow CURRENT destiné à Codex possède trois modes clairement séparés :

- `DEVELOPMENT` via `npm run checks:fast`, budget dur de 180 secondes, ciblé et
  préventif par défaut ;
- `FULL` via `npm run checks:full`, sans budget global, uniquement sur demande
  explicite ou préparation Vercel ; il couvre tous les domaines sans dépendre
  du diff ;
- `RELEASE` via `npm run release:check -- --sha=<sha>`, qui autorise uniquement
  un SHA disposant d'une preuve FULL verte et d'un worktree propre.

Lorsqu'un `FULL` est explicitement lancé, toute erreur actionnable observée par
ses contrôles doit être corrigée dans l'exécution courante, même si les
fichiers causaux sont hors du lot initial. Un échec ne peut pas être laissé
rouge au seul motif qu'il est préexistant ou hors périmètre. Les blocages
externes et environnementaux restent `BLOCKED_*`, avec une preuve explicite,
et ne doivent jamais être masqués ou reclassés en `PASS`.

Le planificateur ne déclenche jamais `FULL` implicitement. Les suites Web
complètes, couverture Web globale, duplication, cycles, Knip, mutation, E2E et
audits distants restent donc disponibles pour FULL sans être ajoutées aux hooks
ou aux jobs CI ordinaires. Le job CI `mobile-validation` fait exception et
exécute systématiquement les validations mobiles, y compris tests et couverture,
sur les pushes et Pull Requests ciblant `main`. Un contrôle différé en DEVELOPMENT est
`SKIPPED_BY_POLICY`, jamais `PASS`. Le gate `quality:cycles` est actuellement
suspendu par cette politique : son invocation produit cette preuve explicite
sans lancer GitNexus jusqu'à réactivation documentée.
Le rapport doit indiquer `VALIDATION_MODE`, `CANDIDATE_SCOPE`,
`ELAPSED_SECONDS`, `TIME_BUDGET_SECONDS`, les contrôles `PASSED`, `FAILED` et
`NOT_RUN`, ainsi que `VERDICT`. Un dépassement est explicitement
`TIME_BUDGET_EXCEEDED` ; un contrôle non lancé faute de budget est
`NOT_RUN_TIME_BUDGET`, jamais un succès.

Les commandes spécialisées (`typecheck`, lint, Vitest, build, sécurité,
gouvernance documentaire, migrations, `test:scripts`, etc.) sont des briques
sélectionnées par ces modes, pas des modes supplémentaires. Un même contrôle
ne doit pas être relancé sans raison ; lorsqu'une suite plus large le couvre,
le rapport porte `ALREADY_PROVEN`. `WORKTREE`, `STAGED`, `PUSH_CANDIDATE` et
`DYNAMIC_CANDIDATE` restent des scopes de contenu et d'exécution, pas des
modes de validation. Les anciens alias (`checks:changed`, `checks`,
`checks:global`) restent des compatibilités bornées vers les deux modes.

La politique des fichiers volumineux est portée par
`scripts/checks/top-heavy-policy.mjs` et réutilise `classifyFileKind()` :
runtime REVIEW `>500` lignes ou `>40 KiB`, HARD `>1000` lignes ou `>50 KiB` ;
test REVIEW `>1000` lignes ou `>50 KiB`, HARD `>1500` lignes ou `>80 KiB` ;
data/config REVIEW `>800` lignes ou `>50 KiB`, HARD `>1500` lignes ou `>80 KiB`.
`generated` n'est exclu que si une provenance régénérable est prouvée ; sinon
il reste soumis à un contrôle conservateur. `--enforce` bloque tout nouveau
REVIEW ou HARD et toute croissance au-delà du plafond ratifié du KIND. Le
checker lit la baseline canonique `scripts/checks/heavy-files-baseline.json`.

La baseline versionnée v3 sépare les responsabilités : `allowed[]` reste un
inventaire d'exceptions HARD explicitement ratifiées, avec `path`, `decision`,
`reason`, `kind`, `reviewedRef`, `maxLines` et `maxBytes`; seuls
`COHESIVE_SINGLE_FILE` et `DEFERRED_SPLIT` sont autorisés. `review[]` contient
uniquement des plafonds numériques REVIEW (`path`, `kind`, `status`,
`reviewedRef`, `maxLines`, `maxBytes`) et ne constitue aucune décision
architecturale. Un
`status: IMPROVED` conserve le plafond abaissé après le retour sous REVIEW et
bloque tout retour au-dessus de ce plafond. Les entrées disparues des fichiers
mesurés ou des roots restent stale ; un fichier seulement repassé sous REVIEW
reste dans la baseline pour conserver le ratchet. Ne pas ajouter d'exception
pour contourner un garde-fou.

### Qualification et priorité des familles jscpd

Lire les deux occurrences CURRENT et regrouper les fingerprints par
responsabilité avant toute mutation. Une famille reçoit une qualification :

- `MIGRATE_TO_CANONICAL` : migrer les consommateurs vers un owner déjà établi ;
- `CENTRALIZE_OWNER` : créer un owner commun seulement si une règle métier
  durable est réellement partagée et que la divergence évitée est démontrée ;
- `DELETE_PROVEN` : suppression justifiée après vérification des consommateurs ;
- `KEEP_INTENTIONAL` : duplication nécessaire à une frontière, une sémantique
  distincte, une lisibilité ou une preuve indépendante ;
- `TEST_SHARED_HARNESS` : mutualiser seulement l'infrastructure de tests, sans
  absorber les assertions métier ni de sécurité ;
- `NO_ACTION_NOISE` : similarité de texte sans gain architectural réel.

Prioriser les familles selon le risque et la source canonique :

```text
P0 sécurité, AuthN/AuthZ, RLS, ownership, scope, invariant sensible
P1 sources de vérité métier concurrentes
P2 duplication runtime de domaine, persistance ou API
P3 infrastructure runtime réutilisable
P4 infrastructure commune de tests
P5 duplication intentionnelle
P6 bruit textuel
```

Traiter P0 à P3 avant P4, sauf test nécessaire à la protection immédiate du
runtime ; pour une famille mixte, traiter d'abord son owner runtime. P5 et P6
ne sont pas des objectifs de réduction. Les preuves et le schéma persistant
des justifications sont définis dans
`documentation/development/TESTING.md` ; les familles conservées restent
réexaminables si leur contrat change.

### Condition d’arrêt des lots de duplication en FULL

Un lot de duplication ne peut être clôturé qu’après, dans cet ordre :

```text
rapport jscpd courant lu
→ familles touchées qualifiées
→ priorité P0–P6 justifiée
→ mutations cohérentes
→ validations de contrats ciblées
→ FULL : quality:duplication sur le candidat final exact
→ aucun nouveau fingerprint
→ métriques finales observées
```

Le cadre universel est dans `AGENTS.md` ; la qualification et la priorité
P0–P6 sont définies ici. La mesure jscpd et ses ratchets restent dans
`documentation/development/TESTING.md`. Pendant `DEVELOPMENT`, jscpd n'est pas
déclenché automatiquement par une extraction, un import ou un refactor et ne
constitue pas une condition de staging, commit, push ou clôture. Une
vérification ciblée reste possible si un risque concret est démontré. En
`FULL`, `SKIPPED` ou `NOT_RUN` pour jscpd ne constitue pas une validation : le
rapport doit mesurer le même candidat final que celui qui sera committé, et
toute modification ultérieure impose de l'actualiser.

Ne jamais relever seuil, grâce, baseline ou exclusion pour fermer le lot. Une
mise à jour de baseline n’est recevable que pour ratifier une amélioration
mesurée sous la politique existante. Si une validation de sécurité directement
concernée échoue, la condition d’arrêt reste non satisfaite.

## Nettoyage et mutations

- un cleanup destructif exige une provenance démontrée, une cible explicite et
  un périmètre vérifié ;
- conserver les artefacts utiles et les chantiers parallèles ; ne jamais
  nettoyer ou réinitialiser une zone étrangère ;
- ne pas transformer un diagnostic, un rapport ou un dry-run en preuve de
  mutation appliquée ;
- respecter les options et garde-fous propres à chaque script avant toute
  opération distante.

Les artefacts générés doivent rester dans les emplacements prévus par le
script ou dans les dossiers techniques existants, jamais à la racine par
commodité.

Validation des scripts lorsque les tests associés existent :

```bash
npm run test:scripts
```
