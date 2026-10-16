# AGENTS.md — CleanMyMap

## Portée

Ce fichier contient uniquement les invariants universels d’exécution du dépôt.
Toute règle propre à un sous-arbre vit dans le `AGENTS.md` scoped le plus proche.

Héritage canonique :

```txt
AGENTS.md
├── apps/web/AGENTS.md
│   ├── apps/web/src/app/api/AGENTS.md
│   ├── apps/web/supabase/AGENTS.md
│   └── apps/web/scripts/AGENTS.md
├── apps/mobile/AGENTS.md
├── scripts/AGENTS.md
├── .github/AGENTS.md
├── maintenance/python/AGENTS.md
├── documentation/AGENTS.md
└── e2e/AGENTS.md
```

Les règles scoped ajoutent des contraintes locales ; elles ne recopient pas la
gouvernance racine et ne peuvent pas affaiblir un invariant universel.

Ordre de priorité :

1. demande explicite de l’utilisateur ;
2. sécurité, données, authentification et intégrité ;
3. entrée utilisateur explicitement fournie pour le lot courant ;
4. état réel du checkout et contrats actuellement consommés ;
5. `AGENTS.md` racine puis `AGENTS.md` scoped applicables ;
6. documentation canonique spécialisée ;
7. simplicité, maintenabilité, performance et quotas selon le sujet.

Ne jamais préférer une refonte large à une correction ciblée suffisante.

## Canari

Commencer uniquement la réponse finale par `Maxence —`.
Les mises à jour intermédiaires n’utilisent pas ce canari.

## Source de vérité

Le dépôt `maxd4/CleanmyMap` sur `main` est la référence versionnée.
Ne jamais déduire l'identité du dépôt du nom du dossier local.
Utiliser la racine Git (`git rev-parse --show-toplevel`) et le remote configuré
comme références techniques.

## QMD — découverte bornée et source locale prioritaire

QMD est un outil d'aide à la découverte, pas une source de vérité. La collection
CleanMyMap ne doit être analysée ou rafraîchie qu'au plus une fois toutes les
24 heures par défaut. Avant une recherche QMD importante, vérifier l'âge connu
de la collection ; si elle a moins de 24 heures, réutiliser l'index existant
sans lancer `qmd update`. Après 24 heures, `qmd update -c CleanMyMap` peut être
exécuté si QMD apporte une valeur réelle à la découverte.

Le code et les documents exacts du checkout local qui évolue souvent restent
toujours prioritaires sur les résultats QMD. Ne jamais substituer un extrait,
un score ou une embedding QMD à la lecture du fichier réel, de ses callers, de
ses consommateurs, des tests ou des contrats. L'index peut être périmé sans
que cela autorise une décision fondée sur QMD seul. N'exécuter `qmd embed`
qu'après un rafraîchissement autorisé et seulement lorsqu'une recherche
sémantique est réellement nécessaire.

Pour un chemin explicitement ciblé par un fichier fourni par l’utilisateur,
la candidate fournie par l’utilisateur est toutefois l’entrée autoritative du
lot jusqu’à son intégration. `HEAD` et `origin/main` restent des bases de
comparaison ; ils ne doivent jamais servir à écraser cette candidate.

Avant une modification :

- relire l’état courant pertinent ;
- lire le `AGENTS.md` scoped le plus proche ;
- inspecter les contrats, dépendances et tests directement concernés ;
- vérifier les changements locaux préexistants sur les chemins ciblés ;
- ne jamais faire prévaloir une ancienne conversation, un plan, un audit ou une
  ancienne version Git sur une entrée utilisateur explicitement fournie pour le
  lot courant.

### Décision préventive obligatoire avant d’écrire du code

Pour toute nouvelle fonctionnalité ou modification substantielle, décider avant
la première écriture :

1. la responsabilité ajoutée ou modifiée ;
2. son owner canonique actuel ;
3. les responsabilités déjà présentes dans le fichier cible ;
4. sa taille actuelle et sa proximité avec la zone préventive ;
5. la croissance approximative introduite ;
6. ses invariants, effets, consommateurs, état, lifecycle et tests propres ;
7. s’il faut **`EXTEND_EXISTING`**, **`CREATE_MODULE`** ou
   **`RESTRUCTURE_FIRST`**.

Une responsabilité autonome rejoint directement son module définitif ; elle ne
doit pas grossir un point d’entrée historique par commodité. Cette décision est
une trace de conception dans le compte rendu Codex, pas un nouveau statut, une
baseline ou un contrôle bloquant. Elle est recontrôlée après l’implémentation
sur les tailles avant/après, les nouvelles responsabilités, les fonctions et
les dépendances ; une frontière autonome découverte après coup est traitée
dans le même lot avant sa clôture.

Toujours distinguer :

```text
code présent
≠ test présent
≠ test exécuté avec succès
≠ état distant observé
≠ preuve de production
≠ documentation
```

Une preuve ne justifie que ce qu’elle mesure.

### Cadrage transversal avant intégration

Avant le premier changement d'un lot affectant un contrat métier, l'intégrateur
vérifie les voies de mutation, les consommateurs, les transitions d'état et les
dépendances directement pertinentes. Il part des invariants définis avant
l'implémentation, recherche les contournements par d'autres routes, services,
imports, RPC, triggers et tâches, puis cible les tests sur les cas normaux et
contraires. L'exploration reste proportionnée au périmètre ; aucun audit global
n'est imposé à une modification purement locale.

Le plan de validation distingue les preuves statiques, comportementales et
l'intégration réelle. Une transaction PostgreSQL, ses triggers, la concurrence
ou RLS ne sont pas prouvés par des tests de texte ou des mocks : utiliser une
voie PostgreSQL autorisée si elle est disponible, sinon déclarer
`DB_SEMANTICS_NOT_EXECUTED` et conserver explicitement le risque non couvert.

