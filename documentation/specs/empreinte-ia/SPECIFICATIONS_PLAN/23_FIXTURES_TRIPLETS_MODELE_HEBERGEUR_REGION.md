# 23. Fixtures synthétiques : choix du triplet modèle + hébergeur + région et recalcul de collecte

**Statut : PLAN, support d'acceptation du lot 21, pas un lot supplémentaire.** Tous les modèles `MODEL_A`, `MODEL_B`, hébergeurs `CLOUD_1/CLOUD_2` et régions `ZONE_X/Y/Z` de ce document sont **fictifs** : ces données ne sont pas mesurées chez OpenAI, Alibaba, Google, Microsoft ou AWS. Les cas ne doivent jamais alimenter un classement de production. Les valeurs précédentes sur les 15 milliards de tokens restent de simples *fixtures de calcul* ; aucune requête réelle Codex n'est attribuée à un lieu ou à un modèle par ces tests.

## 1. Contrat d'entrée minimal pour fixtures

```yaml
# Exemples de champs métier, pas migration/DDL prescrite.
comparison:
  usage_kind: agentic_code
  workload_id: synthetic_agentic_v1
  workload_size: 1000  # mêmes tâches, complexité et budget de tentatives
  task_success_measure: passed_repo_tests
  reference:
    model_id: MODEL_A
    model_version: a-v1
    provider_id: CLOUD_1
    deployment_id: cloud1-modela-regional
    environment: cloud_api
    processing_location_kind: SINGLE_REGION_VERIFIED
    region: ZONE_X
    facility_energy_kwh: 2.0
    energy_boundary: FACILITY
    carbon_factor_kgco2e_per_kwh: 0.350
    carbon_factor_method: LOCATION_BASED_CONSUMPTION_DIRECT
  candidate:
    model_id: MODEL_B
    model_version: b-v1
    provider_id: CLOUD_2
    deployment_id: cloud2-modelb-regional
    environment: cloud_api
    processing_location_kind: SINGLE_REGION_VERIFIED
    region: ZONE_Y
    facility_energy_kwh: 1.2
    energy_boundary: FACILITY
    carbon_factor_kgco2e_per_kwh: 0.020
    carbon_factor_method: LOCATION_BASED_CONSUMPTION_DIRECT
  quality_gate: COMPARABLE_ASSUMED_FOR_FIXTURE
  watermark: SYNTHETIC_ONLY
```

Pour une **offre de production**, les champs précédents nécessitent aussi sources/datation des mesures, matériel, batching, latence, stabilité, disponibilité réelle, garantie de lieu de traitement et statut de preuve. `COMPARABLE_ASSUMED_FOR_FIXTURE` n'existe **que** dans les tests, pas comme justification d'une recommandation réelle. Un profil d'évaluation unique ne prouve pas que toute l'utilisation d'un compte peut être transférée.

## 2. Calculs énergétiques et carbone à vérifier

Pour un même jeu de tâches et une même frontière `FACILITY` :

| Cas synthétique | Énergie origine → candidat | Facteur origine → candidat (kgCO₂e/kWh) | Émissions origine → candidat | Variation énergie | Variation carbone | Décision |
| --- | --- | --- | --- | --- | --- | --- |
| A. Modèle + opérateur + région plus favorables | `2,0 → 1,2 kWh` | `0,350 → 0,020` | `0,700 → 0,024 kgCO₂e` | `-40 %` | `-96,5714 %` | Candidat Pareto, sous preuves réelles équivalentes |
| B. Modèle moins énergivore mais mix plus carboné | `2,0 → 1,2 kWh` | `0,350 → 0,700` | `0,700 → 0,840 kgCO₂e` | `-40 %` | `+20 %` | Ne pas afficher « moins polluant » |
| C. Même modèle, région seule | `2,0 → 2,0 kWh` | `0,350 → 0,020` | `0,700 → 0,040 kgCO₂e` | `0 %` | `-94,2857 %` | Alternative carbone si région effectivement sélectionnable |
| D. Modèle moins énergivore en réseau intermédiaire | `2,0 → 1,2 kWh` | `0,350 → 0,525` | `0,700 → 0,630 kgCO₂e` | `-40 %` | `-10 %` | Candidat potentiellement Pareto, pas « -40 % carbone » |
| E. Carbone plus bas, énergie supérieure | `2,0 → 2,4 kWh` | `0,350 → 0,020` | `0,700 → 0,048 kgCO₂e` | `+20 %` | `-93,1429 %` | `LOWER_CARBON_ENERGY_TRADEOFF` uniquement |

