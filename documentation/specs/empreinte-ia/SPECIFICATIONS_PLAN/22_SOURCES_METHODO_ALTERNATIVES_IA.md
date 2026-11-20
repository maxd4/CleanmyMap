# Sources et protocole de qualification : alternatives de modèles IA moins énergivores

**Statut : référence de recherche et de test, PLAN, 20 novembre 2026.** Ce fichier accompagne le lot 21. Ce n'est pas un benchmark exécuté, une liste de modèles recommandés ni une mesure énergétique de Codex. Les sources ont été consultées pour définir les **conditions de comparabilité** ; l'ajout de modèles réels requiert des mesures datées et vérifiées au moment de l'intégration.

## 1. Sources à exploiter, et limites à ne pas masquer

| Source vérifiée | Utilité technique | Limite majeure |
| --- | --- | --- |
| Hugging Face **AI Energy Score**, https://huggingface.github.io/AIEnergyScore/ | Comparaison d'énergie GPU en Wh/1 000 requêtes, tâche et matériel standardisés, 1 000 requêtes répétées 10 fois, GPU H100 80 Go, batch 1 | GPU seulement pour la note, **pas** consommation totale CPU/RAM/PUE/reseau d'une API cloud ; mode de service réel inconnu |
| Hugging Face **AI Energy Score v2** (4 déc. 2025), https://huggingface.co/blog/sasha/ai-energy-score-v2 | Intègre notamment des tâches de raisonnement, démontre pourquoi la difficulté de tâche change le coût ; protocole source | Ne justifie pas l'application d'un multiplicateur universel au raisonnement d'un compte Codex |
| MLCommons **MLPerf Inference/Power**, https://mlcommons.org/benchmarks/inference-edge/ | Mesures d'énergie système mesurées au mur pour des charges et matériels définis, qualité et scénario contrôlés | `Closed` compare le même modèle sur des systèmes, pas automatiquement deux modèles différents ; résultats soumis seulement pour leur benchmark |
| Stanford **HELM**, https://crfm.stanford.edu/helm/index.html | Évaluation standardisée multidimensionnelle des performances et de l'usage | Pas une mesure de kWh d'un compte OpenAI ; comparer même benchmark/version et conditions |
| OpenAI (2026), **Why SWE-bench Verified no longer measures frontier coding capabilities**, https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/ | Justifie les garde-fous contre contamination et tests défectueux pour le code agentique, et le recours à des évaluations plus robustes comme SWE-bench Pro | Aucun score d'un benchmark n'est un certificat de substituabilité d'un agent complet ; scrutin indépendant nécessaire |
| CodeCarbon, https://docs.codecarbon.io/latest/explanation/faq/ | Mesure ou estimation des consommations matériel sous le contrôle de l'opérateur, utile aux tests locaux | Ne mesure pas à distance une API cloud dont l'infrastructure est inconnue |
| EcoLogits, https://ecologits.ai/ et adaptateur `apps/web/src/lib/environmental-impact-estimator/ecologits-adapter.ts` | Modélisation sourcée, séparation IT/site/empreinte incorporée selon disponibilité des paramètres | Pour les modèles propriétaires sans paramètres fiables, l'absence de calcul reste `NA` ; modèle physique ≠ mesure serveur observée |

Les classements en étoiles ou scores Energy Score sont **relatifs à leur classe/tâche** ; ne les transformer ni en kWh d'un compte Codex, ni en émissions d'un opérateur non instrumenté.

## 2. Grain minimal d'une preuve de comparaison

Pour chaque paire `origine -> candidat` enregistrer les deux `modelId`, version/date, éditeur, opérateur/hébergeur et `executionEnvironment`. Puis :

