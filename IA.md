
## 2. L’incertitude liée aux milliards de tokens

Le chiffre de **400 kWh pour 4 milliards de tokens** reste une hypothèse centrale, pas une mesure. Un token n’a pas une consommation énergétique fixe.

Une estimation exploratoire appliquée aux agents de code proposait approximativement :

| Type de token                          |   Énergie estimative |
| -------------------------------------- | -------------------: |
| Lecture depuis le cache                |    39 Wh par million |
| Entrée normale avec très long contexte |   390 Wh par million |
| Création du cache                      |   490 Wh par million |
| Sortie générée                         | 1 950 Wh par million |

Ces valeurs sont elles-mêmes fondées sur des hypothèses de matériel, de prix et de contexte, mais elles montrent qu’un token de sortie pourrait représenter **jusqu’à cinquante fois** l’énergie d’un token relu depuis le cache. ([Simon P. Couch][1])

Pour vos 4 milliards de tokens, cela donne une enveloppe de sensibilité :

* presque uniquement du cache : environ **156 kWh** ;
* hypothèse centrale précédente : environ **400 kWh** ;
* mélange caractéristique de longs contextes : environ **0,8 à 1,6 MWh** ;
* cas théorique presque entièrement composé de sorties : jusqu’à **7,8 MWh**, mais ce scénario est très improbable pour Codex.

Pour les **8 milliards de tokens du compte principal**, les valeurs seraient approximativement doublées.

La formulation la plus défendable est donc :

> Pour CleanMyMap, l’ordre de grandeur plausible est probablement de quelques centaines de kWh à environ 1 MWh sur quatre mois, mais les données disponibles ne permettent pas une estimation précise.

Le précédent chiffre de **400 kWh** reste plausible si une grande partie des milliards de tokens correspond à des lectures répétées ou mises en cache. Il devient trop faible si le compteur contient beaucoup de générations, de raisonnement ou de traitements de très longs contextes.










## 3. Hypothèse par token contre hypothèse par temps d’utilisation

### Estimation par token

Elle se rapproche davantage du travail réellement envoyé aux modèles. Elle permet de tenir compte des énormes contextes des agents de programmation.

Mais elle devient trompeuse lorsque le compteur additionne sans distinction :

* entrées nouvelles ;
* contexte répété ;
* cache lu ou créé ;
* sorties visibles ;
* tokens de raisonnement internes ;
* appels parallèles.

Une requête typique de 500 tokens de sortie a été estimée autour de **0,3 Wh**, une requête avec 10 000 tokens d’entrée autour de **2,5 Wh**, et une requête avec 100 000 tokens autour de **40 Wh**. Le contexte compte donc autant que le nombre brut de tokens. ([Epoch AI][2])

### Estimation par temps

Elle consiste à estimer :

> durée active × nombre d’agents × puissance informatique moyenne.

Elle est plus intuitive, mais le temps passé devant Codex n’est pas le temps de calcul :

* Codex peut rester ouvert sans produire de calcul ;
* les tests locaux consomment principalement votre ordinateur, pas le modèle ;
* plusieurs agents peuvent calculer simultanément ;
* un agent peut effectuer dix appels pendant une seule instruction ;
* les fournisseurs regroupent plusieurs utilisateurs sur les mêmes accélérateurs.

Le temps d’utilisation constitue donc surtout un **contrôle de cohérence**. Sans connaître le nombre de GPU réellement alloués, leur puissance, leur taux d’utilisation et le batching, il n’est pas possible de convertir proprement une heure de Codex en kWh.

La meilleure méthode serait une combinaison :

1. séparer les tokens d’entrée, de sortie, de cache et de raisonnement ;
2. appliquer un coefficient propre à chaque catégorie ;
3. comparer le résultat avec le nombre de journées ou d’heures d’agents actifs ;
4. publier une fourchette plutôt qu’un chiffre unique.











## 4. Votre impact face à l’entraînement des modèles

À l’échelle d’un entraînement industriel, votre consommation reste faible.