Après publication, classer tout constat en régression introduite, défaut
préexistant critique, amélioration hors périmètre ou hypothèse non démontrée.
Ne corriger immédiatement que ce qui compromet le contrat du lot ou relève
d'un risque critique prouvé. Regrouper les défauts de même cause racine,
respecter la `STOP CONDITION` et ne pas ouvrir un nouveau lot pour chaque
observation périphérique. La méthode détaillée et sa taxonomie appartiennent
à `documentation/development/repo-quality-rules.md` ; les preuves et modes
sont définis dans `documentation/development/TESTING.md`.

Exception de validation `FULL` : lorsqu'un contrôle `FULL` est explicitement
lancé, toute erreur actionnable de ce contrôle doit être corrigée dans
l'exécution courante, même si les fichiers causaux n'appartiennent pas au lot
initial. Elle ne peut pas être laissée rouge sous le classement
`PREEXISTING_CI_FAILURE` ou « hors périmètre ». Les blocages externes ou
environnementaux restent classés `BLOCKED_*` avec leur preuve ; ils ne doivent
ni être masqués ni transformés en succès.

## Modèle d’exécution

Le workflow courant est `MAIN-ONLY / MULTI-WRITER COORDONNÉ`.

- la branche de travail normale est `main` ;
- plusieurs writers Codex peuvent travailler dans le checkout canonique ; ils
  ne doivent jamais écraser silencieusement les changements d’un autre writer ;
- les modifications sur des fichiers distincts peuvent progresser en parallèle ;
  un même fichier, l’index, `HEAD` et les opérations Git mutantes doivent être
  relus et coordonnés explicitement ; la coordination des références Git ne
  donne jamais le droit de réconcilier ou d’écraser le contenu dirty d’un autre
  writer ;
- tout fichier dirty préexistant qui n’est pas explicitement attribué au lot
  courant est présumé appartenir à un autre writer ; ne pas le restaurer,
  supprimer, réécrire, stasher, déplacer ou réconcilier ;
- aucun nouveau worktree, clone, branche de chantier, claim ou coordinateur
  persistant n’est créé pour le workflow normal ;
- le checkout canonique peut rester dirty, contenir des fichiers untracked, des
  commits locaux non publiés ou évoluer pendant une analyse ; ces conditions
  sont normales en multi-writer et ne bloquent pas une lecture ou une
  validation indépendante ;
- main publié = référence versionnée ;
- une candidate locale explicitement fournie ou produite pour le lot courant
  est autoritative pour ce lot jusqu’à intégration ;
- tout changement local préexistant doit être préservé et ne doit jamais être
  écrasé par une synchronisation avec Git.
- un ou plusieurs lots coordonnés peuvent produire des commits locaux sur
  `main` après validation de leurs candidats ;
- le commit est non signé par défaut ;

Hors mode de développement rapide :

```text
validation → commit isolé → push main → vérification de convergence
```

Mode de développement rapide explicitement activé :

```text
commit local selon son protocole, sans push tant que le mode reste actif
```

L’absence de push d’un lot précédent ne bloque pas un nouveau lot local cohérent.

Lors du push :

- auditer toute l’ascendance locale non publiée, y compris les commits d’autres
  writers ;
- vérifier `git diff --cached --name-only` avant le commit et
  `git log --oneline origin/main..HEAD` avant la publication ;
- identifier les fichiers et validations de chaque commit local ; un commit
  multi-responsabilités est publiable seulement si toutes ses parties sont
  identifiées, préservées et validées ;
- appliquer les validations de publication définies par la gouvernance
  spécialisée ;
- si `origin/main` avance pendant le push, attendre de façon bornée, refetcher,
  relire l’ascendance puis resynchroniser sans perte avant une nouvelle tentative
  fast-forward ; ne jamais forcer le push ;
- après publication, vérifier la convergence locale/distante.

### Autorisation ChatGPT Web

ChatGPT Web/Codex est un writer autorisé de ce dépôt. Pour un lot demandé ou
validé par l’utilisateur, il peut créer le ou les commits correspondant(s) et
pousser normalement sur `origin/main` après les validations requises. Avant le
push, il doit vérifier le périmètre staged, l’ascendance de tous les commits
non publiés, l’absence de conflit non résolu et la divergence distante ; après
le push, il doit vérifier la convergence entre `HEAD` et `origin/main`.

Cette autorisation ne couvre ni le force-push, ni la réécriture d’historique, ni
la suppression distante, ni un déploiement ou une autre mutation externe non
explicitement demandée. Une demande explicite de ne pas committer ou de ne pas
pousser prévaut sur cette autorisation.

La mécanique détaillée des scopes Git, hooks, candidats de pré-push et
validations dynamiques appartient à `scripts/AGENTS.md` et
`documentation/development/TESTING.md`.

Les validations du lot distinguent le scope `WORKTREE` des candidats `STAGED`,
`PUSH_CANDIDATE` et `DYNAMIC_CANDIDATE`. Les hooks `pre-commit` et `pre-push`
appliquent ces contrôles sur le candidat exact ; les `fichiers scoped` restent
la source des règles spécialisées de chaque sous-arbre.

### LEGACY / COMPATIBILITY

Les anciens noms, coordinateurs et métadonnées de migration ne décrivent que
l’historique ; ils ne gouvernent aucun nouveau lot et ne doivent pas être
consommés par les guards `CURRENT`.

## Coordination et périmètre des lots

Chaque writer doit identifier les fichiers, contrats et validations de son lot.
Plusieurs responsabilités peuvent coexister dans le même checkout ou dans un
commit lorsque leurs changements sont explicitement identifiés, préservés et
validés ; une présence étrangère n’est pas, à elle seule, un motif de blocage.

### Propreté du lot courant et état partagé

La propreté du worktree n'est pas une condition générale de démarrage d'un
audit. Un audit doit capturer immédiatement le SHA lu, conserver l'état dirty
initial et signaler toute évolution de `HEAD`, de l'index ou du worktree. Il
ne doit ni attribuer silencieusement des fichiers locaux à un SHA Git, ni
supprimer les résultats parce qu'un autre writer a travaillé en parallèle.
La synchronisation avec `origin/main` est une exigence de réconciliation et de
publication, pas un prérequis pour commencer une analyse locale.

