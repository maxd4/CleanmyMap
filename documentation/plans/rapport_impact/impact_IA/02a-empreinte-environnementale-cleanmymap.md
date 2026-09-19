# Partie II — Empreinte environnementale et matérielle {#partie-ii-empreinte-environnementale-et-materielle}

Cette sous-partie estime l'**empreinte environnementale attribuable au développement de CleanMyMap**. Elle ne décrit pas l'impact mondial de l'intelligence artificielle : les mécanismes physiques généraux — data centers, électricité, eau, semi-conducteurs, matériaux, réseaux et fin de vie — sont traités séparément en [Partie II-B](./02b-ia-data-centers-materiel-acv.md).

L'objectif n'est pas de produire une précision artificielle. Le développement a mobilisé plusieurs comptes, plusieurs fournisseurs, plusieurs services cloud et des périodes dont la télémétrie n'est pas homogène. Le rapport distingue donc les données observées, les données déclarées, les dérivations, les hypothèses de scénario, les proxys environnementaux et les données indisponibles.

Le résultat principal de cette partie est un **ordre de grandeur**, pas une mesure instrumentée exhaustive.

Cette partie applique le cadre méthodologique aux postes d'impact les plus plausibles du projet : usage de l'IA, énergie, carbone, eau, matériel, services numériques et cycle de vie.

## Frontière d'attribution

La logique retenue est la suivante :

```text
II-A
→ quelle activité numérique peut raisonnablement être attribuée à CleanMyMap ?
→ quels ordres de grandeur environnementaux peut-on en dériver ?

II-B
→ quels mécanismes physiques transforment l'activité numérique
  en électricité, carbone, eau, matériel et déchets ?
```

Une statistique mondiale sur les data centers n'est donc jamais appliquée directement à CleanMyMap sans règle d'allocation. De même, un compteur d'usage d'un service ou un volume de tokens ne devient pas automatiquement une mesure en kWh, en CO₂e ou en eau.

## Statut des preuves

Cette partie reprend les six statuts définis en Partie I et détaillés en Annexe B.

| Statut | Définition |
| --- | --- |
| `OBSERVED` | Valeur directement observée dans une source technique ou une télémétrie disponible. |
| `DERIVED` | Valeur calculée à partir d'une observation ou d'une déclaration avec une formule explicite. |
| `DECLARED` | Valeur déclarée par le porteur du projet mais non reconstruite exhaustivement. |
| `ASSUMPTION` | Hypothèse de scénario utilisée pour raisonner. |
| `PROXY` | Facteur ou indicateur comparable utilisé faute de mesure physique directe. |
| `NA` | Donnée indisponible ou non attribuable proprement. |

Une valeur numérique n'est donc pas nécessairement une mesure physique. Inversement, une donnée absente n'est jamais transformée en zéro par défaut.

## Périodes et fenêtres de mesure

Le développement de CleanMyMap a commencé **à la mi-février 2026**. Le périmètre historique du projet retenu dans ce rapport est :

```text
PROJECT_PERIOD
mi-février 2026
→
septembre 2026
```

Un audit complémentaire des services externes a utilisé une fenêtre plus courte :

```text
SERVICE_AUDIT_WINDOW
18 mars 2026
→
18 septembre 2026
```

Cette fenêtre ne doit pas être étendue artificiellement au début du projet :

```text
PRE_18_MARCH_SERVICE_USAGE
UNKNOWN / NOT AUDITED
```

L'absence de données avant le 18 mars ne signifie donc ni absence d'usage ni consommation nulle.

D'autres sous-fenêtres existent à l'intérieur de ce périmètre. En particulier :

```text
CODEX_LOCAL_TELEMETRY
11 juillet 2026
→
18 septembre 2026

VERCEL_VISIBLE_DEPLOYMENT_WINDOW
10 septembre 2026
→
13 septembre 2026
```

Ces fenêtres servent à documenter ce qui est réellement visible. Elles ne doivent pas être extrapolées comme si elles couvraient uniformément toute la durée du projet.

## Inventaire des usages d'IA réellement mobilisés

### Outils principaux

Le développement n'a pas reposé sur un seul modèle ni sur un seul compte.

