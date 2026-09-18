# Partie II-B — IA, data centers, matériel et analyse de cycle de vie {#partie-ii-b-ia-data-centers-materiel-acv}

Cette sous-partie décrit l'**infrastructure physique et les impacts environnementaux généraux de l'intelligence artificielle** : électricité, émissions, eau, centres de données, semi-conducteurs, matériaux, stockage, réseaux et fin de vie.

Elle ne calcule pas l'empreinte propre à CleanMyMap. Cette attribution appartient à la **Partie II-A**, qui doit s'appuyer sur les usages réellement observés ou, lorsque ce n'est pas possible, sur des hypothèses explicitement qualifiées.

La distinction est essentielle :

```text
II-A
→ combien d'usage peut raisonnablement être attribué à CleanMyMap ?

II-B
→ quels mécanismes physiques transforment cet usage numérique en impacts ?
```

Une statistique mondiale sur les data centers ne doit jamais être multipliée directement par un nombre de requêtes CleanMyMap sans méthode d'allocation démontrée.

## Chaîne physique d'un service d'IA

Un service génératif apparemment immatériel dépend d'une chaîne industrielle complète :

```{mermaid}
%%| fig-cap: "Chaîne physique simplifiée d'un service d'IA"
%%| fig-width: 10
flowchart LR
  A["Extraction et matériaux"] --> B["Semi-conducteurs"]
  B --> C["GPU / accélérateurs<br/>serveurs et mémoire"]
  C --> D["Data center"]
  D --> E["Électricité<br/>refroidissement<br/>réseau"]
  E --> F["Entraînement / inférence"]
  F --> G["API / application"]
  G --> H["Terminal utilisateur"]

  D --> I["Chaleur"]
  D --> J["Eau"]
  B --> K["Eau + chimie + énergie"]
  C --> L["Fin de vie / e-déchets"]
```

Cette chaîne montre pourquoi une mesure limitée aux watt-heures consommés pendant une requête reste incomplète : une analyse de cycle de vie doit également considérer la fabrication du matériel, l'infrastructure, les transports, la maintenance et la fin de vie.

## Électricité des data centers

### État mondial actuel

Les données les plus récentes de l'Agence internationale de l'énergie indiquent une croissance rapide de la consommation électrique des centres de données.

En **2024**, les data centers ont consommé environ **415 TWh**, soit autour de **1,5 % de la consommation électrique mondiale** [@iea_energy_ai_2025].

L'AIE estime ensuite la consommation à environ **485 TWh en 2025**, soit une hausse annuelle d'environ **17 %**. La consommation des data centers spécifiquement orientés IA a augmenté plus rapidement encore, d'environ **50 % en 2025** [@iea_key_questions_energy_ai_2026].

Cette progression ne signifie pas que toute l'électricité des data centers est consommée par l'IA. Les mêmes infrastructures hébergent notamment :

- cloud généraliste ;
- bases de données ;
- stockage ;
- streaming ;
- logiciels en ligne ;
- calcul scientifique ;
- services internes ;
- charges IA.

La part exacte attribuable à l'IA reste donc dépendante du périmètre et des données opérateurs.

### Horizon 2030

Dans sa mise à jour 2026, l'AIE projette une consommation mondiale des data centers d'environ **950 TWh en 2030**, soit près du double de 2025 et environ **3 % de la demande électrique mondiale**. La consommation des data centers orientés IA progresserait plus vite et **triplerait approximativement entre 2025 et 2030** dans la trajectoire centrale [@iea_key_questions_energy_ai_2026].

Cette projection est un scénario, pas une prédiction certaine. Elle dépend notamment :

- du rythme d'adoption de l'IA ;
- de l'efficacité des modèles et accélérateurs ;
- de la taille des contextes ;
- de la diffusion de la génération vidéo et des agents ;
- des coûts ;
- des capacités de fabrication ;
- des raccordements électriques ;
- des contraintes financières et réglementaires.

