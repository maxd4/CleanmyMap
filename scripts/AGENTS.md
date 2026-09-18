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

## Modèle canonique de développement

`MAIN-ONLY / SINGLE-WRITER` est le workflow CURRENT pour les scripts et leurs
consommateurs : `CleanmyMap-main` reste sur `main`, un seul writer travaille à
la fois, et les analyses read-only peuvent être parallèles. Aucun nouveau
worktree, clone, claim, lock, run ou branche de chantier n'est créé.

Chaque lot fait `git fetch origin main`, vérifie `main`, stage une allowlist,
valide `STAGED` et crée un commit local isolé. Un push est une publication
explicitement demandée, pas une release implicite ; les commits locaux
séquentiels sur `main` restent permis lorsque le push n'est pas demandé.

### LEGACY / COMPATIBILITY

Les anciens noms `workspace:*`, `codex/*`, `publish/*`, les claims, locks,
worktrees liés et métadonnées de runs ne décrivent que la migration historique.
Ils ne gouvernent aucun nouveau lot et ne doivent pas être consommés par les
guards CURRENT.

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
- les lifecycle de candidates doivent réutiliser le helper
  `scripts/ci/candidate-lifecycle.mjs` et la seule racine
  `.artifacts/validation/prepush-candidate/<sha>/`. Toute candidate porte un
  marqueur généré, est supprimée dans `finally` sur succès comme sur erreur,
  détache ses junctions/liens avant la racine et vérifie son absence ;
- aucun `publication-candidate`, clone, worktree ou copie persistante n'est
  autorisé ; le check read-only `check:candidate-lifecycle` signale les
  résidus sans les supprimer ;
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
- `npm run checks:changed` reste l'alias `WORKTREE` du mode `RAPIDE` de
  développement et ne constitue pas une preuve de publication. Un échec prouvé étranger peut être
  classé `SKIPPED_PARALLEL_CHANTIER` si `STAGED` et `PUSH_CANDIDATE` restent
  verts ; une violation du candidat demeure bloquante ;
- `STAGED` et `PUSH_CANDIDATE` sont distincts : le premier décrit le candidat
  du commit, le second les refs réellement transmises au push ;
- toute modification d'un hook ou d'un script de scope doit préserver ces
  frontières, ne jamais utiliser `git add -A` et tester au moins un fichier du
  candidat et un fichier étranger hors candidat lorsque pertinent.

## Deux modes canoniques de validation

Le workflow CURRENT destiné à Codex possède exactement deux modes :

- `npm run checks:fast` — mode `RAPIDE`, budget dur de 180 secondes ;
- `npm run checks:full` — mode `COMPLET`, budget dur de 720 secondes.

Le planificateur sélectionne les contrôles selon le blast radius du candidat.
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

La politique commune des fichiers volumineux est portée par
`scripts/checks/check-top-heavy-files.mjs` : `REVIEW_THRESHOLD` est
`>500` lignes ou `>40 KiB` et reste un signal d'audit sans split automatique ;
`HARD_THRESHOLD` est `>1000` lignes ou `>50 KiB` et bloque tout nouveau
dépassement en mode `--enforce`. Le même mode bloque désormais aussi tout
nouveau REVIEW et toute croissance au-delà du plafond REVIEW mesuré. Le checker
lit la baseline canonique `scripts/checks/heavy-files-baseline.json`.

La baseline versionnée v2 sépare les responsabilités : `allowed[]` reste un
inventaire d'exceptions HARD explicitement ratifiées, avec `path`, `decision`,
`reason`, `reviewedRef`, `maxLines` et `maxBytes`; seuls
`COHESIVE_SINGLE_FILE` et `DEFERRED_SPLIT` sont autorisés. `review[]` contient
uniquement des plafonds numériques REVIEW (`path`, `status`, `reviewedRef`,
`maxLines`, `maxBytes`) et ne constitue aucune décision architecturale. Un
`status: IMPROVED` conserve le plafond abaissé après le retour sous REVIEW et
bloque tout retour au-dessus de ce plafond. Les entrées disparues des fichiers
mesurés ou des roots restent stale ; un fichier seulement repassé sous REVIEW
reste dans la baseline pour conserver le ratchet. Ne pas ajouter d'exception
pour contourner un garde-fou.

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
