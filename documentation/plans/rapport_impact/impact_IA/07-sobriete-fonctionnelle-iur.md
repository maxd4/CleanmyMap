# Partie VII — Sobriété fonctionnelle et Indice d'utilité réelle {#partie-vii-sobriete-fonctionnelle-et-indice-dutilite-reelle}

Cette partie transforme la sobriété en règle de conception et de décision. L'objectif n'est pas de rendre CleanMyMap minimal par principe, mais de conserver les fonctions qui améliorent effectivement l'action de terrain, la coordination, la qualité des données ou la preuve d'impact, tout en refusant les couches numériques dont la valeur ajoutée n'est pas démontrée.

Elle distingue volontairement deux niveaux :

- **l'état observé du produit**, vérifié dans le dépôt `main` au SHA `89982c0cafa6b5379bee55852458b3e5308f8106` ;
- **la cible méthodologique du rapport**, qui remplace l'ancien IUR pseudo-physique par une lecture multidimensionnelle de l'utilité et des coûts.

Cette distinction est nécessaire : une méthode d'évaluation peut évoluer sans prétendre que le runtime a déjà été migré vers cette nouvelle méthode.

## Sobriété fonctionnelle du produit

### Principe directeur

La sobriété fonctionnelle consiste à choisir le mécanisme le plus simple capable de produire le résultat utile attendu. Elle ne signifie ni supprimer arbitrairement des fonctionnalités, ni réduire l'accessibilité ou la qualité de l'expérience. Une fonction est sobre lorsqu'elle répond à un besoin réel avec une complexité, une consommation et une dépendance proportionnées.

Pour CleanMyMap, la question principale reste donc :

> **Cette fonction augmente-t-elle suffisamment l'utilité terrain ou la fiabilité du service pour justifier son coût numérique, sa maintenance et ses dépendances ?**

La Partie VI définit l'utilité du projet autour du passage de l'observation à l'action : signaler, organiser, agir, documenter, coordonner et rendre les résultats exploitables. La sobriété fonctionnelle doit préserver cette boucle avant tout enrichissement secondaire.

### Noyau fonctionnel à préserver

Le noyau fonctionnel correspond aux capacités dont la disparition casserait directement la boucle d'action ou la preuve d'impact. Dans l'état actuel du produit, il comprend notamment :

- le signalement et la déclaration d'une action ;
- la carte et la localisation des actions ou besoins ;
- l'organisation ou la participation à une action ;
- la conservation d'un historique et des preuves utiles ;
- la modération et la qualité minimale des données ;
- la production d'une synthèse ou d'un rapport exploitable ;
- l'export ou la transmission des résultats lorsqu'ils servent réellement une association, une collectivité ou un autre acteur du territoire.

Ces capacités correspondent au coeur de la proposition de valeur. Leur optimisation doit donc viser en priorité la robustesse, la simplicité du parcours, la qualité des données, le coût de lecture et la maintenance plutôt que leur suppression.

### Fonctions utiles sous condition

D'autres fonctions peuvent être légitimes sans appartenir au noyau. Leur maintien dépend de leur usage réel et de leur contribution à un résultat observable.

| Famille | Utilité possible | Condition de maintien |
|---|---|---|
| pilotage détaillé et tableaux de bord | mieux prioriser, arbitrer ou suivre un territoire | indicateurs réellement utilisés et données suffisamment fiables |
| communauté et messagerie | coordonner des personnes ou structures | interaction reliée à une action, un besoin ou un partenariat utile |
| gamification | soutenir la continuité de contribution et l'apprentissage | absence de spam, de compétition artificielle ou de sollicitation excessive |
| notifications | transmettre une information nécessaire au bon moment | rareté, pertinence, désactivation possible et lien avec une action concrète |
| météo et aide à la préparation | réduire les échecs ou déplacements inutiles | information utilisée avant une action de terrain |
| contenus pédagogiques | améliorer les pratiques et la compréhension | contenu durable, lisible et réutilisable |
| surfaces de pilotage institutionnel ou partenaire | rendre les données exploitables par un acteur identifié | usage réel, périmètre clair et absence de duplication avec une surface existante |

Une fonction de cette catégorie n'est donc ni automatiquement à conserver, ni automatiquement à supprimer. Elle doit pouvoir montrer ce qu'elle améliore.

### Fonctions optionnelles et enrichissements d'interface