| Outil ou famille d'outils | Usage retenu dans l'inventaire | Statut |
| --- | --- | --- |
| Codex — compte principal | développement, audits, refactorisations, tests, documentation | `DECLARED` |
| Codex — compte secondaire | complément de capacité et sessions de développement | `DECLARED` |
| Google / Antigravity | essais et développement pendant une période limitée | `DECLARED` |
| Windsurf | essais temporaires de plateforme de développement assisté | `DECLARED` |
| Cursor | essais temporaires de plateforme de développement assisté | `DECLARED` |
| Claude Sonnet via AWS | essais et développement pendant quelques semaines | `DECLARED` |
| ChatGPT hors télémétrie Codex | réflexion, rédaction, analyse ponctuelle | `NA` comme volume distinct |
| Génération d'images | environ 130 générations ou modifications | `DECLARED` |
| Modèles exécutés localement | non retenus comme poste significatif du développement | non utilisé comme poste quantifié |

Les versions exactes de modèles utilisées au fil des essais ne sont pas nécessaires au calcul central lorsque la télémétrie ne permet pas de leur attribuer un facteur environnemental spécifique. Le rapport conserve donc la famille ou la plateforme plutôt qu'un numéro de version fragile.

### Pas de clé API comme poste central de développement

Le développement courant de CleanMyMap a principalement utilisé des abonnements, quotas inclus ou outils de développement intégrés. Aucun volume d'API payée n'est utilisé comme base du calcul central de cette partie.

Une dépense financière, un quota ou un compteur de tokens constitue une information d'activité, pas une mesure énergétique.

## Reconstruction de l'activité IA

### Compteurs Codex déclarés

Les deux comptes Codex fournissent l'ordre de grandeur déclaré suivant :

| Compte | Volume déclaré |
| --- | ---: |
| Compte principal | **35 milliards de tokens** |
| Compte secondaire | **15 milliards de tokens** |
| **Total Codex déclaré** | **50 milliards de tokens** |

Statut : `DECLARED`.

Ces 50 milliards représentent le volume déclaré sur les deux comptes, tous usages confondus. Ils ne sont donc pas assimilés directement à CleanMyMap.

### Part attribuée à CleanMyMap

L'hypothèse centrale attribue **50 %** du volume Codex total au développement de CleanMyMap :

\[
50\ \text{Md} \times 50\% = 25\ \text{Md de tokens}
\]

Le résultat retenu pour Codex est donc :

> **25 milliards de tokens Codex attribués à CleanMyMap par hypothèse.**

Statut : `DECLARED + ASSUMPTION`.

Cette valeur ne signifie pas que 25 milliards de tokens ont été identifiés session par session comme appartenant au dépôt CleanMyMap. Elle représente une convention d'attribution explicite.

### Autres plateformes testées

Antigravity, Windsurf, Cursor et Claude Sonnet via AWS ont été utilisés pendant des périodes plus courtes. Leur historique de tokens n'est pas homogène avec celui de Codex.

Le rapport n'invente donc pas un compteur fournisseur par fournisseur. L'hypothèse retenue ajoute un équivalent d'activité correspondant à **20 % du total Codex déclaré** :

\[
50\ \text{Md} \times 20\% = 10\ \text{Md de token\text{-}équivalents}
\]

Ces 10 milliards ne sont pas des tokens réellement mesurés chez Google, Anthropic, Cursor ou Windsurf. Le terme **token-équivalent** signifie uniquement : _volume d'activité ramené à l'échelle du compteur Codex afin de construire un scénario commun_.

### Hypothèse centrale d'activité

Le total central retenu est :

\[
25\ \text{Md}
+
10\ \text{Md}
=
35\ \text{Md de token\text{-}équivalents}
\]

> **HYPOTHÈSE CENTRALE : 35 milliards de token-équivalents attribués au développement de CleanMyMap entre mi-février et septembre 2026.**

Statut : `DECLARED + ASSUMPTION`.

Le total exact reste :

```text
EXACT_AI_TOTAL = NA
```

Aucun volume supplémentaire de ChatGPT n'est ajouté à ces 35 milliards faute de compteur distinct suffisamment fiable et afin d'éviter un double comptage avec les usages déjà intégrés aux comptes et outils de développement.

## Télémétrie Codex locale disponible

Une reconstruction locale apporte un contrôle de cohérence, mais elle ne couvre pas toute la période du projet ni tous les comptes.

### Fenêtre observée

```text
2026-07-11T01:44:03.623Z
→
2026-09-18T22:57:18.689Z
```

La fenêtre représente environ **69,9 jours**. Les périodes antérieures absentes ne sont jamais interprétées comme une consommation nulle.