Une exécution ne doit jamais se terminer avec un fichier `dirty` ou `untracked`
introduit par le lot courant, ni avec un changement pertinent laissé hors du
commit. Tout fichier pertinent pour le lot courant doit être stagé explicitement
et inclus dans son commit. Les fichiers `dirty` ou `untracked` préexistants et
hors périmètre doivent être préservés, signalés et ne constituent pas un
candidat implicite. Un fichier untracked non pertinent à publier ne peut être
traité par `.gitignore` qu'après vérification qu'il s'agit bien d'un artefact
non canonique, régénérable ou local ; l'entrée `.gitignore` doit elle-même être
ciblée et committée avec le lot. Ne jamais utiliser `.gitignore` pour masquer du
code source, une modification utilisateur ou une dette dont la provenance n'est
pas établie.

- préserver les changements dirty, staged et untracked hors périmètre ;
- les modifications locales non stagées hors périmètre ne bloquent ni le commit
  ni le push lorsqu’elles ne sont pas écrasées et que le candidat exact reste
  vérifiable ;
- stage uniquement les fichiers du candidat courant ;
- ne jamais utiliser `git add -A` par commodité ;
- ne jamais utiliser reset destructif, clean, stash ou force-push pour masquer
  un conflit ou un changement étranger ;
- une erreur étrangère est signalée, pas réparée opportunistement ;
- si un chemin ciblé est dirty et n’est pas explicitement attribué au lot
  courant, ne pas écrire dessus ni reprendre le chantier ; signaler simplement
  que le chemin est indisponible et préserver son contenu ;
- la protection des chemins dirty et untracked étrangers est distincte de la
  synchronisation de l’index, de `HEAD` et des références distantes : seules
  ces références peuvent être réconciliées pour une publication demandée, sans
  modifier les fichiers étrangers ;
- une divergence d’index, de `HEAD` ou de branche distante doit être traitée
  par attente bornée, refetch et intégration non destructive lorsqu'une
  publication ou une réconciliation est demandée ; elle ne bloque pas une
  analyse indépendante. Un conflit non résolu reste bloquant pour la
  publication et ne doit jamais être masqué.

Un fichier supplémentaire directement nécessaire à la même responsabilité
n’est pas un nouveau chantier : adapter callers, consommateurs, tests, types ou
documentation directement affectés lorsque le checkout réel le démontre.

## Protection des entrées utilisateur et des changements préexistants

Cette section prévaut sur toute instruction générale de restauration,
normalisation, synchronisation ou convergence avec `HEAD`.

### Fichier fourni pour créer ou remplacer un chemin du dépôt

Lorsqu’un utilisateur fournit explicitement un fichier destiné à créer,
remplacer ou mettre à jour un chemin du dépôt :

- considérer ce fichier comme la candidate autoritative de ce chemin pour le
  lot courant ;
- préserver son contenu source intact ;
- ne jamais le reconstruire depuis `HEAD`, `origin/main`, un ancien commit, une
  ancienne conversation, un snapshot ou une copie supposée équivalente ;
- ne jamais utiliser `git checkout`, `git restore`, reset, clean ou une
  régénération depuis Git pour annuler son contenu ;
- si le nom du fichier fourni diffère du chemin cible, conserver explicitement
  la correspondance source → cible demandée par l’utilisateur ;
- si le remplacement demandé est exact, vérifier après écriture que le contenu
  cible correspond à la candidate fournie avant staging ;
- si l’utilisateur demande une adaptation plutôt qu’un remplacement exact,
  limiter les écarts aux transformations demandées et préserver le reste du
  contenu fourni ;
- lorsque l’objectif du lot est précisément d’intégrer ce fichier, inclure le
  chemin cible dans le commit isolé du lot après validation au lieu de laisser
  cette intégration comme changement local non committé.

Un fichier utilisateur untracked n’est jamais un déchet, un artefact disposable
ou une preuve qu’il faut restaurer la version Git précédente.

### Chemin déjà modifié avant le lot

Avant d’écrire un chemin ciblé, vérifier son état local par rapport à `HEAD`.

Si ce chemin contient déjà des changements non attribuables avec certitude au
lot courant :

- ne pas les écraser ;
- ne pas restaurer la version Git ;
- ne pas tenter une fusion automatique qui pourrait perdre du contenu ;
- arrêter la mutation de ce chemin et signaler le conflit d’attribution.

`HEAD` est la baseline versionnée ; il n’est pas plus autoritatif qu’un
changement utilisateur local explicitement fourni ou déjà présent.

### Vérification avant commit

Avant de committer un fichier provenant d’une entrée utilisateur :

- vérifier le diff exact du chemin cible ;
- vérifier qu’aucune partie non demandée du contenu utilisateur n’a disparu ;
- vérifier qu’aucun autre fichier utilisateur n’a été supprimé, restauré ou
  réécrit pour « nettoyer » le lot ;
- si le remplacement devait être exact, vérifier l’identité de contenu entre
  la candidate fournie et le chemin cible.

En cas de doute sur une perte de contenu utilisateur, STOP avant commit.

## Règles de modification

Privilégier le plus petit changement cohérent qui résout le problème réel.

Ordre de préférence :

```text
contrat canonique existant
→ extension d’une primitive existante
→ primitive nouvelle justifiée
→ compatibilité bornée
→ exception locale seulement si indispensable
```

Éviter :

- logique dupliquée ;
- seconde source de vérité ;
- abstraction anticipée sans besoin démontré ;
- service, table ou dépendance nouvelle sans valeur durable ;
- refactor voisin sans lien avec la cause traitée ;
- changement métier uniquement destiné à faire passer un test ou un garde-fou.

