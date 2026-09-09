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

## Coordinateur local des chantiers

`workspace-coordination.mjs` conserve uniquement des métadonnées runtime sous
`.artifacts/coordination/`. Un `claim` représente exclusivement une intention
d'écriture future : un fichier dirty, staged ou simplement présent dans
`LEGACY_UNOWNED` ne constitue jamais une preuve d'ownership et ne doit pas
être adopté par un run qui ne prévoit pas de le modifier. La lecture seule
reste donc dans `LEGACY_UNOWNED`.

Une adoption explicite d'un futur chemin d'écriture est suivie dans les
métadonnées du run via `adoptedLegacyPaths`. Si cette intention est abandonnée,
`unclaim --run-id <RUN_ID> [--return-legacy] -- <paths>` retire uniquement les
chemins effectivement possédés par ce run ; il refuse les locks étrangers et
les chemins staged sous publication. `--return-legacy` enregistre d'abord le
retour dans `LEGACY_UNOWNED`. Lors du `release`, un chemin adopté encore dirty
est conservativement rendu au legacy avant la suppression de son lock. Aucun
de ces mécanismes ne modifie le fichier, l'index ou `HEAD`.

Le `publication.lock` reste un mutex global, mais son acquisition attend un
publisher concurrent avec un backoff et un timeout bornés. Cette attente est
distincte d'un conflit réel de chemin, de scope critique ou de staged étranger.
Les runs et le lock portent un heartbeat ; une récupération n'est autorisée
que pour une lease expirée, avec preuve qu'aucun chemin staged du propriétaire
ne serait mis en danger.

`workspace:start` commence par `git fetch origin main`, lit `HEAD` et
la branche courante. Toute branche autre que `main`, y compris un detached
HEAD, lève `WORKTREE_BRANCH_INVALID`. Le coordinateur refuse aussi tout nouveau
run mutable lorsque `HEAD != origin/main`, avec `WORKTREE_BASE_DIVERGED` et les
deux SHA ; un worktree dirty seul reste autorisé. Lorsque les contrôles passent,
le SHA commun est conservé comme `baseSha` du run.

Après obtention effective de `publication.lock`, `workspace:publication-acquire`
refait `git fetch origin main`, vérifie la branche, la convergence de `HEAD` et
`origin/main` (`HEAD == origin/main`), puis le stale-check des seuls chemins possédés depuis le
`baseSha`. Une modification distante possédée lève `WORKSPACE_STALE` avec la
liste des chemins et libère le mutex avant de sortir ; une divergence de base
lève `WORKTREE_BASE_DIVERGED` et suit le même nettoyage. Aucun staging ne doit
suivre un acquire refusé.

`workspace:publication-complete` est l'unique preuve de clôture d'une
publication : le run doit posséder le mutex, refaire les contrôles de branche et
de fetch, puis obtenir `git rev-list --left-right --count HEAD...origin/main =
0 0`. La preuve est inscrite dans le run avant la libération du mutex ; un run
marqué comme publication en attente ne peut pas être fermé par `workspace:release`.

`workspace:claim` refuse avec `ORPHAN_DIRTY` un chemin dirty qui n'est ni
`LEGACY_UNOWNED`, ni déjà possédé par le run. L'adoption doit être explicite via
`--adopt-legacy`; le coordinateur ne lit jamais le contenu des fichiers pour
décider l'ownership.

## Portée Git des contrôles

- les contrôles manuels de changements peuvent utiliser la portée `WORKTREE` ;
  le contrôle de pré-commit doit utiliser exclusivement la portée `STAGED`,
  issue de `git diff --cached`, et ignorer le dirty state et les untracked
  étrangers ;
- le contrôle de pré-push réel doit utiliser exclusivement la portée
  `PUSH_CANDIDATE`, construite à partir des refs et des lignes stdin fournies
  par le protocole pre-push Git ; il doit scanner les ranges effectivement
  envoyés plutôt que `HEAD`, `origin/main` ou le checkout courant ;