### Qualité de la reconstruction

| Indicateur | Valeur |
| --- | ---: |
| Fichiers rollout bruts | 42 |
| Sessions uniques | 39 |
| Copies dédupliquées | 3 |
| Sessions avec compteurs exploitables | 33 |
| Sessions sans compteurs exploitables | 6 |
| Lignes JSONL valides analysées | 101 552 |
| Lignes JSONL invalides | 0 |
| Couverture des métriques | **33/39 = 84,62 %** |

Les compteurs exploitables sont reconstruits à partir de compteurs cumulatifs. La reconstruction distingue répétitions, deltas, resets et diminutions. Les tokens de raisonnement inclus dans les sorties ne sont pas additionnés une seconde fois.

### Volumes observés

| Métrique | Volume observé |
| --- | ---: |
| `input_tokens` | 1 867 497 074 |
| `cached_input_tokens` | 1 818 120 704 |
| `uncached_input_tokens` | 49 376 370 |
| `cache_write_input_tokens` | 0 |
| `output_tokens` | 7 303 361 |
| `reasoning_output_tokens` | 2 387 146 |
| `total_tokens` | **1 874 800 435** |

Sur cette fenêtre, les entrées mises en cache représentent environ **97,36 % des `input_tokens` observés**.

Cette télémétrie ne remplace pas l'hypothèse centrale de 35 milliards de token-équivalents :

- elle porte sur une période récente ;
- elle ne couvre pas les premiers mois du projet ;
- elle ne couvre pas nécessairement les deux comptes de manière exhaustive ;
- elle ne couvre pas les autres fournisseurs ;
- sa fenêtre n'est pas équivalente à la période projet complète.

Le taux de cache de 97,36 % ne doit donc pas être extrapolé mécaniquement à toute la période.

## Pourquoi les tokens ne sont pas des kWh

Un token n'a pas de consommation énergétique universelle.

La charge dépend notamment :

- du modèle ;
- de la longueur du contexte ;
- de la présence ou non d'un cache ;
- de la part d'entrée nouvelle ;
- de la quantité de sortie générée ;
- du raisonnement interne ;
- du matériel utilisé ;
- du batching et du taux d'utilisation des accélérateurs ;
- de l'infrastructure et de la région du fournisseur.

Google a par exemple publié pour son propre environnement une mesure d'environ **0,24 Wh** pour un prompt texte médian de Gemini Apps, avec environ **0,03 gCO₂e** et **0,26 mL d'eau** [@google_measuring_the_1]. Cette valeur décrit un système et une distribution de requêtes précis ; elle ne constitue pas un facteur générique applicable à un agent de code à long contexte.

Les **35 milliards de token-équivalents** sont donc un indicateur d'activité, pas une unité physique.

## Scénarios énergétiques

Faute de facteur fournisseur complet et homogène, cette partie utilise une **analyse de sensibilité** exprimée en `kWh par million de token-équivalents`.

| Scénario | Coefficient effectif | Électricité calculée | Affichage synthétique |
| --- | ---: | ---: | ---: |
| Bas | 0,06 kWh / million | 2,1 MWh | ≈ 2 MWh |
| Central | 0,30 kWh / million | 10,5 MWh | **≈ 10 MWh** |
| Haut | 0,60 kWh / million | 21 MWh | ≈ 20 MWh |

Ces coefficients sont des `ASSUMPTION + PROXY`, pas des mesures fournisseur.

Le calcul central est :

\[
35\,000\ \text{millions de token-eq}
\times
0,30\ \text{kWh/million}
=
10\,500\ \text{kWh}
\]

soit **10,5 MWh calculés**, présentés dans la synthèse comme **≈ 10 MWh**.

La valeur physique exacte reste `NA`.

Cette estimation ne doit pas être additionnée à un ancien calcul fondé sur les heures de développement : les deux méthodes cherchent à représenter le même poste.

## Empreinte carbone associée à l'électricité

Le protocole scientifique CleanMyMap retient actuellement, lorsque la région électrique exacte n'est pas connue, un facteur configurable de **0,35 kgCO₂e/kWh** pour un calcul proxy associé à des serveurs majoritairement américains.

\[
CO₂e = E_{kWh} \times 0,35
\]

