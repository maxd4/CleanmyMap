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

## Modèle d’exécution

Le workflow courant est `MAIN-ONLY / SINGLE-WRITER`.

- la branche de travail normale est `main` ;
- un seul chantier peut écrire à la fois dans le checkout partagé ; les lots restent coordonnés pour éviter les régressions.
- aucun nouveau worktree, clone ou branche de chantier n’est créé pour le
  workflow normal ;
- l'état local est prioritaire sur l'etat github
- un lot terminé produit un au moins commit local sur `main` après validation de
  son candidat ;
- le commit est non signé par défaut ;
- le push est toujours effectué sauf en cas de mode de développement rapide.

L’absence de push d’un lot précédent ne bloque pas un nouveau lot local cohérent.

Lors du push :

- auditer l’ascendance locale non publiée ;
- vérifier `git diff --cached --name-only` avant le commit et
  `git log --oneline origin/main..HEAD` avant la publication ;
- vérifier qu’aucun commit étranger ou non validé ne serait embarqué ;
- appliquer les validations de publication définies par la gouvernance
  spécialisée ;
- après publication, vérifier la convergence locale/distante.

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

## Isolation du lot

Un lot ne contient que les changements attribuables à sa responsabilité.

### Propreté obligatoire du worktree

Une exécution ne doit jamais se terminer avec un fichier `dirty` ou `untracked`
laissé dans le worktree. Tout fichier pertinent pour le lot courant doit être
stagé explicitement et inclus dans son commit. Un fichier untracked dont le
contenu n'est pas pertinent à publier ne peut être traité par `.gitignore`
qu'après vérification qu'il s'agit bien d'un artefact non canonique,
régénérable ou local ; l'entrée `.gitignore` doit elle-même être ciblée et
committée avec le lot. Ne jamais utiliser `.gitignore` pour masquer du code
source, une modification utilisateur ou une dette dont la provenance n'est pas
établie.

- préserver les changements dirty, staged et untracked hors périmètre ;
- les modifications locales non stagées hors périmètre ne bloquent ni le commit
  ni le push ;
- stage uniquement les fichiers du candidat courant ;
- ne jamais utiliser `git add -A` par commodité ;
- ne jamais utiliser reset destructif, clean, stash ou force-push pour masquer
  un conflit ou un changement étranger ;
- une erreur étrangère est signalée, pas réparée opportunistement ;
- si un fichier ou un contrat est modifié concurremment, ou si l’attribution du
  candidat devient ambiguë, arrêter avant de mélanger les travaux.

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

Avant de supprimer ou remplacer un élément, vérifier qu’il ne porte pas encore :

- une connaissance métier ou de sécurité unique ;
- une configuration ou migration ;
- une compatibilité ou un consommateur externe ;
- une fixture, une provenance ou un historique nécessaire ;
- une entrée utilisateur ou un changement local à préserver.

L’absence d’import runtime ne suffit pas à prouver qu’un élément est supprimable.

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
- toute mutation distante ou destructive doit être explicitement autorisée.

Les décisions d’ouverture ou de restriction des surfaces communautaires suivent
la doctrine canonique de `CHATGPT.md`, section
« Proportionnalité, confiance et ouverture associative ». Elles ne peuvent pas
affaiblir les exigences AuthN, AuthZ, RLS, validation, protection des données,
secrets, audit et anti-abus.

Les règles spécialisées de sécurité et d’accès vivent dans
`documentation/security/`, `apps/web/AGENTS.md`,
`apps/web/src/app/api/AGENTS.md` et `apps/web/supabase/AGENTS.md`.

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

La validation est proportionnelle au risque :

```text
preuve ciblée
→ contrat partagé si concerné
→ sécurité / régression si concernée
→ validations plus larges si le blast radius le justifie
```

Commencer par la preuve la plus ciblée utile. Ne pas relancer une suite lourde
identique sur le même candidat sans raison.

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