Les enrichissements visuels ou de confort peuvent améliorer l'expérience sans être essentiels au résultat terrain. Ils doivent rester bornés et ne pas devenir une justification autonome de complexité.

Le dépôt actuel contient par exemple des célébrations de gamification utilisant `canvas-confetti`. Cet élément existe réellement ; il ne faut donc plus le citer comme une fonctionnalité hypothétique ou déjà supprimée. En revanche, sa présence ne prouve pas qu'il est coûteux ou qu'il doit disparaître. Il doit être traité comme un enrichissement optionnel : chargement limité aux surfaces concernées, respect de `prefers-reduced-motion`, absence d'effet sur le parcours métier et réévaluation si son coût devient disproportionné.

Le même principe vaut pour :

- sons ou animations de célébration ;
- exports visuels haute définition lorsque le format léger suffit ;
- visualisations secondaires ;
- effets décoratifs sans information supplémentaire ;
- variantes d'interface dont la maintenance dépasse leur valeur d'usage.

La sobriété impose ici une règle de proportionnalité, pas une interdiction générale.

### Fonctions à différer ou refuser par défaut

Une nouvelle fonction doit être différée lorsque son bénéfice n'est pas démontré et qu'elle ajoute une nouvelle infrastructure, une dépendance externe ou une boucle d'exécution permanente.

Sont notamment à éviter par défaut :

- un chatbot génératif qui duplique les contenus, formulaires ou aides existantes sans service supplémentaire mesurable ;
- un agent autonome généraliste lorsque le parcours peut être décrit par des règles fixes ;
- une recherche vectorielle ou sémantique sans corpus, besoin et évaluation définis ;
- un nouveau service cloud uniquement pour reproduire une capacité déjà disponible ;
- un polling, une tâche périodique ou un traitement background sans besoin de fraîcheur démontré ;
- une nouvelle couche de données ou de cache qui devient une deuxième source de vérité ;
- une automatisation dont les sorties ne sont ni contrôlables, ni désactivables, ni auditables.

Dans l'état observé du dépôt, Pinecone reste une dépendance disponible mais dont l'usage IA/vectoriel n'est pas une fonction centrale prouvée du produit. De même, les recherches ciblées dans le runtime web ne mettent pas en évidence une chaîne générative LLM active équivalente à un chatbot ou à un agent autonome. Ces capacités doivent donc être évaluées comme des options futures, pas comme des briques nécessaires au fonctionnement actuel.

### Test de sobriété avant ajout d'une fonction

Avant d'ajouter ou d'étendre une fonction, cinq questions suffisent à éliminer une grande partie de la complexité inutile :

1. **Quel résultat concret doit changer ?** Une action créée, une erreur évitée, une coordination améliorée, un rapport utilisé ou une donnée rendue plus fiable doit pouvoir être identifié.
2. **Une capacité existante répond-elle déjà au besoin ?** Étendre ou simplifier une source canonique est préférable à créer une pile parallèle.
3. **Quel est le mécanisme minimal suffisant ?** Règle, requête, fonction, workflow, LLM ou agent ne doivent pas être choisis pour leur nouveauté.
4. **Quels coûts supplémentaires apparaissent ?** Calcul, stockage, transferts, service externe, maintenance, sécurité, tests et dépendance doivent être regardés séparément.
5. **Quelle condition permet de supprimer ou désactiver la fonction ?** Une expérimentation sans critère d'arrêt devient facilement une dette permanente.

Une fonction dont le résultat utile ne peut pas être formulé ne doit pas être considérée comme prioritaire.

## Nouvelle définition de l'IUR

### Pourquoi l'ancien ratio doit être abandonné comme définition générale

L'ancienne formulation du rapport présentait l'IUR sous la forme :

```text
IUR = Impact terrain utile / Dette numérique globale
```

et assimilait parfois le coût numérique global à une combinaison de `CO₂e + H₂O`.

Cette écriture est méthodologiquement insuffisante. Elle mélange dans un même numérateur plusieurs résultats qui n'ont pas la même unité — actions, participants, kilogrammes de déchets, signalements convertis ou rapports utilisés — et dans un même dénominateur des grandeurs encore plus hétérogènes : kWh, kgCO₂e, litres d'eau, stockage, transferts, dépendances, temps de maintenance ou complexité logicielle.