- **Usage** : catégorie (`chat_text`, `long_document`, `agentic_code`, `reasoning`, multimodal), tâches, langue, niveau de difficulté, longueurs de contexte, fonctions et outils requis, nombre d'appels.
- **Qualité** : nom/version du benchmark, méthode de scoring, nombre et répartition des tâches, scores comparables, variance et incertitude, seuil de non-infériorité métier, limites de contamination, budget de temps/tokens/tentatives.
- **Énergie** : source/méthode/date, vraie unité (`Wh/query`, `Wh/task`, `Wh/1k tasks`, `Wh/success`), frontière `GPU_ONLY`, `IT_FULL`, `FACILITY`, `LOCAL_WALL`, hardware, quantification, batch, précision, charge, répétitions, latence et dispersion.
- **Autres dimensions** : région et type de mix électrique si observés, carbone `location-based` / `market-based`, eau directe/indirecte, périmètre ACV et points non mesurés. Ne pas inventer de région à partir du siège de l'éditeur.
- **Déploiement et économie** : disponibilité de l’API ou du runtime local, coût complet par tâche réussie (pas seulement tarif/token), compteur de succès, tentatives/outils facturés, convention local marginal/TCO ou dédié alloué, devise/date/prix source, coût financier si distinct, acceptation licence, contexte maximal, restrictions, possibilité de fonctions/outils, matériel local compatible ; si le candidat est chez un autre fournisseur, afficher un avertissement de confidentialité et de gouvernance.
- **Statut** : `MEASURED_COMPARABLE`, `MODELED_COMPARABLE`, `SCENARIO_ONLY`, `NOT_COMPARABLE`, `NA`, avec justification et identifiants stables des sources. La première catégorie peut étayer un conseil fort, la deuxième nécessite un avertissement de modélisation, les autres ne donnent pas un conseil environnemental chiffré.

## 3. Calcul correct, comparaison et contre-exemples

Sur un travail identique et une même frontière :

```
ratio_E = E_candidat / E_origine
reduction_E = 1 - ratio_E
E_candidat_simulee = nombre_taches_comparables * energie_unitaire_candidat
Delta_E = E_candidat_simulee - E_origine_simulee
```

Si les charges diffèrent, il faut **corriger par travail utile et non par simple nombre de tokens**, ou déclarer `NA`. Pour le code agentique : compter le taux de réussite et les tentatives et utiliser `Wh/tâche réussie` lorsque le protocole enregistre suffisamment de données. `E_kWh` et `E_kgCO₂e` ne sont jamais des unités interchangeables. Un changement de mix électrique peut rendre `ΔE < 0` mais `ΔCO₂e > 0`; afficher les deux, pas seulement un score « vert ».

**Fixture synthétique 1 :** même plateforme cloud, charge 1 000 tâches, même frontière `FACILITY`, 2,0 kWh origine contre 1,2 kWh candidat. Qualité 90 % contre 89 % dans **le même** benchmark, sans fonctions manquantes. Gain relatif `40 %`. Ce cas démontre seulement la logique de test, **pas l'existence d'un modèle réel**.

**Fixture synthétique 2 :** même énergie, score origin 90 %, score candidat 75 %. L'alternative est rejetée malgré une éventuelle baisse d'énergie, car la qualité utile chute.

**Fixture synthétique 3 :** 1,2 kWh `GPU_ONLY` contre 2,0 kWh `FACILITY`. Comparaison rejetée (`BOUNDARY_MISMATCH`) ; aucun gain de 40 % annoncé.

**Fixture synthétique 4 :** compte avec 15 milliards de tokens Codex mais sans ventilation d'usage par modèle, version, type de tâche ni énergie réelle. Aucun modèle alternatif validé et aucun gain réel imputable à OpenAI. Le bouton de simulation peut utiliser un ensemble de tâches **synthétique** choisi volontairement, sans prétendre recalculer la consommation personnelle réelle.

## 4. Conditions d'affichage du bouton

- `CONSEILLE` : même environnement, fonctions requises, qualité non inférieure sur le travail réellement réussi, prix par tâche comparable et ≤ +15 % du témoin, énergie et carbone qualifiés à frontières compatibles et sources datées ; montrer les compromis. Le seuil énergétique de 30 % n’autorise que le qualificatif « nettement moins énergivore » et n’est pas une condition générale pour afficher une solution économique/carbone admissible.
- `EXPLORATOIRE` : comparaison pertinente mais preuve insuffisante pour affirmer un gain réel ; bouton de simulation facultatif avec bannière « Scénario hypothétique » ; ne pas dire « recommandé ».
- `NA` : modèle ou charge non identifié, énergie de base/candidat manquante, frontière incompatible, environnement différent, qualité non démontrée, tâche non équivalente ou fonctionnalité manquante. Expliquer la cause ; ne pas calculer de delta fictif.

Aucun profil personnel, token d'usage réel, document, prompt ou code ne doit être envoyé à un autre opérateur pour réaliser cette comparaison. Les performances issues de benchmarks publics ne permettent pas d'inférer une consommation réelle par requête d'un fournisseur cloud non instrumenté.

## 5. Révision et péremption

