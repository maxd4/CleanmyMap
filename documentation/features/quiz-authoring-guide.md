# Guide d'authoring du quiz

Ce document fixe les règles d'écriture des questions du quiz environnemental de CleanMyMap. Son but est d'éviter les questions trop faciles, trop scolaires ou trop reconnaissables par simple élimination.

Le système de répétition espacée n'est efficace que si la banque contient de vraies questions de raisonnement. Une question trop évidente mesure la reconnaissance, pas la compréhension.

Pour la vue d'ensemble complète, les exemples et la procédure d'ajout, voir [Guide de contribution au quiz](./quiz-contributor-guide.md).

La future banque de questions doit s'appuyer principalement sur 10 formats pédagogiques complémentaires. L'objectif est d'éviter qu'un seul format domine et de forcer des modes de raisonnement différents.

## Sept portes d'entrée utilisateur

Le quiz doit aussi être accessible selon ce que l'utilisateur veut évaluer. Cette sélection reste distincte des formats internes et des types de raisonnement.

### Mixte
- Toutes les questions mélangées dans une même séance
- Objectif : alterner les contextes, les mécanismes et les formats

### Terrain
- Décisions réelles pendant une cleanwalk
- Sécurité, gestes pratiques, cas limites, organisation

### Données scientifiques
- Mécanismes environnementaux
- Pollution, recyclage, dégradation, biodiversité, impacts mesurables

### Sensibilisation
- Idées reçues, mythes, questions contre-intuitives
- Objectif : provoquer une prise de conscience rapide

### Habitudes de vie
- Gestes quotidiens, consommation, réduction des déchets
- Lien entre comportement individuel et impact collectif

### Ordres de grandeur
- Estimations, durées, masses, volumes, proportions, comparaisons
- Objectif : apprendre à raisonner avec des ordres de grandeur

### Tri & sécurité
- Filières de traitement, erreurs de tri, déchets dangereux
- Objectif : éviter les mauvais gestes sur le terrain

Règle:
- ces sept portes d'entrée ne sont pas des niveaux de difficulté;
- elles servent à orienter le joueur vers le bon type de contenu;
- le reste de la banque se répartit ensuite dans les formats pédagogiques internes.

## Objectif pédagogique

Chaque question doit:
- obliger à réfléchir avant de répondre;
- corriger une idée reçue identifiable;
- expliquer un mécanisme, une conséquence ou un arbitrage terrain;
- renforcer l'apprentissage, pas seulement la mémorisation brute;
- pouvoir être reliée à une rubrique de révision claire.
- provoquer un vrai doute avant la réponse;
- produire un effet "ah, je ne savais pas" plutôt qu'un simple rappel automatique;
- viser la réflexion plutôt que la mémorisation.

## Grille d'évaluation pédagogique

Chaque question doit aussi pouvoir être évaluée par une grille d'erreur lisible.

Champs attendus:
- `errorType`
- `misconception`
- `severity`
- `feedbackCorrect`
- `feedbackWrong`
- `reviewTarget`

Typologie d'erreurs CleanMyMap:
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

Règles:
- chaque erreur doit expliquer le mécanisme réel, pas seulement signaler qu'une réponse est fausse;
- `feedbackCorrect` doit renforcer la bonne stratégie de raisonnement;
- `feedbackWrong` doit nommer l'erreur pédagogique de manière utile;
- `severity` sert à hiérarchiser l'importance du malentendu, pas à juger l'utilisateur;
- `reviewTarget` doit renvoyer vers la rubrique la plus utile pour corriger l'erreur;
- la grille doit rester cohérente avec le type de raisonnement demandé par la question.

## Champ `trapLevel`

Chaque question doit pouvoir recevoir un niveau de piégeage:
- `low`
- `medium`
- `high`

