# Guide de contribution au quiz CleanMyMap

Ce document rassemble la vue d'ensemble utile pour créer, relire et publier une question de quiz.

Il complète :
- [Guide d'authoring du quiz](./quiz-authoring-guide.md)
- [Contrôle qualité des questions du quiz](./quiz-quality-control.md)
- [Métriques pédagogiques du quiz](./quiz-pedagogical-metrics.md)
- [Système de quiz avec répétition espacée](./quiz-srs.md)

L'objectif n'est pas de produire des questions scolaires ou décoratives.
Le quiz doit faire raisonner, révéler une idée reçue, ou guider un bon geste réel.

## Modes de quiz

Les modes sont des portes d'entrée pédagogiques. Ils ne sont pas des niveaux de difficulté.

| Mode | Ce qu'il couvre | Quand l'utiliser |
| --- | --- | --- |
| `mixte` | Mélange de toute la banque pour alterner les contextes et les formats. | Pour une séance équilibrée ou une démonstration rapide. |
| `terrain` | Décisions de cleanwalk, gestes pratiques, sécurité et cas limites. | Pour tester un réflexe concret sur site. |
| `donnees-scientifiques` | Mécanismes, impacts mesurables, relations de cause à effet. | Pour expliquer pourquoi un phénomène existe. |
| `sensibilisation` | Idées reçues, mythes, intuitions trompeuses. | Pour provoquer un déclic rapide. |
| `habitudes-de-vie` | Gestes quotidiens, consommation, réduction des déchets. | Pour relier un comportement individuel à son effet collectif. |
| `ordres-de-grandeur` | Estimations, masses, volumes, durées, proportions. | Pour travailler l'échelle plutôt que le chiffre brut. |
| `tri-securite` | Filières, tri, erreurs de tri, déchets dangereux. | Pour sécuriser les décisions de terrain. |

Règle simple :
- le mode filtre le périmètre de la session ;
- il ne remplace pas le format pédagogique ;
- il ne remplace pas le `trapLevel` ;
- il ne remplace pas le `reviewTarget`.

## Types pédagogiques

Le moteur s'appuie sur des formats canoniques. Chaque format doit servir un objectif précis.

| Type pédagogique | Objectif |
| --- | --- |
| `Vrai / Faux piégeux` | Corriger une croyance fréquente et forcer l'hésitation utile. |
| `Situations terrain` | Faire décider dans un contexte réel de cleanwalk. |
| `Comparaisons` | Faire distinguer plusieurs options proches. |
| `Cases à cocher` | Écarter plusieurs éléments à risque ou plusieurs mauvaises options. |
| `Estimations` | Travailler les ordres de grandeur. |
| `Conséquences indirectes` | Relier un geste local à ses effets en cascade. |
| `Questions contre-intuitives` | Faire tomber une intuition trompeuse. |
| `Mini enquêtes` | Reconstituer une cause probable à partir d'indices. |
| `Cas limites` | Gérer les situations ambiguës et les arbitrages imparfaits. |
| `Mythes et réalités` | Nuancer une affirmation populaire plutôt que répondre en binaire. |

Bon réflexe :
- un même contenu peut être posé dans plusieurs formats ;
- il faut varier le format quand la répétition n'apporte plus rien ;
- le format doit soutenir l'apprentissage, pas le masquer.

## Compétences

Dans la banque actuelle, la compétence est portée par le type de raisonnement.

Le référentiel courant est :
- `idée reçue`
- `terrain`
- `estimation`
- `comparaison`
- `conséquences indirectes`
- `questions contre-intuitives`
- `cas-limites`
- `mini-enquetes`

Interprétation pratique :
- `idée reçue` : la question corrige une fausse évidence ;
- `terrain` : la question teste une décision concrète ;
- `estimation` : la question demande une échelle crédible ;
- `comparaison` : la question oblige à distinguer deux options proches ;
- `conséquences indirectes` : la question relie une cause locale à un effet plus large ;
- `questions contre-intuitives` : la question casse une intuition forte ;
- `cas-limites` : la question met face à une zone grise ;
- `mini-enquetes` : la question demande d'interpréter des indices.

Règle d'écriture :
- une question doit clairement porter une seule compétence principale ;
- elle peut avoir une compétence secondaire, mais pas au point de devenir floue ;
- si la compétence n'est pas identifiable, la question est trop faible.

## Niveaux de difficulté

La difficulté décrit la charge cognitive globale. Elle ne décrit pas le piège.

| Niveau | Lecture |
| --- | --- |
| `low` | Question accessible, effort limité, structure simple. |
| `medium` | Question qui demande un arbitrage ou un raisonnement modéré. |
| `high` | Question plus exigeante, souvent avec plusieurs indices ou plusieurs critères. |

Bon usage :
- garder `difficulty` séparé de `trapLevel` ;
- une question peut être techniquement simple mais piégeuse ;
- une question peut être difficile sans être particulièrement piégeuse.

## Niveaux de piège

Le niveau de piège décrit la facilité avec laquelle l'intuition peut tromper le joueur.

| Niveau | Lecture |
| --- | --- |
| `low` | Le piège intuitif est faible. |
| `medium` | Il faut réfléchir avant de trancher. |
| `high` | La réponse semble vite évidente alors qu'elle ne l'est pas. |

Règle :
- le piège doit rester juste ;
- il ne doit jamais reposer sur un piège de formulation gratuit ;
- il doit être crédible et pédagogiquement utile.

## Types d'erreurs

Le champ `errorType` sert à relier une erreur à une explication utile et à une suite de révision.

Types utilisés actuellement :
- `idée reçue`
- `erreur de sécurité`
- `mauvaise estimation`
- `confusion entre recyclabilité et recyclage réel`
- `mauvais réflexe terrain`
- `confusion entre biodégradable et sans impact`
- `mauvaise compréhension d'une filière de tri`
- `raisonnement trop simpliste`
- `manque de nuance`
- `impact indirect ignoré`

Lecture pratique :
- `idée reçue` : l'utilisateur a cru une affirmation plausible ;
- `erreur de sécurité` : le risque concret a été sous-estimé ;
- `mauvaise estimation` : l'échelle ou l'ordre de grandeur est faux ;
- `confusion entre recyclabilité et recyclage réel` : le potentiel technique a été confondu avec la réalité de la filière ;
- `mauvais réflexe terrain` : le contexte de terrain a été ignoré ;
- `confusion entre biodégradable et sans impact` : biodégradable a été interprété comme neutre ;
- `mauvaise compréhension d'une filière de tri` : la filière locale a été mal lue ;
- `raisonnement trop simpliste` : un seul critère a été survalorisé ;
- `manque de nuance` : la situation demandait un arbitrage plus fin ;
- `impact indirect ignoré` : les effets en cascade n'ont pas été intégrés.

## Règles de sourcing

Une question sensible doit pouvoir être vérifiée.

Champs attendus :
- `sourceUrl`
- `sourceLabel`
- `sourceType`
- `confidenceLevel`
- `isLocalRule`
- `localScope`
- `lastCheckedAt`
- `needsReview`

Types de source autorisés :
- `institutionnelle`
- `scientifique`
- `associative`
- `presse`
- `interne`
- `estimation`

Niveaux de confiance :
- `élevé`
- `moyen`
- `faible`

Portée locale :
- `national`
- `regional`
- `departemental`
- `communal`
- `variable`

Règles de base :
- toute question de sécurité, de tri, de pollution, de biodiversité ou chiffrée doit porter une source ;
- les règles qui changent selon le territoire doivent être marquées `isLocalRule: true` ;
- si la règle varie selon le site ou la commune, `localScope` doit être `variable` ;
- les questions fondées sur un ordre de grandeur doivent être marquées `estimation` ;
- les questions de terrain générales peuvent rester ouvertes, mais doivent alors indiquer `needsReview: true` ;
- une source institutionnelle est à privilégier quand elle existe ;
- une question sans source exploitable doit être relue avant publication.

## Critères de qualité

Une bonne question de quiz :
- fait réfléchir avant la réponse ;
- teste une compétence réelle ;
- a des distracteurs plausibles ;
- n'est pas résolue par simple élimination ;
- explique le mécanisme ou l'arbitrage, pas seulement la réponse ;
- est reliée à un `reviewTarget` utile ;
- reste cohérente avec un seul mode principal ;
- conserve une formulation claire et sobre ;
- ne mélange pas le fond et le piège ;
- peut être sourcée ou, au minimum, justifiée comme estimation.

Une mauvaise question :
- est trop scolaire ;
- n'apporte qu'un rappel de vocabulaire ;
- a une bonne réponse trop visible ;
- propose des mauvaises réponses absurdes ;
- ne permet pas de corriger une erreur utile ;
- n'a pas de source, pas de mode ou pas de compétence clairement lisible.

## Procédure pour ajouter une nouvelle question

1. Choisir l'objectif pédagogique exact.
2. Choisir le mode principal.
3. Choisir le type pédagogique.
4. Choisir la compétence principale.
5. Définir la difficulté et le niveau de piège.
6. Définir l'erreur attendue et le `reviewTarget`.
7. Rédiger la question, les réponses, l'explication et les retours.
8. Ajouter la source ou le statut d'estimation.
9. Vérifier que les distracteurs restent plausibles.
10. Contrôler que la question n'est pas redondante avec une autre.
11. Lancer les audits et tests du quiz.
12. Relire la question en cherchant le défaut le plus probable, pas seulement le bon fonctionnement.

Si la question est locale ou dépend d'une consigne territoriale :
- préciser le périmètre ;
- documenter la variation ;
- éviter de la présenter comme une règle universelle.

## Exemples de bonnes questions

### Bon exemple terrain

Question :
> Sur un site, une bonbonne de gaz vide est trouvée. Quelle conduite évite de traiter comme ordinaire un déchet qui peut encore être sous pression ?

Pourquoi c'est une bonne question :
- elle part d'une situation réelle ;
- elle teste la sécurité avant la vitesse ;
- elle oblige à lire le risque avant d'agir ;
- elle se relie facilement à une rubrique de tri et sécurité.

### Bon exemple idée reçue

Question :
> Un symbole de recyclage imprimé sur un emballage garantit-il qu'il est recyclé dans la filière locale ?

Pourquoi c'est une bonne question :
- elle corrige une croyance fréquente ;
- le distracteur plausible est crédible ;
- la réponse demande de distinguer le potentiel et la réalité du tri ;
- elle peut être reliée à une source claire.

### Bon exemple ordre de grandeur

Question :
> Un mégot de cigarette peut rendre impropre à la vie aquatique environ combien de litres d'eau ?

Pourquoi c'est une bonne question :
- elle travaille l'échelle ;
- elle ne demande pas une précision scolaire ;
- elle aide à situer un impact concret ;
- elle incite à retenir un ordre de grandeur utile.

### Bon exemple impact local

Question :
> Un déchet abandonné sur un trottoir n'a d'effet que local tant qu'il n'est pas emporté par le vent ou la pluie.

Pourquoi c'est une bonne question :
- elle relie le geste local à des effets indirects ;
- elle pousse à dépasser l'idée d'un impact isolé ;
- elle donne un vrai terrain de discussion pédagogique.

## Exemples de mauvaises questions

### Mauvais exemple trop directif

Question :
> Que faut-il faire d'une bonbonne de gaz vide ?

Pourquoi c'est faible :
- la formulation donne déjà l'orientation ;
- la question ressemble à un rappel de consigne ;
- elle teste moins le raisonnement que l'obéissance à une formule.

### Mauvais exemple scolaire

Question :
> Quel est le bon chiffre exact de mégots ramassés par million d'habitants ?

Pourquoi c'est faible :
- le chiffre exact devient le seul objectif ;
- la réponse n'apprend presque rien si la méthode n'est pas donnée ;
- la question favorise la récitation plutôt que le raisonnement.

### Mauvais exemple trop évident

Question :
> Le plastique se recycle-t-il toujours ?

Pourquoi c'est faible :
- la bonne réponse est trop visible ;
- les distracteurs sont vite éliminés ;
- la question n'apporte pas d'arbitrage utile.

### Mauvais exemple sans source ni contexte

Question :
> Ce déchet est-il dangereux ?

Pourquoi c'est faible :
- le contexte manque ;
- la source manque ;
- le niveau de risque ne peut pas être évalué ;
- la question ne peut pas être relue proprement.

## Recommandation finale

Avant de publier une question, vérifier ces quatre points :
- la question fait-elle vraiment travailler une compétence ?
- la bonne réponse est-elle défendable par une source ou une estimation claire ?
- les mauvaises réponses sont-elles plausibles ?
- la suite de révision proposée est-elle utile au lecteur ?

Si l'une des réponses est non, la question doit être retravaillée.
