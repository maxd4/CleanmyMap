# AGENTS.md — CleanMyMap

## Portée et héritage

Ce fichier contient uniquement la gouvernance universelle du dépôt. Toute
règle propre à un sous-arbre doit vivre dans le `AGENTS.md` le plus proche :

```txt
root
├── apps/web
│   ├── src/app/api
│   ├── supabase
│   └── scripts
├── apps/mobile
├── scripts
├── .github
├── maintenance/python
└── documentation
```

L'héritage se lit du root vers l'application puis vers la frontière
spécialisée. Les fichiers scoped ajoutent des règles locales ; ils ne
remplacent pas les invariants de ce fichier et ne doivent pas recopier sa
gouvernance. Ne pas réintroduire dans le root une règle exclusivement web,
API, Supabase, scripts, mobile, CI/GitHub, Python ou documentation.

Les fichiers scoped canoniques sont :

```txt
apps/web/AGENTS.md
apps/web/src/app/api/AGENTS.md
apps/web/supabase/AGENTS.md
apps/web/scripts/AGENTS.md
apps/mobile/AGENTS.md
scripts/AGENTS.md
.github/AGENTS.md
maintenance/python/AGENTS.md
documentation/AGENTS.md
```

Ordre de priorité :

1. consigne explicite de l'utilisateur ;
2. sécurité, données et authentification ;
3. état réel du dépôt GitHub `maxd4/CleanmyMap` ;
4. architecture et contrats existants ;
5. design system ;
6. tests et validation ;
7. simplicité ;
8. performance et quotas lorsque le sujet est concerné.

Ne jamais préférer une refonte large à une correction ciblée suffisante.

## Canari de session

Commencer uniquement la réponse finale par `Maxence —`. Les mises à jour
intermédiaires ne doivent pas commencer par ce canari.

## Source de vérité et Git

- utiliser GitHub comme source de vérité et confronter toute copie locale à
  `maxd4/CleanmyMap`, branche `main` ;
- lire le fichier actuel et ses dépendances directes avant de le modifier ; ne
  pas privilégier une ancienne conversation ou un ancien plan au dépôt réel ;
- `CleanmyMap-main` est l'unique checkout mutable, reste sur la branche `main`
  et sert aussi de source pour localhost. Le modèle canonique est
  `MAIN-ONLY / SINGLE-WRITER` : un seul chantier peut écrire à la fois ; les
  analyses peuvent être parallèles mais aucune écriture parallèle n'est
  autorisée ;
- avant chaque chantier, faire `git fetch origin main`, vérifier que le
  checkout est `main` et partir de l'état Git courant. Aucun nouveau worktree,
  clone ou branche `codex/*`/`publish/*` ne fait partie du workflow normal ;
- le lifecycle canonique est : `origin/main → main → working tree/index →
  validation de l'allowlist → commit local isolé`. Chaque lot d'écriture est
  clôturé par ce commit local après validation de son allowlist. La signature
  du commit et la publication vers `origin/main` ne sont effectuées que sur
  demande explicite de l'utilisateur. Plusieurs commits locaux successifs
  peuvent s'accumuler sur ce même `main`, avec un seul writer. Par défaut,
  créer un commit non signé, y compris si la configuration Git locale active
  la signature automatique ; n'utiliser `--gpg-sign` qu'après demande explicite
  de l'utilisateur ;
- un moratoire ou gel d'un service externe ne bloque pas la clôture locale d'un
  lot. Aucun push n'est déclenché implicitement par le lifecycle ; si un push
  est explicitement demandé et peut déclencher ce service, vérifier son
  déclenchement automatique avant de poursuivre ;
- les commits locaux validés en attente restent sur `main` jusqu'à une demande
  explicite de publication. Avant tout push demandé, auditer l'intégralité de
  `origin/main..HEAD`, réconcilier `main` avec `origin/main` si nécessaire,
  puis revalider le candidat exact destiné au push ;
- à chaque fin d'exécution ayant produit des modifications, clôturer
  immédiatement le lot : vérifier son allowlist, valider `STAGED`, committer
  uniquement ses fichiers et conserver le commit local sur `main`. La
  signature et le push sont exclus de cette clôture sauf demande explicite ;