Règle:
- le `trapLevel` décrit le piège intuitif, pas la difficulté de connaissance;
- une question peut être simple à comprendre mais très piégeuse;
- une question peut être technique sans être fortement piégeuse;
- le `trapLevel` peut servir de filtre de mode avant le lancement du quiz, seul ou combiné avec un type d'accès;
- le niveau de piégeage doit être renseigné ou déductible sans ambiguïté à l'authoring.

## Champs de sélection du moteur

Le moteur de sélection s'appuie sur plusieurs axes distincts. Ils ne jouent pas tous le même rôle.

### `mode`
- C'est le filtre principal du pool de questions.
- Il détermine d'abord quelles questions sont éligibles à la session.
- Les modes utilisateur restent: `Mixte`, `Terrain`, `Données scientifiques`, `Sensibilisation`, `Habitudes de vie`, `Ordres de grandeur`, `Tri & sécurité`.

### `review`
- C'est la priorité d'exposition issue du SRS.
- L'ordre de passage favorise d'abord les questions `failed`, puis `due`, puis le reste.
- Le but est de réparer d'abord ce qui casse l'apprentissage avant d'ajouter du neuf.

### `skill`
- C'est l'axe qui équilibre les compétences dans une session.
- Il évite d'enchaîner trop de questions du même raisonnement.
- Dans la banque actuelle, il est principalement porté par le type de raisonnement.

### `pedagogicalType`
- C'est l'axe qui fait tourner les formats pédagogiques.
- Il évite de répéter le même habillage de question trop souvent.
- Il doit rester distinct du fond: un même concept peut être posé en Vrai/Faux, en situation terrain ou en comparaison.

### `difficulty`
- C'est la montée en charge cognitive.
- Elle organise la session du plus simple au plus exigeant sur le plan de l'effort mental.
- Elle ne doit pas être confondue avec le piège intuitif.

### `trapLevel`
- C'est la montée en piège intuitif.
- Il mesure à quel point la question exploite une intuition trompeuse.
- Il reste séparé de la difficulté: une question peut être simple à comprendre mais très piégeuse, ou technique sans être très piégeuse.

### `sessionSize`
- C'est la borne de longueur de session.
- Elle empêche la séance de devenir trop longue.
- Elle permet au moteur de garder une sélection concentrée et lisible.

## Moteur de sélection

Le quiz ne pioche pas les questions au hasard.

Règles:
- le mode choisi par l'utilisateur détermine d'abord le périmètre des questions éligibles;
- le moteur ordonne ensuite les questions selon `review`, `skill`, `pedagogicalType`, `difficulty` puis `trapLevel`;
- chaque session ne retient qu'un sous-ensemble limité de la banque, pour éviter les parcours trop longs et favoriser la concentration;
- la sélection doit éviter les doublons pédagogiques en alternant autant que possible les compétences et les formats;
- la progression d'une session doit rester lisible: d'abord des questions accessibles, puis des questions plus exigeantes;
- une sélection explicite de `trapLevel` réduit le pool mais ne remplace pas l'ordonnancement pédagogique;
- la variété doit rester visible dans la session, sans enchaîner trop de questions du même sous-thème.
- `difficulty` et `trapLevel` doivent toujours rester distincts dans l'authoring et dans la sélection;
- quand un doute existe, la question doit être classée par la nature du raisonnement demandé, pas par la seule impression de difficulté.

## Bilan final

La fin de session doit toujours produire un bilan exploitable.

Le bilan doit montrer:
- le score global;
- les compétences maîtrisées;
- les compétences à revoir;
- les types d'erreurs fréquentes;
- le mode le plus utile à rejouer;
- un lien direct vers la rubrique d'apprentissage la plus pertinente.

Règle:
- le bilan n'est pas un simple message de réussite;
- il doit guider la reprise suivante avec une action concrète et une destination claire.

## Taxonomie canonique

Le quiz n'utilise plus de niveaux de difficulté au sens scolaire. Chaque question doit être pensée et classée selon le type de raisonnement qu'elle demande.

Types de raisonnement de référence:
- `idée reçue`
- `terrain`
- `estimation`
- `comparaison`
- `conséquences indirectes`
- `questions contre-intuitives`
- `cas-limites`