**Important :** la fixture C suppose **énergie de déploiement identique** ; cela peut être faux en production à cause du matériel, de la charge ou du PUE. Elle ne prouve ni une région Codex disponible ni un avantage complet en ACV. Les facteurs `0,020`, `0,350`, `0,525`, `0,700` sont des nombres de test et non des mesures d'offres réelles.

### Multi-régions et absence de routage connu

La même offre à `1,2 kWh` pouvant traiter dans `ZONE_Y` (`0,020`) ou `ZONE_Z` (`0,525`) kgCO₂e/kWh, avec destinations **exhaustives** mais partage du travail inconnu :

```text
C_min = 1,2 × 0,020 = 0,024 kgCO2e
C_max = 1,2 × 0,525 = 0,630 kgCO2e
Résultat publié = [0,024 ; 0,630] kgCO2e, non 0,327 (moyenne arbitraire).
```

Si la liste de destinations n'est **pas exhaustive** ou si l'énergie du site diffère sans bornes par destination : `NA`. Si `GetInferenceProfile`/une source analogue énumère les régions autorisées mais ne renseigne pas les parts énergétiques de chaque région, un poids moyen *par requête* n'autorise pas de moyenne *par kWh*.

**Comparaison robuste par intervalles** : pour prouver une baisse carbone sous ce routage, l'intervalle candidat doit être entièrement inférieur à l'intervalle du témoin ; sinon afficher incertitude, sans affirmer le classement carbone. Les intervalles ne constituent pas une mesure de la distribution réelle.

## 3. Matrice de refus et statut

| Entrée | Résultat attendu |
| --- | --- |
| Modèle Qwen prétendument « en Chine » car éditeur chinois, mais déploiement AWS en Europe | Pays du modèle ignoré ; région physique du déploiement seulement |
| Endpoint `eu` prouvé, lieu de traitement non garanti | `INPUT_OR_STORAGE_REGION_ONLY`, CO₂e régional `NA` |
| Profil AWS `Global` à destinations non exhaustives | `GLOBAL_ROUTED`, pas de facteur national |
| Profil AWS `Geo` à destinations exhaustives, part inconnue | `REGIONAL_SET_VERIFIED`, intervalle si bornable, pas moyenne |
| Contrat serveur single-region vérifié et modèle/version bien disponible | Région admissible, sous réserve de preuve énergétique et de qualité |
| `possibleHosters` contient un fournisseur, aucune version/déploiement confirmé | `UNAVAILABLE` / `NA`, aucune permutation fictive |
| Énergie candidat `GPU_ONLY`, témoin `FACILITY` | `BOUNDARY_MISMATCH`, aucun delta affiché |
| Un modèle obsolète ou dépourvu des outils d'agent requis | `UNAVAILABLE` ou `CAPABILITY_GAP` |
| Benchmark code de tâches simples alors que compte utilise des agents complexes | `WORKLOAD_MISMATCH` / `QUALITY_UNPROVEN` |
| Même modèle dans un autre pays mais choix régional non proposé par la plateforme utilisateur | Scénario pédagogique uniquement, **pas** recommandation exploitable |
| Candidat `local_device` et origine `cloud_api` | `ENVIRONMENT_MISMATCH`, rejet |
| Deux modèles `local_device` sur matériel **différent** et énergie mesurée sur GPU seul | Référence locale non comparable, pas de gain prétendu |
| Modèle propriétaire, tokens sans modèle/version, aucun kWh mesuré | `NO_DEFENSIBLE_COMBINATION` |
| Région annoncée « 100 % renouvelable » uniquement via garanties d'origine | Garder location-based réseau, market-based séparé |
| Facteur réseau `lifecycle` candidat vs `direct` origine | `CARBON_BOUNDARY_MISMATCH` ; pas de ratio |
| Origine énergie zéro ou `NA` | Pas de pourcentage, état `NA` |
| Eau indirecte française non sourcée alors que témoin utilise un facteur US | Après eau `NA`, double seuil `UNKNOWN` ; carbone seul si justifié |