Le développement de la famille Llama 3.1 a représenté environ **39,3 millions d’heures-GPU** et **11 390 tonnes de CO₂e en émissions calculées selon le lieu de consommation électrique**. Le seul modèle 405B représentait environ 8 930 tonnes. ([GitHub][3])

Avec votre estimation centrale de **20 à 160 kg CO₂e pour CleanMyMap**, votre projet représenterait environ :

* **70 000 à 570 000 fois moins** que l’entraînement de toute la famille Llama 3.1 ;
* **300 à 2 500 fois moins** que l’empreinte complète estimée de l’entraînement de BLOOM, évaluée à 50,5 tonnes de CO₂e. ([arXiv][4])

Mais la comparaison doit être interprétée correctement :

* l’entraînement est un coût initial partagé par des millions d’utilisateurs ;
* votre utilisation provoque principalement de l’**inférence** ;
* un message supplémentaire ne déclenche pas un nouvel entraînement ;
* l’ensemble de la demande des utilisateurs influence néanmoins la construction de nouveaux centres de données et le développement des modèles suivants.

L’inférence cumulée peut donc finir par dépasser l’entraînement sur toute la durée de vie d’un modèle. Le problème industriel vient surtout de la multiplication à très grande échelle : les centres de données américains ont utilisé environ 176 TWh en 2023 et pourraient atteindre 325 à 580 TWh en 2028, la croissance des serveurs d’IA jouant un rôle majeur. ([Berkeley Lab News Center][5])











## 5. Comparaison avec un régime contenant de la viande

Une étude française publiée en 2025 estime que remplacer quotidiennement la viande par des légumineuses, noix, graines, œufs ou substituts pourrait réduire l’empreinte alimentaire d’environ **2,8 kg CO₂e par jour**, soit approximativement **1 tonne de CO₂e par an**. ([Portail de Recherche WUR][6])

En annualisant votre hypothèse centrale pour CleanMyMap :

* 20 à 160 kg sur quatre mois ;
* donc environ **60 à 480 kg CO₂e par an**, si vous maintenez le même rythme.

Votre usage intensif de l’IA représenterait ainsi approximativement **6 à 47 %** de la réduction annuelle associée au remplacement quotidien de la viande dans cette étude.

Sur les quatre mois étudiés :

| Activité                                                | Empreinte ou réduction estimée |
| ------------------------------------------------------- | -----------------------------: |
| IA pour CleanMyMap, hypothèse centrale                  |                 20–160 kg CO₂e |
| Remplacement quotidien de la viande pendant quatre mois |            environ 341 kg CO₂e |

Avec l’hypothèse centrale, l’effet alimentaire reste donc **de deux à dix-sept fois plus important**. Mais avec une hypothèse IA haute, comportant beaucoup de sorties et de longs raisonnements, les deux pourraient devenir comparables.

Les études observent aussi que l’empreinte climatique d’un régime végétalien représente environ 25 % de celle d’un régime consommant plus de 100 g de viande par jour. L’alimentation carnée possède également des impacts importants sur l’occupation des sols, le méthane, l’eutrophisation et la biodiversité, dimensions qui ne sont pas directement comparables à l’électricité consommée par l’IA. ([Nature][7])









## 6. Impact physique et responsabilité individuelle

Ces deux notions ne doivent pas être confondues.

**L’impact physique** correspond à l’électricité, à l’eau, aux émissions et à l’usure du matériel nécessaires pour exécuter vos demandes.

**L’empreinte attribuée** dépend d’une convention comptable : inclut-on seulement l’inférence marginale, une fraction de l’entraînement, la fabrication des GPU, les bâtiments et les réseaux électriques ?

**La responsabilité** dépend surtout du contrôle et du pouvoir de décision.

Les entreprises contrôlent :

* la taille et l’architecture des modèles ;
* le nombre d’entraînements ;
* le choix des GPU ;
* le lieu des centres de données ;
* le mix électrique et les contrats énergétiques ;
* les méthodes de refroidissement ;
* les mécanismes de cache et de mutualisation ;
* les paramètres proposés par défaut ;
* la transparence des mesures.