- les modifications locales non stagées hors périmètre ne bloquent ni le commit
  ni le push d'un lot ; Codex délimite le lot, stage uniquement son allowlist
  explicite (jamais `git add -A`) et vérifie
  `git diff --cached --name-only` avant le commit ;
- un commit doit contenir exclusivement les fichiers du lot courant ; les
  changements parallèles hors périmètre ne sont jamais ajoutés au lot et sont
  préservés, y compris s'ils étaient déjà stagés avant l'intervention ;
- lorsqu'un lot a déjà produit des modifications et qu'un changement étranger
  apparaît ensuite dans le working tree, l'agent ne doit pas abandonner
  silencieusement son propre diff. Si son allowlist reste attribuable sans
  ambiguïté, qu'aucun fichier de son lot n'a été modifié concurremment et que
  la validation `STAGED` peut isoler exactement son candidat, il termine son
  lot : stage ciblé, validation, commit local isolé, puis STOP avant toute
  nouvelle modification. Le commit n'est signé que si l'utilisateur l'a
  explicitement demandé. Il ne doit laisser ses propres changements non commités que
  si l'attribution des fichiers est ambiguë, qu'un fichier est partagé avec le
  writer concurrent ou que le candidat ne peut plus être validé
  indépendamment. Dans ce cas, il rapporte `DIRTY_HANDOFF_REQUIRED` et aucun
  nouveau chantier d'écriture ne doit commencer avant résolution.

  ```text
  FOREIGN_DIRTY != automatic STOP before commit

  STOP before commit only if:
  - overlap on same files/contracts;
  - ownership ambiguous;
  - staged candidate cannot be isolated;
  - validation of own candidate is impossible.
  ```
- un fichier hors allowlist modifié exclusivement par une commande de
  validation exécutée par le lot n'est pas un chantier étranger. Si le fichier
  était clean avant la commande, que sa provenance est démontrée et que son
  diff est un artefact généré reproductible sans contenu métier, il est classé
  `GENERATED_VALIDATION_SIDE_EFFECT`. Il doit être restauré à son état `HEAD`
  après la validation s'il n'appartient pas au candidat. Une modification
  préexistante, ambiguë ou contenant un changement métier ne doit jamais être
  restaurée automatiquement.
- le dossier du projet est l'unique source canonique ; ne pas créer ni
  conserver de copie persistante du dépôt, copie manuelle de fichiers, branche
  temporaire, clone Git isolé ou worktree mutable ;
- Git pousse des commits, pas des fichiers ; avant tout push explicitement
  demandé, faire `git fetch origin main`, auditer l'intégralité de
  `git log --oneline origin/main..HEAD` et le périmètre de chaque commit local
  non publié, dans l'ordre, afin de vérifier la provenance, l'allowlist et
  l'absence de commit étranger ou ambigu dans l'ascendance destinée au push ;
- si un commit local étranger, ambigu ou non validé serait embarqué par le push,
  ne pas le publier silencieusement, conserver les commits locaux et signaler
  précisément le blocage ; les changements dirty hors périmètre restent
  préservés et ne sont pas ajoutés au candidat ;
- si `origin/main` avance avant un push explicitement demandé, faire d'abord
  `git fetch origin main` ; une évolution distante indépendante du lot autorise
  une resynchronisation sûre sans écraser les changements parallèles, suivie de
  l'audit intégral de `origin/main..HEAD` et de la revalidation du candidat
  exact ; si cette resynchronisation du `main` n'est pas sûre, arrêter avec un
  STOP explicite ; un conflit réel sur les fichiers ou contrats du lot impose
  le même arrêt ;
- distinguer les trois portées de validation : `WORKTREE` pour l'itération
  manuelle (dirty et untracked inclus), `STAGED` pour le candidat de
  pré-commit (`git diff --cached`) et `PUSH_CANDIDATE` pour le vrai pré-push,
  construit exclusivement depuis les refs et le stdin du protocole Git, sans
  dépendre du dirty state, de `HEAD` global ou d'un commit local non envoyé ;
- `PUSH_CANDIDATE` désigne l'arbre Git exact de chaque SHA local effectivement
  poussé. Tout check statique exécuté par le pre-push doit lire cet arbre via
  `--ref=<local-sha>` ; il ne doit lire ni le staged, ni l'unstaged, ni les
  untracked, ni un commit local étranger. Les refs identiques sont dédupliquées
  et une suppression de ref ne possède aucun arbre candidat à valider ;
