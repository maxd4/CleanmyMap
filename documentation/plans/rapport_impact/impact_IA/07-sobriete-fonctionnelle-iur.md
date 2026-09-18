# Partie VII — Sobriété fonctionnelle et Indice d'utilité réelle {#partie-vii-sobriete-fonctionnelle-et-indice-dutilite-reelle}

## Scénario minimal viable sobre

### Fonctionnalités indispensables

Signalement, carte, organisation d'action, preuve d'impact, modération simple.

### Fonctionnalités utiles sous condition

tableau de bord détaillé, gamification, notifications push, IA de tri. Ces fonctions ne doivent être activées que si elles boostent réellement l'action terrain.

L'enjeu n'est pas seulement le coût actuel du site, mais aussi le coût des modèles embarqués ou des API futures. Une fonctionnalité comme l'analyse automatique d'image, la classification des déchets, le résumé d'action ou un chatbot peut changer l'échelle de l'impact dès qu'elle passe du statut d'idée à celui de service actif. Il faut donc distinguer l'impact actuel du risque de trajectoire fonctionnelle.

Dans le code actuel, cette vigilance concerne surtout les zones de parcours opérationnel comme `apps/web/src/app/(app)/actions/map/page.tsx`, `apps/web/src/app/(app)/actions/new/page.tsx`, `apps/web/src/app/reports/page.tsx` et `apps/web/src/app/(app)/parcours/page.tsx`. Une future brique IA n'est acceptable que si elle améliore clairement ces parcours au lieu de les compliquer.

### Fonctionnalités à limiter ou désactiver

Animations lourdes (confetti), chat redondant avec des outils existants, exports visuels haute définition systématiques.

### Chatbot, agent IA, stockage et outils

Un chatbot est surtout une interface de conversation. Il répond à partir d'un LLM et du contexte immédiatement disponible, avec éventuellement un historique court ou une mémoire limitée. Il peut être utile pour expliquer, reformuler ou guider, mais il reste d'abord réactif.

Un agent IA ajoute une couche d'action. Le LLM devient le moteur de raisonnement, mais le système embarque aussi des outils, du stockage de travail, parfois une mémoire persistante et une boucle de décision. Cela permet de lire un état, choisir une action, appeler un service, enregistrer le résultat puis continuer si nécessaire. Pour un projet comme CleanMyMap, cette différence compte: un chatbot peut aider à comprendre ou à rédiger, tandis qu'un agent peut trier un signalement, récupérer un contexte terrain, appeler une API, mettre à jour une base ou préparer un rapport, à condition que ces actions restent bornées et validées humainement. Voir les [guides OpenAI sur les agents](https://platform.openai.com/docs/guides/agents/agent-builder) et les [Agents SDK](https://platform.openai.com/docs/guides/agents-sdk/).

### Qu'est-ce qu'un MCP ?

Le **Model Context Protocol (MCP)** est un protocole ouvert qui standardise la manière dont les applications fournissent du contexte à des LLM. L'idée est simple: au lieu de recoder une intégration spécifique pour chaque outil, on expose des serveurs MCP qui publient des outils, des ressources ou des capacités que l'agent peut découvrir et appeler. C'est une sorte de port standard pour connecter un modèle à des fichiers, une base de données, un calendrier, un système de tickets ou un dépôt de code. [Anthropic MCP](https://docs.anthropic.com/en/docs/mcp)

### Pourquoi un agent IA peut-il être meilleur que n8n ?

Pas dans tous les cas. **n8n** est très bon quand le flux est déterministe: déclencheur clair, étapes fixes, transformations connues et vérifications faciles. Un workflow n8n est d'ailleurs, par définition, une collection de nodes connectés pour automatiser un processus. Un agent IA devient préférable quand le problème est moins linéaire: la donnée est imparfaite, le contexte change, il faut choisir entre plusieurs outils, interpréter du texte libre ou décider d'une prochaine action sans scénario unique à l'avance.

Dans ce cas, l'agent apporte de la flexibilité et de l'adaptation, alors que n8n apporte de la robustesse et de la prévisibilité. Pour CleanMyMap, le schéma le plus pertinent est souvent hybride: l'agent comprend, priorise et prépare, puis un workflow comme n8n exécute des tâches fixes, répétables et auditables. [n8n Workflows](https://docs.n8n.io/workflows/) ; [n8n Advanced AI](https://docs.n8n.io/advanced-ai/)

## Indice d'utilité réelle

### Définition et rôle de l'IUR

L'IUR est le ratio entre l'impact positif mesuré sur le terrain et le coût numérique global. Dans CleanMyMap, l'IUR sert de boussole de discipline interne : un projet n'est défendable que si son impact terrain utile progresse plus vite que son coût numérique global (CO₂e + H₂O).

Cette logique vaut aussi pour les futures fonctionnalités IA. Une brique embarquée ou une API additionnelle n'est acceptable que si elle augmente réellement l'utilité sociale ou environnementale plus qu'elle n'augmente les risques, la dépendance technique et la complexité à maintenir.

### Mise en relation entre impact terrain et coût numérique global

**Formule simplifiée : IUR = (Impact terrain utile) / (Dette numérique globale)**

L'objectif est de maintenir un IUR élevé en refusant les fonctionnalités qui n'augmentent pas clairement l'impact terrain tout en augmentant la charge numérique.

### Limites méthodologiques de l'indicateur

L'IUR reste un indicateur comparatif et non une mesure absolue. Sa valeur dépend des hypothèses de coût numérique, de la qualité des données terrain et du périmètre choisi pour l'impact utile. Il doit donc être lu comme un outil d'arbitrage, pas comme une vérité statistique définitive.

### Usage de l'IUR comme outil d'aide à la décision et de gouvernance de l'IA

L'IUR aide à décider si une fonctionnalité, une évolution ou une simplification du site mérite d'être conservée. Une hausse de complexité n'est acceptable que si elle se traduit par un gain terrain mesurable, une meilleure coordination ou une preuve d'impact plus solide.

Dans CleanMyMap, l'IUR joue aussi un rôle de gouvernance : une fonctionnalité IA n'est acceptable que si elle augmente davantage l'utilité sociale ou environnementale qu'elle n'augmente les risques, les dépendances et le coût numérique. Cette règle sert à trancher entre automatisation utile et automatisation décorative.