## 4. Simulation des objectifs terrain et confidentialité

La simulation doit :

1. Substituer seulement **une portion source effectivement attribuée** (modèle/version/workload et environnement identifiés), en préservant les autres usages ou en marquant la portion non comparable `NA`. Ne pas recopier un ratio de 40 % sur les 15 milliards de tokens sans ventilation fiable.
2. Calculer `E_apres`, `C_apres`, `W_apres` (ou `NA`) à partir de la combinaison et de ses mesures ; ne jamais reconstituer `E` en divisant `CO₂e` par un facteur.
3. Résoudre à nouveau `C_restant`, `W_restant`, `H_min(p)`, `M_i` et `ceil(N)` selon le contrat du lot `0 + 08`, avec proportions, rendements d'incorporation, facteur mégots optionnel, mode eau, acquis réellement éligibles et maximum d'effort inchangés. Un nouveau facteur géographique peut modifier le carbone mais pas l'eau, et inversement. Un résultat eau `NA` n'est pas une compensation accomplie.
4. Produire **Avant / Après / Delta** pour kWh, CO₂e, eau calculable, heures-personne, `kg plastique`, `kg aluminium`, `kg verre`, autres catégories documentées et nombre entier de mégots, statut du solveur et limites de preuve. Les nombres exacts des scénarios à 15 milliards de tokens figurent dans `19_SCENARIOS_OPENAI_15_MILLIARDS_ET_FIN_DE_VIE.md` et `22_SOURCES_METHODO_ALTERNATIVES_IA.md` §6 ; ils restent *synthétiques*.
5. Protéger le compte : pas d'écriture sur les imports, historique tokens, défi, gamification, parts/structures, attestations ou rapports ; pas d'appel à un fournisseur tiers avec prompts, secrets, code, fichiers, corpus ou relevés privés.

## 5. Critères de validation et STOP

- Tester les cinq cas mathématiques, la fourchette multi-région et tous les rejets du §3 ; inclure transitions `NA`, contraintes de Pareto et réversion de qualification si une preuve expire.
- Exécuter tests purs TypeScript, tests d'intégration des chemins concernés, tests UI responsive/clavier/FR-EN, et tests d'absence de mutations serveur/DB et d'appels tiers. Distinguer tests exécutés, SQL versionné et production observée.
- Aucun triplet n'est recommandé comme « moins polluant » sans déploiement régional prouvé, qualité comparable, énergie et facteur localisés à frontières compatibles. Si les conditions sont absentes, le résultat **correct et achevé** est une absence de conseil et une explication exploitable.

## 6. Nouvelles fixtures déterministes : coût par tâche réussie, filtrage et graphique

**Toutes les offres ci-dessous sont synthétiques et supposées aussi performantes pour la même charge, sauf indication contraire.** Aucun chiffre de prix ou d'émission du tableau n'est une mesure ni un tarif de fournisseur réel. Les fixtures `§2` continuent de tester les émissions sur **1 000 tâches tentées** ; cette nouvelle section teste explicitement la **normalisation par tâche réussie**.

### 6.1. Vérifier d'abord le dénominateur de succès

```text
reference : attempted=1000, successful=900, total_cost=90,00 EUR, total_energy=2,0 kWh
candidate : attempted=1000, successful=890, total_cost=62,30 EUR, total_energy=1,2 kWh
P_ref=90/900=0,1000 EUR/succès      E_ref=2/900=0,002222222... kWh/succès
P_new=62,30/890=0,0700 EUR/succès  E_new=1,2/890=0,0013483146... kWh/succès
price_reduction=30,0 %
energy_reduction_on_campaign=40,0 %
energy_reduction_per_success=1-(1,2/890)/(2/900)=39,3258426966 %
```

**Invariants :** la qualité 90 % vs 89 % n'entraîne pas une égalité automatique de coût ni d'énergie par réussite. Lorsque `successful_tasks=0`, tous les ratios normalisés par réussite sont `NA`. Ne pas compter une relance réussie comme deux tâches réussies ; ses appels et dépenses contribuent au coût de la seule tâche initiale.

### 6.2. Cas d'affichage prix (X) contre carbone (Y), en unités déjà normalisées