Règle:
- ne pas réintroduire une progression scolaire par niveaux;
- utiliser uniquement ces catégories pour qualifier la nature de l'effort cognitif;
- une question peut être technique sans être "plus difficile" au sens scolaire.

## Les 10 Formats Canoniques

La banque s'appuie strictement sur ces 10 formats pour garantir la diversité cognitive et éviter qu'un seul format ne domine.

### 1. Vrai / Faux piégeux
**Objectif :** Combattre les idées reçues, exploiter les intuitions erronées et obliger le joueur à réfléchir avant de répondre.
- **Bénéfices :** Corrige les croyances courantes, fait hésiter avant la réponse, révèle les écarts entre intuition et réalité.
- **À éviter :** Les affirmations trop caricaturales, les réponses évidentes après une première lecture.

### 2. Situations terrain
**Objectif :** Reproduire des cas réalistes rencontrés lors d'une cleanwalk, faire prendre une décision concrète et renforcer les bonnes pratiques et la sécurité.
- **Bénéfices :** Ancre la pédagogie dans le réel, teste le bon geste en contexte.
- **À éviter :** Les cas trop théoriques, les situations irréalistes ou trop faciles.

### 3. Comparaisons
**Objectif :** Comparer plusieurs déchets, matériaux, comportements ou impacts pour identifier les différences importantes et éviter les réponses évidentes.
- **Bénéfices :** Fait ressortir les écarts utiles, aide à classer et hiérarchiser.
- **À éviter :** Les comparaisons trop simples ou trop scolaires, les écarts triviaux.

### 4. Classements
**Objectif :** Ordonner plusieurs éléments selon un critère comme la durée de dégradation, l'impact environnemental, etc.
- **Bénéfices :** Force à comparer plusieurs options, développe le sens des priorités.
- **À éviter :** Les listes trop courtes ou trop évidentes.

### 5. Estimations
**Objectif :** Travailler les ordres de grandeur, éviter la mémorisation brute et favoriser le raisonnement approximatif.
- **Bénéfices :** Ancre les quantités dans une échelle réaliste, réduit l'effet de récitation.
- **À éviter :** Les chiffres décoratifs sans usage pédagogique.

### 6. Conséquences indirectes
**Objectif :** Comprendre les effets cachés d'un comportement ; relier une action locale à ses impacts réels ; développer une vision systémique.
- **Bénéfices :** Révèle l'impact caché d'un geste, connecte le terrain à un enjeu global.
- **À éviter :** Les enchaînements trop complexes, les liens de causalité non prouvés.

### 7. Questions contre-intuitives
**Objectif :** Surprendre le joueur ; remettre en question une intuition ; créer un effet "je ne savais pas".
- **Bénéfices :** Casse les certitudes trompeuses, attise la curiosité.
- **À éviter :** Les pièges sémantiques ou jeux de mots.

### 8. Mini enquêtes
**Objectif :** Présenter plusieurs indices ; demander au joueur d'identifier la cause la plus probable ou la meilleure explication ; développer l'esprit critique.
- **Bénéfices :** Simule une démarche d'investigation, implique davantage le joueur.
- **À éviter :** Les indices contradictoires sans solution claire.

### 9. Cas limites
**Objectif :** Situations ambiguës ; déchets difficiles à identifier ; arbitrages entre plusieurs solutions imparfaites ; éviter les réponses binaires trop simples.
- **Bénéfices :** Prépare à la réalité complexe du terrain, apprend à prioriser.
- **À éviter :** Les situations impossibles à résoudre.

### 10. Mythes et réalités
**Objectif :** Partir d'une affirmation populaire ; demander si elle est correcte, partiellement correcte ou fausse ; corriger les croyances fréquentes.
- **Bénéfices :** Nuance la réflexion (partiellement vrai/faux), déconstruit efficacement les légendes urbaines.
- **À éviter :** Les mythes que personne ne croit vraiment.