Pour une erreur locale évidente, corriger directement avec la preuve adaptée.
Rechercher une cause systémique lorsque le défaut révèle un contrat insuffisant,
se répète ou peut raisonnablement apparaître ailleurs.

## Propriété sémantique et recherche de collision

Avant de créer une formule, un seuil, un statut, un score, un classement, un
badge, une catégorie, une règle de décision, une constante métier, un type
public, une table, une RPC ou un vocabulaire utilisateur :

- rechercher le nom prévu, ses synonymes, les valeurs caractéristiques et les
  owners du même domaine dans le code, les tests et la documentation canonique ;
- identifier l'owner CURRENT éventuel et son état `CURRENT`, `COMPATIBILITY`,
  `TARGET` ou `LEGACY` ;
- étendre le contrat canonique lorsque c'est possible, plutôt que créer une
  seconde définition parce qu'elle est plus pratique localement.

Une règle métier durable possède un owner unique. Une abstraction n'est
justifiée que si elle centralise un invariant réel ou supprime une duplication
de connaissance. Avant extraction, pouvoir répondre :

```text
Quel invariant devient propriétaire de ce module ?
Quels consommateurs doivent évoluer ensemble ?
Quelle divergence devient impossible après l'extraction ?
```

Si ces réponses ne sont pas claires, conserver temporairement les
implémentations séparées et classifier le cas pour revue. Les règles chiffrées,
les identités métier et les assertions de leurs tests sont précisées dans les
instructions scoped de l'application et dans `documentation/development/TESTING.md`.

## Exports, types et façades

Les symboles sont privés par défaut. Un `export` n'est justifié que par un
consommateur cross-file actuel ou par un contrat public/une compatibilité
explicitement identifiée et vérifiable ; un type ne doit jamais être exporté
uniquement « pour plus tard ».

Les imports doivent viser l'owner canonique du symbole. Ne pas créer ou
conserver un `index.ts`, un barrel, une façade ou un re-export intermédiaire
par commodité : après un déplacement ou un refactor, fermer l'ancien alias ou
re-export dès qu'aucun contrat ne le nécessite.

## Modularité et suppressions

La taille seule ne justifie jamais une extraction.

Une modularisation doit améliorer une frontière réelle : responsabilité,
cohésion, testabilité, dépendances, contrat public ou réutilisation utile.
Les seuils, statuts et politiques quantitatives sont définis dans
`documentation/development/conventions-modularisation.md` et les contrôles
sous `scripts/`.

### Décision préventive avant création ou modification substantielle

Toute nouvelle fonctionnalité ou modification substantielle doit être relue
avant écriture avec la question suivante :

> Est-ce une extension cohésive d'une responsabilité existante, ou une
> responsabilité autonome qui mérite son propre module ?

Identifier au minimum la responsabilité apportée, son owner canonique, les
responsabilités déjà présentes dans le fichier envisagé, les dépendances et
consommateurs concernés, ainsi que la croissance et la complexité introduites.

- **Extension d'un owner existant** : rester dans le module canonique lorsque
  la logique appartient réellement à son contrat et reste cohésive.
- **Responsabilité autonome** : créer directement le module à son emplacement
  définitif lorsque le changement porte notamment sur un calcul, une
  validation, une transformation, un accès réseau/persistance, une
  orchestration d'effets, un hook à lifecycle indépendant, une sous-vue
  autonome ou un contrat de domaine distinct.
- **Fonctionnalité multi-responsabilités** : définir d'abord les frontières
  entre point d'entrée, logique métier, effets/persistance, présentation et
  tests ; ne pas écrire un monolithe provisoire dans l'intention de le
  découper ensuite.
- **Frontière artificielle** : conserver l'extension dans le fichier existant
  lorsqu'un nouveau module n'apporterait qu'indirection, exports, couplage ou
  navigation sans gain structurel démontré.

Cette règle est préventive : elle ne crée pas un fichier par fonction, ne
transforme pas les seuils informatifs en déclencheurs automatiques et ne
justifie jamais une seconde source de vérité, un barrel ou une façade sans
consommateur. Les nouvelles frontières doivent rester compatibles avec les
contrats AuthN/AuthZ, serveur/client, persistance et présentation existants.
La convention détaillée, ses exemples et sa vérification vivent dans
`documentation/development/conventions-modularisation.md`.

Les seuils de surveillance restent ceux du contrôle canonique : runtime à
partir de 300 lignes, tests à partir de 600 lignes, et revue qualitative pour
data/config ; REVIEW reste au-delà de 500 lignes ou 40 KiB pour le runtime,
au-delà de 1 000 lignes ou 50 KiB pour les tests, et selon les seuils existants
pour data/config. Ce sont des signaux de revue, jamais des déclencheurs
automatiques de découpage. Une croissance fonctionnelle significative dans la
zone préventive exige toutefois une décision explicite avant acceptation.

La réduction de la taille d'un fichier n'est jamais une preuve suffisante de
modularisation. Toute création, modification substantielle, extraction ou
déplacement de code est relu à deux niveaux : le module ou fichier, puis les
fonctions, méthodes, composants et handlers internes concernés.

Après toute écriture ou tout déplacement, relire les fonctions créées,
déplacées ou substantiellement modifiées et vérifier leur responsabilité,
leurs étapes logiques, leurs effets de bord et leurs frontières extractibles.
Ne jamais transformer un monolithe de fichier en monolithe de fonction. Ne
jamais déplacer intacte une grosse fonction uniquement pour passer un seuil
top-heavy. Décomposer lorsqu'une fonction contient plusieurs responsabilités
autonomes. Conserver une fonction longue uniquement lorsqu'elle constitue
réellement un algorithme ou un pipeline cohésif et que l'extraction dégraderait
sa cohésion. Toute fonction touchée ne doit pas devenir plus longue ou plus
complexe sans nécessité contractuelle démontrée.

### Réparation obligatoire lorsqu'un ratchet bloque