Même jeu de tâches et qualité comparables démontrées **dans les fixtures uniquement**. La référence A coûte `0,100 €/succès`, donc `P_cap=0,115 €/succès` :

| Offre fictive | X (€/succès) | Y (gCO₂e/succès) | Énergie (Wh/succès) | Éligibilité prix | Interprétation |
| --- | ---: | ---: | ---: | --- | --- |
| `A_REF` | 0,100 | 100 | 2,0 | Référence | Baseline |
| `B_CHEAPER_CLEANER` | 0,070 | 35 | 1,2 | OUI | Dominante prix/CO₂e contre A |
| `C_EQUAL_PRICE` | 0,100 | 45 | 1,1 | OUI | À afficher même si B la domine en X/Y |
| `D_PLUS_13_PCT` | 0,113 | 20 | 1,3 | OUI | Plus cher de 13 %, moins carboné ; compromis libre |
| `E_PLUS_40_PCT` | 0,140 | 130 | 2,2 | NON | Hors plafond, ne doit pas être recommandé dans le sous-ensemble |
| `F_MINUS_40_PCT` | 0,060 | 125 | 0,9 | OUI | Moins cher et plus énergétiquement efficace mais plus carboné ; ne pas le masquer |
| `G_PLUS_15_PCT_EXACT` | 0,115 | 18 | 1,4 | OUI | Limite incluse, sans flou flottant |
| `H_PLUS_15_PCT_EPS` | 0,11501 | 10 | 1,0 | NON | À exclure malgré le carbone favorable |
| `I_MINUS_90_PCT` | 0,010 | 200 | 1,1 | OUI | Ne pas appliquer de plancher artificiel à 85 % |

**Assert principal :** sont admissibles `A_REF`, `B`, `C`, `D`, `F`, `G`, `I`, avec `E/H` hors plafond. La liste est indépendante du front de Pareto : afficher aussi les points dominés en prix/carbone ; le front met en avant les non-dominés, sans cacher `C`, dont l'efficacité énergétique peut justifier un choix informé.

**Assert Pareto prix/carbone sur cette seule fixture :** sont non dominées `I_MINUS_90_PCT`, `F_MINUS_40_PCT`, `B_CHEAPER_CLEANER`, `D_PLUS_13_PCT`, `G_PLUS_15_PCT_EXACT` ; `D` et `G` forment un compromis prix/carbone (D moins cher, G moins carboné), `C` est dominée par `B` et `A` par `B`. Vérifier séparément le front éventuel prix/énergie/carbone, car l'offre `F` reste énergétiquement intéressante malgré son Y élevé. Égalité exacte de X et Y sans amélioration stricte => aucune domination stricte.

**Assert UI :** X `€/tâche réussie`, Y `gCO₂e/tâche réussie`, repère du témoin et ligne verticale `0,115` ; curseur et clavier ; détails Wh, coût provenance, qualité, région/source, avertissement quand énergie ↑ ou carbone ↑. Tous les modèles ont des noms synthétiques en mode test ; aucun point réel n'est construit à partir de ces valeurs.

### 6.3. Rejets/précautions économiques

