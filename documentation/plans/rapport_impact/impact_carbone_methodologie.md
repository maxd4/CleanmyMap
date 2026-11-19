# Méthodologie ACV numérique de CleanMyMap

Ce document explique comment CleanMyMap lit, trace et documente l'impact carbone de son propre site.

Le principe est simple: chaque chiffre affiché dans l'onglet `Impact carbone` doit pouvoir être relié à une source réelle, à une période claire et à un niveau de confiance explicite. Quand une donnée n'est pas branchée, la bonne réponse est `NA`, pas une estimation déguisée.

## Ce que mesure l'onglet

- l'impact carbone du site lui-même, côté production;
- l'impact historique enregistré mois par mois;
- l'impact de développement lié à l'usage des outils IA;
- les contributions relatives des services d'infrastructure et d'outillage;
- les données disponibles et les zones encore en `NA`.

## Sources utilisées

L'onglet impact s'appuie sur un mélange de sources réelles et de proxys clairement étiquetés:

- Supabase pour les snapshots mensuels et les signaux applicatifs;
- GitHub pour les runs GitHub Actions quand la source est disponible;
- Vercel pour les déploiements et les coûts de rendu si la métrique existe;
- Resend pour les envois d'emails;
- PostHog pour la télémétrie et le volume d'événements;
- les outils d'IA de développement, comptés à part dans l'ACV de développement;
- des proxys de calcul uniquement quand aucune métrique directe n'est accessible.

## Règle de lecture

- `observé` signifie qu'un chiffre vient d'une vraie source branchée;
- `dérivé` signifie qu'un calcul a été fait à partir de signaux observés;
- `proxy` signifie qu'une estimation est utilisée faute de mieux;
- `NA` signifie que le projet ne dispose pas encore d'une donnée exploitable.

## Comment lire la courbe

- la courbe pleine suit l'historique des snapshots mensuels du site;
- la courbe en pointillé distingue l'impact du développement assisté par IA;
- les valeurs mensuelles doivent rester cohérentes avec la période de capture;
- si le mois courant n'est pas complet, la projection doit être affichée comme telle.

## Distinguer production et développement

CleanMyMap sépare volontairement:

- les services web de production, qui appartiennent au site lui-même;
- les outils d'IA de développement, qui appartiennent à l'ACV de fabrication du site.

Les modèles utilisés pour coder ne doivent donc pas apparaître dans les quotas web. Ils doivent apparaître dans l'ACV de développement avec un badge clair indiquant qu'ils sont hors production.

## Règle de transparence

Le bloc impact doit toujours indiquer:

- la période couverte;
- la source de la donnée;
- le statut `observé`, `dérivé`, `proxy` ou `NA`;
- la cohérence avec les autres vues du projet.

Si une métrique n'est pas assez fiable pour être publiée, elle doit rester en `NA`.

## CO₂e électrique: mesure, calcul et équivalent proxy

Le moteur distingue explicitement trois états:

- `kWh × facteur électrique`: utilisé uniquement lorsqu'un signal de consommation électrique réel est fourni. Le CO₂e est alors calculé dans ce sens et ne doit pas être ajouté une seconde fois à un proxy déjà inclus dans le même total;
- `équivalent électrique estimé`: affiché lorsque le moteur répartit un CO₂e proxy entre des familles, sans disposer de kWh. Cette valeur ne signifie pas qu'une consommation électrique a été mesurée;
- `à compléter`: affiché lorsqu'aucun signal électrique ni proxy exploitable n'est disponible.