## Ce qu'il faut éviter

- Les questions dont la bonne réponse est visible par élimination immédiate.
- Les QCM avec un seul distracteur crédible et trois réponses absurdes.
- Les mauvaises réponses absurdes ou caricaturales.
- Les chiffres bruts quand une conséquence ou un mécanisme est plus utile.
- Les formulations qui révèlent la réponse dans le texte même.
- Les questions de type `quel est le bon chiffre ?` si le chiffre n'est pas essentiel à la compréhension.
- Les questions qui testent uniquement la mémoire sans contexte.
- Les formulations du type `Quel est le meilleur réflexe ?`
- Les formulations du type `Quelle est la bonne attitude ?`
- Les formulations du type `Que faut-il faire ?`
- Les formulations où une réponse paraît immédiatement plus raisonnable que les autres.
- Les banques qui répètent toujours le même format.

Ces formulations sont à éviter car elles orientent trop directement la réponse attendue et réduisent le travail d'interprétation. Elles fonctionnent souvent comme un indice, pas comme une vraie évaluation.

Le quiz doit pousser à hésiter, raisonner ou remettre en question une intuition avant de répondre.

## Règles de formulation

### Une question doit contenir une vraie tension cognitive

La phrase doit pousser à choisir entre deux interprétations plausibles:
- ce qui semble intuitivement vrai;
- ce qui est réellement correct dans le contexte environnemental.

Si le joueur peut répondre sans hésiter, la question est trop facile.

### Préférer les conséquences concrètes

On privilégie:
- les effets sur la pollution;
- les impacts sur la biodiversité;
- les erreurs de tri;
- les risques de sécurité;
- les mécanismes de contamination;
- les logiques d'économie circulaire.

### Éviter le piège du mot-clé

Une question ne doit pas être résolue uniquement parce qu'elle contient un mot connu comme:
- `recyclable`;
- `compostable`;
- `plastique`;
- `nature`;
- `tri`.

Le mot-clé peut aider au cadrage, mais il ne doit pas rendre la réponse évidente.

### Favoriser les nuances réelles

Les meilleures questions:
- introduisent une condition;
- opposent deux cas proches;
- testent une exception;
- mettent en scène une consigne locale;
- montrent une conséquence indirecte.

### Préférer une tension cognitive

La meilleure question ne demande pas seulement de se souvenir d'un bon geste. Elle oblige à choisir entre:
- une intuition plausible mais trompeuse;
- une lecture plus juste du contexte.

Si la formulation révèle déjà l'action attendue, la question est trop faible.

## Structure recommandée d'une question

Chaque item devrait contenir:
- un thème principal;
- un seul point de décision;
- une formulation réaliste;
- une réponse non triviale;
- une explication pédagogique;
- une rubrique de révision associée.

Métadonnées recommandées:
- `type`: `true-false`, `multiple-choice` ou `flashcard`;
- `theme`: `Vulgarisation`, `Tri, compost, comportements`, `Cleanwalk`, `Sécurité`, etc.;
- `reasoningType`: l'un des types canoniques ci-dessus;
- `reviewTarget`: rubrique à revoir;
- `misconception`: idée reçue corrigée;
- `context`: terrain, plage, ville, événement, compost, etc.
- `sourceUrl`: lien de référence de la question;
- `sourceLabel`: nom lisible de la source;
- `sourceType`: `institutionnelle`, `scientifique`, `associative`, `presse`, `interne` ou `estimation`;
- `confidenceLevel`: `élevé`, `moyen` ou `faible`;
- `isLocalRule`: vrai pour les consignes dépendantes du territoire;
- `localScope`: `national`, `regional`, `departemental`, `communal` ou `variable`;
- `lastCheckedAt`: date ISO de dernière vérification;
- `needsReview`: vrai quand la question reste à relire ou dépend d'un contexte terrain général.

## Comment sourcer une question

Une question bien sourcée doit pouvoir être expliquée, vérifiée et réutilisée sans flou éditorial.

