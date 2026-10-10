# Conventions de modularisation

## Objet

Ce document définit les conventions durables de modularisation de CleanMyMap.
Il ne maintient pas de backlog de fichiers à découper et ne fixe pas de taille
cible universelle.

La liste courante des monolithes et leur état mesuré vivent dans
`documentation/architecture/monolith-split-plan.md`.

## Principe directeur

La modularisation est un moyen d'améliorer :

- la cohésion ;
- la compréhension locale ;
- la testabilité ;
- la stabilité des contrats ;
- la réutilisation réellement utile ;
- la maîtrise des dépendances.

La taille d'un fichier est un signal de revue, pas une preuve suffisante qu'il
faut l'extraire.

Un fichier long et linéaire avec une responsabilité claire peut rester
acceptable. Un fichier plus court mais dense, multi-responsabilités ou très
couplé peut justifier une extraction plus tôt.

## Cinq signaux qualitatifs complémentaires

La décision de modulariser repose sur une analyse qualitative, pas sur un seuil
de lignes isolé. Examiner explicitement les cinq dimensions suivantes :

1. **Cohésion** — plusieurs responsabilités autonomes cohabitent-elles dans le
   même fichier, ou forment-elles encore un modèle compréhensible et cohésif ?
2. **Complexité** — les fonctions, composants ou hooks restent-ils lisibles
   localement, avec des étapes et des décisions nommées ?
3. **Couplage** — les dépendances sont-elles nombreuses, circulaires ou
   traversent-elles plusieurs domaines sans frontière claire ?
4. **Testabilité** — un comportement peut-il être isolé sans charger une grande
   partie du module, de son cycle de vie ou de ses effets ?
5. **Évolutivité** — les modifications fréquentes ou la croissance du module
   augmentent-elles le contexte nécessaire à chaque changement ?

Une extraction devient pertinente lorsqu'elle améliore objectivement au moins
l'une de ces dimensions sans dégrader les autres. La taille, la proximité d'un
seuil préventif ou un signal de radar déclenche une lecture ; elle ne démontre
ni une responsabilité autonome ni une décision `PROACTIVE_SPLIT`.

Les rapports automatiques n'affichent que les signaux qu'ils mesurent
réellement. La cohésion et l'évolutivité restent des décisions d'analyse
architecturale tant qu'aucune mesure canonique attribuable n'existe.

## Modularisation à deux niveaux

Une revue structurelle examine toujours le module et les unités de logique
qu'il contient. Réduire le nombre de lignes d'un fichier ou déplacer son
contenu dans un autre fichier ne suffit pas : la modularisation doit améliorer
la cohésion, la localité, la testabilité ou la lisibilité des contrats.

### Niveau 1 — module

Pour chaque module ou fichier, identifier :

- son owner et sa responsabilité principale ;
- son API et ses invariants ;
- ses dépendances et sa direction de dépendance ;
- ses effets de bord ;
- ses consommateurs ;
- ses tests et leur frontière de preuve.

### Niveau 2 — fonctions

Pour chaque fonction, méthode, composant ou handler significatif, relire la
chaîne :

```text
entrée
→ transformations
→ décisions
→ effets
→ sortie
```

Vérifier que cette unité conserve une responsabilité cohésive et rechercher
en particulier les mélanges suivants :

- parsing + métier + effet ;
- chargement + projection + assemblage ;
- orchestration + calcul détaillé ;
- rendu + parsing + état ;
- mutation + audit + mapping de réponse.

Une fonction touchée ne doit pas devenir plus longue ou plus complexe sans
nécessité contractuelle démontrée. Une fonction longue peut rester dans son
module lorsqu'elle constitue réellement un algorithme ou un pipeline cohésif
et qu'une extraction dégraderait la compréhension de ses étapes. Lorsqu'elle
contient plusieurs responsabilités autonomes, créer des fonctions nommées et
des contrats propres au lieu de seulement la déplacer.

### Anti-pattern : déplacer le monolithe

```text
MAUVAIS
gros fichier → nouveau petit fichier contenant toujours buildEverything()
très long et multi-responsabilités

BON
point d'entrée court → étapes nommées avec responsabilités et contrats propres
```

### Write with growth in mind

Ne pas attendre 500 lignes pour modulariser. Avant de créer ou modifier
substantiellement du code, répondre à cette question :