Elles portent donc la plus grande **responsabilité structurelle**. Meta peut par exemple déclarer pour le même entraînement Llama 3.1 environ **11 390 tonnes en comptabilité géographique**, mais zéro tonne en comptabilité dite « market-based » grâce à l’achat ou à l’appariement d’électricité renouvelable. Cela montre que la comptabilité carbone peut changer fortement sans que la consommation physique d’électricité disparaisse. ([GitHub][3])

L’utilisateur contrôle principalement :

* la fréquence des appels ;
* le nombre d’agents parallèles ;
* la répétition d’audits similaires ;
* la taille des contextes envoyés ;
* l’usage de modèles puissants lorsque des modèles plus légers suffiraient ;
* la valeur réellement produite par cette consommation.

Votre responsabilité est donc **plus élevée que celle d’un utilisateur occasionnel**, mais elle n’est pas proportionnelle à votre part de l’impact industriel total. Vous ne choisissez ni les centres de données ni le matériel, et vous ne déclenchez pas directement les entraînements.

La comparaison avec la viande doit également intégrer le contrefactuel. Réduire la viande implique de la remplacer par d’autres aliments, ce que les études alimentaires peuvent modéliser. Pour l’IA, il faut demander ce qu’elle remplace : du temps humain, des déplacements, une prestation, du développement abandonné ou simplement une consommation supplémentaire. L’utilité sociale ou environnementale de CleanMyMap peut justifier une consommation donnée, mais elle ne l’annule pas comptablement.


[1]: https://simonpcouch.com/blog/2026-01-20-cc-impact/ "Electricity use of AI coding agents | Simon P. Couch – Simon P. Couch"
[2]: https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use "How much energy does ChatGPT use? | Epoch AI"
[3]: https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/MODEL_CARD.md "llama-models/models/llama3_1/MODEL_CARD.md at main · meta-llama/llama-models · GitHub"
[4]: https://arxiv.org/abs/2211.02001?utm_source=chatgpt.com "Estimating the Carbon Footprint of BLOOM, a 176B Parameter Language Model"
[5]: https://newscenter.lbl.gov/2025/01/15/berkeley-lab-report-evaluates-increase-in-electricity-demand-from-data-centers/?utm_source=chatgpt.com "Berkeley Lab Report Evaluates Increase in Electricity Demand ..."
[6]: https://research.wur.nl/en/publications/substituting-meat-with-alternatives-the-potential-to-reduce-envir/ "
        Substituting meat with alternatives: the potential to reduce environmental footprints of the French diet: The Third French Individual and National Food Consumption Survey (INCA3)
      \-  Research Portal - Wageningen University & Research"
[7]: https://www.nature.com/articles/s43016-023-00795-w "Vegans, vegetarians, fish-eaters and meat-eaters in the UK show discrepant environmental impacts | Nature Food"


## 7. Tokens par mois
**Oui, 3 milliards de tokens par mois sont techniquement plausibles dans ton cas**, mais ils indiquent probablement une très forte répétition du contexte, et non 3 milliards de tokens de code ou de réponses réellement produits.

Tu utilises environ :

* 40 h de développement humain par mois ;
* jusqu’à 3 conversations simultanées ;
* soit potentiellement **120 heures-conversations** ;
* 3 milliards ÷ 120 = **25 millions de tokens par heure et par conversation**.

GPT-5.4 mini possède une fenêtre de contexte maximale de 400 000 tokens. Une conversation consommant 25 millions de tokens par heure équivaut donc à environ **62 passages de 400 000 tokens par heure**, soit un passage presque complet toutes les 58 secondes. Avec trois conversations, cela donne environ 75 millions de tokens par heure de travail humain, ce qui conduit bien à environ 3 milliards sur 40 heures. ([OpenAI Développeurs][1])

Ce rythme est élevé, mais réaliste lorsqu’un agent :

