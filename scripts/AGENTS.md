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

### Migration vers les worktrees liés

Le checkout bootstrap `CleanmyMap-main` reste sur `main`, est le miroir local
de `origin/main` et la source du serveur localhost ; il ne sert pas au
développement mutable. Chaque nouveau run possède une branche
`codex/<run-id>` et un worktree lié sous
`<parent>/CleanMyMap-worktrees/<run-id>/`. Les métadonnées, claims advisory et
le mutex global sont stockés sous
`git rev-parse --git-common-dir/cleanmymap-workspace`. Le champ canonique est
`intendedPaths`; `ownedPaths` reste une lecture de compatibilité uniquement.
Les chevauchements ordinaires sont permis, tandis que `AUTHZ_SECURITY` reste
exclusif. `.artifacts/coordination` est seulement signalé comme
`LEGACY_COORDINATION_STATE` et n'est jamais écrit.

La reprise recharge le même run, sa branche, son worktree et sa publication.
`workspace:publication-integrate` intègre depuis un worktree éphémère
`<parent>/CleanMyMap-worktrees/.publish/<run-id>/` avec `publish/<run-id>` ;
les fast-forwards sont conservés et tout nouveau merge est signé. Un conflit
Git devient `INTEGRATION_CONFLICT`. Après convergence, seuls les worktrees et
branches du run sont nettoyés.

Après une publication réussie et la finalisation du run, le coordinateur
recherche ce bootstrap, vérifie `main` et l'absence de modifications, puis
exécute `fetch origin main` et `merge --ff-only origin/main`. Un bootstrap
dirty est signalé `BOOTSTRAP_DIRTY` et laissé intact ; aucune copie manuelle,
aucun reset, rebase, stash ou clean automatique n'est permis. `doctor` signale
également les runs fermés avec worktree, les runs terminés dirty/staged, les
commits non publiés abandonnés, les worktrees sans run et les métadonnées
`ACQUIRED` sans mutex réel.

`workspace-coordination.mjs` conserve uniquement des métadonnées runtime sous
`git rev-parse --git-common-dir/cleanmymap-workspace/`. Un `claim` représente exclusivement une intention
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
HEAD, lève `WORKTREE_BRANCH_INVALID`. Un `HEAD == origin/main` autorise le
démarrage ; un checkout `ahead-only` autorise également le démarrage, marque
`PUBLICATION_PENDING` et conserve les chemins de
`git diff --name-only origin/main..HEAD`. Les chemins revendiqués par ce run
doivent être disjoints de ces commits non publiés, sinon
`UNPUBLISHED_PATH_CONFLICT`. Un checkout behind ou réellement divergent lève
`WORKTREE_BASE_DIVERGED`. Cette politique de démarrage ne doit pas exiger
l'égalité littérale `HEAD == origin/main` ; cette égalité reste obligatoire
avant toute publication. Le SHA de `origin/main` est conservé comme `baseSha`.

Le flux canonique est `STAGE → STAGED VALIDATION → COMMIT LOCAL SIGNÉ →
PUBLICATION ACQUIRE → INTEGRATE → PUSH → FINALIZE`. Le staging et le contrôle
`workspace:check-staged` précèdent donc `publication-acquire`; ce contrôle
vérifie uniquement que les chemins staged appartiennent à `intendedPaths`.
Après acquisition, le coordinateur refait `git fetch origin main` et laisse
l'intégration Git trancher : même fichier ≠ conflit, tandis qu'un conflit Git
réel devient `INTEGRATION_CONFLICT`. `workspace:stale` reste read-only et
informatif et ne bloque pas par simple chevauchement de chemin.

Après interruption, `workspace:resume -- --run-id <RUN_ID>` recharge uniquement
le run existant, renouvelle son heartbeat et classe `WORK`, `STAGED_PENDING`,
`COMMITTED_PENDING` ou `PUSHED_PENDING_COMPLETE` par lecture des refs, des
staged et des ownerships. En `ahead-only`, il doit retrouver le run dont le
candidat appartient sans ambiguïté à l'allowlist avant toute reprise. Il
refuse `PUBLICATION_RESUME_FOREIGN_COMMIT`, `PUBLICATION_RESUME_STALE`,
`PUBLICATION_RESUME_AMBIGUOUS` ou `PUBLICATION_RESUME_FOREIGN_STAGED` et ne
modifie jamais l'historique Git. `publication-acquire` est réentrant pour son
propre run et ne permet pas à un autre run d'adopter une publication expirée.

`workspace:publication-complete` est l'unique preuve de clôture d'une
publication : après fetch, `publishedSha` doit être ancêtre de `origin/main`.
La finalisation inscrit durablement `COMPLETE`, supprime les claims du run,
libère les locks, ferme les métadonnées et nettoie exclusivement ses worktrees
et branches intégrés. Elle est idempotente et reprenable ; `workspace:release`
reste une primitive de récupération, mais n'est pas nécessaire après une
publication normale. `doctor` détecte aussi les locks critiques orphelins ou
expirés, les runs sans worktree et les worktrees de coordinateur sans run ; un
lock `AUTHZ_SECURITY` vivant n'est jamais récupéré.

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