> Est-ce que j'étends une responsabilité existante, ou est-ce que je crée une
> responsabilité autonome qui mérite son propre fichier ?

#### Arbre de décision préventif

1. Identifier la responsabilité apportée, l'owner canonique éventuel, les
   responsabilités déjà présentes dans le fichier envisagé, les dépendances et
   consommateurs concernés, puis la croissance et la complexité introduites.
2. **Extension d'une responsabilité existante** : modifier l'owner existant
   si la logique appartient à son contrat, reste cohésive et ne mélange pas de
   nouvelle frontière d'effets, de persistance ou de présentation.
3. **Responsabilité autonome** : créer immédiatement un module dans le domaine
   et à l'emplacement définitifs lorsque la responsabilité possède ses propres
   invariants, consommateurs, effets, lifecycle ou tests. Cela peut concerner
   un calcul métier, une validation spécialisée, une transformation de
   données, un accès réseau/persistance, une orchestration asynchrone, un hook,
   une sous-vue ou un contrat de domaine. Une responsabilité autonome peut
   justifier un module dès quelques dizaines de lignes, notamment autour de
   50 lignes ; ce repère n'est pas un seuil automatique.
4. **Fonctionnalité multi-responsabilités** : dessiner les frontières avant
   l'implémentation. Garder un point d'entrée lisible qui orchestre des
   modules métier, des frontières d'effets/persistance, des composants de
   présentation et des tests adaptés aux contrats.
5. **Frontière artificielle** : rester dans le fichier existant si l'extraction
   ajouterait davantage d'indirection, d'exports, de couplage ou de navigation
   que de cohésion, testabilité ou clarté.

Les seuils préventifs (`>=300` lignes runtime et `>=600` lignes de test) sont
des signaux pour approfondir cette analyse, pas des déclencheurs de création
de fichier. Une extension cohésive peut rester dans un fichier long ; une
responsabilité autonome peut être séparée avant REVIEW. Les seuils REVIEW et
HARD ne changent pas.

#### Frontières et exemples courts

- **Web** : séparer, lorsque les contrats le justifient, modèle/dérivations,
  hook ou controller d'état/lifecycle, service d'accès réseau/persistance et
  vue de rendu. Ne pas déplacer une règle serveur sensible vers un composant
  client ni ajouter `use client` pour faciliter l'extraction.
- **Tests** : organiser par comportement ou contrat ; ne pas créer un fichier
  miroir pour chaque fichier runtime. Une fixture propre à un scénario reste
  proche de celui-ci ; une fixture partagée ou volumineuse peut devenir un
  module seulement si elle possède un owner clair.
- **Services et scripts** : conserver l'orchestration courte et déplacer une
  implémentation spécialisée dans son owner réel. Réutiliser un contrat ou
  helper canonique plutôt que créer un service parallèle.

Rester dans le fichier existant est préférable pour quelques lignes qui
étendent directement un owner, pour une constante locale sans consommateur
indépendant ou pour un JSX sans autonomie sémantique. À l'inverse, agrandir le
composant principal parce qu'il contient déjà le point d'entrée, écrire un
monolithe provisoire, déplacer la complexité dans un helper géant, créer un
barrel ou dupliquer la logique métier pour éviter l'owner canonique sont des
anti-patterns. Le nombre de fichiers et la réduction brute de lignes ne sont
pas des objectifs.

Après un déplacement :

- relire la fonction dans son nouveau contexte ;
- relire les fonctions, méthodes, composants et handlers nouveaux,
  déplacés ou substantiellement modifiés au niveau du module et de l'unité de
  logique ;
- vérifier que chaque frontière a un owner, un contrat, des consommateurs et
  une couverture adaptés ;
- vérifier qu'aucune complexité n'a seulement été transférée vers un autre
  fichier et qu'aucun export, wrapper, barrel ou façade n'est devenu inutile ;
- internaliser les exports inutiles ;
- supprimer les anciennes façades seulement si aucun contrat ne les exige ;
- vérifier `quality:complexity`, `quality:dead-code`, `quality:duplication` et
  `quality:cycles` selon les outils applicables.

## Politique des fichiers volumineux

Les contrôles déterminent deux seuils par KIND via `classifyFileKind()` :