* relit un contexte de conversation devenu volumineux ;
* réinjecte les instructions, `AGENTS.md`, documentation et fichiers précédemment ouverts ;
* enchaîne plusieurs appels de modèle pour une seule demande ;
* utilise des outils, sous-agents ou boucles de correction ;
* effectue ces opérations dans trois sessions parallèles.

OpenAI comptabilise séparément les tokens d’entrée, les entrées récupérées depuis le cache, les sorties et certains tokens de raisonnement. Les tokens issus de l’historique réutilisé continuent donc d’apparaître dans le volume traité, même lorsqu’ils bénéficient du cache. ([OpenAI Help Center][2])

## Le test décisif

Regarde la répartition dans **Codex Settings → Usage Dashboard** :

| Répartition constatée                 | Interprétation                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| Majorité d’entrées en cache           | Volume plausible ; contexte répété, mais coût informatique réduit par le cache |
| Majorité d’entrées non mises en cache | Sessions ou fichiers trop variables ; forte inefficacité contextuelle          |
| Beaucoup de sorties                   | Agents trop verbeux, raisonnements longs ou tâches autonomes excessives        |
| Répartition inconnue ou incohérente   | Vérifier la période, les comptes inclus et la métrique affichée                |

OpenAI précise que le tableau de bord affiche l’usage récent et que la consommation dépend directement du mélange entre entrée, entrée en cache et sortie. ([OpenAI Help Center][2])

**Trois milliards de tokens de sortie seraient irréalistes** : cela représenterait plus de 20 000 tokens générés par seconde pendant tes 40 heures. En revanche, **trois milliards de tokens totaux dominés par du contexte en cache sont crédibles**.

## Mon diagnostic

Le nombre de conversations parallèles explique une grande partie du volume :

* 1 conversation active : équivalent d’environ 1 milliard de tokens par mois au même rythme ;
* 2 conversations : environ 2 milliards ;
* 3 conversations : environ 3 milliards.

Le parallélisme ne multiplie toutefois la consommation par trois que lorsque les trois agents travaillent réellement pendant l’essentiel des 40 heures. Une conversation simplement ouverte et inactive ne consomme normalement pas de tokens.

Ton dépôt accentue également le phénomène : il contient une documentation abondante, de nombreuses règles persistantes et de longues conversations. Si chaque nouvel appel réinjecte 200 000 à 400 000 tokens, quelques dizaines de cycles par heure suffisent pour atteindre ton chiffre. GPT-5.4 mini est justement conçu pour des charges importantes, les outils et les sous-agents, mais cela n’empêche pas une consommation massive de contexte. ([OpenAI][3])

## Conséquence pour l’analyse carbone

Le calcul ne doit donc pas partir de :

> 3 milliards de tokens identiques.

Il faut partir de :

> X tokens d’entrée non cachés + Y tokens d’entrée en cache + Z tokens de sortie et de raisonnement.

Un token en cache est facturé dix fois moins qu’un token d’entrée neuf pour GPT-5.4 mini, ce qui indique qu’OpenAI lui attribue une charge économique nettement plus faible. Cela ne fournit pas un facteur carbone, mais interdit de traiter les trois catégories comme énergétiquement équivalentes. ([OpenAI Développeurs][1])

**Conclusion : 3 milliards de tokens sont réalistes avec trois agents parallèles et un contexte volumineux. Ce volume est néanmoins anormalement élevé par rapport à 40 heures de développement et révèle probablement une réinjection presque continue de gros contextes. Avant toute estimation carbone, il faut récupérer la ventilation exacte entre entrée, cache et sortie.**

[1]: https://developers.openai.com/api/docs/models/gpt-5.4-mini "GPT-5.4 mini Model | OpenAI API"
[2]: https://help.openai.com/en/articles/20001106-codex-rate-card "Codex rate card | OpenAI Help Center"
[3]: https://openai.com/index/introducing-gpt-5-4-mini-and-nano/ "Introducing GPT-5.4 mini and nano | OpenAI"