L'AIE souligne d'ailleurs que les gains d'efficacité par tâche sont rapides mais peuvent être dépassés par la croissance du nombre d'utilisateurs et par l'apparition de tâches beaucoup plus coûteuses, telles que certains raisonnements longs, agents et usages vidéo [@iea_key_questions_energy_ai_2026].

Il faut donc éviter deux conclusions opposées :

- l'amélioration de l'efficacité ne garantit pas une baisse de la consommation totale ;
- la croissance actuelle ne permet pas non plus d'extrapoler indéfiniment un taux constant.

## Puissance locale, réseau et géographie

### Un impact mondial limité peut être localement très important

À l'échelle mondiale, les data centers restent une fraction minoritaire de la demande électrique. Leur effet peut néanmoins être beaucoup plus important localement car les nouvelles capacités sont fortement concentrées.

L'AIE souligne que les data centers orientés IA peuvent présenter des puissances comparables à celles d'installations industrielles très énergivores et que les capacités sont regroupées dans quelques grands clusters [@iea_energy_ai_2025].

Cette concentration peut provoquer :

- files d'attente de raccordement ;
- besoin de nouveaux transformateurs ;
- renforcement des réseaux ;
- nouvelles capacités de production ;
- arbitrages locaux entre usages électriques.

Le problème énergétique doit donc être analysé à deux échelles :

```text
énergie annuelle mondiale
+
puissance et contrainte du réseau local
```

Un chiffre global faible en pourcentage n'exclut pas une contrainte forte sur un territoire particulier.

### Localisation et mix électrique

Une même quantité d'électricité peut produire des émissions très différentes selon :

- le pays et la région ;
- l'heure de consommation ;
- le mix du réseau ;
- les capacités locales de production ;
- les contrats d'approvisionnement ;
- la présence éventuelle de production sur site.

L'AIE distingue explicitement le **mix électrique physiquement consommé** du mix contractuel annoncé par un opérateur [@iea_energy_ai_2025].

Cette distinction est importante : acheter des certificats ou signer un contrat renouvelable n'implique pas que chaque kilowattheure consommé au moment du calcul provienne physiquement d'une source bas carbone.

## Émissions de gaz à effet de serre

### Émissions de l'électricité

Selon l'AIE, l'électricité consommée par l'ensemble des data centers représentait environ **180 Mt de CO₂ indirect en 2024**, soit environ **0,5 % des émissions mondiales de CO₂ liées à la combustion**. Ce chiffre couvre tous les usages des data centers ; l'IA n'en constitue qu'une partie [@iea_energy_ai_2025].

Dans le scénario central publié en 2025, les émissions liées à leur électricité augmentent encore jusqu'à environ 2030 avant de se stabiliser ou diminuer légèrement, malgré la croissance du calcul, sous l'effet de l'évolution du mix électrique [@iea_energy_ai_2025].

Ce résultat rappelle qu'il faut distinguer :

```text
croissance du calcul
≠
croissance strictement proportionnelle des émissions
```

Le résultat carbone dépend à la fois de l'énergie consommée et de son intensité carbone.

### Les émissions opérationnelles ne sont pas l'ACV complète

Les émissions associées à l'électricité ne couvrent pas :

- extraction des matériaux ;
- fabrication des puces ;
- fabrication des serveurs ;
- construction du bâtiment ;
- équipements électriques ;
- refroidissement ;
- transport ;
- remplacement du matériel ;
- fin de vie.

Une ACV complète doit donc distinguer **émissions opérationnelles** et **émissions incorporées**.

## Refroidissement, PUE et efficacité énergétique

### Le calcul n'est qu'une partie de l'énergie d'un data center

L'énergie totale d'un centre de données comprend les serveurs mais aussi :

- refroidissement ;
- pompes et ventilateurs ;
- alimentation électrique ;
- conversion ;
- stockage ;
- réseau ;
- éclairage et auxiliaires.