| KIND | REVIEW | HARD |
| --- | --- | --- |
| runtime | `>500` lignes ou `>40 KiB` | `>1000` lignes ou `>50 KiB` |
| test | `>1000` lignes ou `>50 KiB` | `>1500` lignes ou `>80 KiB` |
| data/config | `>800` lignes ou `>50 KiB` | `>1500` lignes ou `>80 KiB` |
| generated | informatif si réellement régénérable | informatif si réellement régénérable |

### Surveillance préventive informative

Le radar ajoute une zone de lecture avant REVIEW, sans créer un nouveau
contrôle :

| KIND | Surveillance préventive | Portée |
| --- | --- | --- |
| runtime | `>=300` lignes | fichiers sous REVIEW uniquement |
| test | `>=600` lignes | fichiers sous REVIEW uniquement |
| data/config | selon la cohésion et les responsabilités du catalogue | aucun seuil numérique automatique |

Cette surveillance est strictement informative. Elle ne bloque ni commit ni
push, ne produit pas `REVIEW` ou `HARD`, ne modifie aucune baseline et ne
déclenche aucune modularisation automatique. Le poids en KiB reste un signal
complémentaire de la politique REVIEW/HARD existante ; aucun plafond préventif
universel de poids n'est ajouté.

`REVIEW_REQUIRED` reste un signal d'audit sans split automatique ; le mode
`--enforce` interdit tout nouveau REVIEW/HARD et toute croissance au-delà du
plafond numérique ratifié pour le KIND. Un fichier `generated` n'est exclu du
radar architectural que si sa provenance régénérable est prouvée ; un fichier
source manuel placé sous un chemin ressemblant à generated reste contrôlé.
La taille d'un test signale la lisibilité et la cohésion des scénarios ; elle
n'est pas assimilée à un monolithe runtime.

Le seuil ne déclenche jamais un split automatique. La décision repose sur la
cohésion, les responsabilités, le couplage, la testabilité et les contrats.
Une exception HARD de baseline doit être explicitement ratifiée, justifiée et
bornée par `maxLines` et `maxBytes`; elle ne peut pas croître silencieusement.

### Ratchet bloquant : extraction substantielle obligatoire

Lorsqu'un ratchet de longueur de fonction ou de poids de fichier bloque
`precommit:guard` ou un contrôle équivalent, la résolution doit comporter une
modularisation substantielle de la zone concernée. Extraire une responsabilité
cohésive vers un nouveau fichier, lui donner un owner et un contrat propres,
puis migrer les consommateurs et les tests. Il est interdit de traiter ce
blocage par simple condensation, reformatage, raccourcissement de noms,
déplacement de commentaires ou toute autre réduction visant seulement à
repasser juste sous la limite. Le code déplacé ne doit pas rester un monolithe
intact dans le nouveau fichier.

Cette règle s'applique aux changements ajoutés pour débloquer le garde-fou,
même si le seuil est finalement franchi de peu. Si aucune frontière sûre et
réellement cohésive n'est identifiable, le lot reste bloqué jusqu'à une
décision explicite ; la baseline, le seuil ou la mesure ne doivent pas être
affaiblis.
Les entrées numériques `review[]` de la baseline ne sont pas des décisions
architecturales : un état `IMPROVED` conserve le plafond abaissé après une
amélioration mesurée.

Les statuts architecturaux concernent prioritairement runtime et data/config et
sont `REVIEW_REQUIRED`, `PROACTIVE_SPLIT`,
`COHESIVE_SINGLE_FILE`, `ALREADY_MODULARIZED` et `DEFERRED_SPLIT`.
`REVIEW_REQUIRED` est un état d'audit, pas une décision. `DEFERRED_SPLIT`
exige une raison et un déclencheur de reprise explicite. Un test ne reçoit
`PROACTIVE_SPLIT` que si plusieurs contrats ou scénarios indépendants ont une
frontière naturelle de séparation démontrée.

## Signaux qui justifient une revue structurelle

Évaluer une modularisation lorsqu'un fichier cumule un ou plusieurs signaux :