| Scénario | Électricité | CO₂e électrique proxy |
| --- | ---: | ---: |
| Bas | 2 100 kWh | ≈ 0,74 tCO₂e |
| Central | 10 500 kWh | **3,675 tCO₂e ≈ 3,7 tCO₂e** |
| Haut | 21 000 kWh | ≈ 7,35 tCO₂e |

Le facteur `0,35 kgCO₂e/kWh` est un **proxy CleanMyMap**. Il ne doit pas être présenté comme un facteur moyen d'OpenAI.

Le mix électrique peut fortement modifier le carbone associé à une même quantité d'énergie, mais il ne modifie pas la quantité d'énergie elle-même : **10 MWh restent 10 MWh** quel que soit le mix. Les comparaisons détaillées entre mix bas-carbone, renouvelables, nucléaire et réseaux plus carbonés relèvent de l'Annexe B et de la Partie II-B.

## Empreinte hydrique

L'eau est traitée séparément afin d'éviter de confondre eau directe de refroidissement et eau indirecte associée à la production d'électricité.

La méthodologie CleanMyMap utilise actuellement un proxy de **4,52 L/kWh** pour l'eau indirecte liée à l'électricité.

\[
W_{indirect} = E_{kWh} \times 4,52
\]

| Scénario | Électricité | Eau indirecte calculée | Affichage synthétique |
| --- | ---: | ---: | ---: |
| Bas | 2 100 kWh | ≈ 9,5 m³ | ≈ 10 m³ |
| Central | 10 500 kWh | ≈ 47,5 m³ | **≈ 45 m³** |
| Haut | 21 000 kWh | ≈ 94,9 m³ | ≈ 95 m³ |

La valeur éditoriale centrale **≈ 45 m³** est cohérente avec l'arrondi de l'énergie centrale à **≈ 10 MWh**. La valeur de calcul **≈ 47,5 m³** reste conservée pour la reproductibilité.

Cette valeur ne représente pas l'eau directe réellement consommée par les centres de données utilisés par les fournisseurs :

```text
DIRECT_DATA_CENTER_WATER = NA
```

Les bénéfices terrain de CleanMyMap ne sont jamais soustraits de cette empreinte hydrique.

## ACV partielle centrale

Le carbone opérationnel ne représente pas tout le cycle de vie. La fabrication des accélérateurs, des serveurs, des équipements électriques et de refroidissement ainsi que la construction des infrastructures peuvent ajouter une composante incorporée.

Faute d'allocation spécifique aux infrastructures réellement sollicitées par CleanMyMap, le rapport utilise la convention de sensibilité définie en Annexe B :

```text
PARTIAL_LCA_SENSITIVITY_UPLIFT = +30 %
```

Statut : `ASSUMPTION + PROXY`.

Pour le scénario central :

\[
3,675\ \text{tCO₂e}
\times
1,30
=
4,7775\ \text{tCO₂e}
\]

soit :

```text
PARTIAL_LCA_CENTRAL_CALCULATED ≈ 4,8 tCO2e
PARTIAL_LCA_CENTRAL_DISPLAYED  ≈ 5 tCO2e
```

Cette valeur est une **ACV partielle centrale de sensibilité**, pas une ACV complète d'OpenAI ou de CleanMyMap. L'entraînement des modèles, l'allocation exacte des GPU, les réseaux, plusieurs postes amont et l'ensemble des impacts physiques non attribuables restent `NA`.

## Génération d'images

Environ **130 générations ou modifications d'images** sont déclarées sur la période de travail.

```text
IMAGE_COUNT = 130 — DECLARED
IMAGE_ENVIRONMENTAL_FACTOR = NA
```

Le rapport ne convertit donc pas ces images en kWh ou en CO₂e avec un coefficient inventé. Leur impact n'est pas nul ; il reste non quantifié dans le total central.

## Services numériques hors IA

L'audit complémentaire permet désormais de remplacer une simple preuve de présence par une **preuve d'usage partielle** pour plusieurs services. Cette amélioration ne permet cependant toujours pas de convertir proprement ces usages en énergie, en carbone ou en eau.

### Vercel

L'audit expose **120 déploiements visibles**, mais uniquement sur la fenêtre disponible du **10 au 13 septembre 2026**.

Il montre également :

- runtime observé : `cdg1` ;
- un build observé : `sfo1`.

Statut :