- les validations dynamiques du pre-push réel utilisent la portée
  `DYNAMIC_CANDIDATE` : `test:scripts`, lint, typecheck, Vitest et build sont
  exécutés dans un arbre éphémère matérialisé exclusivement depuis le SHA
  candidat sous `.artifacts/validation/prepush-candidate/<sha>/`, jamais dans
    le WORKTREE. Les dépendances locales peuvent être reliées ou matérialisées
    temporairement sous cette racine sans modifier le dépôt ;
  l'index normal et les refs Git restent inchangés ;
- les candidates de validation utilisent exclusivement la racine
  `.artifacts/validation/prepush-candidate/<sha>/`. Le lifecycle doit créer un
  marqueur généré, nettoyer dans `finally`, supprimer ses liens avant sa
  racine et vérifier son absence ; aucun `publication-candidate` n'est
  nécessaire au modèle MAIN-ONLY ;
- toute exécution ayant créé une candidate documente obligatoirement
  `CANDIDATE_CREATED: yes/no`, `CANDIDATE_PATH: <path|none>` et
  `CANDIDATE_CLEANUP: PASS|FAIL`. Un cleanup en échec interdit le verdict
  `VERDICT_REVIEW: terminé` ;
- `node scripts/checks/check-candidate-lifecycle.mjs` est un contrôle
  read-only : il signale les candidates marquées encore présentes, les entrées
  inconnues et les chemins ad hoc, sans supprimer aveuglément un artefact
  étranger ou un chantier parallèle ;
- un outil ou une dépendance dynamique absente relève de `HOST_ENVIRONMENT` et
  bloque avec un diagnostic explicite ; il ne doit pas être reclassé comme
  chantier parallèle. Le fallback manuel utilise `HEAD` comme candidat
  dynamique matérialisé, pas le WORKTREE dirty ;
- le hook `.githooks/pre-commit` est automatique et bloquant sur `STAGED` ; le
  hook `.githooks/pre-push` doit exécuter le garde sur le `PUSH_CANDIDATE` exact
  transmis par Git ; si une ressource temporaire est indisponible, attendre
  puis réessayer avec un backoff borné (30 s, 60 s, 120 s ; maximum environ
  5 minutes) ; ne pas abandonner au premier échec transitoire ; si le blocage
  est structurel (outil absent, authentification/permission manquante ou
  contrat impossible à satisfaire), arrêter avec le diagnostic exact ; ne
  jamais contourner le garde ni pousser un candidat non validé. Les
  validations larges relèvent de la CI ou d'une préparation explicite de
  release ;
- l'invocation manuelle du guard sans protocole peut utiliser le fallback
  `origin/main...HEAD`, qui doit être affiché comme `manual-fallback`, mais ses
  checks statiques doivent utiliser `--ref=HEAD` plutôt que le worktree ;
- `npm run checks:changed` est un contrôle de développement `WORKTREE`, pas une
  preuve de publication. Si son échec est démontré comme étranger, tandis que
  `STAGED` et `PUSH_CANDIDATE` sont verts, le signaler comme
  `SKIPPED_PARALLEL_CHANTIER` sans masquer une erreur du candidat ;
- les suites lourdes ne doivent pas être répétées entre phases sans raison
  liée au candidat réellement validé ;
- le flux normal est : stage ciblé → validation `STAGED` → commit local isolé
  sur `main` → clôture du lot. La signature du commit est optionnelle et
  soumise à une demande explicite. Sur demande explicite de push seulement :
  audit intégral de `origin/main..HEAD` → validation du
  `PUSH_CANDIDATE`/`DYNAMIC_CANDIDATE` exact → push normal. Vérifier
  l'allowlist, les ajouts et suppressions, puis ne jamais force-push ni
  réécrire l'historique ;
- avant tout push demandé, vérifier le diff exact du périmètre logique, les
  validations pertinentes, `git diff --cached --name-only`, l'intégralité de
  l'ascendance `origin/main..HEAD` et le SHA candidat exact ; une candidate
  réussie ne remplace pas l'audit de `main` local et de tous les commits qui
  seraient publiés ;