## 8.Développement web avec l’IA et trajectoire climatique individuelle

L’empreinte carbone moyenne d’un Français se situe aujourd’hui autour de 8 à 10 tCO₂e par an. Pour respecter une trajectoire mondiale compatible avec les objectifs climatiques associés à l’Accord de Paris, l’ordre de grandeur souvent retenu à long terme est d’environ 2 tCO₂e par personne et par an. Ce seuil n’est pas une limite individuelle directement inscrite dans l’accord, mais une traduction des réductions nécessaires à l’échelle mondiale.

Dans le cas étudié, l’utilisation de Codex représente environ 40 heures de développement par mois, souvent avec trois conversations simultanées, pour près de 3 milliards de tokens mensuels. Ce volume est techniquement plausible, notamment lorsqu’une grande quantité de documentation, d’historique et de fichiers est relue à chaque appel. Il ne signifie toutefois pas que 3 milliards de tokens de texte utile ont été générés : une part importante correspond probablement au contexte réinjecté, aux tokens mis en cache, aux raisonnements internes et aux appels successifs des agents.

Il n’existe pas actuellement de facteur public suffisamment fiable permettant de convertir directement un token Codex en énergie ou en CO₂e. L’empreinte réelle dépend du modèle, du matériel, du taux d’utilisation des serveurs, du refroidissement, de la localisation des centres de données et du mix électrique. Une estimation d’environ 1 tCO₂e par an est donc plausible dans certains scénarios, mais elle ne peut pas être considérée comme démontrée à partir du seul nombre de tokens.

Si cette estimation d’une tonne annuelle était correcte, l’usage serait très difficilement compatible avec une trajectoire individuelle de 2 tCO₂e par an. Le développement assisté par IA absorberait à lui seul environ la moitié du budget carbone annuel théorique, avant même de prendre en compte le logement, l’alimentation, les transports, les biens consommés et la part des services publics. Du strict point de vue individuel, un tel niveau de consommation numérique serait donc disproportionné.

Cette incompatibilité ne signifie cependant pas que tout développement web utilisant l’IA est incompatible avec l’Accord de Paris. Le problème dépend de l’intensité de l’usage, de son efficacité et de son utilité réelle. Une activité professionnelle, associative ou collective peut légitimement utiliser une partie du budget carbone disponible si elle produit un service utile. En revanche, son utilité environnementale ne constitue pas automatiquement une compensation carbone.

Dans le cas de CleanMyMap, faciliter les actions de dépollution, la coordination des bénévoles, la cartographie et la mesure de l’impact peut créer une utilité écologique réelle. Toutefois, les déchets ramassés, les utilisateurs mobilisés ou les fonctionnalités développées ne compensent pas directement les émissions de CO₂ du développement. Une réduction ou une compensation climatique ne pourrait être revendiquée qu’en démontrant des émissions effectivement évitées : déplacements réduits, mutualisation d’actions, optimisation logistique ou amélioration mesurable du recyclage. Le projet vise bien à structurer une boucle allant de l’action de terrain à la production de données et de livrables exploitables.

Le véritable indicateur ne devrait donc pas être uniquement le nombre d’heures passées ou de tokens consommés, mais la quantité de calcul nécessaire pour produire un résultat utile :

* tokens par fonctionnalité réellement finalisée ;
* tokens par correction acceptée ;
* tokens par régression évitée ;
* tokens par utilisateur actif ;
* tokens par action de terrain effectivement accompagnée.

En conclusion, une utilisation de l’IA représentant réellement environ 1 tCO₂e par an serait incompatible, à l’échelle individuelle, avec un budget cible de 2 tCO₂e. En revanche, il serait excessif d’en déduire que tout développement web assisté par IA est intrinsèquement incompatible avec la transition climatique. L’incompatibilité vient surtout d’un usage intensif, mal mesuré ou insuffisamment optimisé. La priorité consiste donc à réduire fortement le calcul consommé par résultat utile, puis à évaluer l’empreinte avec une méthode transparente et des fourchettes d’incertitude.