```text
DEPLOYMENTS_VISIBLE = 120 — OBSERVED
VERCEL_VISIBLE_WINDOW = 2026-09-10 → 2026-09-13 — OBSERVED
RUNTIME_REGION = cdg1 — OBSERVED
OBSERVED_BUILD_REGION = sfo1 — OBSERVED
VERCEL_COMPUTE = NA
VERCEL_BANDWIDTH = NA
VERCEL_ENERGY = NA
VERCEL_CO2E = NA
VERCEL_WATER = NA
```

Les 120 déploiements ne doivent pas être extrapolés à toute la période de six mois. L'API accessible dans cet audit ne fournit pas ici une quantité de compute ou de bande passante permettant une conversion physique défendable.

### Supabase

L'audit confirme un usage applicatif réel, notamment :

```text
FUNNEL_EVENTS = 1 437 — OBSERVED
STORAGE_BUCKETS = 4 — OBSERVED
```

Ces éléments prouvent l'activité du service, mais ils ne donnent pas la consommation physique correspondante :

```text
SUPABASE_COMPUTE = NA
DATABASE_SIZE_AUDITED = NA
EGRESS_AUDITED = NA
SUPABASE_ENERGY = NA
SUPABASE_CO2E = NA
SUPABASE_WATER = NA
```

Le nombre de buckets ne constitue pas un volume de stockage. De même, le nombre d'événements n'est pas une unité énergétique.

### GitHub et GitHub Actions

Sur la fenêtre d'audit **18 mars → 18 septembre 2026**, l'audit compte :

```text
GITHUB_ACTIONS_RUNS_TOTAL = 2 340 — OBSERVED
CI_RUNS = 1 052 — OBSERVED
CODEQL_RUNS = 1 072 — OBSERVED
DEPENDABOT_RUNS = 216 — DERIVED
```

La dernière valeur est obtenue par différence :

\[
2\,340 - 1\,052 - 1\,072 = 216
\]

Ces compteurs décrivent une activité CI réelle et importante. Ils ne fournissent cependant pas une consommation électrique.

Le champ :

```text
billable.total_ms = 0
```

ne signifie **pas** que les runs ont consommé zéro énergie. Il s'agit d'un champ de facturation dans le contexte observé, pas d'un wattmètre ni d'une mesure de calcul physique.

Ainsi :

```text
GITHUB_ACTIONS_PHYSICAL_ENERGY = NA
GITHUB_ACTIONS_CO2E = NA
GITHUB_ACTIONS_WATER = NA
```

### Clerk

L'audit expose :

```text
VISIBLE_USERS = 4 — OBSERVED
```

Ce snapshot prouve un usage du service d'identité, mais ne fournit pas l'historique complet des sessions, des requêtes API ou de la consommation d'infrastructure :

```text
CLERK_SESSION_HISTORY = NA
CLERK_API_USAGE_HISTORY = NA
CLERK_ENERGY = NA
CLERK_CO2E = NA
CLERK_WATER = NA
```

### LWS

L'audit confirme LWS comme opérateur DNS du projet.

```text
LWS_DNS_ROLE = OBSERVED
LWS_WEB_HOSTING = NOT_DEMONSTRATED
```

Il ne faut donc pas présenter LWS comme hébergeur web de CleanMyMap sur la seule base du domaine.

L'impact quantitatif attribuable reste :

```text
LWS_ENERGY = NA
LWS_CO2E = NA
LWS_WATER = NA
```

### Synthèse des services audités

| Service | Preuve d'usage disponible | Fenêtre / portée | Impact physique attribuable |
| --- | --- | --- | --- |
| Vercel | 120 déploiements ; runtime `cdg1` ; un build `sfo1` | 10–13 septembre pour les déploiements visibles | `NA` |
| Supabase | 1 437 événements funnel ; 4 buckets Storage | audit ponctuel dans la fenêtre de service | `NA` |
| GitHub Actions | 2 340 runs : 1 052 CI, 1 072 CodeQL, 216 Dependabot dérivés | 18 mars–18 septembre | `NA` |
| Clerk | 4 utilisateurs visibles | snapshot disponible | `NA` |
| LWS | rôle DNS confirmé | état observé | `NA` ; hébergement web non démontré |

Ces métriques renforcent la preuve d'usage des services, mais elles ne sont **pas intégrées aux ≈ 10 MWh du scénario central IA**. Les additionner à l'aide de facteurs arbitraires donnerait une précision fictive et pourrait provoquer un double comptage.

La règle est :