- après tout push réussi, refaire `git fetch origin main`, puis vérifier
  `git rev-list --left-right --count HEAD...origin/main` ; un verdict
  `terminé` exige le résultat `0 0` et doit signaler
  `CHECKOUT_DIVERGENCE` dans tout autre cas ; ne jamais résoudre cette
  divergence automatiquement par merge, rebase, reset destructif, stash ou
  clean lorsqu'il existe des changements parallèles. Pour la seule validation
  d'une candidate avant le push, ne pas exiger l'égalité littérale
  `HEAD == origin/main` ; l'exigence de convergence s'applique au démarrage
  d'un nouveau chantier et à la clôture après publication ;
- si le push échoue, conserver le commit local et signaler explicitement le
  blocage ; ne jamais contourner les protections par un force push ;
- lorsqu'une vérification effective du site web est demandée, comparer le
  déploiement actif avec le `main` actuel ; si le déploiement est obsolète,
  redéployer Vercel depuis ce `main` avant de vérifier le site et ne pas tirer
  de conclusion à partir d'une version plus ancienne.

Un agent externe peut lire et préparer une analyse ou des fichiers, mais ne
doit pas écrire sans autorisation. L'intégrateur local vérifie la cohérence du
checkout, applique les changements autorisés, valide et committe le lot
localement ; il ne signe ou ne pousse que sur demande explicite de
l'utilisateur.

`CHATGPT.md` gouverne la réflexion et la préparation côté ChatGPT ; ce fichier
gouverne l'exécution locale Codex. ChatGPT peut analyser plusieurs sujets en
parallèle, mais ne doit jamais déclencher deux Codex d'écriture simultanément.
Codex écrit uniquement dans ce checkout `main`, exécute les checks puis
committe localement chaque lot selon la règle ci-dessus ; signature et push
restent conditionnels à une demande explicite de l'utilisateur.

## Chantiers parallèles

- les analyses read-only peuvent être parallèles ; un seul writer travaille
  dans `CleanmyMap-main` à la fois ;
- les changements dirty, staged et untracked existants sont préservés, ne sont
  ni nettoyés ni déplacés automatiquement et doivent être explicitement
  attribués au lot avant staging ;
- une erreur étrangère est signalée sans être corrigée dans ce lot. Aucun
  second run mutable, claim, lock ou worktree ne doit être créé.

## Modèle canonique de développement

`MAIN-ONLY / SINGLE-WRITER` est le seul workflow CURRENT. Chaque lot fait un
fetch de `origin/main`, vérifie la branche `main`, stage son allowlist, passe la
validation `STAGED` et crée un commit local isolé. La signature et le push ne
sont effectués que sur demande explicite de l'utilisateur. Plusieurs commits
locaux successifs peuvent s'accumuler sur `main`. Avant tout push demandé,
l'intégralité de `origin/main..HEAD` est auditée, puis le SHA exact est validé
avec `PUSH_CANDIDATE` et `DYNAMIC_CANDIDATE`.

Les anciens worktrees, branches et métadonnées du coordinateur peuvent rester
présents comme preuves historiques pendant la migration, mais ne sont ni créés,
ni revendiqués, ni nettoyés automatiquement par le workflow courant.

### LEGACY / COMPATIBILITY

Les noms `workspace:*`, `codex/*`, `publish/*`, `CleanMyMap-worktrees`, les
claims, locks et états du coordinateur désignent uniquement l'ancien modèle et
les artefacts historiques. Ils ne gouvernent aucun nouveau lot.

## Hygiène du dépôt et architecture interne

- conserver par défaut sous la racine du projet tous les fichiers et dossiers
  du projet, notamment le code, les tests, la documentation, les scripts, les
  données et les artefacts, selon les emplacements canoniques de son
  architecture ;
- le dossier du projet est la source canonique unique ; ne pas créer ni
  conserver par commodité de dossier parallèle, copie persistante, clone ou
  copie de fichier hors racine sous `business` ou sur la machine. Aucun
  worktree mutable ou dossier `CleanmyMap-*` parallèle ne doit être créé ;
- respecter et étendre l'arborescence canonique existante ; ne pas créer de
  structure ambiguë ou dupliquée lorsqu'un contenu possède déjà un emplacement
  canonique ; la racine du projet reste la source canonique des fichiers
  versionnables ;