Ces grandeurs peuvent être comparées conjointement dans une décision, mais **elles ne peuvent pas être additionnées ou divisées directement sans convention de normalisation explicite**. Une telle opération produirait un chiffre précis en apparence mais sans signification physique ou méthodologique stable.

L'IUR doit donc devenir en priorité une **grille multidimensionnelle d'utilité réelle**.

### Le proxy IUR actuellement présent dans le runtime

Le produit possède déjà un indicateur nommé `iurIndex`. Il faut le distinguer de la nouvelle définition méthodologique du rapport.

Dans le code observé, `apps/web/src/lib/pilotage/metrics.ts` calcule :

```text
IUR_runtime = masse de déchets renseignée sur la période
              / coût carbone numérique proratisé sur la période
```

avec :

```text
coût carbone annuel de référence = 345 kgCO₂e/an
jours par an = 365,25
version de formule = 2026.04.10-v1
```

soit, de manière explicite :

```text
IUR_runtime = waste_kg
              / ((345 kgCO₂e / 365,25 jours) × nombre_de_jours)
```

Ce proxy a plusieurs propriétés utiles :

- il ne mélange pas directement CO₂e, eau et énergie ;
- il produit un ratio traçable entre deux grandeurs explicites ;
- le runtime le rend indisponible pour l'aide à la décision lorsque la masse de déchets n'est pas renseignée sur 100 % des actions comparées.

Mais il a aussi des limites fortes :

- les kilogrammes de déchets retirés ne résument pas toute l'utilité de CleanMyMap ;
- la constante annuelle de 345 kgCO₂e est une hypothèse de cadrage, pas une mesure instrumentée de la période ;
- l'énergie, l'eau, le matériel, le stockage, les transferts et la maintenance ne sont pas représentés directement ;
- le seuil actuellement utilisé par le moteur de priorisation, notamment la cible `IUR > 2`, est une **heuristique produit**, pas un seuil scientifique universel ;
- la valeur ne doit pas être interprétée comme un bilan environnemental net ou comme une compensation carbone.

Dans ce rapport, cet indicateur doit donc être nommé et compris comme **proxy IUR opérationnel historique du pilotage**, et non comme définition générale de l'utilité réelle.

### Grille multidimensionnelle d'utilité terrain

L'utilité terrain doit être décrite par plusieurs dimensions indépendantes. Toutes ne seront pas disponibles immédiatement ; une donnée absente doit rester absente plutôt qu'être remplacée artificiellement par zéro.

| Dimension d'utilité | Exemple de mesure | Condition d'interprétation |
|---|---|---|
| actions effectivement réalisées | nombre d'actions terminées et documentées | distinguer création, validation et réalisation effective |
| participants mobilisés | participants attribuables aux actions | éviter doubles comptes et distinguer inscription de présence réelle lorsque possible |
| déchets retirés | masse, catégories ou autres métriques terrain disponibles | distinguer mesure, déclaration et estimation |
| signalements convertis en action | signalements ayant conduit à une intervention identifiable | relation de conversion traçable nécessaire |
| rapports effectivement utilisés | rapports exportés, transmis ou exploités | ne pas confondre génération et utilisation réelle |
| coordination améliorée | doublons ou tâches inutiles évités | uniquement si le mécanisme de mesure est documenté |
| déplacements évités | kilomètres ou trajets évités par mutualisation | ne pas revendiquer ce gain sans scénario contrefactuel suffisamment défini |
| qualité de la preuve | complétude, géolocalisation, fiabilité, traçabilité | indicateur de confiance, pas bénéfice terrain autonome |

Cette grille permet de montrer qu'une fonction peut être utile même si elle n'augmente pas immédiatement la masse de déchets collectés. Par exemple, une amélioration de la modération ou de la qualité des coordonnées peut augmenter la fiabilité d'un rapport sans modifier directement le nombre de kilogrammes retirés.

### Grille multidimensionnelle des coûts numériques

Le coût numérique doit lui aussi conserver ses unités et ses frontières propres.