| Cas | Résultat attendu |
| --- | --- |
| Prix candidat `0,050`, référence `0,100`, qualité conforme | `ELIGIBLE_PRICE` : prix 50 % inférieur, pas de borne 85 % |
| Prix candidat `0,115`, référence `0,100`, même monnaie/périmètre | `ELIGIBLE_PRICE` : seuil exact inclus |
| Prix candidat `0,11501`, référence `0,100` | `OVER_PRICE_CAP` |
| Prix référence `0` ou `NA`, même si candidat `0,001` | `PRICE_UNKNOWN` : plafond relatif indéfini, aucun point éligible certifié |
| `successful_tasks=0`, `total_cost>0` | `PRICE_UNKNOWN` : division interdite |
| Compte Codex/ChatGPT avec seul abonnement mensuel et tokens totaux | `PRICE_UNKNOWN` pour un changement API : aucun coût marginal par tâche inféré |
| Token price seul sans sortie/cache/outils/échecs documentés | `INCOMPLETE_COST_BOUNDARY` ; pas de position X fiable |
| Endpoint dédié : 1 h facturée pour 10 min utiles, 50 réussites | Prendre **toute l'heure facturée** dans le coût attribuable si la session est dédiée à ces 50 tâches |
| Terminal local coût marginal 0,01 € vs autre coût `LOCAL_TCO` 0,04 € | `COST_BOUNDARY_MISMATCH`, pas de ratio automatique |
| Coût local calculé sans électricité ou avec `hardware_cost=0` par défaut | `INCOMPLETE_COST_BOUNDARY` ou documenter explicitement la frontière marginale |
| Prix référence `[0,095 ; 0,105]` ; candidat `[0,100 ; 0,115]` | `PRICE_ELIGIBILITY_UNCERTAIN` car `0,115 > 1,15 × 0,095 = 0,10925` |
| Prix référence `[0,095 ; 0,105]` ; candidat `[0,080 ; 0,090]` | `ELIGIBLE_PRICE_ROBUST` car `0,090 <= 0,10925` |
| Prix connu, carbone `NA` pour région cloud inconnue | Afficher dans « coût connu, carbone indéterminé » ; aucun Y fictif |
| Carbone connu, prix `NA` | Afficher dans « prix inconnu » ; aucun X fictif |
| Facteur local inconnu, Wh locaux mesurés | Énergie documentée, carbone local `NA` ; pas de zéro |
| Model `open_weights` sur endpoint distant | `cloud_api` ; prix du service réellement utilisé, région du serveur, jamais pays de l'éditeur |
| Modèle `open_weights` sur terminal local fixe | `local_device` ; même appareil/localisation, prix marginal ou TCO explicite, carbone réseau local |
| Architecture `moe`, weights `open_weights` | Ne pas interpréter MoE comme `hybrid` local/cloud |
| Baseline cloud et modèle local ou hybride non instrumenté | `ENVIRONMENT_MISMATCH` V1 ; **pas** de troisième runtime implicite |
| Pipeline hybride simulé, étape cloud sans lieu physique prouvé | `SCENARIO_ONLY` hors moteur V1 ; CO₂e total `NA` |

### 6.4. Matrice de réductions combinées, uniquement mono-région par offre

Pour mêmes tâches réussies, même frontière de consommation et même méthodologie de facteur électrique : `gC=1-(1-gE)*(1-gI)`.

| Gain énergie `gE` \ gain intensité `gI` | 0 % | 20 % | 50 % | 80 % |
| --- | ---: | ---: | ---: | ---: |
| 0 % | 0 % | 20 % | 50 % | 80 % |
| 20 % | 20 % | 36 % | 60 % | 84 % |
| 40 % | 40 % | 52 % | 70 % | 88 % |
| 60 % | 60 % | 68 % | 80 % | 92 % |