Lorsqu'un ratchet de longueur de fonction ou de poids de fichier s'active et
bloque un contrôle `FULL` ou une vérification ciblée explicitement justifiée,
la correction
doit modulariser substantiellement la zone concernée : extraire une
responsabilité cohésive dans un nouveau fichier avec un owner, un contrat et
des tests adaptés, puis migrer ses consommateurs. Condenser des lignes,
modifier la mise en forme, raccourcir des noms, déplacer des commentaires ou
réduire artificiellement le fichier juste sous le seuil est interdit. Une
fonction ou un bloc monolithique ne doit pas être déplacé intact dans le
nouveau fichier.

Cette exigence s'applique à toute modification introduite pour débloquer le
garde-fou, même si le résultat repasse techniquement sous le seuil. Si aucune
frontière de modularisation réelle et sûre n'est identifiable, le lot doit
rester bloqué et le rapporter plutôt que contourner le ratchet.

Avant de supprimer ou remplacer un élément, vérifier qu’il ne porte pas encore :

- une connaissance métier ou de sécurité unique ;
- une configuration ou migration ;
- une compatibilité ou un consommateur externe ;
- une fixture, une provenance ou un historique nécessaire ;
- une entrée utilisateur ou un changement local à préserver.

L’absence d’import runtime ne suffit pas à prouver qu’un élément est supprimable.

### Cycle de vie du code dormant

L'absence de consumer CURRENT ne suffit pas à démontrer qu'une fonctionnalité
doit être supprimée. Avant suppression, classifier lorsque pertinent :

```text
CURRENT
IMPLEMENTED_NOT_EXPOSED
COMPATIBILITY
TARGET
LEGACY
DELETE_PROVEN
```

Une capacité `IMPLEMENTED_NOT_EXPOSED` doit avoir une raison de conservation,
un owner identifiable, une condition d'activation et un test ou contrat qui
protège la capacité conservée. Une capacité sans consumer, contrat,
documentation produit ni raison démontrée de réactivation reste candidate à
`DELETE_PROVEN`, selon la qualification dead-code ci-dessous.

### Qualification obligatoire du dead-code

Avant toute mutation motivée par Knip ou le dead-code, chaque finding du
périmètre doit être qualifié avec exactement l’un des statuts suivants :

```text
DELETE_PROVEN
INTERNALIZE
MIGRATE
RESTORE_FUNCTIONALITY
KEEP_JUSTIFIED
```

- `DELETE_PROVEN` : élément réellement inutile après vérification des
  consommateurs statiques et dynamiques, tests, scripts, documentation,
  contrats et connaissances uniques ;
- `INTERNALIZE` : implémentation utile, mais export public inutile ;
- `MIGRATE` : valeur utile à transférer vers la source canonique ou le
  successeur avant suppression ;
- `RESTORE_FUNCTIONALITY` : capacité produit, métier ou scientifique
  pertinente mais mal branchée, incomplète ou devenue inaccessible ; elle ne
  doit pas être supprimée pour satisfaire Knip ;
- `KEEP_JUSTIFIED` : conservation nécessaire avec une justification
  vérifiable.

Seul `KEEP_JUSTIFIED` peut être protégé durablement. Les protections sont
enregistrées dans `scripts/checks/dead-code-justifications.json` par l'ID stable
d'un finding déjà présent dans `scripts/checks/dead-code-baseline.json`, avec
une raison, une preuve vérifiable et un SHA complet de revue. Le finding doit
rester exactement présent dans le rapport Knip courant ; toute disparition ou
modification d'identité produit `STALE_KEEP_JUSTIFIED` et bloque jusqu'à une
requalification explicite. Une entrée du registre ne peut jamais couvrir un
finding absent de la baseline ni un finding nouveau. `DELETE_PROVEN`,
`INTERNALIZE`, `MIGRATE` et `RESTORE_FUNCTIONALITY` restent actionnables et ne
peuvent pas être transformés en protection durable. Les futurs lots dead-code
visent 60 à 100 findings actionnables corrigés ; les `KEEP_JUSTIFIED` n'entrent
pas dans cette cible.

Interdictions :

- transformer un finding Knip directement en suppression sans qualification ;
- supprimer une fonctionnalité pertinente uniquement parce qu’elle n’a plus de
  caller ;
- viser artificiellement « zéro finding » au prix d’une perte fonctionnelle.

La cible d’un lot dead-code est d’avoir zéro finding non qualifié dans son
périmètre, puis de réduire Knip uniquement par des décisions sûres.

### Qualification obligatoire de la duplication

Avant toute mutation motivée par jscpd, lire le rapport courant et identifier
les deux occurrences réelles de chaque clone étudié. Regrouper les fingerprints
qui relèvent d’une même responsabilité en familles, puis qualifier chaque
famille avec exactement l’un des statuts suivants :

```text
MIGRATE_TO_CANONICAL
CENTRALIZE_OWNER
DELETE_PROVEN
KEEP_INTENTIONAL
TEST_SHARED_HARNESS
NO_ACTION_NOISE
```

- `MIGRATE_TO_CANONICAL` : un owner CURRENT existe ; les consommateurs doivent
  migrer vers lui avant de supprimer la copie ;
- `CENTRALIZE_OWNER` : plusieurs implémentations portent la même connaissance
  ou règle durable et aucun owner canonique suffisant n’existe ;
- `DELETE_PROVEN` : la copie est devenue obsolète après vérification des
  consommateurs statiques et dynamiques, contrats, tests et compatibilités ;
- `KEEP_INTENTIONAL` : la répétition reste nécessaire pour l’autonomie, la
  lisibilité, la sécurité, une preuve indépendante ou des sémantiques
  distinctes ;
- `TEST_SHARED_HARNESS` : l’élément est une infrastructure de test réellement
  commune, sans y déplacer les assertions métier ou de sécurité ;
- `NO_ACTION_NOISE` : la similarité est textuelle et aucune amélioration
  architecturale démontrable ne résulte d’une extraction.