- plusieurs responsabilités métier ou techniques distinctes ;
- logique difficile à tester sans rendre tout le module ;
- branches ou transformations qui masquent le contrat principal ;
- données, configuration, effets de bord et rendu fortement entremêlés ;
- duplication de logique ou de types ;
- dépendances croisées difficiles à suivre ;
- modification locale qui exige trop de contexte ;
- sous-partie possédant une API ou un cycle de vie compréhensible seule ;
- taille importante confirmée par le radar courant.

Le radar ou un seuil de qualité déclenche une analyse. Il ne dicte pas à lui
seul une arborescence cible.

## Duplication : revue, owner et réouverture

Un clone jscpd est un signal de revue, jamais une instruction automatique
d'extraction. L'objectif n'est pas de minimiser un pourcentage global de
duplication ni de faire disparaître un fingerprint isolé.

Une extraction devient prioritaire lorsque plusieurs occurrences portent la
même connaissance ou le même invariant qui doit rester synchronisé. Le signal
prend davantage de poids lorsqu'il converge avec d'autres faits : fonction
longue ou complexe, fichier `REVIEW`, fréquence de modification élevée,
difficulté de test ou frontière fonctionnelle naturelle identifiable.

À l'inverse, conserver explicitement une répétition est correct lorsqu'elle :

- rend une frontière AuthN/AuthZ localement et auditivement explicite ;
- maintient l'indépendance de scénarios de test et de leurs preuves ;
- préserve la lisibilité de contrats métier différents ;
- décrit des données déclaratives proches mais volontairement autonomes, comme
  des palettes complètes par thème.

Toute abstraction partagée doit avoir un owner et un invariant commun
démontrables. À défaut, la famille reste qualifiée `KEEP_INTENTIONAL` ou
`NO_ACTION_NOISE` selon la policy jscpd. Une décision historique n'est pas
irrévocable : si le code évolue ou si la duplication converge ensuite avec
d'autres signaux, la qualification doit être réouverte et revue sur les deux
occurrences CURRENT.

Les contrôles jscpd, leurs fingerprints et leurs métriques restent la source
mesurée des audits ; cette convention conserve uniquement le raisonnement qui
permet de décider, pas un compteur courant.

## Quand ne pas extraire

Ne pas extraire uniquement pour :

- atteindre un nombre de lignes arbitraire ;
- créer un fichier par bloc JSX ;
- imposer un `index.ts` sans besoin d'API publique ;
- déplacer trois lignes dans un hook ou un helper sans responsabilité propre ;
- remplacer un couplage local simple par du prop drilling ou un contexte
  supplémentaire ;
- rendre un diagramme de fichiers plus symétrique ;
- suivre un ancien plan qui ne correspond plus au code courant.

Une extraction est mauvaise si elle fragmente davantage le raisonnement ou
augmente les dépendances sans réduire une complexité réelle.

## Frontières d'extraction préférées

Quand elles existent réellement, privilégier les frontières suivantes.

### Données et configuration

Extraire les constantes ou données statiques volumineuses lorsqu'elles forment
un domaine lisible ou empêchent de comprendre la logique du module.

Ne pas découper une petite configuration uniquement pour réduire le fichier
principal.

### Fonctions pures

Extraire un calcul, une normalisation ou une règle de décision lorsqu'elle peut
être nommée, testée et comprise indépendamment de son appelant.

Les frontières réseau, stockage et données externes doivent être normalisées
avant d'entrer dans la logique métier.

### État et effets de bord

Extraire un hook ou un contrôleur lorsqu'il porte un vrai cycle de vie ou une
responsabilité cohérente.

Ne pas déplacer automatiquement toute logique React dans des hooks. Un état
strictement local à un composant peut y rester s'il améliore la locality.

### Rendu

Extraire une sous-vue lorsqu'elle représente une section ou un état autonome,
ou lorsqu'elle peut être comprise et testée sans lire tout le parent.

Un bloc purement déclaratif et fortement couplé au contexte immédiat peut
rester inline.

### API publique

Créer une façade ou un fichier d'exports seulement lorsqu'il stabilise une API
réellement consommée. Ne pas ajouter de couche de réexport par convention
esthétique.

## Contrats à préserver

Avant toute extraction, identifier explicitement les contrats qui ne doivent
pas changer sans décision fonctionnelle distincte :

- routes ;
- props ;
- exports publics ;
- signatures de hooks et services ;
- contrats API ;
- schémas et types métier ;
- ordre des effets de bord ;
- erreurs observables ;
- permissions ;
- comportement utilisateur.