Méthode recommandée:
1. identifier exactement ce que la question affirme;
2. décider si l'affirmation est factuelle, locale, chiffrée, méthodologique ou purement pédagogique;
3. choisir une source publique quand elle existe déjà;
4. n'utiliser une source interne que pour cadrer l'authoring, pas pour masquer une affirmation non vérifiée;
5. remplir les métadonnées de traçabilité avant de publier la question;
6. relire toute question chiffrée, locale ou sensible avant validation finale.

Hiérarchie de sources à privilégier:
- ADEME, Citeo, collectivités, ministère, ARS, INRS, CNRS, OFB, ONU et agences publiques;
- études scientifiques ou rapports méthodologiques quand la question porte sur un mécanisme ou un ordre de grandeur;
- associations de référence quand elles documentent clairement un sujet de terrain;
- presse seulement si elle relaie une donnée déjà attribuable à une source première;
- source interne uniquement pour des arbitrages d'authoring, de pédagogie ou de relecture.

Règles de remplissage:
- `sourceUrl` doit pointer vers une référence consultable;
- `sourceLabel` doit décrire la source en français de manière lisible;
- `sourceType` doit refléter la nature réelle de la référence;
- `confidenceLevel` doit traduire le degré de solidité de la preuve;
- `isLocalRule` doit être `true` dès qu'une consigne varie selon le territoire;
- `localScope` doit devenir `variable` si la réponse dépend d'une commune, d'un département ou d'une filière locale;
- `lastCheckedAt` doit être renseigné au format ISO `YYYY-MM-DD`;
- `needsReview` doit rester `true` tant que la question n'a pas été relue sur le fond ou qu'elle repose surtout sur un raisonnement terrain général.

Cas particuliers:
- les questions de sécurité, de tri, de pollution, de biodiversité et toutes les questions chiffrées doivent avoir une source;
- les questions fondées sur des ordres de grandeur doivent être explicitement marquées `sourceType: estimation`;
- une consigne locale ne doit jamais être présentée comme universelle;
- une question sans source n'est acceptable que si elle reste un raisonnement terrain général et qu'elle est marquée `needsReview: true`.

Vérification utile:
- `npm run audit:quiz-sources`
- `npm run audit:quiz-quality`

## Banque cible

Pour le quiz environnemental, la banque doit tendre vers:
- une répartition équilibrée entre plusieurs formats;
- une présence forte de `Vrai / Faux` piégeux sans en faire le format unique;
- des questions de contexte pour les cas terrain;
- des comparaisons, estimations et classements quand ils apportent une vraie nuance;
- très peu de QCM classiques;
- presque aucun item fondé uniquement sur la mémoire brute.

Répartition éditoriale attendue:
- ne pas laisser un seul format dominer la banque;
- éviter les répétitions excessives de `Vrai / Faux` ou de QCM;
- varier les formulations pour maintenir l'attention et le doute;
- alterner les formats selon la nature du concept à apprendre.

Formats à renforcer en priorité aujourd'hui:
- `classements`
- `comparaisons`
- `estimations`
- `mini-enquetes`
- `cas-limites`
- puis, selon les besoins, davantage de `consequences-indirectes`

Les 10 formats doivent rester complémentaires et couvrir notamment:
- idées reçues;
- situations terrain;
- estimations;
- comparaisons;
- conséquences indirectes;
- questions contre-intuitives;
- classements;
- arbitrages;
- cas réels;
- rappels pédagogiques courts quand ils sont nécessaires.

Répartition recommandée:
- 65 à 75 % `Vrai / Faux`;
- 20 à 25 % questions de situation;
- 5 à 10 % rappels courts ou cartes flash.

## Couverture réelle de la banque

La banque actuelle est encore plus fournie sur les questions d'idées reçues et de terrain que sur les formats d'investigation et d'ordonnancement.