Une extraction n’est jamais justifiée par le seul fait de faire disparaître un
clone jscpd. Avant `CENTRALIZE_OWNER`, documenter l’invariant dont le module
devient propriétaire, les consommateurs qui doivent évoluer ensemble et la
divergence fonctionnelle que la centralisation empêchera. Si ces éléments ne
sont pas démontrés, conserver les implémentations et qualifier
`KEEP_INTENTIONAL` ou `NO_ACTION_NOISE`.

Toute qualification CURRENT `KEEP_INTENTIONAL` ou `NO_ACTION_NOISE` décidée
dans un lot de duplication doit être ajoutée ou mise à jour dans
`scripts/checks/duplication-justifications.json` dans le même lot, avec raison,
preuve des deux occurrences réelles et SHA complet de revue. Une décision
durable ne doit pas rester uniquement dans un compte-rendu de prompt.

Règles de clôture et de requalification :

- une entrée persistée est indexée par `scope:fingerprint` ; une
  requalification met à jour cette entrée au lieu d'en créer une seconde ;
- chaque entrée conserve les six champs `scope`, `fingerprint`,
  `classification`, `reason`, `evidence` et `reviewedRef` ; `reason` décrit la
  décision propre à la famille étudiée, `evidence` cite les deux occurrences
  CURRENT et `reviewedRef` est le SHA complet effectivement inspecté ;
- le lot ne peut pas être clôturé avec une décision durable présente seulement
  dans un rapport, une conversation ou un commentaire de revue ;
- avant le commit, exécuter le contrôle duplication sur le candidat final et
  vérifier que la décision est présente dans le registre, que son fingerprint
  est CURRENT et qu'aucun stale durable n'est introduit.

La priorité de traitement est :

```text
P0 sécurité/AuthN/AuthZ/RLS/scope/ownership/règle sensible
P1 plusieurs sources de vérité métier
P2 duplication runtime domaine/persistance/API
P3 infrastructure runtime réutilisable
P4 infrastructure de harness de test
P5 duplication intentionnelle
P6 bruit textuel
```

Exécuter P0 → P1 → P2 → P3 avant P4, sauf lorsqu’un changement de test est
nécessaire pour protéger une famille runtime. Pour une famille mixte runtime et
tests, traiter d’abord l’owner runtime. P5 et P6 ne sont pas des objectifs de
réduction et aucun quota arbitraire de clones ou de lignes ne justifie une
mutation.

## Limite mobile des lots dead-code et duplication

Dans tout lot de qualification ou de correction `dead-code` ou `duplication`,
ne pas modifier les fichiers issus de l’application mobile, notamment ceux
sous `apps/mobile/**`. Ces fichiers peuvent être inspectés, mesurés et
qualifiés pour expliquer un résultat global, mais ils ne doivent pas être
supprimés, déplacés, internalisés, refactorés ou réécrits pour faire baisser un
finding.

Un finding mobile ne doit pas non plus entraîner la modification d’une
baseline, d’une justification, d’une exclusion, d’un seuil ou d’une grâce dans
un lot non mobile. Toute correction mobile `dead-code` ou `duplication` doit
faire l’objet d’un lot séparé explicitement demandé et respecter
`apps/mobile/AGENTS.md`. Dans le lot courant, le finding mobile reste donc
audité et signalé comme hors périmètre, jamais masqué ni acquis par un ratchet.

Une demande utilisateur explicite qui nomme `apps/mobile` comme surface à
corriger constitue une autorisation bornée pour ce lot uniquement. Elle permet
de traiter les findings mobiles directement concernés, après lecture de
`apps/mobile/AGENTS.md`, sans ouvrir d’autres fichiers mobiles ni modifier une
baseline, une justification, une exclusion, un seuil ou une grâce pour masquer
un finding. Les validations mobiles ciblées restent obligatoires.

## Amélioration opportuniste des ratchets

Lorsqu’un lot touche déjà un fichier contenant un export inutile ou un clone
historique, cette dette directement concernée peut être réduite dans le même
lot si la correction reste locale, sûre, cohésive et facile à valider. Cette
règle ne transforme pas un finding en suppression sans qualification et ne
justifie pas un refactor transverse.

Ne jamais, pour améliorer une métrique :

- élargir artificiellement le lot en refactor transversal ;
- modifier un contrat métier, API, données, AuthN/AuthZ ou UI sans nécessité ;
- relever une baseline ou un seuil ;
- ajouter une exclusion ;
- réduire le scope mesuré ;
- déplacer artificiellement du code ;
- créer une abstraction générique uniquement pour satisfaire jscpd ;
- ajouter des tests sans valeur comportementale.

Une dette hors périmètre reste hors lot. Si elle doit être différée pour une
raison non évidente, le signaler brièvement.

Aucun champ de rapport systématique tel que `RATCHET_OPPORTUNITY` n’est requis.
Les seuils et politiques restent canoniques dans leurs contrôles spécialisés.

## Sécurité

Invariants non négociables :

- ne jamais exposer un secret, token, cookie, session ou credential ;
- `service_role` reste côté serveur/outillage autorisé ;
- ne jamais désactiver RLS ou contourner AuthN/AuthZ pour débloquer un flux ;
- valider les entrées non fiables et les permissions côté serveur ;
- préserver ownership, scope et séparation des privilèges ;
- ne pas exposer de stack trace ou détail interne sensible au client ;
- toute mutation distante ou destructive doit être explicitement autorisée,
  sauf l'application automatique des migrations Supabase canoniques dans le
  cadre borné ci-dessous.

### Autonomie bornée des migrations Supabase

L'application d'une migration versionnée depuis
`apps/web/supabase/migrations/` est autorisée sans demander une confirmation
supplémentaire lorsqu'elle fait partie du workflow normal du dépôt. Elle doit
être exécutée dès que possible après les contrôles suivants :

- la cible Supabase explicitement liée est identifiée et visible par le CLI ;
- `npx supabase migration list --linked` a été comparé à l'arbre Git courant ;
- `npx supabase db push --dry-run` confirme la liste exacte des migrations à
  appliquer ;