Les scores énergétiques et qualités sont attachés à des versions de modèle **et** à des dates de mesure. Le classement peut être invalidé par une modification de modèle, d'API, de hardware, de pricing/de disponibilité ou du protocole d'évaluation. Une absence de données fiables ne se résout pas en sélectionnant « le plus petit modèle » par défaut. Les résultats doivent pouvoir devenir `NA` sans casser l'historique personnel.


## 4. Données récentes : modèles aussi performants mais pas énergétiquement équivalents

- **Yang & Armour, octobre 2026**, *Measuring the Inference Energy Efficiency of Open-Weight LLMs across Benchmarks, Reasoning Modes, and Hardware*, https://arxiv.org/abs/2610.14389 : 86 checkpoints, sept benchmarks, six plateformes ; nombreuses configurations 2,6 à 4,8 fois plus énergivores que des alternatives à score au moins équivalent ; jusqu'à 27 fois selon configurations. Mesures d'énergie de service en conditions expérimentales, **pas** preuve d'un gain exact dans une API OpenAI.
- **Scientific Reports (2026)**, *Comparing energy consumption and accuracy in text classification inference*, https://www.nature.com/articles/s41598-026-45023-0 : exemple sur **classification de texte**, Qwen 2.5 7B environ 7 fois moins énergivore que Qwen 2.5 72B, légère baisse d'accuracy de 0,07 sur l'échelle étudiée ; pas de généralisation à l'agent coding.
- **Hugging Face AI Energy Score**, https://huggingface.github.io/AIEnergyScore/ : note relative pour une tâche, un protocole, du matériel et une date de référence ; ne représente ni l'électricité d'un datacenter cloud ni le routing réel.
- **Microsoft Research (2026)**, *Energy use of AI inference, efficiency pathways, and test-time scaling*, https://www.microsoft.com/en-us/research/publication/energy-use-of-ai-inference-efficiency-pathways-and-test-time-scaling/ : mesure et scénarios tenant compte du service réel, de l'équipement et des efforts de raisonnement ; pas de facteur universel par token.

## 5. Électricité : comparer les régions **en plus** des modèles

- **RTE, bilan électrique 2025**, https://analysesetdonnees.rte-france.com/bilan-electrique-2025/emissions : intensité moyenne de consommation française **20,0 gCO₂e/kWh**, distincte des 19,6 g pour la production. Elle ne donne pas le facteur réel d'une requête OpenAI.
- **Google Cloud, région et carbone**, https://cloud.google.com/sustainability/region-carbon et https://googlecloudplatform.github.io/region-carbon-info/ : certaines régions cloud ont des données de carbone de réseau et disponibilité d'électricité décarbonée ; **les régions réellement autorisées doivent être vérifiées** pour chaque modèle/opérateur. Leur comparaison ne dit pas quel datacenter a servi une requête API opaque.
- **Google Cloud, choix des régions**, https://docs.cloud.google.com/architecture/framework/sustainability/low-carbon-regions : arbitrages résidence des données, disponibilité, latence, coût et fenêtres horaires.
- **GHG Protocol, Scope 2 Guidance**, https://ghgprotocol.org/scope-2-guidance : deux comptabilités, `location-based` (mix du réseau) et `market-based` (achats/attributs contractuels) ; ne pas remplacer l'une par l'autre pour déclarer qu'une requête a été physiquement alimentée à 100 % en électricité sans carbone.

## 6. Calculs de référence pour tests du lot 21

**Fixture synthétique**, sans mesure du compte Codex ni recommandation fournisseur :