| Dimension de coût | Unité ou indicateur possible | Lecture |
|---|---|---|
| énergie | kWh | consommation directe ou estimation documentée |
| climat | kgCO₂e | émissions associées selon facteur et périmètre explicites |
| eau | L | eau directe ou indirecte, avec méthode précisée |
| stockage | Go·mois ou Go·an | volume conservé et durée de rétention |
| transferts | Go | trafic utile ou évitable |
| exécutions cloud | invocations, temps CPU/mémoire ou métrique fournisseur | charge d'infrastructure, sans conversion arbitraire si le facteur manque |
| dépendances externes | nombre et criticité des services | coût de réversibilité et de continuité, distinct du coût physique |
| maintenance | heures, incidents ou charge récurrente | coût humain et organisationnel |
| complexité | métriques de code, surface de tests, nombre de contrats à maintenir | signal de dette technique, pas unité environnementale |
| IA | jetons, appels, durée, coût financier ou estimation énergétique | uniquement lorsque ces données sont disponibles ou explicitement estimées |

La règle méthodologique est simple : **ne jamais transformer cette matrice en somme brute**.

### Comment utiliser l'IUR sans score unique

L'IUR devient une grille de comparaison entre une situation de référence et une évolution proposée.

```text
Situation A
→ utilités observées
→ coûts observés ou estimés

Situation B
→ utilités observées
→ coûts observés ou estimés

Décision
→ quels bénéfices ont progressé ?
→ quels coûts ont baissé, augmenté ou changé de nature ?
→ les nouveaux coûts sont-ils proportionnés au gain utile ?
```

Une lecture simple permet déjà de prendre de nombreuses décisions :

- **utilité en hausse et coûts stables ou en baisse** : évolution cohérente avec la sobriété ;
- **utilité en hausse et certains coûts en hausse** : arbitrage explicite nécessaire ;
- **utilité stable et coûts en hausse** : évolution difficile à justifier ;
- **utilité en baisse et coûts en hausse** : évolution à corriger, désactiver ou supprimer ;
- **données insuffisantes** : conclusion suspendue plutôt que score inventé.

Cette méthode rend visibles les compromis au lieu de les dissimuler dans un chiffre agrégé.

### Conditions nécessaires avant de créer un score IUR numérique composite

Un score unique peut rester utile pour un tableau de bord, mais il ne doit être réintroduit qu'après définition d'un contrat séparé et versionné.

Ce contrat devrait préciser au minimum :

```text
version de la formule
population et période de référence
liste des dimensions incluses
unité source de chaque dimension
sens favorable ou défavorable
fonction de normalisation
borne basse et borne haute
objectif ou budget de référence
poids éventuel
politique de donnée manquante
règle d'agrégation
règle de comparabilité entre versions
```

Les poids et seuils ne doivent pas être inventés pour obtenir un résultat souhaité. Ils doivent être justifiés, documentés, testés sur des cas concrets et changés uniquement avec une nouvelle version de formule.

Tant que ce contrat n'existe pas, le rapport ne doit pas publier un **IUR global unique** prétendant agréger l'ensemble des impacts.

### Articulation avec le proxy IUR du produit

La nouvelle méthodologie ne modifie pas automatiquement le runtime. Tant que le code n'est pas migré :

```text
IUR runtime actuel
= proxy masse de déchets / kgCO₂e proratisés

IUR méthodologique du rapport
= grille multidimensionnelle utilité / coûts
```

Les deux ne doivent pas porter implicitement la même signification.

Une future évolution du produit pourra soit renommer le proxy actuel pour lever l'ambiguïté, soit remplacer l'affichage par une synthèse multidimensionnelle, soit introduire un score normalisé versionné. Ce changement devra alors modifier ensemble le code, les libellés, les tests et la documentation concernés.

## Rendement spécifique de l'IA

### Séparer l'IA de développement de l'IA intégrée au produit

Deux usages différents doivent rester distingués.

**IA de développement** : génération ou modification de code, analyse, documentation, tests, recherche technique et assistance à la conception. Son coût appartient à la production et à la maintenance de CleanMyMap.

**IA intégrée au produit** : appel d'un modèle au bénéfice d'un utilisateur ou d'un processus runtime. Son coût augmente avec l'usage du produit et doit être attribué à la fonction concernée.

Dans l'état observé du dépôt, l'assistant public de tri constitue un exemple utile de sobriété : malgré son interface conversationnelle, sa réponse est construite localement à partir de fonctions et de la taxonomie déchets, sans appel LLM identifié. Une apparence d'« assistant » ne justifie donc pas à elle seule l'emploi d'une IA générative.

### Mesurer le rendement de l'IA de développement