- aucune divergence d'historique, cible ambiguë, migration en échec non
  qualifiée ou précondition SQL non résolue n'est ignorée ;
- les contrôles de sécurité et de schéma pertinents sont exécutés avant puis
  après l'application ;
- la convergence de l'historique distant et des objets attendus est vérifiée.

Cette délégation ne couvre pas `migration repair`, une DDL SQL manuelle, un
reset ou seed destructif, une suppression de données, une modification de
secret, ni une autre mutation distante hors migration versionnée. Une erreur
de migration bloque l'automatisation ; elle ne doit pas être contournée par un
repair ou un push aveugle.

Les décisions d’ouverture ou de restriction des surfaces communautaires suivent
la doctrine canonique de `CHATGPT.md`, section
« Proportionnalité, confiance et ouverture associative ». Elles ne peuvent pas
affaiblir les exigences AuthN, AuthZ, RLS, validation, protection des données,
secrets, audit et anti-abus.

Les règles spécialisées de sécurité et d’accès vivent dans
`documentation/security/`, `apps/web/AGENTS.md`,
`apps/web/src/app/api/AGENTS.md` et `apps/web/supabase/AGENTS.md`.

### Deception de sécurité

Un honeypot, honeytoken, decoy ou canary de sécurité est un contrôle actif de
détection, jamais du dead-code de diversion. Les honeypots anti-spam qui
participent au traitement d'un formulaire restent des protections anti-abus
normales. Tout futur leurre cybersécurité doit avoir une entrée précise, aucun
privilège ni secret réel, aucun effet métier, un monitoring exploitable, un
owner, des tests positifs et négatifs et une documentation `CURRENT` ; son
absence de consumer normal ne suffit pas à le conserver. Le registre
`scripts/checks/security-deception-registry.json` et
`npm run check:security-deception` gardent ce contrat sans affaiblir Knip,
jscpd, CodeQL, Semgrep ou Secret Scanning. La source canonique détaillée est
`documentation/security/SECURITY.md`.

## Code Review Rules

### Préservation des changements utilisateur

- Signaler comme bloquant toute modification qui restaure, remplace ou supprime
  un contenu utilisateur préexistant sans instruction explicite.
- Un fichier fourni par l'utilisateur pour créer ou mettre à jour un chemin du
  dépôt est autoritatif pour ce lot : ne pas accepter une restauration depuis
  `HEAD`, `origin/main` ou un ancien commit.
- Signaler toute perte de contenu dirty ou untracked qui existait avant le lot.

### Sécurité et données

- Signaler tout affaiblissement d'AuthN, AuthZ, RLS, ownership ou scope.
- Signaler toute utilisation de `service_role` côté client ou toute exposition
  de secret, session ou détail interne sensible.
- Une migration Supabase déjà appliquée ne doit jamais être réécrite pour
  corriger le runtime : utiliser une migration forward-only.

### Sources de vérité

- Signaler l'introduction d'une seconde source de vérité lorsque le dépôt
  possède déjà un contrat canonique pour la même donnée ou règle.
- Signaler un changement de comportement métier introduit uniquement pour
  satisfaire un test, une baseline ou un ratchet.

### Portée

- Signaler les refactors voisins sans lien direct avec la responsabilité du lot.
- Ne pas signaler comme problème une dette hors périmètre qui reste inchangée.

## Documentation et artefacts

Une règle durable possède une source canonique unique.

- préférer un lien à une copie ;
- distinguer `CURRENT`, `PLAN`, `AUDIT`, `HISTORY`, `SNAPSHOT`, `ADR` et
  `GENERATED` ;
- mettre à jour la documentation `CURRENT` directement rendue fausse par un
  changement durable ;
- ne pas créer un document si une source canonique existante peut absorber la
  connaissance ;
- un artefact généré, une capture ou un rapport ne devient pas une source de
  vérité.

La structure, les zones protégées et la politique documentaire détaillée sont
gouvernées par `documentation/AGENTS.md`.

Une pièce jointe ou un document fourni par l’utilisateur doit toujours être
préservé. Sa seule présence dans le checkout n’impose pas son commit si elle est
hors périmètre. Lorsqu’il est explicitement fourni pour mettre à jour un fichier
du dépôt, appliquer la section « Protection des entrées utilisateur ».

La racine du dépôt reste l’unique emplacement canonique du projet. Ne pas créer
de clone, worktree ou copie persistante du projet hors de cette racine.
Les détails de diagnostic host et de fichiers temporaires sont documentés dans
`documentation/development/host-environment.md`.

## Validation

Ne jamais annoncer une validation non exécutée comme réussie.

`precommit:guard` est une barrière bloquante du lot : dès qu'il échoue,
diagnostiquer sa sortie, corriger la cause dans le même lot et le relancer
avant tout commit ou push. Ne pas attendre une nouvelle demande de l'utilisateur
pour effectuer cette correction. Si la réparation exige une autorité nouvelle,
une extension de périmètre ou rencontre un blocage externe/preexistant qui ne
peut pas être corrigé sans risque, s'arrêter en documentant précisément le
blocage plutôt que contourner ou désactiver le garde.

La validation est proportionnelle au risque :

```text
preuve ciblée
→ contrat partagé si concerné
→ sécurité / régression si concernée
→ validations plus larges si le blast radius le justifie
```

Commencer par la preuve la plus ciblée utile. Ne pas relancer une suite lourde
identique sur le même candidat sans raison.

- Un prompt de correction, refactor, audit, duplication, dead-code, documentation ou maintenance ordinaire ne doit pas inclure `npm run checks:full` par défaut.
- L’absence de `checks:full` dans un lot normal n’est pas une validation manquante.
- La validation normale est : preuves ciblées → contrats concernés → sécurité/régression concernée → `checks:fast` uniquement si le blast radius le justifie.
- `checks:full` / mode `FULL` est autorisé uniquement :
  1. dans un prompt explicitement dédié à `checks:full` ;
  2. dans une préparation immédiate et explicitement demandée de déploiement Vercel.