À renforcer en priorité:
- les `classements`, qui sont encore rares;
- les `comparaisons`, qui restent trop peu nombreuses pour créer une vraie diversité;
- les `estimations`, qui doivent porter davantage d'ordres de grandeur réalistes;
- les `mini-enquetes`, qui aident à travailler le raisonnement à partir d'indices;
- les `cas-limites`, encore trop peu présents pour couvrir les ambiguïtés de terrain;
- secondairement, les `consequences-indirectes`, pour développer davantage la lecture systémique.

## Transformation d'une question trop facile

Si une question paraît trop simple, la réécrire selon cette séquence:

1. Identifier la bonne réponse immédiate.
2. Chercher pourquoi cette réponse est trop évidente.
3. Remplacer le rappel brut par une conséquence ou un mécanisme.
4. Ajouter une condition de terrain ou une exception.
5. Vérifier qu'au moins une mauvaise réponse reste crédible.
6. Ajouter une explication qui corrige l'idée reçue.

## Modèles de remplacement

Si une question est trop directive, la reformuler selon un de ces modèles:

### Modèle 1 - Idée reçue

Au lieu de:
- `Que faut-il faire avec cet emballage ?`

Préférer:
- `Tous les plastiques portant un symbole de recyclage sont effectivement recyclés.`

### Modèle 2 - Cas réel

Au lieu de:
- `Quel est le meilleur réflexe face à ce déchet ?`

Préférer:
- `Une bouteille plastique abandonnée dans la nature disparaît complètement avec le temps.`

### Modèle 3 - Ordre de grandeur

Au lieu de:
- `Que faut-il retenir sur cet objet ?`

Préférer:
- `Un mégot contient-il plus ou moins de substances chimiques qu'une bouteille en verre ?`

### Modèle 4 - Piège cognitif

Au lieu de:
- `Quelle est la bonne attitude ?`

Préférer:
- `Un déchet biodégradable peut être abandonné dans la nature sans impact majeur.`

### Modèle 5 - Situation terrain

Au lieu de:
- `Que faut-il faire pendant une cleanwalk ?`

Préférer:
- `Pendant une cleanwalk, un bénévole trouve un bidon fermé contenant un liquide inconnu. L'ouvrir pour identifier son contenu est une bonne pratique.`

### Exemple de transformation

Trop facile:
- `Une bouteille plastique met environ 450 ans à se dégrader.`

Plus utile:
- `Une bouteille plastique abandonnée dans la nature disparaît complètement au bout de quelques siècles.`

Réponse attendue:
- `Faux`

Pourquoi:
- elle se fragmente souvent sans disparaître;
- le mécanisme important est la fragmentation et la persistance des microplastiques;
- la question corrige mieux l'idée reçue qu'un simple chiffre.

## Checklist avant ajout d'une question

- La question peut-elle être résolue par simple reconnaissance?
- La réponse est-elle trop visible dans le vocabulaire?
- Le sujet peut-il être formulé en Vrai / Faux plus intéressant?
- La question corrige-t-elle une idée reçue réelle?
- L'explication donne-t-elle le `pourquoi` et pas seulement le `bon / mauvais`?
- La question peut-elle être reliée à une rubrique de révision?
- Le piège est-il pédagogique, pas artificiel?
- La formulation reste-t-elle réaliste pour un utilisateur terrain?

Pour appliquer cette checklist de manière plus stricte, utiliser la grille dédiée:
[quiz-quality-control.md](./quiz-quality-control.md).

## Règle de validation éditoriale

Une question est acceptable seulement si:
- elle demande une vraie interprétation;
- elle peut être ratée par un joueur attentif;
- la correction apporte une compréhension durable;
- elle ne devient pas triviale après une première lecture;
- elle s'insère dans la logique Learn de CleanMyMap.

## Références associées

- [Système de répétition espacée (SRS)](./quiz-srs.md)
- [Guide qualité du projet](../development/QUALITY_GUIDE.md)
- [Spécification des rappels cognitifs](../product/specification-rappels-cognitifs.md)
