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

### Modèle worktree courant

Le checkout `main` est une référence/bootstrap. `workspace:start` fait un
fetch puis crée une branche `codex/<run-id>` et un worktree lié sous
`<parent>/CleanMyMap-worktrees/<run-id>/`, avec un index et un staging isolés.
Les métadonnées et le mutex global sont stockés sous
`git rev-parse --git-common-dir/cleanmymap-workspace`. Le champ canonique est
`intendedPaths`; les claims ordinaires sont advisory et les chevauchements non
critiques sont permis. `AUTHZ_SECURITY` reste la seule scope exclusive.

`workspace-coordination.mjs` ne coordonne que des intentions d'écriture
futures et ne lit pas le contenu des fichiers pour décider l'ownership. Après
`workspace:claim`, le run travaille dans son worktree ; avant le staging il
obtient `workspace:publication-acquire`, qui prend le mutex global, refait le
fetch et vérifie les `intendedPaths` depuis le `baseSha`.

`workspace:resume -- --run-id <RUN_ID>` reprend le même run après interruption.
`workspace:publication-integrate` intègre le dernier `origin/main` depuis un
worktree de publication sous `<parent>/CleanMyMap-worktrees/.publish/<run-id>/`
et conserve le fast-forward lorsque possible ; tout nouveau merge est signé.
Un conflit Git devient `INTEGRATION_CONFLICT`.

`workspace:publication-complete` est l'unique preuve de publication terminée :
le coordinateur refait le fetch et vérifie la convergence de la branche
publiée avec `origin/main`, puis libère le mutex. `workspace:release` retire
uniquement la branche, le worktree et les métadonnées du run.

### Migration / legacy

`workspace:init` reste read-only. `.artifacts/coordination` est seulement lu
comme `LEGACY_COORDINATION_STATE`; l'ancien champ `ownedPaths`,
`LEGACY_UNOWNED` et les locks de chemins sont des compatibilités historiques.
Les erreurs historiques `WORKTREE_BRANCH_INVALID`,
`UNPUBLISHED_PATH_CONFLICT`, `COORDINATION_CONFLICT`, `ORPHAN_DIRTY` et
`PUBLICATION_PENDING` ne décrivent pas le modèle courant. Toute adoption d'un
état historique doit être explicite et ne peut pas modifier silencieusement
un fichier, l'index ou l'historique Git.

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