Le facteur par défaut du moteur est centralisé à `0,35 kgCO₂e/kWh` pour des serveurs majoritairement américains. Il s'agit d'un ancrage configurable, à remplacer par un facteur eGRID régional ou une localisation électrique réelle du fournisseur dès que cette donnée est connue. Les références de cadrage sont [EPA eGRID](https://www.epa.gov/egrid), [EPA - déterminer les émissions liées à l'électricité](https://www.epa.gov/system/files/documents/2025-01/using-egrid-to-determine-emissions.pdf) et [EIA - facteurs d'émissions de l'électricité](https://www.eia.gov/tools/faqs/faq.php?id=76&t=3).

Les data centers ne reçoivent pas une part de refroidissement universelle: l'IEA indique des situations pouvant aller d'environ 7 % dans certains hyperscalers efficaces à plus de 30 % dans des installations moins efficaces. Les serveurs accélérés, principalement associés à l'adoption de l'IA, sont un moteur important de la croissance prévue de la consommation des data centers; aucune part du trafic ou de l'impact de CleanMyMap n'est attribuée à l'IA sans signal spécifique. Voir [IEA, Energy and AI](https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai).

Le repère d'interface `10 kgCO₂e ≈ 70 km en voiture thermique moyenne` est une comparaison pédagogique indépendante du calcul CleanMyMap. Il est dérivé de l'ordre de grandeur `1,42 kgCO₂e/100 km` de [Impact CO₂ / Base Empreinte ADEME](https://impactco2.fr/outils/transport/itineraire?iframe=1), et ne transforme pas un proxy numérique en distance réellement parcourue.

## CO₂e et eau: contrats séparés

Le CO₂e est l'unité commune qui agrège plusieurs gaz à effet de serre selon leur potentiel de réchauffement global. Le facteur eGRID peut couvrir le CO₂, le CH₄ et le N₂O; ces composantes sont donc déjà incluses dans le total CO₂e et ne sont pas ajoutées une seconde fois. Les cartes « proxy de carbone CO₂e » et « proxy de GES inclus dans le CO₂e » sont des allocations de lecture, pas des inventaires de CO₂ brut, de CH₄ ou de N₂O mesurés.

Le moteur expose l'eau dans un contrat distinct:

- `Eau directe consommée sur site`: signal direct fourni pour le site; il peut inclure des usages de refroidissement ou d'autres usages documentés;
- `dont évaporation`: composante séparée uniquement lorsqu'elle est disponible. Toute l'eau directe n'est pas assimilée à de l'évaporation;
- `Eau indirecte liée à l'électricité`: `kWh × facteur hydrique`. Elle n'est calculée que lorsqu'un kWh est disponible, jamais en divisant un CO₂e par un coefficient;
- `Eau totale estimée`: affichée seulement lorsque les composantes nécessaires sont disponibles; sinon chaque donnée reste `à compléter`.

Le facteur par défaut de `4,52 L/kWh` est un proxy configurable d'eau indirecte pour l'électricité associée à des data centers américains, issu de [LBNL — 2024 United States Data Center Energy Usage Report](https://doi.org/10.71468/P1WC7Q). Il varie fortement selon le mix électrique, le lieu et le temps, et doit être remplacé par une donnée localisée lorsqu'elle est connue. [DOE/FEMP](https://www.energy.gov/cmei/femp/cooling-water-efficiency-opportunities-federal-data-centers) rappelle que la consommation directe des tours de refroidissement dépend notamment de la charge thermique, de l'efficacité et de l'évaporation.

L'eau reste dans le cycle hydrologique global, mais l'eau évaporée est consommée localement car elle n'est plus immédiatement disponible dans le même bassin. Le retrait et la consommation sont différents; l'eau retournée varie selon le lieu, le moment, la température et la qualité. L'impact dépend aussi du stress hydrique et des conflits locaux, pas seulement du volume en litres. Cette lecture ne doit pas être confondue avec les KPI d'impact terrain.

Référence complémentaire sur la limite planétaire Freshwater Change: [Stockholm Resilience Centre](https://www.stockholmresilience.org/research/planetary-boundaries/the-nine-planetary-boundaries/freshwater-change.html), qui distingue blue water et green water et décrit une transgression de la limite.

## Convergence scientifique des estimateurs (CleanMyMap et « Mon empreinte IA »)

Pour assurer la cohérence méthodologique sans fusionner des réalités comptables distinctes, l'estimateur environnemental existant (`environmental-impact-estimator`, via `constants-core.ts` dérivé du registre) et le module « Mon empreinte IA » (`personal-ai-estimator`) partagent une source unique canonique de facteurs versionnés (`scientific-registry.ts`).

### 1. Registre canonique des facteurs versionnés

Le registre centralise les facteurs, leur version, leur région, leur périmètre, leur unité, leurs hypothèses et leur statut de preuve (`OBSERVED`, `DERIVED`, `DECLARED`, `ASSUMPTION`, `PROXY`, `NA`) :
- `electricity-us-egrid-2024` (v2024.1) : `0,35 kgCO₂e/kWh` (EPA eGRID / EIA, région US, `PROXY`) ;
- `electricity-fr-rte-2024` (v2024.1) : `0,0217 kgCO₂e/kWh` (`21,7 gCO₂e/kWh`, RTE Bilan électrique 2024 — intensité moyenne des émissions directes de production, distincte de `30,2 gCO₂e/kWh` en ACV ; utilisé comme proxy régional d'analyse de sensibilité, région FR, `PROXY`) ;
- `water-indirect-datacenter-us-2024` (v2024.1) : `4,52 L/kWh` (LBNL 2024, région US, `PROXY`) ;
- `ai-inference-energy-scenario-low-v1` : `0,06 kWh/million_tokens` (scénario bas, `ASSUMPTION`) ;
- `ai-inference-energy-scenario-central-v1` : `0,30 kWh/million_tokens` (scénario central, `ASSUMPTION`) ;
- `ai-inference-energy-scenario-high-v1` : `0,60 kWh/million_tokens` (scénario haut, `ASSUMPTION`) ;
- `ai-partial-lca-overhead-v1` : `+30 %` (`fraction 0,30`, majoration de sensibilité de fabrication/ACV partielle, `ASSUMPTION`) ;
- `digital-car-equivalent-ademe-v1` : `14,2 kgCO₂e/100km` (Base Empreinte ADEME / Impact CO₂, équivalence pédagogique, `PROXY`) ;
- `multimodal-image-unmeasured-v1`, `multimodal-audio-unmeasured-v1`, `multimodal-video-unmeasured-v1` : facteurs physiques non calculables (`null`, statut `NA`).

### 2. Étanchéité stricte des périmètres comptables

Les périmètres sont strictement cloisonnés pour éviter tout mélange d'attribution :
1. `CLEANMYMAP_PRODUCTION` : fonctionnement du site web, de l'API et de la base de données en production ;
2. `CLEANMYMAP_DEVELOPMENT` : fabrication et développement du site (incluant l'outillage IA de développement tel que Codex/GitHub Actions) ;
3. `PERSONAL_AI_USAGE` : utilisation personnelle d'IA déclarée par l'utilisateur dans « Mon empreinte IA » ;
4. `HYPOTHETICAL_SCENARIO` : simulations prospectives ou analyses de sensibilité ;
5. `NOT_CALCULABLE` : postes ou modalités sans métrique ni facteur physique applicable.

### 3. Invariants scientifiques stricts

- **Aucune conversion du proxy générique `aiCalls` en tokens** : La métrique opérationnelle `aiCalls` (détections photos d'actions ou inférences applicatives hébergées) est un compteur d'événements et ne doit jamais être convertie en tokens LLM.
- **Aucune application automatique des facteurs américains sur infrastructure inconnue** : Si la région d'infrastructure n'est pas établie ou vaut `UNKNOWN`, aucun facteur d'émission régional américain (comme `0,35 kgCO₂e/kWh` ou `4,52 L/kWh`) n'est appliqué silencieusement. L'énergie IT/facility reste calculable si la charge est connue, mais les émissions associées sont classées non calculables (`null`) avec mention explicite.
- **Multimodalité conditionnée aux méthodes sourcées** : Le contrat scientifique intègre les quatre catégories multimodales (`text`, `image`, `audio`, `video`). Seule la modalité `text` dispose aujourd'hui de méthodes physiques sourcées (`kWh/M tokens`). Pour `image`, `audio` et `video`, les compteurs d'activité déclarés sont consignés, mais l'impact physique (kWh, CO₂e, eau) est obligatoirement `null` avec statut `NA` (`NOT_CALCULABLE`).
- **Diagnostic déterministe de qualité des données** : Les scores de confiance numériques arbitraires (pourcentages inventés de 50 % à 96 %) sont proscrits. La qualité des données est évaluée de façon déterministe selon quatre statuts objectifs : `MEASURED`, `DOCUMENTED_MODEL`, `PROXY_SCENARIO` ou `NOT_CALCULABLE`.

### 4. Règles anti-double-comptage

Six règles formelles garantissent l'intégrité des calculs :
1. `NO_IT_FACILITY_DOUBLE_COUNT` : L'énergie totale data center intégrant le PUE ($E_{\text{total}} = E_{\text{IT}} \times \text{PUE}$), ne jamais sommer énergie IT et énergie totale pour une même charge.
2. `NO_WATER_DOUBLE_COUNT` : L'eau indirecte liée à la production d'électricité ne s'additionne à l'eau directe sur site que si cette dernière n'inclut pas déjà l'amont énergétique.
3. `NO_ACV_EMBODIED_DOUBLE_COUNT` : La majoration de sensibilité ACV partielle (+30 %) s'applique au carbone opérationnel sans imputer à nouveau le matériel cloud dans un autre poste.
4. `NO_CROSS_SCOPE_DOUBLE_COUNT` : Aucune porosité ni addition entre production CleanMyMap, développement du projet et usage personnel d'un utilisateur.
5. `NO_TOKEN_TIME_DOUBLE_COUNT` : Ne jamais sommer une estimation basée sur les tokens et une estimation basée sur la durée de session pour une même activité.
6. `NO_REVERSE_CO2_TO_KWH` : La conversion énergétique n'opère que dans le sens physique $\text{kWh} \times f_C = \text{kgCO₂e}$. Interdiction absolue de diviser un CO₂e proxy par un facteur d'émission pour fabriquer un prétendu « kWh électrique mesuré ».

### 5. Catalogue des modèles et séparation stricte éditeur / opérateur

Le catalogue standard (`model-catalog.ts`) répertorie les modèles représentatifs des usages courants (OpenAI, Anthropic, Mistral, Meta, DeepSeek, Google, Alibaba) avec leurs caractéristiques physiques et contractuelles :
- **Séparation éditeur / opérateur effectif** : L'éditeur d'un modèle (ex. Meta, Mistral AI, Alibaba) ne doit jamais être confondu avec son hébergeur opérationnel (ex. Scaleway, AWS Bedrock, Microsoft Azure, Google Cloud, OVHcloud ou serveur local on-premise). La fonction `resolveHosterForModel` impose la résolution explicite de l'opérateur pour rattacher les facteurs d'efficacité et de réseau électrique adéquats.
- **Architectures denses vs MoE** : Le catalogue distingue les paramètres totaux et les paramètres actifs par token (ex. Mixtral 8x7B avec 12,9B actifs sur 46,7B totaux ; DeepSeek-V3 avec 37B actifs sur 671B totaux). L'évaluation énergétique opérationnelle repose sur la charge de calcul réellement exécutée par token (paramètres actifs), tandis que l'allocation de fabrication (embodied footprint) tient compte de l'infrastructure globale nécessaire à l'hébergement du modèle complet.
- **Modèles de raisonnement (reasoning models)** : Pour les modèles avec phase de réflexion explicite (type OpenAI o1, o3-mini ou DeepSeek-R1), les tokens de réflexion (`reasoning tokens`) sont comptabilisés comme des tokens de génération physiques supplémentaires. Aucun multiplicateur énergétique arbitraire n'est appliqué : la dépense énergétique découle naturellement du volume réel de tokens calculés.

### 6. Évaluation et intégration fidèle de la méthodologie EcoLogits v3.0.0

La méthodologie EcoLogits v3.0.0 (Data For Good / GenAI Impact, licence MPL-2.0, `packages/ecologits.js/src/impacts/llm.ts`) est implémentée fidèlement dans `ecologits-adapter.ts` et validée numériquement contre les vecteurs officiels (`spec/vectors/estimator.json`) :
- **Équations physiques officielles** :
  - Énergie GPU active : $E_{\text{GPU}} = N_{\text{output}} \times \frac{\alpha \exp(\beta \cdot \text{batch}) P_{\text{active}} + \gamma}{1000} \times N_{\text{GPU}}$ avec $\alpha = 1,1665273170451914 \times 10^{-6}$, $\beta = -0,011205921025579175$ et $\gamma = 4,052928146734005 \times 10^{-5}$ ;
  - Dimensionnement matériel : mémoire requise $M_{\text{req}} = 1,2 \times P_{\text{total}} \times \text{bits} / 8$ et nombre de GPU requis $N_{\text{GPU}} = 2^{\lceil \log_2(\lceil M_{\text{req}} / M_{\text{GPU}} \rceil) \rceil}$ ;
  - Latence de génération : régression officielle par token ($\alpha_L P_{\text{active}} + \beta_L \text{batch} + \gamma_L$) ou `1 / tps` + `requestCount × ttft`, bornée par `requestLatency` ;
  - Énergie serveur hors GPU : $E_{\text{server}} = \frac{\Delta t}{3600} \times P_{\text{server}} \times \frac{N_{\text{GPU}}}{8} \times \frac{1}{\text{batch}}$ ;
- **Multi-critères ACV et eau** : Calcul des impacts incorporés serveur + GPU pondérés par $N_{\text{GPU}} / 8$ et amortis sur $3 \times 365 \times 24 \times 3600\text{ s}$ (GWP en kgCO₂e, ADPe en kgSb-eq, PE en MJ). L'eau directe sur site ($E_{\text{IT}} \times \text{WUE}_{\text{site}}$) et l'eau indirecte réseau ($E_{\text{facility}} \times \text{WUE}_{\text{grid}}$) restent séparées ; `totalWaterLiters` n'est exposé que si les deux composantes sont calculables.
- **Refus des substitutions implicites** : EcoLogits exige des paramètres actifs/totaux publiés et un volume explicite `outputTokens > 0`. Si seul `totalTokens` (ou `inputTokens`) est fourni sur un modèle connu, l'estimateur refuse d'assimiler des tokens d'entrée à de la génération et bascule explicitement sur le scénario générique (`PROXY_SCENARIO`). Sans aucune activité déclarée, aucune durée fictive d'une seconde n'est inventée (`NOT_CALCULABLE`).

### 7. Scénarios déterministes, prompt cache, exécution locale et isolation market-based

- **Scénarios bas / central / haut** : Ils constituent des hypothèses de sensibilité déterministes (`0,06`, `0,30` et `0,60 kWh/M tokens`), jamais des tirages ou des intervalles statistiques inventés.
- **Sémantique du cache (`cachedTokens`)** : `cachedTokens` est un sous-ensemble vérifié de `inputTokens` (`0 <= cachedTokens <= inputTokens`) et n'est jamais additionné à `inputTokens`.
- **Mesure électrique directe et exécution locale (`local_device`)** : Lorsqu'une mesure directe (`measuredEnergyKwh`) est disponible, elle prévaut avec un diagnostic `MEASURED` (et `PUE = 1,0` sur `local_device`). Sans `measuredEnergyKwh`, une exécution `local_device` retourne `null` (`NOT_CALCULABLE`) sans jamais extrapoler un serveur cloud H100 ni attribuer `0` à l'impact matériel incorporé du terminal personnel (`embodiedKgCo2e = null`).
- **Herméticité market-based vs location-based** : Les déclarations contractuelles de fournisseurs (certificats ENR, garanties d'origine, PPA) sont présentées dans un bloc distinct `marketBasedDisclosure`. Elles ne modifient en aucun cas le calcul physique `location-based` fondé sur le mix électrique réel de la région d'hébergement.