Le rendement de l'IA ne doit pas être évalué au volume de texte ou de code produit. Les indicateurs utiles sont ceux qui relient la consommation à un résultat accepté.

Selon les données effectivement disponibles, le suivi peut inclure :

- jetons par fonctionnalité réellement finalisée ;
- coût financier IA par correction acceptée ;
- estimation énergétique par lot réellement conservé ;
- nombre d'itérations IA avant validation ;
- proportion de sorties rejetées ou entièrement reprises ;
- temps humain économisé, uniquement lorsqu'une comparaison crédible existe ;
- régression détectée ou évitée, uniquement lorsqu'une preuve de test permet de l'établir ;
- coût IA rapporté à un résultat terrain utile lorsque le lien d'attribution est suffisamment défendable.

Un indicateur comme « coût IA par régression évitée » n'est donc valide que si la régression est matérialisée par une preuve reproductible : test qui échoue avant correction, cas reproduit, puis validation après correction. Une impression subjective de risque évité ne doit pas être comptabilisée comme résultat.

De même, le nombre de jetons n'est pas actuellement disponible de manière homogène pour tous les abonnements et outils utilisés dans l'historique du projet. Il doit rester `non mesuré` ou `estimé` lorsque la télémétrie n'existe pas.

### Mesurer le rendement d'une IA intégrée au produit

Pour une future fonction LLM ou agentique, le minimum utile est de relier les appels à la tâche utilisateur réellement terminée.

Exemples d'indicateurs :

```text
appels IA / tâche utilisateur terminée
coût € / tâche utile
jetons / tâche utile
taux de réponse acceptée sans reprise
taux de fallback vers une règle classique ou une validation humaine
taux d'erreur ou de sortie refusée
taux de revue humaine pour les actions sensibles
latence ajoutée par l'IA
```

Lorsque la fonction prétend améliorer le terrain, elle doit en plus définir un indicateur produit correspondant : meilleure conversion d'un signalement en action, réduction mesurée du temps de préparation, amélioration de la qualité d'un rapport, diminution d'une erreur de classification, etc.

La métrique IA ne doit jamais devenir une fin en soi. Un taux de réponse élevé n'a aucun intérêt si les réponses ne modifient pas favorablement le parcours utilisateur.

### Choisir le mécanisme minimal suffisant

La décision technique peut être résumée par la matrice suivante :

| Mécanisme | À choisir lorsque… | À éviter lorsque… | Exemple ou lecture CleanMyMap |
|---|---|---|---|
| **règle déterministe** | la logique métier est connue et testable | les cas ne peuvent pas être décrits correctement par des règles | taxonomie, validation, mapping ou réponse locale de tri |
| **SQL / fonction classique** | la donnée structurée suffit au calcul ou à la sélection | une interprétation sémantique réelle est nécessaire | filtres, agrégats, métriques, règles de qualité |
| **workflow déterministe** | les étapes et transitions sont connues à l'avance | le système doit choisir dynamiquement entre de nombreux chemins imprévus | enchaînement fixe de validation, notification, export ou traitement |
| **LLM** | le besoin exige compréhension ou génération de langage non couverte proprement par des règles | la même réponse peut être obtenue de façon fiable par code ou donnée structurée | futur résumé libre, reformulation ou classification sémantique évaluée |
| **agent** | un choix dynamique d'outils ou de sous-tâches est réellement nécessaire | les étapes peuvent être codées explicitement ou le risque d'action est disproportionné | réservé aux cas multi-outils justifiés et fortement bornés |

Cette matrice implique un ordre de préférence :

```text
règle déterministe
→ SQL / fonction classique
→ workflow déterministe
→ LLM
→ agent
```

Ce n'est pas une hiérarchie de puissance. C'est une hiérarchie de **complexité à justifier**.

### Workflow, n8n et agent

Un moteur de workflow comme n8n peut être pertinent lorsque le processus est connu : déclencheur, étapes, conditions et sorties sont définis à l'avance. CleanMyMap n'utilise pas actuellement n8n comme dépendance runtime identifiée ; il doit donc être considéré ici comme un exemple de catégorie technique, pas comme une brique existante du produit.

Un agent devient pertinent seulement lorsque le système doit réellement choisir lui-même parmi plusieurs outils ou stratégies à partir d'un contexte non entièrement déterminable à l'avance. Même dans ce cas, les opérations sensibles doivent rester limitées par des permissions, des validations et des contrats de sortie.