- ne pas créer de fichier racine sans justification explicite ; placer les
  temporaires, captures, logs, exports et artefacts dans leur emplacement
  canonique (`artifacts/`, `documentation/`, `backups/` ou sous-dossier dédié) ;
- supprimer les artefacts temporaires dès qu'ils ne sont plus nécessaires ; une
  exception hors projet n'est admise que pour une contrainte technique réelle
  et justifiée ; si elle est persistante, mentionner obligatoirement son chemin
  exact et sa justification dans le compte rendu final ;
- les images et captures placées sous `documentation/pages_site/routes/` sont
  des assets locaux uniquement : elles doivent rester ignorées par Git et ne
  doivent jamais être ajoutées à l'index ou commitées ;
- les skills CleanMyMap versionnés utilisent `.agents/skills/` comme source
  canonique et `.codex/skills/` comme miroir gouverné ; les skills tiers vont
  dans l'installation utilisateur globale, jamais dans le checkout ;
- ne pas modifier `documentation/pepite/` sans demande explicite.

### Archives ZIP

- par défaut, lorsqu'un seul fichier ou un petit nombre de fichiers suffit,
  fournir les fichiers individuels plutôt qu'une archive ;
- si l'utilisateur demande explicitement un fichier `.zip`, celui-ci peut être
  créé et fourni quel que soit le type des fichiers qu'il contient ;
- conserver exactement dans l'archive les noms et chemins attendus ; ne pas
  modifier le contenu uniquement pour faciliter l'archivage ;
- traiter le ZIP uniquement comme un format de transport : il ne constitue
  jamais une nouvelle source de vérité ni une nouvelle structure du dépôt ;
- indiquer clairement où télécharger l'archive fournie.

### Documents Markdown apportés par l'utilisateur

- tout nouveau fichier `.md` explicitement apporté ou téléchargé par
  l'utilisateur dans le checkout est une source utilisateur intentionnelle ;
  il ne doit jamais être traité comme un artefact disposable ni supprimé
  parce qu'il est untracked ; s'il n'existe pas encore sur `origin/main`, il
  doit être intégré au dépôt et commité localement sur `main` dans son
  emplacement fourni ; sa signature et son push ne sont effectués que sur
  demande explicite de l'utilisateur ; seul un secret, une donnée sensible, un fichier
  manifestement généré ou un contenu tiers non destiné au dépôt peut bloquer
  cette intégration, avec un STOP explicite.

Ne jamais supprimer en masse un fichier untracked, généré ou non canonique
sans établir sa provenance, son rôle, sa régénérabilité et son emplacement
attendu. En cas de doute, le conserver et produire un verdict
`KEEP / MOVE / REINSTALL_ELSEWHERE / DELETE`. Une absence d'import ou de suivi
Git ne suffit pas à justifier une suppression.

## Suppression et dead-code

L'absence de consommateur ou d'import runtime ne prouve pas qu'un module est
supprimable. Vérifier les connaissances métier, pédagogiques, de sécurité ou
réglementaires, configurations, migrations, compatibilités historiques,
fixtures et documents uniques. Rechercher le successeur, migrer explicitement
la valeur utile, supprimer les doublons prouvés et préserver les artefacts
historiques encore nécessaires.

## Principes de restructuration

Avant de créer ou déplacer une responsabilité, vérifier l'emplacement, le
nommage, les dépendances, les cycles, les contrats publics et les frontières
Server/Client. Toute restructuration importante suit :

1. structure physique cohérente et legacy réellement prouvé ;
2. architecture logique, dépendances, responsabilités et testabilité ;
3. garde-fous de gouvernance, dépendances et documentation canonique.

La taille seule n'impose pas une extraction. La politique commune des fichiers
volumineux comporte deux niveaux : `REVIEW_THRESHOLD` (`>500` lignes ou
`>40 KiB`), signal d'audit uniquement, et `HARD_THRESHOLD` (`>1000` lignes ou
`>50 KiB`), dont un nouveau dépassement est bloquant. Aucun de ces seuils ne
déclenche un split automatique. La décision dépend de la cohésion, des
responsabilités, du couplage, de la testabilité et des contrats.

### Modularité préventive

#### Conception avant dette

Avant une implémentation substantielle, identifier les responsabilités que le
changement introduit. Codex ne doit pas :

- implémenter sciemment plusieurs responsabilités durables dans un seul
  fichier avec l'intention de « refactorer plus tard » ;