```text
SERVICE_USAGE_OBSERVED
+
PHYSICAL_CONVERSION_UNAVAILABLE
=
OBSERVED + NA
```

et jamais :

```text
NO_PHYSICAL_METRIC
=
ZERO_IMPACT
```

## Matériel personnel

### Aucun achat induit par CleanMyMap

Aucun ordinateur ou téléphone n'a été acheté spécifiquement pour CleanMyMap.

La source de ce point est déclarative :

```text
NO_PROJECT_INDUCED_PURCHASE = 0 — DECLARED
```

Dans une lecture conséquentielle incrémentale :

```text
INCREMENTAL_EMBODIED_CARBON_FROM_PURCHASE = 0 — DERIVED
```

Cette dérivation signifie seulement qu'**aucune fabrication supplémentaire n'a été déclenchée par un achat attribuable au projet**. Elle ne signifie pas que le matériel utilisé possède une empreinte physique nulle.

L'allocation de l'ACV des équipements déjà existants reste :

```text
ATTRIBUTIONAL_EXISTING_HARDWARE_LCA = NA
```

### Électricité locale

L'électricité réellement consommée par le PC pendant les sessions de développement n'a pas été mesurée par wattmètre et la durée CleanMyMap n'est pas isolable avec suffisamment de précision.

```text
LOCAL_DEVICE_ELECTRICITY = NA
```

Aucune puissance nominale ou durée d'écran n'est utilisée pour reconstruire artificiellement ce poste.

## Impression, encre et déplacements

Ces zéros proviennent d'une déclaration du porteur du projet. Ils ne sont donc pas `OBSERVED`.

```text
PRINTING = 0 — DECLARED
INK = 0 — DECLARED
TRAVEL_FOR_DIGITAL_DEVELOPMENT = 0 — DECLARED
```

Si une impression, une consommation d'encre ou un déplacement attribuable est réalisé ultérieurement, le poste devra être ajouté à partir des données réellement disponibles.

Les déplacements liés aux cleanwalks, rencontres de partenaires ou autres activités terrain appartiennent à leur propre périmètre et ne sont ni ajoutés arbitrairement à l'empreinte numérique ni utilisés pour la compenser.

## Synthèse quantitative

### Poste principal et limites

| Élément | Valeur retenue | Statut |
| --- | ---: | --- |
| Tokens Codex déclarés, deux comptes | 50 Md | `DECLARED` |
| Part Codex attribuée à CleanMyMap | 25 Md | `DECLARED + ASSUMPTION` |
| Autres plateformes | 10 Md token-équivalents | `DECLARED + ASSUMPTION` |
| **Activité IA centrale CleanMyMap** | **35 Md token-équivalents** | **`DECLARED + ASSUMPTION`** |
| Énergie centrale calculée | 10,5 MWh | `ASSUMPTION + PROXY` |
| **Énergie centrale affichée** | **≈ 10 MWh** | arrondi du proxy |
| CO₂e électrique calculé | 3,675 tCO₂e | `PROXY` |
| **CO₂e électrique affiché** | **≈ 3,7 tCO₂e** | arrondi du proxy |
| Eau indirecte calculée | ≈ 47,5 m³ | `PROXY` |
| **Eau indirecte affichée** | **≈ 45 m³** | arrondi du proxy |
| ACV partielle centrale calculée | ≈ 4,8 tCO₂e | `ASSUMPTION + PROXY` |
| **ACV partielle centrale affichée** | **≈ 5 tCO₂e** | arrondi du scénario |
| Eau directe data centers | NA | `NA` |
| Impact physique exact Vercel / Supabase / GitHub / Clerk / LWS | NA | `NA` |
| Achat matériel induit par le projet | 0 | `DECLARED` |
| Carbone incorporé incrémental dû à un achat | 0 | `DERIVED` |
| ACV attributionnelle du matériel existant | NA | `NA` |
| Électricité locale du PC | NA | `NA` |
| Impression | 0 | `DECLARED` |
| Encre | 0 | `DECLARED` |
| Déplacements de développement numérique | 0 | `DECLARED` |
| Impact des ~130 images | NA | `DECLARED + NA` |

### Lecture correcte

La chaîne quantitative centrale est :

```text
35 Md token-equivalents
→ 10,5 MWh calculés
→ ≈ 10 MWh affichés
→ 3,675 tCO2e calculées
→ ≈ 3,7 tCO2e affichées
→ 47,5 m3 d'eau indirecte calculés
→ ≈ 45 m3 affichés
→ ≈ 4,8 tCO2e en ACV partielle de sensibilité
→ ≈ 5 tCO2e affichées
```