```text
Tokens déclarés : 15 000 000 000
E_IT_ref : 4 500 kWh (0,30 kWh IT / million × 15 000 millions)
PUE : 1,15 ; E_site_ref = 5 175 kWh
fC_US_hyp = 0,35 kgCO2e/kWh ; C_ref = 1 811,25 kgCO2e
fW_US_indirect_hyp = 4,52 L/kWh ; W_ref = 23 391 L indirects
Nouvelle énergie site : 3 105 kWh (-40 %), même contexte
C_apres = 1 086,75 kgCO2e ; W_apres = 14 034,6 L indirects
p=20 %, avec facteur carbone fournisseur des mégots :
  M_avant=917,917820 kg ; N_avant=8 809
  M_apres=550,750692 kg ; N_apres=5 285
p=80 %, avec facteur carbone fournisseur des mégots :
  M_avant=731,226188 kg ; N_avant=112 270
  M_apres=438,735713 kg ; N_apres=67 362
  H_apres=221,583693 heures-personne
p=80 %, sans facteur carbone des mégots :
  M_avant=933,812119 kg ; N_avant=143 374
  M_apres=560,287271 kg ; N_apres=86 024
Matériaux p=80 % + mégots recyclés après :
  plastique=219,367856 kg ; aluminium=43,873571 kg ; verre=175,494285 kg
  Facteur verre = 1,948 kgCO2e/kg de matière réincorporée (ADEME BNR 2021)
Région seulement, sans changement de modèle ou d'énergie :
  fC_apres=0,020 kgCO2e/kWh ; C_apres=103,50 kgCO2e
  gE=0 %, gC=94,2857 % ; eau indirecte française=NA
  p=80 % + mégots avec facteur fournisseur, CARBONE SEUL :
  M_apres=41,784354 kg ; N_apres=6 416 ; objectif eau=NA
Contre-exemple : gE=40 %, fC_apres=2× fC_avant => gC=-20 % (émissions en hausse)
```

Le fait que le nouveau besoin de kg/mégots baisse d'environ 40 % dans la première simulation est dû aux coefficients inchangés **et** à la contrainte carbone dominante. Tester également eau dimensionnante, eau `NA`, `H_max` activé, `p=0`, `p=1`, objectifs déjà partiellement atteints, et substitutions sur **une seule ligne** d'usage multiformat. Les gains ne sont jamais directement convertis en résultats terrain sans passer par le solveur.

## 7. Sources primaires pour qualifier la combinaison modèle + déploiement + lieu de traitement

**Important :** les URL ci-dessous documentent des **capacités et contrats fournisseurs**, pas l'exécution d'une requête d'un compte utilisateur. À chaque intégration, vérifier la documentation actualisée et **la disponibilité pour la version/mode exacts**. Ne jamais utiliser une information de stockage ou d'endpoint comme preuve automatique de la région de traitement GPU.