- considérer qu'un fichier doit d'abord devenir lourd avant de pouvoir être
  modularisé ;
- laisser un TODO ou un backlog de modularisation pour une dette structurelle
  créée par le lot courant lorsque les frontières sont déjà identifiables.

Considérer notamment les familles suivantes :

1. contrats, parsing et validation ;
2. logique métier, calculs, normalisation et dérivations ;
3. accès données, persistence, réseau et providers ;
4. orchestration, état, lifecycle et effets ;
5. présentation, rendu, sérialisation et export.

Si un nouveau module doit porter au moins trois de ces familles de
responsabilités, définir des frontières cohésives dès le premier lot, avant ou
pendant l'implémentation.

#### Déclencheurs précoces de revue

Les déclencheurs suivants imposent une revue de l'architecture avant de
poursuivre :

- `REVIEW_THRESHOLD` dépassé : `REVIEW_REQUIRED`, état d'audit sans décision
  automatique ;
- `HARD_THRESHOLD` dépassé : nouveau dépassement bloquant sauf exception
  explicitement ratifiée par la baseline ;
- lot ajoutant environ 250 lignes ou davantage dans un même fichier ;
- fichier existant au-dessus d'environ 600 lignes auquel le lot ajoute une
  nouvelle responsabilité indépendante ;
- plusieurs sous-flux pouvant être testés ou modifiés indépendamment ;
- présence simultanée de logique pure et d'effets, de provider ou d'UI
  importants dans le même module.

Ces valeurs sont des déclencheurs de revue d'architecture, jamais des tailles
cibles ni une obligation de créer de petits fichiers artificiels. Les statuts
architecturaux autorisés sont `REVIEW_REQUIRED`, `PROACTIVE_SPLIT`,
`COHESIVE_SINGLE_FILE`, `ALREADY_MODULARIZED` et `DEFERRED_SPLIT`. Lorsqu'un
déclencheur est rencontré, choisir avant de poursuivre :

`PROACTIVE_SPLIT`

ou

`COHESIVE_SINGLE_FILE`

`COHESIVE_SINGLE_FILE` exige une justification fondée sur la cohésion, le
couplage, la testabilité et le nombre réel de raisons de changement.
`DEFERRED_SPLIT` exige en plus une raison et un déclencheur explicite de
reprise. `REVIEW_REQUIRED` est un état d'audit, pas une décision. « Le fichier
fonctionne » ou « il reste sous le seuil heavy-files » ne sont pas des
justifications suffisantes.

#### Qualité d'un découpage

- chaque module extrait possède une responsabilité dominante identifiable ;
- préserver un point d'entrée ou une façade lorsque cela protège l'API
  publique, sans utiliser une façade pour masquer de la logique dupliquée ;
- diriger les dépendances vers les responsabilités spécialisées et éviter les
  cycles ;
- placer les tests de logique autour des frontières pures ou métier nouvellement
  créées ;
- ne pas créer mécaniquement `model`, `controller`, `service`, `utils`,
  `shared` ou des sous-composants lorsque la responsabilité correspondante
  n'existe pas ;
- préférer une architecture petite mais extensible à un gros fichier contenant
  toutes les futures variantes.

#### Rapport des lots substantiels

Le rapport d'un lot substantiel doit indiquer :

`ARCHITECTURE_DECISION: PROACTIVE_SPLIT | COHESIVE_SINGLE_FILE | ALREADY_MODULARIZED | DEFERRED_SPLIT`

Lorsqu'un déclencheur précoce a été rencontré, fournir une justification
courte. Si une dette structurelle est volontairement différée pour une raison
de sécurité, de compatibilité ou de manque de caractérisation, la signaler
explicitement :

`STRUCTURAL_DEBT_DEFERRED: <raison précise>`

Il est interdit de différer silencieusement cette dette.

## Sécurité et validation globales

- ne jamais exposer un secret ou `service_role` côté client ;
- ne jamais désactiver RLS ou contourner AuthN/AuthZ pour débloquer un flux ;
- ne pas utiliser de SQL brut dans le code applicatif ;
- valider les entrées non fiables et vérifier les permissions côté serveur ;
- ne pas exposer de stack trace, secret, erreur interne ou détail sensible ;
- préserver les contrats publics, les données, les erreurs et les invariants
  de sécurité existants ;