- chaque check statique du pre-push doit recevoir `--ref=<local-sha>` et lire
  l'arbre Git exact correspondant, sans staged, unstaged, untracked ni commit
  local étranger. Les SHA identiques sont dédupliqués ; une ref supprimée n'a
  pas d'arbre candidat ;
- les gates dynamiques du pre-push (`test:scripts`, lint, typecheck, Vitest et
  build) doivent utiliser `DYNAMIC_CANDIDATE` et un arbre éphémère construit
  exclusivement depuis le SHA candidat sous
  `.artifacts/validation/prepush-candidate/<sha>/`. Elles ne doivent jamais
  lire le WORKTREE ni ses fichiers étrangers ; les dépendances locales peuvent
    être reliées ou matérialisées temporairement sous cette racine sans modifier
    le dépôt, et l'index normal doit rester inchangé ;
- les lifecycle de candidates doivent réutiliser le helper
  `scripts/ci/candidate-lifecycle.mjs` et les seules racines
  `.artifacts/validation/prepush-candidate/<sha>/` ou
  `.artifacts/validation/publication-candidate/<run-id>/`. Toute candidate
  porte un marqueur généré, est supprimée dans `finally` sur succès comme sur
  erreur, détache ses junctions/liens avant la racine et vérifie son absence ;
- `publication-candidate` est réservé aux races/divergences ou à une
  resynchronisation de publication réellement nécessaire. Aucun nom ad hoc,
  clone, worktree ou copie persistante n'est autorisé ; le check read-only
  `check:candidate-lifecycle` signale les résidus sans les supprimer ;
- `npm run check:candidate-lifecycle -- --strict` applique le ratchet contre
  `scripts/checks/candidate-lifecycle-baseline.json` : les trois preuves
  historiques qui y sont documentées restent tolérées, tandis que toute
  nouvelle candidate générée, entrée canonique inconnue ou entrée ad hoc est
  bloquante. La baseline est une exception historique explicite, pas une
  autorisation de créer de nouveaux chemins ; aucune entrée inconnue n'est
  supprimée automatiquement ;
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
  hook `.githooks/pre-push` doit exécuter le garde sur le `PUSH_CANDIDATE` exact
  transmis par Git ; si une ressource temporaire est indisponible, attendre
  puis réessayer avec un backoff borné (30 s, 60 s, 120 s ; maximum environ
  5 minutes) ; ne pas abandonner au premier échec transitoire ; si le blocage
  est structurel (outil absent, authentification/permission manquante ou
  contrat impossible à satisfaire), arrêter avec le diagnostic exact ; ne
  jamais contourner le garde ni pousser un candidat non validé. Les
  validations larges relèvent de la CI ou d'une préparation explicite de
  release ;
- `npm run checks:changed` reste un contrôle `WORKTREE` de développement et ne
  constitue pas une preuve de publication. Un échec prouvé étranger peut être
  classé `SKIPPED_PARALLEL_CHANTIER` si `STAGED` et `PUSH_CANDIDATE` restent
  verts ; une violation du candidat demeure bloquante ;
- `STAGED` et `PUSH_CANDIDATE` sont distincts : le premier décrit le candidat
  du commit, le second les refs réellement transmises au push ;
- toute modification d'un hook ou d'un script de scope doit préserver ces
  frontières, ne jamais utiliser `git add -A` et tester au moins un fichier du
  candidat et un fichier étranger hors candidat lorsque pertinent.

Le fichier `scripts/heavy-files-baseline.json` est un inventaire temporaire de
dette historique, pas une autorisation permanente de dépasser les seuils. Ne
pas y ajouter une entrée pour contourner un garde-fou. Lorsqu'un fichier sort
de la dette mesurée, retirer son entrée ; lorsqu'il est significativement
modifié, réévaluer sa cohésion et le ratchet en mode `--enforce`.

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