Le **Power Usage Effectiveness (PUE)** est défini comme :

\[
PUE = \frac{E_{\text{total data center}}}{E_{\text{équipements IT}}}
\]

Un PUE de 1 serait théoriquement parfait : toute l'énergie entrerait dans les équipements informatiques. En pratique, il reste toujours des auxiliaires. Le PUE est donc utile pour mesurer l'efficacité de l'infrastructure, mais il ne mesure ni la pertinence du calcul ni l'empreinte de fabrication [@doe_data_centers_servers].

### La densité de puissance augmente

L'IA accélère l'adoption de serveurs fortement accélérés et de racks très denses. L'AIE rapporte qu'entre **2020 et 2025**, la densité de puissance des serveurs IA a été multipliée par environ **11**, et qu'elle pourrait encore être multipliée par quatre d'ici 2027 [@iea_key_questions_energy_ai_2026].

Cette évolution renforce les contraintes sur :

- distribution électrique ;
- transformateurs ;
- refroidissement ;
- pompage ;
- conception des racks ;
- infrastructures de secours.

Elle contribue au développement du refroidissement liquide, sans qu'une technologie unique soit optimale dans tous les contextes.

## Eau : distinguer plusieurs empreintes

### Eau directe du data center

Certains centres utilisent de l'eau pour le refroidissement évaporatif ou l'humidification.

Le **Water Usage Effectiveness (WUE)** mesure classiquement :

\[
WUE = \frac{\text{eau utilisée sur site}}{\text{énergie des équipements IT}}
\]

et s'exprime généralement en litres par kWh [@doe_data_centers_servers].

Le WUE dépend fortement :

- du climat ;
- de la technologie de refroidissement ;
- de la charge ;
- des températures d'exploitation ;
- de la saison ;
- de la qualité et du type d'eau utilisés.

Une moyenne mondiale ne doit donc pas être appliquée automatiquement à un service dont la région d'exécution est inconnue.

### Eau indirecte liée à l'électricité

L'électricité possède elle-même une empreinte hydrique, notamment lorsque les technologies de production utilisent de l'eau pour le refroidissement ou le cycle thermodynamique.

L'empreinte hydrique d'un service numérique peut donc comprendre :

```text
eau directe du data center
+
eau liée à la production d'électricité
+
eau incorporée dans le matériel
```

Ne mesurer que l'eau consommée sur site sous-estime potentiellement l'empreinte complète.

### Eau de fabrication des semi-conducteurs

La fabrication de semi-conducteurs utilise de grandes quantités d'eau de très haute pureté pour les opérations de nettoyage des wafers, ainsi que de l'énergie et différents produits chimiques.

Une étude de données environnementales portant sur 28 entreprises du secteur des semi-conducteurs confirme l'importance combinée de l'eau, de l'électricité et des émissions de la fabrication [@semiconductor_environmental_data_2023].

Il faut toutefois éviter d'attribuer toute l'empreinte de l'industrie des semi-conducteurs à l'IA : les mêmes usines produisent des composants destinés à de nombreux secteurs.

### Les facteurs « par prompt » ne sont pas universels

Les mesures publiées par les fournisseurs peuvent être utiles pour comprendre une architecture précise. Google a par exemple publié en 2025 une méthodologie attribuant à un **prompt texte médian de Gemini Apps**, dans son infrastructure mesurée, environ **0,24 Wh**, **0,03 gCO₂e** et **0,26 mL d'eau** [@google_measuring_the_1].

Ces valeurs ne constituent pas un facteur générique applicable à :

- tous les modèles ;
- toutes les longueurs de contexte ;
- toutes les générations ;
- toutes les régions ;
- tous les fournisseurs ;
- les images ou vidéos ;
- les agents ;
- l'entraînement.

Elles illustrent précisément pourquoi le calcul environnemental doit rester **spécifique au système mesuré**.

