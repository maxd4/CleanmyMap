# Partie XII — Apports de l'IA et enseignements du DU {#partie-xii-apports-de-lia-et-enseignements-du-du}

Cette partie évite de réduire l'IA à ses seuls coûts ou risques. Elle présente ce que l'IA peut apporter lorsqu'elle est utilisée de manière encadrée, puis relie ces apports aux enseignements du DU et aux choix de conception de CleanMyMap.

## Apports positifs de l'IA

### Apports scientifiques et techniques généraux de l'IA

L'IA est retenue ici pour quatre raisons simples :

- elle accélère le développement d'un service utile avec une petite équipe ;
- elle peut améliorer la qualité du code, de la documentation, des tests et de certains arbitrages techniques ;
- elle aide à livrer plus vite un outil qui coordonne des actions de dépollution réelles ;
- elle reste un usage d'assistance, pas une délégation de décision.

Cette justification cesse dès que l'IA ajoute surtout du volume, de la dépendance, du bruit numérique ou des fonctionnalités peu utiles.
Elle cesse aussi si l'équipe n'est plus capable de relire, mesurer, désactiver ou documenter correctement ses usages.

### Apports concrets de l'IA au développement de CleanMyMap

- Rapidité d'exécution : l'IA accélère les tâches de cadrage, de rédaction technique, de structuration et de prototypage.
- Productivité technique : génération de premiers jets de code, aide au refactor, proposition de tests, accélération du débogage.
- Idéation et structuration : transformation de notes brutes en plans exploitables, décomposition en lots, priorisation des dépendances.
- Accessibilité technique : réduction du seuil d'entrée sur des sujets complexes comme l'architecture, les tests, l'instrumentation et la documentation.
- Support éditorial : reformulation de contenus, clarté des messages, harmonisation de la tonalité entre pages.
- Appui opérationnel : accélération de la production de docs, checklists, runbooks et synthèses pour la coordination d'équipe ou de jury.

Appliqués à CleanMyMap, ces apports sont pertinents lorsque l'IA sert des objectifs concrets : meilleure lisibilité des parcours, meilleure qualité des livrables, meilleure capacité de pilotage et réduction du temps perdu sur des tâches répétitives.

Cette utilité reste néanmoins conditionnée à une discipline de fond : l'IA doit libérer du temps pour ce qui demande encore du discernement humain, comme la validation, l'éthique, la relation aux partenaires, l'écriture d'un message juste ou la correction d'un raisonnement. Si elle sert seulement à produire plus vite la même chose, elle augmente le bruit ; si elle permet de recentrer l'équipe sur les arbitrages utiles, elle devient un outil de progrès.

### Limites d'une lecture uniquement positive de l'innovation

Le bénéfice n'est pas automatique. Une lecture uniquement positive de l'innovation oublie les coûts de dépendance, de surproduction et d'effet rebond. Les apports de l'IA restent donc conditionnels : ils ne sont défendables que lorsqu'ils sont documentés, mesurés et réellement utiles au projet.

## Enseignements issus du DU

### Apports méthodologiques des ateliers du DU

Les ateliers DU ont clarifié un point utile pour CleanMyMap : l'IA n'a d'intérêt que si elle renforce un système sociotechnique déjà lisible. Autrement dit, elle n'est pas la finalité du projet. Elle devient acceptable lorsqu'elle améliore la coordination entre acteurs, la traçabilité des choix, la qualité du reporting et la capacité d'arbitrage institutionnel, plutôt que de produire davantage de surface numérique pour elle-même.

### Traduction des apprentissages en critères de conception

Cette lecture rejoint le pilotage par indicateurs : un outil assisté par IA doit être jugé sur sa capacité à rendre l'action plus mesurable, plus explicable et plus utile, et non sur la seule vitesse de production. Dans CleanMyMap, cela se traduit par quelques critères simples : relire humainement les sorties, limiter les usages IA aux tâches à forte valeur, documenter les arbitrages et refuser les fonctionnalités qui ajoutent surtout du bruit ou de la dépendance.

### Lien entre engagement citoyen, sobriété numérique et gouvernance IA

CleanMyMap a été initié dans le cadre du Diplôme Universitaire « Engagement » de Sorbonne Université. Les ateliers suivis ont accompagné le passage d'un prototype centré sur la cartographie vers un outil plus large d'action citoyenne, de coordination et de transmission. Cette trajectoire illustre une construction progressive, à l'intersection de l'apprentissage du développement assisté par IA et d'un projet à visée d'intérêt général. Les ateliers du DU ont également contribué à structurer les choix de sobriété, d'utilité et de gouvernance, tout en renforçant la capacité du projet à être présenté et évalué dans un cadre institutionnel.

### Dimension personnelle du projet

Au-delà de l'analyse technique, CleanMyMap a aussi une valeur personnelle nette. Le projet donne une direction concrète au travail quotidien : une idée pertinente qui améliore vraiment le site produit une satisfaction immédiate, parce qu'elle transforme le temps passé en avancée utile. Cette dynamique a renforcé ma motivation et mon sentiment de fierté sur les journées où une solution simple, propre et réellement utile a été trouvée.

Sur la durée, ce projet m'a aussi fait énormément progresser en IA, en gestion de projet et en création numérique. J'y ai appris à cadrer un besoin, arbitrer entre plusieurs solutions, structurer un développement, documenter les choix et relier une intention à un résultat concret. Dans une perspective proche de celle de Sartre, le projet n'est pas seulement un objet produit : il participe aussi à la manière dont on se construit.

### Limites restantes et points à approfondir

Malgré ce cadre, plusieurs limites restent ouvertes. La première est l'hétérogénéité de qualité des données : si les flux amont restent imparfaits, l'IA peut amplifier des interprétations fragiles au lieu de les corriger. La deuxième est le risque d'effet rebond et d'inflation de code : plus l'outil rend la production facile, plus il faut une discipline explicite pour refuser les fonctionnalités secondaires et les abstractions peu utiles.

S'ajoutent à cela des limites structurelles déjà visibles dans le dépôt : dépendance technologique à des services propriétaires, besoin d'une validation humaine pérenne sur les contenus et le code, et exigence d'exportabilité réelle pour conserver une autonomie technique minimale. Ces points ne rendent pas l'usage de l'IA incohérent, mais ils imposent de la traiter comme un levier sous contrainte et non comme une solution auto-justifiée.