Pour le réseau, SQL, concurrence, transactions, navigateur, lifecycle et
orchestration, caractériser le comportement avant de déplacer la logique.

### Routes API et services backend

Pour une route API, conserver un handler lisible qui orchestre les étapes dans
leur ordre observable :

```text
AuthN/AuthZ
→ parsing et validation
→ appel métier
→ audit et autres effets de bord
→ mapping de la réponse
```

Les sous-responsabilités peuvent être extraites lorsqu'elles forment une unité
cohérente : parsing du payload, validation d'une règle, chargement autorisé,
construction d'un scope ou d'un DTO, mapping d'erreur, persistance ou audit.
L'extraction ne doit ni déplacer une décision d'autorisation hors de sa
frontière serveur, ni changer l'ordre des mutations, des audits, des
revalidations ou de la libération d'une réservation.

Pour un service backend, privilégier des frontières explicites entre lectures,
projections pures, normalisation, mutation et persistance. Les fonctions pures
ne doivent pas recréer une source de vérité pour les participants, les scopes,
les événements, les identifiants ou les calculs d'usage ; elles préparent les
données pour la primitive déjà canonique.

Les helpers de tests suivent les mêmes frontières : factories pour les états,
builders pour les requêtes et helpers d'assertion pour les invariants. Réduire
la longueur d'un scénario ne justifie jamais la suppression d'un cas métier.

Ces conventions ont été appliquées aux dernières cibles backend de la baseline
de complexité, notamment les routes d'annulation d'action, de recherche chat,
d'opérations d'événement et de génération de rapport, ainsi qu'aux services de
participation, d'usage Codex et de progression. Les contrats HTTP, AuthN/AuthZ,
les règles métier et les effets de bord restent définis par le code et les
contrats spécialisés ; cette section documente seulement leurs frontières de
découpage.

## Méthode de travail

Traiter une cible principale à la fois.

1. Vérifier l'état courant de la cible et du radar.
2. Identifier ses responsabilités, consommateurs et tests.
3. Décrire le problème structurel concret.
4. Définir le plus petit découpage cohérent.
5. Ajouter ou renforcer les tests nécessaires avant de supprimer une logique
   existante.
6. Extraire d'abord les responsabilités les plus indépendantes.
7. Garder un point d'entrée lisible qui orchestre sans dupliquer.
8. Relancer les validations après la dernière modification pertinente.
9. Mettre à jour le radar ou le plan seulement si son état factuel a changé.

Il n'existe pas d'ordre obligatoire `types -> config -> hooks -> composants`.
L'ordre dépend des dépendances réelles. Les éléments purs et indépendants sont
simplement les candidats les moins risqués à extraire en premier.

## Anti-patterns

Éviter :

- les micro-fichiers sans responsabilité propre ;
- les wrappers qui ne font que renommer un appel ;
- les façades inutilisées ;
- les imports circulaires ;
- les abstractions anticipées pour un usage hypothétique ;
- les contextes React créés uniquement pour compenser une mauvaise extraction ;
- les objectifs de réduction en pourcentage sans bénéfice structurel ;
- les estimations de durée utilisées comme critère de qualité ;
- les plans qui prédéterminent des noms de fichiers avant analyse du code.

## Critères de succès

Une modularisation réussie doit améliorer au moins un des axes suivants sans
dégrader les autres :

- responsabilité plus claire ;
- compréhension plus locale ;
- réduction du couplage ;
- tests plus ciblés ;
- dépendances plus explicites ;
- suppression d'une duplication ;
- stabilité accrue d'une API ;
- risque de régression réduit.

Le nombre de fichiers créés ou la réduction brute du nombre de lignes ne sont
pas des critères de réussite suffisants.

## Validation

Valider proportionnellement au risque :

- tests ciblés de la logique déplacée ;
- typecheck lorsque types, exports ou signatures changent ;
- lint pertinent pour les fichiers touchés ;
- contrôle des fichiers lourds lorsqu'une cible du radar est traitée ;
- tests de contrat lorsque l'API publique ou une frontière partagée est
  concernée ;
- build uniquement lorsque le périmètre le justifie.

Pour le radar courant et le choix de la prochaine cible, utiliser
`documentation/architecture/monolith-split-plan.md`.