Ces chiffres ne constituent pas une mesure fournisseur. Ils reposent sur des hypothèses de scénario et des proxys documentés en Annexe B.

L'audit des services externes améliore la preuve de l'**activité numérique** du projet, mais il ne modifie pas ce total : aucun facteur défendable ne permet actuellement de convertir les 120 déploiements Vercel, les 1 437 événements Supabase, les 2 340 runs GitHub Actions ou les quatre utilisateurs Clerk en kWh, CO₂e ou eau propres à CleanMyMap.

## Principales incertitudes

### Attribution de l'activité IA

L'hypothèse `50 % Codex + 20 % équivalent autres plateformes` est déclarative. Elle structure le bilan mais n'est pas démontrée session par session sur toute la période.

### Hétérogénéité des modèles

Les 35 milliards de token-équivalents mélangent plusieurs modèles, fournisseurs, contextes et mécanismes de cache. Ils ne correspondent pas à une unité énergétique homogène.

### Cache

La fenêtre locale récente montre environ 97,36 % d'input mis en cache, mais cette proportion ne peut pas être extrapolée à toute la période.

### Fenêtres de service incomplètes

La fenêtre d'audit des services commence le 18 mars alors que le projet commence mi-février. La période antérieure est `UNKNOWN / NOT AUDITED`.

Vercel est encore plus limité : les 120 déploiements visibles ne couvrent que le 10 au 13 septembre.

### Localisation

La région électrique réelle des calculs IA n'est pas connue requête par requête. Le facteur carbone de `0,35 kgCO₂e/kWh` reste donc un proxy de travail.

### Eau

Le facteur de `4,52 L/kWh` représente une eau indirecte proxy. Il ne mesure pas l'eau directe réellement consommée par les fournisseurs.

### Matériel et infrastructure

L'ACV partielle de ≈ 5 tCO₂e est une analyse de sensibilité, pas une allocation exhaustive des infrastructures effectivement utilisées.

L'ACV des équipements personnels déjà possédés reste `NA`.

### Services applicatifs

L'activité de Vercel, Supabase, GitHub Actions, Clerk et LWS est désormais mieux documentée, mais leur consommation physique attribuable reste `NA`.

## Risques de double comptage

Les règles suivantes sont obligatoires pour les révisions futures :

1. ne pas additionner une estimation par temps et une estimation par tokens lorsqu'elles représentent la même activité IA ;
2. ne pas ajouter la télémétrie locale de 1,87 milliard aux compteurs déclarés si elle en constitue une sous-partie ;
3. ne pas additionner un facteur « par requête » et un facteur « par token » pour le même appel ;
4. ne pas reconstruire des kWh en divisant un CO₂e proxy par un facteur carbone ;
5. ne pas additionner eau directe et eau indirecte si une source les agrège déjà ;
6. ne pas compter deux fois une allocation de fabrication dans plusieurs postes ACV ;
7. ne pas convertir un compteur SaaS en énergie sans facteur d'allocation défendable ;
8. ne pas interpréter `billable.total_ms=0` comme une consommation énergétique nulle ;
9. ne pas extrapoler les 120 déploiements Vercel au-delà de leur fenêtre visible ;
10. ne pas convertir une période non auditée en zéro ;
11. ne pas considérer un quota gratuit comme un impact nul ;
12. ne pas soustraire les bénéfices terrain de l'empreinte numérique comme s'il s'agissait d'une compensation physique.

## Ce qui est explicitement exclu du total central

Le total central quantifié ne comprend pas :

- une part arbitraire de l'entraînement des modèles ;
- l'allocation exacte de la fabrication des accélérateurs cloud ;
- une ACV complète des centres de données ;
- l'impact exact des générations d'images ;
- l'électricité locale du poste de travail ;
- les impacts physiques non mesurés de Vercel, Supabase, GitHub Actions, Clerk et LWS ;
- l'usage des services avant le 18 mars lorsqu'il n'est pas audité ;
- les déplacements terrain ;
- les bénéfices environnementaux des cleanwalks.

Ces exclusions évitent de transformer une estimation partielle en fausse ACV exhaustive.

## Implications pour la sobriété

L'ordre de grandeur obtenu est suffisamment élevé pour justifier une stratégie de réduction, même si son incertitude reste importante.