- tout texte public est en français sauf surface explicitement localisée.

### Proportionnalité des accès communautaires

Les décisions d'accès doivent distinguer explicitement la communication,
l'information et l'entraide de la participation métier, des mutations, des
données sensibles, de l'organisation, de la modération et des privilèges
administratifs. Le moindre privilège protège ces pouvoirs et ces données ; il
n'impose pas un statut métier préalable pour une communication ou une
consultation communautaire lorsque la sécurité réelle ne le requiert pas.

Toute restriction supplémentaire doit être fondée sur un risque concret et
documenter la ressource protégée, le scénario d'abus, l'impact attendu,
l'insuffisance des protections existantes et celle d'une mesure moins
restrictive. Pour une surface d'échange, examiner d'abord la modération, le
signalement, le blocage/exclusion, le rate limiting, l'anti-spam, les limites
de pièces jointes, la journalisation adaptée et les outils d'organisateur ou
de modérateur.

Le runtime observé est la source de vérité du comportement réellement
implémenté ; la documentation et le contrat AuthZ canonique décrivent le
comportement attendu. Un écart entre les deux est une anomalie à analyser et à
corriger. Ne jamais déduire une permission du seul nom d'une route ou d'un
ancien document. Le coût ou la performance ne constitue pas une raison
d'AuthZ. Une page publique et une mutation authentifiée peuvent coexister sans
devenir une seule « route protégée ». L'ouverture d'une surface communautaire
ne doit ni élever un rôle, ni accorder une mutation, une participation métier,
un accès privé, un contournement d'ownership, une modération ou un scope
administratif. Les exigences AuthN, AuthZ, RLS, validation, protection des
données, secrets, audit et anti-abus nécessaires restent inchangées. Le détail
de cette doctrine est canonique dans `CHATGPT.md`, section
« Proportionnalité, confiance et ouverture associative ».

Les règles propres à Next/web, API, Supabase, scripts, mobile, CI/GitHub,
Python et documentation sont portées par les fichiers scoped correspondants.
Les changements SQL, routes API, workflows, maintenance Python et documents
doivent en plus appliquer leur gouvernance locale.

## Charge machine

Ne pas lancer plusieurs commandes lourdes en parallèle. Préférer les contrôles
read-only et ciblés ; exécuter séquentiellement les suites Vitest/Node,
pytest, build, Turbopack et E2E. Ne pas laisser tourner de serveur, watcher,
worker ou processus local après la validation. Ne pas explorer par défaut
`node_modules/`, `.next/`, `.vercel/`, `.playwright-mcp/`,
`.codex-remote-attachments/`, `artifacts/` ou `backups/`.
Si Codex utilise Docker pendant une exécution, fermer proprement Docker
Desktop à la fin, après les validations, et vérifier son arrêt avant le
rapport final ; ne le laisser actif que sur demande explicite de l'utilisateur.

## Validation

Ne jamais annoncer une commande non exécutée comme réussie. Choisir les checks
proportionnels au risque :

```bash
npm run checks:changed
npm run checks
```

La validation complète doit couvrir les garde-fous de gouvernance, tests,
typecheck, lint et build web. Les tests E2E restent explicites. Pour un audit
GitNexus, utiliser exclusivement :

```bash
npm run audit:gitnexus
npm run audit:gitnexus:cycles
```

Ces commandes utilisent `analyze --index-only` puis `status`; ne pas appeler
directement le mode standard qui peut injecter des fichiers de gouvernance.
En cas d'échec : lire l'erreur complète, identifier la cause, corriger le lot
minimal, relancer le check ciblé puis élargir si nécessaire.

## Navigateur et réponse

Ne pas lancer de navigation, capture, audit visuel ou Playwright sans demande
explicite ou obligation locale. Les validations E2E non visuelles restent
autorisées lorsqu'elles sont explicitement requises.

La réponse finale doit être en français, commencer par `Maxence —`, distinguer
faits vérifiés, inférences et incertitudes, lister les fichiers modifiés et
hors périmètre, les validations exactes, les erreurs rencontrées, l'état du
push, les artefacts et les changements parallèles préservés. Ne pas présenter
comme testé ou terminé ce qui ne l'est pas.

Terminer par :