Contre-exemple : `gE=40 %`, **intensité carbone doublée** (`gI=-100 %`) => `gC=-20 %`, soit hausse carbone de 20 %. Les diminutions de consommation et d'intensité ne s'additionnent jamais simplement (`40 % + 50 %` n'implique pas `90 %`). Pour un routage multi-région, vérifier les bornes ou la somme réelle `Σ E_z f_z` ; ne pas appliquer cette matrice comme un oracle de comparabilité fournisseur.

### 6.5. Tests d'acceptation complémentaires

- Filtrage **qualité puis prix**, choix utilisateur explicite, aucune recommandation automatiquement imposée ; si prix/carbone NA, les offres ne sont pas projetées sur des coordonnées fausses.
- Deux offres de même modèle, hébergeurs distincts : facture, hardware, batch, PUE et région propres à chaque déploiement, même version exacte ; ne pas reprendre le prix ou l'énergie du premier.
- Mesures en `Wh/1 000 tentatives` converties en `Wh/tâche réussie` **uniquement avec nombre de succès et campagne cohérente** ; conservation du protocole.
- Preuve d'incertitude de prix ou carbone : ne pas utiliser un milieu d'intervalle pour donner une fausse certitude ; la borne et la qualification sont affichées.
- Recalcul du bilan `E`, `CO₂e`, eau, objectifs matière/mégots/heures-personne via lot `0 + 08` sur la portion réellement substituable, sans mutation. Le prix nouveau n'est **pas** ajouté aux émissions, au bilan d'eau ou aux preuves terrain.
- Un modèle local plus efficace mais plus lent doit respecter la contrainte de latence/qualité et le même terminal ; seul le coût marginal/TCO explicitement mesuré est comparable.


### 6.6. Nouvelles fixtures synthétiques : code, raisonnement, abonnement et fidélité plateforme

**Toutes ces données sont fictives.** Même protocole de 1 000 tâches de code agentique, mêmes outils, temps et critères bloquants. La référence `CODE_A`, mode `high`, réussit 90 % (`passRate=[0,90;0,90]`), `0,100 €/succès`, `100 gCO₂e/succès`. Les comparaisons n'affirment rien des produits commerciaux Astra, Sol et Luna.

| Candidat | Raisonnement évalué | Taux de succès compatible | Prix et carbone | Attendu |
| --- | --- | --- | --- | --- |
| `CODE_B` | `medium` mesuré | `[0,88;0,88]`, contraintes critiques OK | `0,080 €`, `40 g` | Éligible, preuve de code non inférieure à 3 points absolus |
| `CODE_C` | `max` mesuré | `[0,75;0,75]`, contraintes OK | `0,010 €`, `2 g` | `QUALITY_INSUFFICIENT` malgré prix/carbone |
| `CODE_D` | `max` **non mesuré** | `NA` | `0,010 €`, `2 g` | `REASONING_CONFIGURATION_UNPROVEN` ou `QUALITY_UNPROVEN` |
| `CODE_E` | `high` mesuré | `[0,90;0,90]`, test sécurité échoué | `0,010 €`, `2 g` | `QUALITY_INSUFFICIENT` |
| `CODE_F` | `medium` mesuré sur benchmark facile différent | `[0,95;0,95]` mais protocoles non identiques | `0,020 €`, `5 g` | `CODING_PROFILE_MISMATCH` |
| `CODE_G` | `medium`, sous-incertitude | `[0,85;0,94]` | `0,080 €`, `40 g` | Non-infériorité robuste non prouvée, aucune promotion |

**Facturation** : `SUB_A` sous un forfait `F1` à coût de période entièrement attribué et quotas suffisants ; `API_B` à tarif facturé par tokens. L'API est `BILLING_MODE_MISMATCH` par rapport à `SUB_A` en comparaison de même mode. Un forfait non validé donne `SUBSCRIPTION_ACCESS_UNPROVEN`, forfait absent `SUBSCRIPTION_PLAN_UNAVAILABLE`, quota insuffisant ou attribution incomplète `PRICE_UNKNOWN`. Une période différente de la référence avec coût non comparable donne `COST_BOUNDARY_MISMATCH`. Un prix par tâche déclaré de `0 €` sous abonnement ne peut jamais être inféré du seul montant fixe déjà payé.

**Bonus de plateforme** : référence `Codex/F1`, option `CURSOR_B` vérifiée sous `Cursor/F2` à `0,080 €/succès` et `40 g`; option `STAY_C` prouvée sous `Codex/F1` à `0,081 €/succès` et `40,8 g` ; `STAY_C` a une marge supplémentaire de `1,25 %` en euros et `2 %` en carbone, donc bonus UX autorisé (pas d'altération du front de Pareto : `CURSOR_B` domine `STAY_C`). `STAY_D` à `0,100 €/succès`, `60 g` ne reçoit aucun bonus ; de même sans identifiant exact de forfait ou lorsque disponibilité d'effort non confirmée. Rejeter les comparaisons réellement non substituables avant la règle de bonus.

**Validation UI** : champ « Abonnement ou API », plateforme et forfait visibles uniquement en abonnement ; champ local facultatif selon contexte, labels accessibles. La sélection d'une plateforme ne prouve pas la disponibilité de l'offre. Chaque point conserve identifiant et raisonnement ; détails qualité et provenance, bonus discret sur les offres proches, sélection par boutons natifs. Pas d'appel externe, pas de recalcul terrain avant confirmation, pas de valeur CO₂e inventée.

**Fixture négative complémentaire :** forfait et plateforme déclarés disponibles, mais `verifiedReasoningConfigurationIds=[low]` alors que la comparaison porte sur `high` : `SUBSCRIPTION_ACCESS_UNPROVEN`, pas de bonus ni de point. Même erreur en mode `LOCAL_OWNED` rattaché à `cloud_api` : `ACCESS_RUNTIME_MISMATCH`.