Les leviers prioritaires sont ceux qui réduisent réellement le calcul ou l'infrastructure sans dégrader la qualité du projet :

- utiliser le modèle le plus léger capable de réussir correctement la tâche ;
- conserver des instructions courtes, précises et bornées ;
- éviter les audits globaux répétés sans nouveau signal ;
- limiter le nombre d'agents parallèles ;
- réutiliser les résultats déjà validés ;
- réduire les contextes et fichiers transmis sans nécessité ;
- arrêter un chantier dès que sa condition de clôture est atteinte ;
- préférer une règle déterministe, une requête SQL ou une fonction classique à un appel de modèle lorsqu'elles suffisent ;
- limiter les builds et runs CI inutiles ;
- suivre les métriques SaaS réellement disponibles sans leur attribuer artificiellement un impact physique ;
- conserver `NA` lorsque l'allocation n'est pas défendable.

Les risques techniques liés aux agents, aux secrets, aux prompt injections, au code généré et aux permissions sont traités en Partie V. Les choix de souveraineté et de dépendance fournisseurs sont traités en Partie IV. Le plan d'action opérationnel de réduction est détaillé en Partie IX.

## Relation avec l'impact terrain

CleanMyMap poursuit une finalité environnementale réelle : faciliter des actions de dépollution, organiser des bénévoles, cartographier des besoins et produire des données exploitables.

Cette utilité ne constitue toutefois **pas une compensation carbone automatique**.

```text
UTILITÉ TERRAIN
→ déchets retirés
→ actions réalisées
→ bénévoles mobilisés
→ zones documentées
→ rapports utilisés

EMPREINTE NUMÉRIQUE
→ énergie
→ CO₂e
→ eau
→ matériel
→ stockage et transferts
→ services numériques
```

Les deux familles peuvent être rapprochées pour discuter de l'utilité du projet, mais elles ne doivent pas être soustraites l'une de l'autre sans relation causale démontrée.

## Bilan de la Partie II-A

Le développement de CleanMyMap a utilisé intensivement plusieurs systèmes d'IA entre **mi-février et septembre 2026**. Les historiques disponibles ne permettent pas de mesurer exhaustivement l'activité fournisseur par fournisseur. Le rapport retient donc une hypothèse centrale transparente de **35 milliards de token-équivalents**, construite à partir de **50 milliards de tokens Codex déclarés sur deux comptes**, dont 50 % sont attribués au projet, auxquels s'ajoute un équivalent de 20 % pour les plateformes temporairement testées.

La télémétrie Codex locale récente confirme qu'un volume brut de tokens peut être dominé par du contexte mis en cache ; elle ne permet pas d'extrapoler un taux de cache unique à toute la période.

Avec la méthode de sensibilité retenue, le scénario central correspond à **10,5 MWh calculés**, présentés comme **≈ 10 MWh**, puis à **≈ 3,7 tCO₂e** pour la composante électrique proxy et **≈ 45 m³ d'eau indirecte** dans la synthèse. L'ajout de la convention d'ACV partielle conduit à **≈ 4,8 tCO₂e calculées**, présentées comme **≈ 5 tCO₂e**.

L'audit des services externes renforce maintenant la preuve d'usage : **120 déploiements Vercel visibles sur une fenêtre du 10 au 13 septembre**, **1 437 événements funnel et quatre buckets Supabase**, **2 340 runs GitHub Actions sur la fenêtre du 18 mars au 18 septembre**, **quatre utilisateurs Clerk visibles**, et **LWS confirmé comme opérateur DNS**. Ces faits ne fournissent toutefois pas de conversion physique défendable : l'énergie, le CO₂e et l'eau attribuables à ces services restent `NA`.

La frontière matérielle est également explicite : **aucun achat de PC ou téléphone n'est déclaré comme induit par CleanMyMap**, donc le carbone incorporé incrémental dû à un achat est dérivé à zéro ; l'ACV attributionnelle du matériel existant et l'électricité locale du PC restent `NA`. Impression, encre et déplacements de développement sont des zéros `DECLARED`, non des observations instrumentées.

La règle finale est donc :

> **mesurer quand c'est possible, distinguer déclaration et observation, dériver seulement avec une formule explicite, utiliser les proxys comme proxys, respecter les fenêtres réellement auditées et laisser `NA` ce qui ne peut pas être attribué proprement.**