```text
VERDICT_REVIEW: <terminé|partiel|bloqué|échec>
COMMIT: <SHA ou aucun>
PRIMARY_EVIDENCE: <preuves et artefacts principaux>
REMAINING_UNCERTAINTIES: <incertitudes restantes ou aucune>
NEXT_RECOMMENDED_ACTION: <action suivante ou aucune>
```

## Interdictions synthétiques

Il est interdit de créer un dépôt parallèle, d'utiliser `service_role` côté
client, de désactiver RLS, d'exposer des secrets, de contourner une protection
pour obtenir du vert, d'inventer des sources ou chiffres, de laisser des
placeholders ou routes cassées, ou de considérer une ancienne conversation
comme source supérieure au dépôt actuel.

## Contexte de conversation

Si plusieurs chantiers se mélangent ou si une décision importante risque d'être
perdue, ne pas reconstruire approximativement le contexte : fournir une
passation courte avec l'état, le dernier commit, les fichiers, les décisions
et la prochaine étape, puis attendre confirmation avant de continuer.

## Interdiction stricte des copies persistantes hors projet

- La racine de ce dépôt est l’unique emplacement canonique de travail.
- Cette règle prévaut sur toute mention générale d’un répertoire temporaire
  système pour du contenu issu du projet.
- Il est interdit de créer, copier, cloner, snapshotter, exporter ou conserver
  hors de cette racine un fichier ou dossier issu du projet à titre persistant,
  notamment une copie complète, un backup, un staging durable, un clone Git ou
  un worktree.
- Il est également interdit de créer ou d'utiliser un clone Git isolé, même
  éphémère ; la sandbox exceptionnelle de publication ne constitue pas une
  autorisation de clone et doit utiliser un mécanisme qui ne duplique pas le
  dépôt. Si aucun mécanisme conforme n'est disponible, l'opération est
  `BLOCKED`.
- Cette interdiction couvre `%TEMP%`, `%TMP%`, `%LOCALAPPDATA%`, le dossier
  parent `business`, les dossiers frères et tout autre chemin externe.
- Utiliser uniquement un emplacement canonique déjà prévu sous la racine
  (`work/`, `artifacts/` ou `.artifacts/` selon le dépôt) pour les fichiers de
  travail et preuves. Ne jamais diriger volontairement un outil vers `%TEMP%`
  pour y déposer du contenu du projet.
- Si un mécanisme de validation temporaire devient nécessaire, il doit rester
  sous `.artifacts/validation/prepush-candidate/<sha>/` dans cette racine. Une
  copie externe est `BLOCKED`.
- Avant de clôturer, vérifier qu’aucune copie externe n’a été créée par le lot;
  les éventuels artefacts internes générés hors du contrôle de l’agent ne
  constituent pas une autorisation de reproduire ce comportement.

## Sécurité des diagnostics host et des verrous Git

Le fichier `.git/index.lock` ne doit jamais être supprimé par réflexe. Sa
suppression n'est permise qu'après preuve documentée qu'il est stale : fichier
de 0 octet, inchangé depuis au moins 30 secondes, aucun processus Git
mutateur pertinent et aucun `MERGE`, `REBASE`, `CHERRY_PICK` ou `REVERT` actif.
La suppression est alors unique et ciblée. Si le lock réapparaît, arrêter avec
le verdict `HOST_ENVIRONMENT` ; ne pas entrer dans une boucle de suppressions.

Ne jamais tuer globalement `git.exe` ou `fsmonitor`. Identifier le dépôt et le
processus concernés, puis préserver les démons et processus Git étrangers.

Les diagnostics host tels que ProcMon, ETW ou équivalents doivent être filtrés
et bornés dans le temps. Annoncer leur périmètre et le volume attendu et
obtenir une autorisation explicite avant toute capture susceptible de dépasser
1 Go. Ne jamais charger ou parcourir intégralement en Python une capture d'au
moins 500 Mo sans autorisation explicite. Préférer un export filtré, une
fenêtre temporelle courte, une requête native ou un traitement borné ; arrêter
plutôt que provoquer une consommation RAM ou disque non bornée.

Un workaround local de Codex Desktop, notamment `config.toml` ou un mode
Git Review, ne constitue pas un contrat du dépôt et ne doit pas être transposé
dans sa gouvernance.