### Incertitude élevée des estimations globales d'eau IA

Des études de scénarios montrent que l'empreinte hydrique de l'IA peut devenir importante, mais leurs résultats dépendent fortement du nombre de serveurs, de leur localisation, de leur durée de vie, du mix électrique et des technologies de refroidissement.

Une étude publiée dans _Nature Sustainability_ en 2025 estime, pour des scénarios de déploiement de serveurs IA aux États-Unis entre 2024 et 2030, une empreinte hydrique annuelle de plusieurs centaines de millions de mètres cubes selon les hypothèses [@nature_ai_servers_environment_2025].

Ce résultat est **un scénario américain**, pas une mesure mondiale directement transposable à CleanMyMap.

## Chaleur fatale

Toute énergie électrique utilisée par le calcul finit presque entièrement sous forme de chaleur à dissiper.

Cette chaleur peut parfois être valorisée dans :

- réseaux de chaleur ;
- bâtiments ;
- équipements publics ;
- procédés industriels.

La valorisation dépend de la température disponible, de la proximité d'un besoin de chaleur, de la saison et des coûts de raccordement.

Dans l'Union européenne, la directive sur l'efficacité énergétique impose notamment, pour les data centers au-dessus du seuil réglementaire concerné, l'utilisation de chaleur fatale ou l'évaluation de sa faisabilité lorsqu'elle n'est pas techniquement ou économiquement possible [@eu_energy_efficiency_directive_2023].

La récupération de chaleur ne supprime pas l'énergie initialement consommée. Elle permet d'en **réutiliser une partie** et éventuellement d'éviter une autre production de chaleur.

## Matériel spécialisé et semi-conducteurs

### GPU, accélérateurs, mémoire et serveurs

L'essor de l'IA génère une demande accrue pour :

- GPU et autres accélérateurs ;
- mémoire à haute bande passante ;
- équipements réseau rapides ;
- alimentation électrique ;
- racks haute densité ;
- systèmes de refroidissement.

Cette demande matérielle constitue une empreinte indépendante de l'électricité d'inférence.

Un modèle plus efficace peut réduire l'énergie nécessaire par tâche tout en nécessitant du matériel récent dont la fabrication possède elle-même une empreinte. L'évaluation doit donc éviter de regarder uniquement la phase d'usage.

### Matières critiques

L'AIE identifie parmi les matériaux nécessaires à l'expansion des data centers :

- cuivre ;
- aluminium ;
- silicium ;
- gallium ;
- terres rares ;
- matériaux de batteries.

Elle estime que la demande de gallium liée aux data centers pourrait, en **2030**, dépasser **10 % de l'offre mondiale actuelle**, alors que la production raffinée est extrêmement concentrée géographiquement [@iea_energy_ai_2025].

Ce chiffre décrit un **risque de chaîne d'approvisionnement**. Il ne signifie pas que 10 % du gallium mondial serait exclusivement consommé par les modèles génératifs eux-mêmes.

### Fabrication et empreinte incorporée

Les étapes de fabrication avancée comprennent notamment :

- purification des matériaux ;
- production des wafers ;
- photolithographie ;
- gravure ;
- dépôts ;
- nettoyage ;
- packaging ;
- mémoire ;
- assemblage du serveur.

Elles consomment énergie, eau et produits chimiques.

Les études ACV récentes sur les infrastructures informatiques montrent généralement que l'électricité d'usage reste un poste majeur, mais que le carbone incorporé dans les serveurs et leur renouvellement doit être comptabilisé lorsqu'on veut comparer des architectures ou des cycles de vie [@nature_cool_clouds_lca_2025].

## Durée de vie, renouvellement et obsolescence

Les accélérateurs progressent rapidement. Une nouvelle génération peut offrir davantage de calcul par watt et rendre économiquement intéressant le remplacement de matériel encore fonctionnel.

Deux effets opposés apparaissent :