Le schéma hybride reste possible :

```text
interprétation sémantique bornée
→ proposition
→ workflow déterministe
→ validation
→ mutation autorisée
```

Il est souvent préférable à un agent disposant directement de nombreuses capacités de mutation.

### MCP : connecteur, pas justification d'agentification

Le Model Context Protocol peut standardiser l'exposition d'outils ou de ressources à un modèle. Il simplifie potentiellement l'intégration, mais il ne rend pas une tâche plus utile, plus sobre ou plus sûre par lui-même.

Un serveur MCP supplémentaire ajoute au contraire une surface à maintenir et à sécuriser. Il ne doit donc être introduit que si un besoin réel de connexion d'outils existe. Une fonction déterministe n'a pas besoin de devenir agentique simplement parce qu'un connecteur MCP est disponible.

### Règle d'admission d'une fonction IA

Une fonction IA intégrée à CleanMyMap ne devrait être activée que si les conditions suivantes sont réunies :

1. une tâche utilisateur ou métier précise est définie ;
2. une solution déterministe plus simple a été examinée ;
3. le gain attendu peut être mesuré par rapport à une baseline ;
4. les entrées et sorties sont bornées et validées ;
5. le coût par appel ou par tâche peut être plafonné ;
6. la fonction possède un fallback ou peut être désactivée sans casser le coeur du produit ;
7. les données envoyées sont compatibles avec les règles de sécurité et de confidentialité ;
8. les mutations sensibles restent sous contrôle humain ou sous une AuthZ serveur explicite ;
9. les erreurs, refus et régressions peuvent être observés ;
10. la fonction est réévaluée si son usage réel reste faible.

Pour une capacité agentique capable d'agir sur des données ou des services, la séparation suivante doit rester la référence :

```text
READ
→ PROPOSE
→ VALIDATE
→ MUTATE
```

L'agent ne doit pas obtenir davantage de permissions que celles nécessaires à la tâche, et la présence d'une IA ne doit jamais devenir un contournement de l'AuthZ, de la validation métier ou des règles de données.

### Grille de décision pour chaque fonction IA

Chaque proposition IA peut être documentée avec une fiche minimale :

| Champ | Question |
|---|---|
| problème | quelle difficulté réelle est traitée ? |
| baseline | comment la tâche est-elle réalisée sans IA ? |
| gain attendu | quel résultat utilisateur ou terrain doit progresser ? |
| mécanisme | pourquoi règle, SQL ou workflow ne suffisent-ils pas ? |
| métrique de succès | comment vérifier le gain ? |
| coût | appels, jetons, énergie estimée, stockage, latence, euros |
| risques | erreur, dépendance, confidentialité, sécurité, biais |
| contrôle | validation humaine, schéma de sortie, AuthZ, limites |
| fallback | que se passe-t-il si le modèle ou le fournisseur est indisponible ? |
| arrêt | quand la fonction est-elle désactivée ou supprimée ? |

Cette fiche remplace l'idée vague selon laquelle une fonction IA serait justifiée parce qu'elle est techniquement réalisable.

## Synthèse

La sobriété fonctionnelle de CleanMyMap repose sur trois règles.

Premièrement, **préserver le noyau qui transforme réellement une observation en action, coordination ou preuve**, et traiter les fonctions secondaires comme conditionnelles à leur utilité mesurée.

Deuxièmement, **abandonner l'IUR comme ratio global entre grandeurs hétérogènes**. Le rapport doit désormais utiliser une grille multidimensionnelle séparant les résultats terrain des coûts énergétiques, climatiques, hydriques, techniques et organisationnels. Le `iurIndex` actuellement calculé par le runtime reste un proxy historique spécifique masse de déchets / kgCO₂e ; il ne doit pas être confondu avec cette nouvelle méthode.

Troisièmement, **n'utiliser l'IA que lorsque sa valeur ajoutée justifie une complexité et un coût supérieurs à ceux d'une solution déterministe**. Le mécanisme par défaut reste le plus simple qui satisfasse correctement le besoin. LLM et agents sont des outils de dernier recours fonctionnel, pas des étapes obligatoires de modernisation du produit.

Cette approche permet de juger une évolution par ce qu'elle améliore réellement, sans fabriquer un score pseudo-scientifique ni transformer la sobriété en simple argument de communication.