- `checks:full` ne peut jamais être une STOP CONDITION ou un critère de clôture générique d’un lot ordinaire ; `release:check` exige en plus le SHA exact et une preuve FULL persistée.
- Si un prompt demande `checks:full` hors de ces deux cas, ne pas l’exécuter : retourner `NOT_RUN_POLICY` et poursuivre avec les validations proportionnées.

### Boucle de prévention des récidives

Toute tâche qui corrige une régression, une erreur de revue, un lot déclaré
terminé mais incomplet, une validation trompeuse ou insuffisante, une erreur
répétée de conception, de type, de sécurité, de données ou de test, ou un
micro-correctif de suivi déclenche dans le même lot la boucle décrite dans
`documentation/development/repo-quality-rules.md`. Le déclenchement dépend de
la nature de la demande, pas de ses mots-clés ; il n'ouvre pas automatiquement
un second chantier.

La politique canonique est donc : `DEVELOPMENT` (`checks:fast`) pour le travail
courant ciblé, `FULL` (`checks:full`) pour une exécution globale explicitement
demandée, puis `RELEASE` (`release:check -- --sha=<sha>`) pour vérifier qu'un SHA
précis possède la preuve FULL requise. `RELEASE` n'est pas une commande de
déploiement.

Pendant `DEVELOPMENT`, une extraction, une création de module, une modification
d'import ou une opération de refactor ne déclenche automatiquement aucun des
contrôles `quality:cycles`, `quality:duplication`, `quality:complexity`,
`quality:dead-code` ou `quality:top-heavy`, y compris avant staging, commit,
push ou clôture du lot. Codex doit prévenir les cycles, duplications évitables
et fonctions inutilement complexes par une conception rigoureuse ; une
vérification ciblée reste possible lorsqu'un risque concret le justifie, sans
devenir une condition systématique.

En `FULL`, ces contrôles sont obligatoires sur le candidat final. Toute
modification du code après leur exécution invalide les preuves concernées et
impose leur actualisation avant `RELEASE`.

GitNexus reste un accélérateur facultatif de découverte pendant `DEVELOPMENT` :
il ne remplace ni le code actuel, ni les contrats, ni TypeScript, ni les tests,
et ne crée aucun contrôle bloquant de hook. Pour une modification transversale,
la procédure ciblée et la vérification de fraîcheur de l'index sont canoniques
dans `documentation/development/TESTING.md`. Pour le périmètre actuellement
déclaré par le porteur du projet — projet étudiant, non commercial et orienté
protection de l'environnement — l'usage de GitNexus `1.6.12` est qualifié
`LICENSE_AUTHORIZED_FOR_CURRENT_USE` au titre des usages non commerciaux et des
catégories éducatives ou de protection de l'environnement prévues par PolyForm
Noncommercial 1.0.0. Cette qualification n'autorise pas un usage commercial
ultérieur sans nouvelle vérification ; l'installation ou le MCP actif ne
constitue pas à lui seul une autorisation.

Un lot ne peut pas être déclaré terminé avec une conséquence imputable non
qualifiée : `BASELINE_STALE` complexity, nouveau dead-code, nouveau cycle,
nouvelle duplication actionnable, export ou façade devenue inutile, ou
fonction déplacée qui reste inutilement multi-responsabilités.

Les modes, commandes, budgets, scopes Git, E2E et politiques de qualité sont
canoniques dans :

```txt
documentation/development/TESTING.md
scripts/AGENTS.md
e2e/AGENTS.md
```

Ne pas lancer plusieurs validations lourdes concurrentes sur le poste.
Ne pas laisser tourner serveur, watcher, worker ou processus local après le lot.

## Routage des règles spécialisées

| Sujet                                 | Source principale                                         |
| ------------------------------------- | --------------------------------------------------------- |
| Web / Next / UI / navigateur          | `apps/web/AGENTS.md`                                      |
| Routes API                            | `apps/web/src/app/api/AGENTS.md`                          |
| Supabase / migrations                 | `apps/web/supabase/AGENTS.md`                             |
| Scripts web opératoires               | `apps/web/scripts/AGENTS.md`                              |
| Contrôles, hooks, scopes Git, qualité | `scripts/AGENTS.md`                                       |
| GitHub Actions / Dependabot / CodeQL  | `.github/AGENTS.md`                                       |
| Mobile                                | `apps/mobile/AGENTS.md`                                   |
| Python maintenance                    | `maintenance/python/AGENTS.md`                            |
| Documentation                         | `documentation/AGENTS.md`                                 |
| E2E / Playwright                      | `e2e/AGENTS.md`                                           |
| AuthN / AuthZ / RLS                   | `documentation/security/`                                 |
| Tests et validation                   | `documentation/development/TESTING.md`                    |
| Modularisation                        | `documentation/development/conventions-modularisation.md` |
| Environnement host                    | `documentation/development/host-environment.md`           |

Consulter uniquement les sources spécialisées réellement concernées par le lot.

## Réponse finale

La réponse finale est en français et commence par `Maxence —`.

Elle reste concise et factuelle. Ne pas imposer de formulaire encyclopédique.
Mentionner seulement ce qui sert à la suite :

- résultat du lot ;
- commit créé, s’il existe ;
- blocage, déviation ou incertitude restante ;
- validation importante lorsqu’elle n’est pas évidente ou qu’elle a échoué.

Ne pas recopier systématiquement la liste complète des fichiers, toutes les
commandes exécutées, les invariants inchangés ou des champs `PASS/NOT_RUN`
lorsqu’ils sont déjà visibles dans l’exécution.

## Principe directeur

Le but n’est pas de produire davantage de code, de documentation, de prompts
ou de rapports.

Le but est d’obtenir un produit plus utile et un dépôt plus simple, sûr,
maintenable, cohérent et vérifiable, sans inventer de preuve, écraser une entrée
utilisateur ni créer de seconde source de vérité.