| Fournisseur/documentation officielle | Information réellement disponible | Qualification obligatoire avant un facteur local |
| --- | --- | --- |
| OpenAI API : [Data residency](https://developers.openai.com/api/docs/guides/data-residency) et [Your data](https://developers.openai.com/api/docs/guides/your-data) | Projets/endpoints et modes de résidence/traitement documentés, avec restrictions de modèles et services | Vérifier API vs ChatGPT/Codex, mode de résidence, endpoint, modèle/version et garantie **de traitement** ; ne pas déduire une région physique précise du domaine ou de la résidence de données |
| [AWS Bedrock, Regional availability](https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html), [Cross-region inference](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html) et [GetInferenceProfile](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html) | Distingue `In-Region`, `Geo Cross-Region`, `Global Cross-Region` et destinations admissibles par profil/modèle | Dans un profil Geo/Global, la source AWS seule **ne prouve pas la région de chaque requête** ; si toutes destinations connues, intervalle, sinon `NA` ; actualiser si la liste des régions change |
| [Microsoft Foundry, deployment types](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/deployment-types) et [architecture](https://learn.microsoft.com/en-us/azure/foundry/concepts/architecture) | Déploiements `Global`, `Data Zone` et géographiques/régionaux avec règles de traitement différentes | Vérifier le mode du déploiement et si les données peuvent passer entre régions au sein d'une géographie ; une zone EU n'est pas un facteur électrique français |
| [Google Cloud Vertex AI, locations](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/locations) et [multi-region Claude](https://cloud.google.com/blog/products/ai-machine-learning/multi-region-endpoints-for-claude-available-on-vertex-ai) | Certains endpoints régionaux et mondiaux, modalités de résidence/ML processing variables selon modèle | La documentation indique que certains endpoints **ne garantissent pas** le lieu de traitement : valider le **contrat particulier du modèle/end-point** |
| [Alibaba Cloud Model Studio, regions](https://www.alibabacloud.com/help/en/model-studio/regions/) | Régions Pékin/Singapour/Virginie/Francfort/Tokyo/Hong Kong, endpoints, clés, catalogues et *scopes* de déploiement différents | Vérifier version, scope et traitement réel, non seulement réception/stockage de requêtes ; ne jamais affecter la moyenne chinoise à Qwen déployé hors Chine |
| [Google Cloud, Carbon-free energy by region](https://cloud.google.com/sustainability/region-carbon), [Google Cloud Carbon Footprint methodology](https://docs.cloud.google.com/carbon-footprint/docs/methodology) | CFE% annuel régional, location-based et market-based avec méthodologie | Une statistique régionale Google n'est pas une mesure de l'empreinte d'une requête passée par un opérateur tiers ; ne pas retrancher CFE% d'un facteur réseau |
| [Electricity Maps, Carbon intensity](https://app.electricitymaps.com/docs/reference/carbon-intensity/latest), [historical](https://app.electricitymaps.com/docs/reference/carbon-intensity/history) et [methodology](https://www.electricitymaps.com/data/methodology) | Intensité parfois horaire basée sur la consommation, flow-traced et périmètre cycle de vie documentés | Vérifier zone et période, conversion g/kg, production vs consommation et `lifecycle` vs `direct` ; API payante/indisponible : utiliser un facteur sourcé statique, pas importer automatiquement |
| [GHG Protocol, Scope 2 Guidance](https://ghgprotocol.org/scope-2-guidance) | Frontières et qualité des méthodes `location-based` / `market-based` | Conserver les deux lectures séparées ; contrat d'énergie propre et région physique ne sont pas une même donnée |
| [AI Energy Score](https://huggingface.github.io/AIEnergyScore/) | Benchmarks contrôlés d'énergie de modèles sur une configuration déterminée | Énergie GPU du benchmark ≠ électricité du serveur réellement déployé chez un fournisseur cloud ; preuve insuffisante à elle seule pour une recommandation carbone produit |

Les données **nucléaires et renouvelables** sont particulièrement pertinentes via les facteurs du réseau consommé. Faible intensité opérationnelle ne signifie pas « zéro impact » : usage de matériaux, énergie, eau, durée de vie et réseau doivent rester déclarés séparément. Une région plus décarbonée peut augmenter les émissions si les GPU/batching/PUE y sont moins efficaces : calculer **énergie de l'offre** puis **intensité du lieu**.

## 8. Checklist de preuve d'une offre réelle et statut de classement

```text
[ ] modelId + version et usage/benchmark clairement comparables
[ ] providerId + deploymentId et mode réellement disponible (date + source)
[ ] executionEnvironment inchangé : cloud/cloud ou local/local
[ ] lieu **physique d'inférence** : région unique prouvée, régions autorisées exhaustives, ou UNKNOWN
[ ] si région de réception/stockage/TLS seule : ne pas la confondre avec la région de calcul
[ ] si routage multi-région : poids énergétiques observés ou fourchette conditionnelle, jamais une moyenne inventée
[ ] Wh/tâche utile sur même frontière et conditions (GPU, IT, site ou local au mur)
[ ] contraintes de performance : succès, tentatives, outils, sécurité, contexte, modalités
[ ] facteur carbone daté, bon réseau, consommation et périmètre direct/ACV cohérents
[ ] distinction explicite location-based / market-based ; CFE séparé
[ ] eau directe/indirecte et ACV calculées seulement si facteurs comparables
[ ] bénéfices environnementaux différents des impacts humains et de la compensation symbolique
[ ] avant/après de kg et de mégots uniquement via le solveur, sans écriture
[ ] aucun contenu privé/clé transmis à un concurrent pour tester sa solution
```

| État | Autorise l'interface à déclarer | N'autorise jamais |
| --- | --- | --- |
| `ROBUST_LOWER_ENERGY_AND_CARBON` | « Alternative mesurée/modélisée à énergie et émissions inférieures dans ce périmètre » avec incertitude/source | « Pollution globale nulle » ou gain certifié de toute la chaîne IA |
| `LOWER_ENERGY_CARBON_UNKNOWN` | « Potentiellement moins énergivore ; émissions non comparables » | « Moins polluant grâce à la région » |
| `LOWER_CARBON_ENERGY_TRADEOFF` | « Moins carboné pour ce scénario, mais plus énergivore » | « Globalement plus écologique » sans arbitrage complémentaire |
| `SCENARIO_ONLY` | « Et si cette offre pouvait être déployée dans telle région ? » | « Vous pouvez réellement choisir cet endpoint/modèle » |
| `NO_DEFENSIBLE_COMBINATION` | « Aucune offre suffisamment documentée pour recommander » et raisons | Un pourcentage de gain ou modèle fictif présenté comme existant |

Exemples numériques, règles d'invariants et conditions de STOP : `23_FIXTURES_TRIPLETS_MODELE_HEBERGEUR_REGION.md`. Les illustrations 2026 de la section 6 restent **inchangées** et purement synthétiques.

## 9. Complément PLAN du 20 novembre 2026 : coût par tâche réussie, visualisation et licences de déploiement

### 9.1. Sources primaires supplémentaires et rôle exact

| Source | Fait documentaire exploitable | Ce que la source ne prouve pas |
| --- | --- | --- |
| [Green Software Foundation, SCI Specification](https://sci.greensoftware.foundation/) et [SCI Standard](https://greensoftware.foundation/standards/sci/) | Intensité environnementale par **unité fonctionnelle** ; frontière `E × I` et émissions incorporées `M` explicitement distinctes | Un prix/tâche, les émissions d'une API privée ou un fournisseur plus sobre mesuré |
| [Green Software Foundation, référence SCI for AI](https://github.com/Green-Software-Foundation/reference-implementations/blob/main/specifications/sci-for-ai/gsf/llm-inference/docs/SCI_METHODOLOGY.md) | Choix des unités fonctionnelles d'inférence et distinction des méthodes de mesure | Résultat de performance/énergie du compte CleanMyMap |
| [Hugging Face Inference Endpoints, pricing](https://huggingface.co/docs/inference-endpoints/pricing) et [billing FAQ](https://huggingface.co/docs/inference-endpoints/faq) | Une instance dédiée peut être facturée **à l'heure de calcul allouée**, selon dimensionnement/réplicas, et pas par token | Tarif actuel universel pour tous les déploiements, taux d'utilisation, coût/tâche ou région physique d'une offre utilisateur |
| [Hugging Face Inference Endpoints, configuration](https://huggingface.co/docs/inference-endpoints/guides/configuration) | Choix possibles du fournisseur, de l'instance et de régions dans les configurations réellement proposées | Disponibilité de toutes les combinaisons modèle/hébergeur/région sans vérification au déploiement |
| [Google Cloud, Vertex AI deployments and endpoints](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/locations) | Les endpoints ne garantissent pas nécessairement la région de traitement ML ; le mode/contrat précis gouverne la preuve physique | Localiser automatiquement les GPU à partir d'une URL régionale |
| [MLCommons MLPerf Edge](https://mlperf.pw/benchmarks/inference-edge/index.html) | Illustrations de mesures d'énergie AC au mur et frontières de systèmes dans des benchmarks contrôlés | Coût/tâche et prix API réels d'un fournisseur |

Sources documentaires consultées pour les **règles de méthode**, pas pour attribuer à OpenAI/Anthropic/Hugging Face une efficacité, un prix ou une localisation réels. Lors de l'intégration, actualiser les tarifs auprès des sources primaires de chaque offre, avec `checkedAt` et version ; ne pas mélanger deux dates ou monnaies sans taux daté.

### 9.2. Contrat économique testable

```text
unit = 1 tâche réussie selon une règle de succès identique et versionnée
cost_per_success = cost_all_attributable_attempts_and_tools / successful_tasks
energy_per_success = energy_of_same_campaign / successful_tasks
carbon_per_success = comparable_location_based_carbon / successful_tasks
threshold = 1.15 * reference_cost_per_success
eligible = quality_pass && availability_pass && capability_pass && privacy_pass
           && price_proven_comparable && candidate_cost_per_success <= threshold
```

La sélection doit compter les reprises, les recherches, les appels d'outils et les tâches **échouées**, et rapporter les deux campagnes au **nombre de tâches réussies**. Les tailles de tâches, niveaux de difficulté et budgets de calcul doivent être harmonisés ; sinon le ratio, même calculable, est `NOT_COMPARABLE`.

| Mode | Coût à documenter | Frontière et principal risque |
| --- | --- | --- |
| API à l'usage | Grille en vigueur entrée/sortie/cache + frais outils et appels réellement facturés ; volume par tâche réussie | Prix/token seul, version, frais non déclarés, abonnements et promotions ne sont pas un coût/tâche vérifié |
| Endpoint GPU dédié / self-hosted distant | Prix instance/heure × durée facturée × réplicas, inactivité, outillage et frais obligatoires alloués sur tâches réussies | Faible utilisation entraîne un coût/tâche plus haut ; ne pas ignorer les heures à vide |
| Terminal local déjà possédé | kWh au mur × tarif électricité local, et uniquement les coûts marginaux effectivement attribués | `LOCAL_MARGINAL` distinct du TCO, pas `0 €` sous prétexte que la machine est déjà achetée |
| Terminal local en coût complet | Coûts variables + amortissement matériel, maintenance/frais attribués, sur période et volume explicites | `LOCAL_TCO` non comparable à une variante locale marginale sans alignement |
| Abonnement ChatGPT/Codex à forfait | Attribution possible uniquement sur période, usage et règle d'allocation justifiés | Aucun tarif API implicite, aucun « coût marginal/tâche = 0 » affirmé sans contrat approprié |

Pour une valeur de référence `P_ref` positive, **toutes** les offres `P_candidate < P_ref`, même très inférieures à `85 %`, passent le filtre économique, tout comme les offres jusqu'à `1,15 P_ref` inclus ; les offres au-dessus sont visibles hors filtrage principal si pertinent mais ne deviennent pas des recommandations éligibles. Le « ±15 % » exprime une tolérance maximale de surcoût de 15 %, **pas** une zone symétrique obligatoire. Si la preuve de prix tombe en `NA`, le point ne peut pas figurer sur X. Si la preuve carbone tombe en `NA`, on peut présenter un prix séparément, **pas** une ordonnée inventée.

**Incertitude économique :** prix bornés documentés `[P_ref_min,P_ref_max]` et `[P_c_min,P_c_max]` : admissibilité robuste lorsque `P_c_max <= 1,15 P_ref_min`. Sinon indiquer `PRICE_ELIGIBILITY_UNCERTAIN` lorsque le passage du plafond dépend d'une hypothèse. Prix référence nul, succès nuls, facturation impossible à attribuer : `PRICE_UNKNOWN`, aucun division ni badge « gratuit ».

### 9.3. Méthodologie du graphique et classement

Axes fixes : **X `€/tâche réussie`**, **Y `gCO₂e/tâche réussie`** pour les émissions opérationnelles **location-based** au périmètre physique compatible. Montrer l'original, la limite X de +15 %, les autres solutions admissibles, leurs versions, opérateurs et régions de traitement probantes. Mettre en évidence le front de Pareto prix/carbone, **sans enlever les points dominés** et sans choisir automatiquement l'offre de référence. Garder l'**énergie `Wh/tâche réussie` comme troisième dimension distincte** et qualifier les compromis ; les frontières et intervalles d'incertitude ne sont jamais des coordonnées ponctuelles arbitraires. Pas de graphique officiel alimenté par des modèles fictifs `23`.

Le vocabulaire de l'axe Y doit être « **émissions de CO₂e opérationnelles** », jamais « pollution totale ». Les coûts ne se traduisent pas en kWh sans mesure, et les gains en CO₂e ne se transforment pas en litres ni en kg/mégots sans repasser par le solveur. Le `market-based`, l'eau et le matériel incorporé font l'objet d'informations séparées.

### 9.4. Poids ouverts, matériel local et workflows hybrides

- `weightsAvailability` est un attribut **orthogonal** au runtime `cloud_api | local_device`, et `MoE` une architecture interne. Le même checkpoint open-weight peut être facturé par requête, exploité via endpoint dédié, sur un serveur distant ou sur PC local. La licence et l'accès doivent être vérifiés pour chaque déploiement.
- En local sur **le même appareil et la même localisation**, l'intensité du réseau est commune, donc la variation carbone **opérationnelle électrique** découle principalement de l'énergie ; elle n'est pas automatiquement nulle. Coûts marginaux et TCO doivent être séparés. Sur serveur distant, la région physique du serveur redevient critique et doit être prouvée.
- Un workflow **hybride local + cloud** additionne, par **tâche complète réussie**, les coûts et énergies de ses étapes et les émissions `Σ(E_stage × f_region)` ; un routeur, ses outils et ses tentatives font partie de la frontière. Si une étape possède une région ou une énergie inconnue, total carbone `NA`. **Non implémenté au lot 21 :** pas de type `hybrid`, pas de comparaison croisée automatique cloud/local, pas de nouvel owner parallèle.

### 9.5. Matrice de gains d'intensité et d'efficacité, tests uniquement

Dans une offre à **région unique** et frontières/méthodes identiques, avec `gE=1-E_new/E_ref`, `gI=1-I_new/I_ref`, la réduction carbone électrique suit `gC=1-(1-gE)(1-gI)`. La matrice déterministe du fichier `23` fixe les **attendus de tests**, et non des pourcentages réels publiés d'un opérateur. Pour plusieurs régions, utiliser `Σ E_z I_z`, ou des bornes documentées, jamais une moyenne arbitraire.


### 9.6. Preuves supplémentaires : programmation, raisonnement, plateforme et abonnement

**Sources primaires à vérifier au jour du lot 21** :

| Source | Peut établir | Ne démontre pas |
| --- | --- | --- |
| [OpenAI, Reasoning models](https://developers.openai.com/api/docs/guides/reasoning) | Le mode de raisonnement est une configuration de requête avec effets possibles sur tokens, coût et qualité ; modes effectivement pris en charge par version à vérifier | Qu'un mode maximal rende deux modèles équivalents, ou une relation universelle entre qualité et dépense |
| [OpenAI API Pricing](https://developers.openai.com/api/docs/pricing) | Un tarif API officiel, détails des outils et éventuelles majorations régionales | Le prix d'un abonnement Codex/ChatGPT ni un coût complet par tâche de code réussie |
| [GitHub Copilot Plans](https://github.com/features/copilot/plans) et [GitHub Copilot billing](https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing) | Forfaits, modèles et limites dépendant de l'offre, politiques de facturation | Accès effectif à tous les modèles/raisonnements sur un forfait personnel non observé |
| [Cursor, Models & Pricing](https://cursor.com/docs/models-and-pricing) | Catalogue et modes de facturation, crédits et limitations propres à la plateforme à une date donnée | Coût/tâche réussi propre au travail de l'utilisateur, accès garanti sans identifier son forfait |

L'**unité fonctionnelle** d'un benchmark de code est une tâche de difficulté définie, réussie au sens de ses tests et contraintes ; les appels de l'agent et ses reprises sont comptés. Exiger un `benchmarkId`, un `codingWorkloadId`, le protocole complet, le modèle/version, le `reasoningConfigurationId`, succès avec intervalles et exigences critiques, sources et date. Des benchmarks généralistes ou des scores composites non cohérents avec le travail réellement exigé n'autorisent pas une substitution. Un modèle moins cher dont les capacités sont insuffisantes est rejeté avant toute pondération économique. Un écart robuste supérieur à **3 points absolus de réussite**, ou toute régression sur une exigence critique, rejette ; une incertitude non levée produit `QUALITY_UNPROVEN`.

Les **modes de raisonnement** dépendent du modèle et parfois de l'application ; ne jamais les aligner par intitulé seul (`high` chez un opérateur n'est pas une unité comparable à `high` chez un autre). On peut comparer les **résultats mesurés** de ces configurations distinctes sur le même jeu de tâches. L'effort « max » n'est ni un bonus automatique, ni une preuve de succès. Les noms Astra/Sol/Luna ne constituent pas un contrat de performance.

**Abonnement** : qualifier le mode d'accès `SUBSCRIPTION` et le prix attribué sur une **même période** avec abonnement complet, éventuels crédits, plafond de requêtes, surcoûts, disponibilité modèle et effort pour le forfait, succès. Les offres à frais forfaitaires et modèles/quotas hétérogènes ne se ramènent pas à un tarif par token. Les coûts déjà engagés doivent faire l'objet d'un scénario transparent (résiliation ou maintien de l'ancien plan), sans faux coût nul. Si abonnement, plateforme ou forfait non vérifiés, maintenir l'accès et/ou le coût comme inconnu.

**Règle du bonus de continuité** : ne s'active que pour `SUBSCRIPTION`, si plateforme **et forfait** déjà utilisés sont indiqués, et si la disponibilité de ce modèle+effort sur ce forfait est sourcée. Entre deux offres admissibles de coût et carbone **ponctuels**, la continuité peut être mise en évidence si elle ne coûte pas plus de 3 % supplémentaire **sur chacun des axes prix et CO₂e**. C'est un confort UX explicite, indépendant du score de benchmark, du taux de succès, du seuil de +15 % et du Pareto. La non-disponibilité, la donnée `NA` ou la différence de capacité interdit le bonus.

**Contrôle technique additionnel :** vérifier la preuve d'accès à l'effort de raisonnement sur le **couple exact** `subscriptionPlatformId + subscriptionPlanId`. Ne pas accepter `plan=VERIFIED` sans vérifier que `reasoningConfigurationId` figure dans la liste autorisée pour ce plan et cette version. Ne pas convertir un usage terminal local en facturation API par commodité de schéma.