```text
nouveau matériel plus efficace
→ moins d'énergie par unité de calcul

renouvellement plus rapide
→ davantage de fabrication et de matériel retiré
```

La meilleure décision environnementale dépend donc :

- du gain réel d'efficacité ;
- du niveau d'utilisation de l'ancien équipement ;
- de la durée de vie restante ;
- du réemploi possible ;
- de l'intensité carbone du réseau ;
- de l'empreinte de fabrication.

Il n'existe pas de durée optimale universelle.

## Déchets électroniques et circularité

Le _Global E-waste Monitor 2024_ estime que le monde a produit **62 millions de tonnes de déchets électroniques en 2022**. Seulement **22,3 %** de cette masse a été documentée comme formellement collectée et recyclée de manière appropriée [@unitar__itu_2024].

Ces chiffres concernent **l'ensemble des déchets électroniques**, pas l'IA.

Ils sont néanmoins pertinents pour comprendre la fin de vie de l'infrastructure numérique : accélérateurs, serveurs, stockage, équipements réseau et alimentation finissent par rejoindre une chaîne de réemploi, démontage ou traitement des déchets.

L'empreinte matérielle de l'IA ne doit donc pas être assimilée à la totalité des e-déchets mondiaux ; elle contribue à un flux beaucoup plus large.

## Analyse de cycle de vie : éviter la confusion avec les scopes carbone

### ACV

Une **analyse de cycle de vie** suit les impacts d'un produit ou service à travers plusieurs étapes :

```text
matières premières
→ fabrication
→ transport
→ installation
→ usage
→ maintenance
→ remplacement
→ fin de vie
```

Selon la méthode choisie, elle peut mesurer plusieurs catégories :

- changement climatique ;
- consommation d'eau ;
- ressources ;
- toxicité ;
- occupation des sols ;
- déchets.

### Scopes 1, 2 et 3

Les **scopes carbone** répondent à une autre logique : ils répartissent les émissions d'une organisation selon leur relation à celle-ci.

| Catégorie | Exemple dans une infrastructure numérique |
| --- | --- |
| Scope 1 | émissions directes d'un groupe électrogène ou autre combustion contrôlée par l'opérateur |
| Scope 2 | émissions associées à l'électricité achetée |
| Scope 3 | fabrication du matériel, chaîne d'approvisionnement, transport, services achetés, fin de vie selon le périmètre |

`ACV` et `Scope 1/2/3` ne sont donc pas synonymes.

Une analyse de projet peut utiliser des données de scopes fournisseurs comme **entrée**, mais elle doit définir sa propre frontière d'attribution.

## Stockage, réseau, réplication et sauvegardes

Le calcul IA n'est qu'une partie de l'infrastructure numérique.

Un service peut aussi consommer des ressources pour :

- stockage des modèles ;
- caches ;
- logs ;
- sauvegardes ;
- réplication ;
- transferts ;
- CDN ;
- observabilité ;
- environnements temporaires.

La redondance améliore disponibilité et résilience mais n'est pas gratuite. À l'inverse, supprimer toute redondance au nom de la sobriété peut accroître le risque de perte de données.

La question environnementale correcte est donc :

> **quel niveau de réplication et de rétention est réellement nécessaire au niveau de service attendu ?**

Il ne faut pas supposer qu'un service managé duplique systématiquement toutes les données de la même manière. L'architecture réelle du fournisseur doit être connue avant d'attribuer un multiplicateur énergétique.

## Terminaux et réseaux utilisateurs

Une analyse complète d'un service numérique peut également considérer :

- terminal ;
- écran ;
- CPU/GPU local ;
- batterie ;
- Wi-Fi ou réseau mobile ;
- transfert de médias ;
- géolocalisation ;
- caméra.

Ces postes ne sont pas spécifiques à l'IA. Une carte interactive ou une photo peut produire un coût côté terminal même sans modèle génératif.

Cette distinction est importante pour CleanMyMap : les consommations liées aux cartes, photos, GPS ou navigation web appartiennent au **bilan numérique du projet**, mais pas automatiquement à l'empreinte de l'IA.

Les facteurs génériques du type « un smartphone consomme X watts » ou « 1 Go mobile vaut Y kWh » varient trop selon l'appareil, le réseau et la méthode pour être utilisés comme constantes universelles sans source et périmètre explicites.

## Effet rebond

### Efficacité par tâche et consommation totale

Les progrès matériels et logiciels réduisent rapidement l'énergie nécessaire pour certaines tâches.

Mais :

\[
\text{impact total}
=
\text{impact par tâche}
\times
\text{nombre de tâches}
\]

Une baisse de l'impact unitaire peut donc être compensée par :

- plus d'utilisateurs ;
- plus de requêtes ;
- contextes plus longs ;
- génération multimodale ;
- agents lançant plusieurs appels ;
- nouvelles applications devenues économiquement possibles.

La mise à jour 2026 de l'AIE illustre précisément cette tension : l'efficacité énergétique par tâche progresse rapidement tandis que la consommation totale des data centers continue d'augmenter [@iea_key_questions_energy_ai_2026].

### Le rebond n'est pas automatique

Il serait cependant incorrect de supposer qu'un gain d'efficacité est toujours entièrement annulé.

L'ampleur du rebond dépend :

- du prix ;
- de la demande ;
- des usages créés ;
- des limites de capacité ;
- des politiques ;
- des comportements.

Le rebond doit être traité comme un **mécanisme possible à mesurer**, pas comme une loi imposant nécessairement une hausse infinie.

## Transparence des fournisseurs et limites des métriques

### PUE, WUE et carbone ne mesurent pas la même chose

| Indicateur | Ce qu'il mesure | Ce qu'il ne mesure pas |
| --- | --- | --- |
| PUE | énergie totale / énergie IT | utilité, carbone du mix, fabrication |
| WUE | eau du site / énergie IT | eau complète du cycle de vie |
| facteur carbone | émissions par unité d'énergie | matériaux, eau, utilité |
| ACV | impacts sur un cycle défini | aucune valeur sans frontière et hypothèses explicites |
| énergie par requête | coût d'un workload mesuré | entraînement, matériel complet, autres workloads |

Une infrastructure peut avoir un excellent PUE mais fonctionner sur une électricité carbonée. Une infrastructure refroidie sans eau sur site peut déplacer une partie de son impact vers une consommation électrique plus élevée. Une requête très efficace peut être répétée des milliards de fois.

Il n'existe donc pas **un indicateur environnemental unique de l'IA**.

### Données fournisseur

Les mesures publiées par un fournisseur sont utiles lorsqu'elles documentent :

- modèle ;
- hardware ;
- région ;
- période ;
- charge ;
- frontières du calcul ;
- méthode d'allocation.

Elles deviennent fragiles lorsqu'elles sont appliquées à un autre modèle ou à un autre fournisseur sans justification.

La transparence doit donc être préférée à une précision artificielle.

## Règles d'attribution à CleanMyMap

La Partie II-A peut utiliser les connaissances de cette fiche, mais selon une hiérarchie stricte.

### 1. Mesure directe

À privilégier lorsque disponible :

```text
kWh réellement mesurés
usage fournisseur observé
durée de calcul observée
volume de données observé
région réellement utilisée
```

Statut : `OBSERVED`.

### 2. Dérivation

Une donnée observée peut être convertie avec un facteur suffisamment documenté :

```text
usage observé
×
facteur documenté
=
impact dérivé
```

Statut : `DERIVED`.

### 3. Proxy

Lorsque le facteur réel n'est pas disponible, une littérature comparable peut fournir un ordre de grandeur.

Il faut alors documenter :

- source ;
- population ou infrastructure ;
- différences avec CleanMyMap ;
- scénario bas/central/haut lorsque nécessaire.

Statut : `PROXY`.

### 4. Donnée indisponible

Si l'allocation n'est pas défendable :

```text
NA
```

est préférable à un faux zéro ou à une estimation trop précise.

### Ce qu'il ne faut pas faire

Ne pas :

- attribuer à CleanMyMap une fraction arbitraire des 485 TWh mondiaux ;
- utiliser un facteur Google Gemini comme facteur OpenAI universel ;
- considérer toute consommation d'un data center comme de l'IA ;
- assimiler 62 Mt d'e-déchets mondiaux à l'empreinte matérielle de l'IA ;
- supposer une réplication ou un PUE sans données ;
- additionner consommation électrique et ACV lorsqu'elles se chevauchent ;
- présenter une compensation carbone comme une annulation physique des émissions.

## Repères actuels

| Indicateur | Valeur / constat | Statut |
| --- | --- | --- |
| Data centers mondiaux, 2024 | ~415 TWh ; ~1,5 % de l'électricité mondiale | estimation institutionnelle [@iea_energy_ai_2025] |
| Data centers mondiaux, 2025 | ~485 TWh | estimation institutionnelle [@iea_key_questions_energy_ai_2026] |
| Croissance 2025 | +17 % pour l'ensemble des data centers | estimation institutionnelle [@iea_key_questions_energy_ai_2026] |
| Data centers orientés IA, croissance 2025 | ~+50 % | estimation institutionnelle [@iea_key_questions_energy_ai_2026] |
| Projection data centers, 2030 | ~950 TWh ; ~3 % de l'électricité mondiale | scénario central [@iea_key_questions_energy_ai_2026] |
| Trajectoire data centers IA, 2025→2030 | environ ×3 | scénario central [@iea_key_questions_energy_ai_2026] |
| Émissions indirectes électricité data centers, 2024 | ~180 Mt CO₂ ; tous workloads confondus | estimation institutionnelle [@iea_energy_ai_2025] |
| E-déchets mondiaux, 2022 | 62 Mt | observation statistique globale [@unitar__itu_2024] |
| E-déchets formellement collectés/recyclés, 2022 | 22,3 % | observation statistique globale [@unitar__itu_2024] |
| Gallium : demande data centers 2030 | >10 % de l'offre mondiale actuelle selon scénario AIE | projection [@iea_energy_ai_2025] |
| Énergie/eau d'un prompt | dépend du modèle et de l'infrastructure ; pas de constante universelle | limite méthodologique |

Ces ordres de grandeur servent à contextualiser l'infrastructure. Ils ne remplacent pas le calcul d'attribution de la Partie II-A.

## Synthèse

L'empreinte environnementale de l'IA ne peut pas être réduite au nombre de prompts. Elle résulte d'un système physique associant **électricité, réseaux, refroidissement, eau, semi-conducteurs, serveurs, matériaux et renouvellement du matériel**.

Les données disponibles montrent une accélération nette : la consommation mondiale des data centers est estimée à environ **485 TWh en 2025** et l'AIE projette environ **950 TWh en 2030**, tandis que les infrastructures orientées IA croissent encore plus rapidement [@iea_key_questions_energy_ai_2026].

Cette hausse s'accompagne de progrès rapides d'efficacité. L'enjeu n'est donc pas de présenter l'IA comme intrinsèquement « sobre » ou « insoutenable », mais d'observer simultanément :

```text
efficacité unitaire
+
volume total d'usage
+
mix énergétique
+
localisation
+
eau
+
matériel
+
durée de vie
+
utilité
```

Pour CleanMyMap, cette partie n'est pas un calcul d'empreinte. Elle fournit le **cadre physique** nécessaire à l'interprétation de la Partie II-A. Toute valeur propre au projet doit y rester classée `OBSERVED`, `DERIVED`, `PROXY` ou `NA`, sans transformer une statistique mondiale ou une mesure fournisseur en facteur universel.
