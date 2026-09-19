# Partie II — Empreinte environnementale et matérielle {#partie-ii-empreinte-environnementale-et-materielle}

Cette sous-partie estime l'**empreinte environnementale attribuable au développement de CleanMyMap**. Elle ne décrit pas l'impact mondial de l'intelligence artificielle : les mécanismes physiques généraux — data centers, électricité, eau, semi-conducteurs, matériaux, réseaux et fin de vie — sont traités séparément en [Partie II-B](./02b-ia-data-centers-materiel-acv.md).

L'objectif n'est pas de produire une précision artificielle. Le développement a mobilisé plusieurs comptes, plusieurs fournisseurs et des périodes dont la télémétrie n'est pas homogène. Le rapport distingue donc les données observées, les données déclarées, les reconstructions, les hypothèses de scénario, les proxys environnementaux et les données indisponibles.

Le résultat principal de cette partie est un **ordre de grandeur**, pas une mesure instrumentée exhaustive.

Cette partie applique le cadre méthodologique aux postes d'impact les plus plausibles du projet : usage de l'IA, énergie, carbone, eau, matériel et cycle de vie.

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

Une statistique mondiale sur les data centers n'est donc jamais appliquée directement à CleanMyMap sans règle d'allocation. De même, un volume de tokens n'est pas converti en énergie avec un facteur présenté comme universel.

## Statut des preuves

Cette partie utilise six statuts.

| Statut       | Définition                                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| `OBSERVED`   | Valeur directement observée dans une source technique disponible.                                                 |
| `DERIVED`    | Valeur calculée à partir d'une donnée observée avec une formule explicite.                                        |
| `DECLARED`   | Valeur déclarée par le porteur du projet mais non reconstruite exhaustivement depuis une télémétrie indépendante. |
| `ASSUMPTION` | Hypothèse choisie pour construire un scénario ; elle ne doit jamais être présentée comme une mesure.              |
| `PROXY`      | Facteur ou indicateur utilisé faute de mesure physique directe.                                                   |
| `NA`         | Valeur non disponible ou impossible à attribuer proprement avec les données actuelles.                            |

Cette convention est cohérente avec le [protocole scientifique CleanMyMap](../../../product/SCIENTIFIC_PROTOCOL.md), qui impose de distinguer les mesures, dérivations et proxys et de refuser toute présentation donnant une illusion de précision.

## Période étudiée

Le développement de CleanMyMap a commencé **à la mi-février 2026**. L'historique Git formalisé du dépôt commence quelques jours plus tard, mais il ne couvre pas nécessairement les premières expérimentations locales.

La période retenue ici est donc :

```text
début du périmètre : mi-février 2026
fin du périmètre   : septembre 2026
```

Cette période couvre plusieurs phases : premiers prototypes, migration vers une application web plus structurée, développement intensif avec agents de code, refactorisations, tests, documentation, préparation du rapport d'impact et stabilisation progressive du dépôt.

## Inventaire des usages d'IA réellement mobilisés

### Outils principaux

Le développement n'a pas reposé sur un seul modèle ni sur un seul compte.

| Outil ou famille d'outils     | Usage retenu dans l'inventaire                                | Statut                     |
| ----------------------------- | ------------------------------------------------------------- | -------------------------- |
| Codex — compte principal      | développement, audits, refactorisations, tests, documentation | `DECLARED`                 |
| Codex — compte secondaire     | complément de capacité et sessions de développement           | `DECLARED`                 |
| Google / Antigravity          | essais et développement pendant une période limitée           | `DECLARED`                 |
| Windsurf                      | essais temporaires de plateforme de développement assisté     | `DECLARED`                 |
| Cursor                        | essais temporaires de plateforme de développement assisté     | `DECLARED`                 |
| Claude Sonnet via AWS         | essais et développement pendant quelques semaines             | `DECLARED`                 |
| ChatGPT hors télémétrie Codex | réflexion, rédaction, analyse ponctuelle                      | `NA` comme volume distinct |
| Génération d'images           | environ 130 images sur la période de travail                  | `DECLARED`                 |
| Modèles exécutés localement   | non retenus comme poste significatif du développement         | `NOT_USED`                 |

Les versions exactes de modèles utilisées au fil des essais ne sont pas nécessaires au calcul central lorsque la télémétrie ne permet pas de leur attribuer un facteur environnemental spécifique. Le rapport préfère donc conserver la famille ou la plateforme plutôt que figer un numéro de version fragile.

### Pas de clé API comme poste central de développement

Le développement courant de CleanMyMap a principalement utilisé des abonnements, quotas inclus ou outils de développement intégrés. Aucun volume d'API payée n'est utilisé comme base du calcul central de cette partie.

Cette distinction est importante : une dépense financière, un quota ou un compteur de tokens ne constitue pas en soi une mesure énergétique.

## Reconstruction de l'activité IA

### Compteurs Codex déclarés

Les deux comptes Codex fournissent l'ordre de grandeur déclaré suivant :

| Compte                  |             Volume déclaré |
| ----------------------- | -------------------------: |
| Compte principal        | **35 milliards de tokens** |
| Compte secondaire       | **15 milliards de tokens** |
| **Total Codex déclaré** | **50 milliards de tokens** |

Ces **50 milliards** représentent le volume déclaré sur les deux comptes, tous usages confondus. Ils ne sont donc pas assimilés directement à CleanMyMap.

### Part attribuée à CleanMyMap

L'hypothèse centrale attribue **50 %** du volume Codex total au développement de CleanMyMap :

\[
50\ \text{Md} \times 50\% = 25\ \text{Md de tokens}
\]

Le résultat retenu pour Codex est donc :

> **25 milliards de tokens Codex attribués à CleanMyMap par hypothèse.**

Statut : `DECLARED + ASSUMPTION`.

Cette valeur ne signifie pas que 25 milliards de tokens ont été identifiés session par session comme appartenant au dépôt CleanMyMap. Elle représente une convention d'attribution volontairement explicite.

### Autres plateformes testées

Antigravity, Windsurf, Cursor et Claude Sonnet via AWS ont été utilisés pendant des périodes plus courtes, principalement pour tester différentes plateformes, comparer leurs capacités ou compléter les quotas disponibles.

Leur historique de tokens n'est pas homogène avec celui de Codex. Le rapport n'invente donc pas un compteur fournisseur par fournisseur.

L'hypothèse retenue ajoute un **équivalent d'activité correspondant à 20 % du total Codex déclaré** :

\[
50\ \text{Md} \times 20\% = 10\ \text{Md de token\text{-}équivalents}
\]

Ces **10 milliards** ne sont pas des tokens réellement mesurés chez Google, Anthropic, Cursor ou Windsurf. Le terme **token-équivalent** signifie ici uniquement : _volume d'activité ramené à l'échelle du compteur Codex afin de construire un scénario commun_.

### Hypothèse centrale d'activité

Le total central retenu est donc :

\[
25\ \text{Md Codex attribués}

- # 10\ \text{Md équivalents autres plateformes}
  35\ \text{Md de token\text{-}équivalents}
  \]

> **HYPOTHÈSE CENTRALE : 35 milliards de token-équivalents attribués au développement de CleanMyMap entre mi-février et septembre 2026.**

Statut : `DECLARED + ASSUMPTION`.

Le total exact reste :

```text
EXACT_AI_TOTAL = NA
```

Aucun volume supplémentaire de ChatGPT n'est ajouté à ces 35 milliards faute de compteur distinct suffisamment fiable et afin d'éviter un double comptage avec les usages déjà intégrés aux comptes et aux outils de développement.

## Télémétrie Codex locale disponible

Une reconstruction locale plus récente apporte un contrôle de cohérence, mais elle ne couvre pas toute la période du projet ni tous les comptes.

### Fenêtre observée

```text
2026-07-11T01:44:03.623Z
→
2026-09-18T22:57:18.689Z
```

La fenêtre observée représente environ **69,9 jours**. Les périodes antérieures absentes ne sont jamais interprétées comme une consommation nulle.

### Qualité de la reconstruction

| Indicateur                           |              Valeur |
| ------------------------------------ | ------------------: |
| Fichiers rollout bruts               |                  42 |
| Sessions uniques                     |                  39 |
| Copies dédupliquées                  |                   3 |
| Sessions avec compteurs exploitables |                  33 |
| Sessions sans compteurs exploitables |                   6 |
| Lignes JSONL valides analysées       |             101 552 |
| Lignes JSONL invalides               |                   0 |
| Couverture des métriques             | **33/39 = 84,62 %** |

Les compteurs exploitables sont reconstruits à partir de compteurs cumulatifs. La reconstruction distingue répétitions, deltas, resets et diminutions. Les tokens de raisonnement inclus dans les sorties ne sont pas additionnés une seconde fois.

### Volumes observés

| Métrique                   |    Volume observé |
| -------------------------- | ----------------: |
| `input_tokens`             |     1 867 497 074 |
| `cached_input_tokens`      |     1 818 120 704 |
| `uncached_input_tokens`    |        49 376 370 |
| `cache_write_input_tokens` |                 0 |
| `output_tokens`            |         7 303 361 |
| `reasoning_output_tokens`  |         2 387 146 |
| `total_tokens`             | **1 874 800 435** |

Sur cette fenêtre, les entrées mises en cache représentent environ **97,36 % des `input_tokens` observés**.

Ce résultat est important, mais sa portée est limitée :

- il porte sur une période récente ;
- il ne couvre pas les premiers mois du projet ;
- il ne couvre pas nécessairement les deux comptes de manière exhaustive ;
- il ne couvre pas les autres fournisseurs ;
- les sessions n'ont pas été classées de manière fiable entre `CLEANMYMAP`, `OTHER_PROJECT` et `AMBIGUOUS`.

La télémétrie locale ne remplace donc pas l'hypothèse centrale de 35 milliards de token-équivalents. Elle sert à montrer qu'un agent de code peut relire une très grande quantité de contexte mise en cache et qu'un token brut ne correspond pas à une quantité uniforme de calcul.

En particulier, le taux de cache de **97,36 %** observé sur cette fenêtre ne doit **pas** être appliqué mécaniquement aux 35 milliards de token-équivalents de toute la période.

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
- de l'infrastructure du fournisseur.

Google a par exemple publié pour son propre environnement une mesure d'environ **0,24 Wh** pour un prompt texte médian de Gemini Apps, avec environ **0,03 gCO₂e** et **0,26 mL d'eau** [@google_measuring_the_1]. Comme expliqué en Partie II-B, cette valeur décrit une architecture et une distribution de requêtes précises ; elle ne peut pas être transformée en facteur générique pour un agent de code à long contexte.

Les **35 milliards de token-équivalents** doivent donc être compris comme un indicateur d'activité, pas comme une unité physique.

## Scénarios énergétiques

### Principe

Faute de facteur fournisseur complet et homogène, cette partie utilise une **analyse de sensibilité**.

Le coefficient effectif est exprimé en `kWh par million de token-équivalents`. Il agrège implicitement des usages très différents ; il n'est pas présenté comme un facteur scientifique universel.

Trois coefficients sont retenus :

| Scénario |   Coefficient effectif | Justification                                                                                                                   |
| -------- | ---------------------: | ------------------------------------------------------------------------------------------------------------------------------- |
| Bas      | **0,06 kWh / million** | scénario très favorable, fortement cache-heavy, cohérent avec la structure de la fenêtre locale récente                         |
| Central  | **0,30 kWh / million** | hypothèse de travail prudente pour une période multi-modèles et multi-plateformes dont les premiers mois sont moins observables |
| Haut     | **0,60 kWh / million** | stress test intégrant davantage d'entrées nouvelles, sorties, raisonnement et contextes moins efficacement réutilisés           |

Ces coefficients sont des `ASSUMPTION`, pas des mesures fournisseur. Le scénario central ne prétend donc pas savoir quelle puissance exacte a été mobilisée dans les data centers.

### Calcul

Le volume central d'activité est :

\[
35\ \text{milliards}
=
35\,000\ \text{millions de token\text{-}équivalents}
\]

La formule est :

\[
E = 35\,000 \times f_E
\]

avec \(f_E\) le coefficient effectif du scénario.

| Scénario | Électricité estimée |
| -------- | ------------------: |
| Bas      |         **2,1 MWh** |
| Central  |        **10,5 MWh** |
| Haut     |          **21 MWh** |

> **Ordre de grandeur central retenu pour l'assistance IA : environ 10 MWh d'électricité équivalente sur la période étudiée.**

La valeur exacte reste `NA`.

Cette estimation ne doit pas être additionnée à un ancien calcul fondé sur les heures de développement : les deux méthodes cherchent à représenter le même poste et leur addition créerait un double comptage.

## Empreinte carbone associée à l'électricité

Le [protocole scientifique CleanMyMap](../../../product/SCIENTIFIC_PROTOCOL.md) retient actuellement, lorsque la région électrique exacte n'est pas connue, un facteur configurable de **0,35 kgCO₂e/kWh** pour un calcul proxy associé à des serveurs majoritairement américains.

La formule utilisée est :

\[
CO₂e = E\_{kWh} \times 0,35
\]

| Scénario | Électricité | CO₂e électrique proxy |
| -------- | ----------: | --------------------: |
| Bas      |   2 100 kWh |        **0,74 tCO₂e** |
| Central  |  10 500 kWh |        **3,68 tCO₂e** |
| Haut     |  21 000 kWh |        **7,35 tCO₂e** |

Le **scénario central** est donc d'environ **3,7 tCO₂e** pour la composante électrique proxy de l'assistance IA.

Ce nombre n'est pas une ACV complète. Il ne comprend pas correctement :

- la fabrication des GPU et serveurs ;
- la construction des centres de données ;
- l'entraînement ou le post-entraînement des modèles ;
- les réseaux et équipements amont ;
- les éventuels mécanismes contractuels d'achat d'électricité des fournisseurs.

Ces composantes restent `NA` pour l'attribution spécifique à CleanMyMap tant qu'une méthode d'allocation défendable n'est pas disponible.

## Empreinte hydrique

L'eau est traitée séparément afin d'éviter de confondre eau directe de refroidissement et eau indirecte associée à la production d'électricité.

La méthodologie environnementale du projet utilise actuellement un proxy configurable de **4,52 L/kWh** pour l'**eau indirecte liée à l'électricité** associée à des data centers américains, d'après le _2024 United States Data Center Energy Usage Report_ du Lawrence Berkeley National Laboratory. La méthode détaillée est documentée dans [impact_carbone_methodologie.md](../impact_carbone_methodologie.md).

La formule utilisée ici est :

\[
Eau*{indirecte} = E*{kWh} \times 4,52
\]

| Scénario | Électricité | Eau indirecte proxy |
| -------- | ----------: | ------------------: |
| Bas      |   2 100 kWh |        **≈ 9,5 m³** |
| Central  |  10 500 kWh |       **≈ 47,5 m³** |
| Haut     |  21 000 kWh |       **≈ 94,9 m³** |

Le scénario central correspond donc à environ **47 500 L d'eau indirecte proxy**.

Cette valeur ne représente **pas** l'eau directe réellement consommée par les centres de données utilisés par les fournisseurs. Le refroidissement local dépend de la technologie, de la région, de la saison et du stress hydrique. L'eau directe attribuable à CleanMyMap reste donc :

```text
DIRECT_DATA_CENTER_WATER = NA
```

Les volumes d'eau associés aux bénéfices terrain de CleanMyMap — par exemple les proxys liés aux mégots collectés — ne sont jamais soustraits de cette empreinte numérique. Il n'y a pas de compensation ou de _netting_ entre ces indicateurs.

## Génération d'images

Environ **130 générations ou modifications d'images** sont déclarées sur la période de travail.

Statut :

```text
IMAGE_COUNT = DECLARED
IMAGE_ENVIRONMENTAL_FACTOR = NA
```

Le rapport ne convertit donc pas ces images en kWh ou en CO₂e avec un coefficient inventé. Leur impact n'est pas nul ; il reste simplement non quantifié dans le total central.

Par conséquent, l'estimation textuelle/agentique présentée plus haut doit être comprise comme le poste principal quantifié, avec un résidu d'impact non chiffré lié aux images.

## Services numériques hors IA

CleanMyMap ne dépend pas seulement des modèles d'IA. Le dépôt courant confirme notamment l'usage de **Vercel**, **Supabase** et **Clerk** ; GitHub et GitHub Actions font partie du cycle de développement, tandis que **LWS** porte notamment le domaine et des éléments de messagerie.

La configuration Vercel versionnée déclare actuellement la région `cdg1` pour les fonctions. Cette information décrit une configuration du dépôt ; elle ne fournit pas à elle seule l'énergie réelle consommée par les builds, le CDN ou les fonctions.

| Service                 | Présence dans le projet | Quantité d'usage environnemental exploitable ici | Statut          |
| ----------------------- | ----------------------- | -----------------------------------------------: | --------------- |
| Vercel                  | oui                     |                                               NA | `OBSERVED + NA` |
| Supabase                | oui                     |                                               NA | `OBSERVED + NA` |
| GitHub / GitHub Actions | oui                     |                                               NA | `OBSERVED + NA` |
| Clerk                   | oui                     |                                               NA | `OBSERVED + NA` |
| LWS / domaine           | oui                     |                                               NA | `OBSERVED + NA` |

Ces services ne sont **pas intégrés par défaut aux 10,5 MWh du scénario central IA**. Le faire sans métriques de consommation provoquerait soit une invention, soit un double comptage avec l'infrastructure déjà incluse dans certains facteurs fournisseurs.

Lorsque des métriques réelles deviennent disponibles, elles doivent être ajoutées poste par poste selon la hiérarchie :

```text
OBSERVED
→ DERIVED
→ PROXY
→ NA
```

Une valeur absente ne devient jamais zéro par défaut.

## Matériel personnel

### Aucun achat induit par CleanMyMap

Le développement a été réalisé avec du matériel déjà possédé. Aucun ordinateur ou GPU n'a été acheté spécifiquement pour exécuter des modèles locaux ou développer CleanMyMap.

Dans une lecture **conséquentielle incrémentale**, le poste de fabrication directement déclenché par le projet est donc :

```text
PROJECT_INDUCED_HARDWARE_PURCHASE = 0
INCREMENTAL_EMBODIED_MANUFACTURE = 0
```

Cela ne signifie pas que l'ordinateur a une empreinte de fabrication nulle.

Dans une ACV attributionnelle complète, une fraction de la fabrication, de l'usure, de la batterie, du stockage et de la fin de vie pourrait être allouée au projet. Les données nécessaires pour une allocation fiable ne sont pas disponibles ici :

```text
ATTRIBUTIONAL_PERSONAL_HARDWARE_LCA = NA
```

Cette distinction évite une erreur fréquente : confondre **absence d'achat supplémentaire** et **absence d'impact matériel physique**.

### Électricité locale

L'électricité réellement consommée par l'ordinateur personnel pendant les sessions de développement n'a pas été mesurée par wattmètre.

Elle reste :

```text
LOCAL_DEVICE_ELECTRICITY = NA
```

Elle ne doit pas être reconstruite à partir du seul nombre d'heures devant l'écran.

## Impression

Aucune impression papier n'est retenue comme poste actuel du développement évalué ici.

```text
CURRENT_PRINTING = 0
```

Si un rapport papier est ultérieurement imprimé pour un jury, un événement ou une diffusion institutionnelle, ce poste devra être ajouté séparément avec le nombre de pages, le nombre d'exemplaires et le type de papier réellement utilisés.

## Déplacements

Aucun déplacement spécifiquement nécessaire au **développement numérique** de CleanMyMap n'est déclaré dans ce bilan.

```text
CURRENT_DEVELOPMENT_TRAVEL = 0
```

Les déplacements liés à des cleanwalks, rencontres, partenaires ou événements relèvent de l'activité terrain et doivent être évalués dans leur propre périmètre s'ils deviennent significatifs. Ils ne sont ni ajoutés arbitrairement à l'empreinte numérique, ni utilisés pour la compenser.

## Synthèse quantitative

### Poste quantifié principal

| Élément                                  |              Valeur retenue | Statut                                         |
| ---------------------------------------- | --------------------------: | ---------------------------------------------- |
| Tokens Codex déclarés, deux comptes      |                       50 Md | `DECLARED`                                     |
| Part Codex attribuée à CleanMyMap        |                       25 Md | `DECLARED + ASSUMPTION`                        |
| Autres plateformes                       |     10 Md token-équivalents | `DECLARED + ASSUMPTION`                        |
| **Activité IA centrale CleanMyMap**      | **35 Md token-équivalents** | **`DECLARED + ASSUMPTION`**                    |
| Électricité IA — scénario bas            |                     2,1 MWh | `PROXY`                                        |
| **Électricité IA — scénario central**    |                **10,5 MWh** | **`PROXY`**                                    |
| Électricité IA — scénario haut           |                      21 MWh | `PROXY`                                        |
| CO₂e électrique — scénario central       |             **≈ 3,7 tCO₂e** | `PROXY`                                        |
| Eau indirecte — scénario central         |               **≈ 47,5 m³** | `PROXY`                                        |
| Eau directe data centers                 |                          NA | `NA`                                           |
| ACV matérielle cloud attribuable         |                          NA | `NA`                                           |
| Fabrication incrémentale du PC personnel |                           0 | `DERIVED` à partir de l'absence d'achat induit |
| Électricité locale du PC                 |                          NA | `NA`                                           |
| Impression actuelle                      |                           0 | `DECLARED`                                     |
| Déplacements de développement actuels    |                           0 | `DECLARED`                                     |
| Impact des ~130 images                   |                          NA | `DECLARED + NA`                                |

### Lecture correcte

Sur la base de l’hypothèse centrale de 35 milliards de token-équivalents, l’ordre de grandeur retenu est arrondi à environ 10 MWh d’électricité, 3,7 tonnes de CO₂e pour la composante électrique et 45 m³ d’eau indirecte. Ces valeurs restent des proxys : les 10 MWh sont une estimation de calcul et non une mesure fournisseur, tandis que les 3,7 tCO₂e reposent sur le facteur de travail actuel de CleanMyMap, soit 0,35 kgCO₂e/kWh. Ce facteur ne doit surtout pas être présenté comme « le facteur d’émission d’OpenAI » : OpenAI ne publie pas à ce jour un facteur carbone moyen unique et auditable couvrant l’ensemble de ses calculs. Son infrastructure est distribuée entre plusieurs partenaires, régions et sources d’énergie ; certains projets peuvent être très bas carbone — Stargate Norway doit par exemple fonctionner entièrement avec de l’électricité renouvelable — alors que d’autres capacités américaines dépendent du mix électrique régional et de contrats énergétiques différents.

Pour élargir le bilan à une ACV partielle, il faut ajouter aux émissions d’usage une allocation de la fabrication des GPU et serveurs, des équipements électriques et de refroidissement ainsi que de la construction des centres de données. Faute de données propres aux infrastructures réellement sollicitées par CleanMyMap, le rapport retient comme hypothèse de sensibilité une majoration d’environ 30 % par rapport aux émissions opérationnelles. Cet ordre de grandeur est cohérent avec une méthodologie sectorielle récente de l’UIT, qui estime à environ 29 MtCO₂e les émissions incorporées des centres de données contre 90 MtCO₂e liées à leur fonctionnement électrique dans son périmètre de référence. Appliquée aux 3,7 tCO₂e opérationnelles, cette convention ajoute environ 1,1 tCO₂e et conduit à une empreinte ACV partielle centrale d’environ 4,8 tCO₂e, arrondie à environ 5 tonnes de CO₂e. Il ne s’agit pas d’une ACV complète d’OpenAI : l’allocation de l’entraînement des modèles, le renouvellement exact des accélérateurs, les réseaux et plusieurs postes amont restent NA. Les travaux d’ACV sur les data centers confirment par ailleurs que, lorsque l’électricité est fortement décarbonée, la part relative du carbone incorporé dans les serveurs devient plus importante.

Le mix électrique constitue donc un paramètre majeur du bilan carbone, mais pas de la quantité d’énergie consommée : 10 MWh restent 10 MWh, qu’ils proviennent de gaz, de solaire ou de nucléaire. Les grandes entreprises du cloud et de l’IA réduisent leur Scope 2 notamment par des contrats d’électricité renouvelable ou bas carbone : Microsoft, Amazon et Meta indiquent aujourd’hui apparier 100 % de leur consommation électrique annuelle avec de l’énergie renouvelable ou propre, et développent parallèlement de nouvelles capacités nucléaires ; Microsoft soutient par exemple le redémarrage d’une centrale nucléaire en Pennsylvanie, tandis qu’Amazon et Meta investissent également dans de nouvelles capacités nucléaires. Le nucléaire peut être particulièrement pertinent pour des data centers fonctionnant en continu parce qu’il fournit une électricité pilotable et très faiblement carbonée, tandis que l’éolien, le solaire et l’hydraulique réduisent également fortement le carbone opérationnel mais doivent être considérés avec leur disponibilité temporelle, le stockage et le mix du réseau. En revanche, ni le nucléaire ni les renouvelables ne font disparaître les impacts de fabrication des puces et des serveurs, la construction des infrastructures, la consommation de matériaux ou l’ensemble des impacts hydriques. Il faut enfin distinguer électricité physiquement consommée et comptabilité contractuelle : un fournisseur peut afficher un Scope 2 très faible grâce à des achats ou appariements d’électricité propre sans que chaque requête soit exécutée, heure par heure, avec une électricité effectivement sans carbone. C’est pourquoi 0,35 kgCO₂e/kWh reste ici un proxy central prudent, à remplacer par un facteur régional réel si OpenAI ou ses fournisseurs publient un jour une traçabilité suffisamment détaillée.

## Principales incertitudes

L'incertitude porte moins sur l'arithmétique que sur les entrées.

### Attribution de l'activité

L'hypothèse `50 % Codex + 20 % équivalent autres plateformes` est déclarative. Elle est raisonnable pour structurer le bilan mais elle n'est pas démontrée session par session.

### Hétérogénéité des modèles

Les 35 milliards de token-équivalents mélangent plusieurs modèles, fournisseurs, contextes et mécanismes de cache. Ils ne correspondent pas à une unité énergétique homogène.

### Cache

La fenêtre locale récente montre environ 97,36 % d'input mis en cache, mais cette proportion ne peut pas être extrapolée à toute la période.

### Localisation

La région électrique réelle des calculs IA n'est pas connue requête par requête. Le facteur carbone de 0,35 kgCO₂e/kWh est donc un proxy de travail du projet.

### Eau

Le facteur de 4,52 L/kWh représente une eau indirecte proxy liée à l'électricité. Il ne mesure pas l'eau directe des fournisseurs effectivement utilisés.

### Matériel et infrastructure

L'impact incorporé des GPU, serveurs, bâtiments, réseaux et équipements personnels n'est pas attribué quantitativement à CleanMyMap dans cette version.

### Services applicatifs

Vercel, Supabase, GitHub Actions, Clerk et LWS sont réels, mais leurs usages environnementaux ne sont pas encore suffisamment instrumentés pour être ajoutés proprement au total.

## Risques de double comptage

Les règles suivantes sont obligatoires pour les révisions futures :

1. ne pas additionner une estimation par temps et une estimation par tokens lorsqu'elles représentent la même activité IA ;
2. ne pas ajouter la télémétrie locale de 1,87 milliard aux 50 milliards déclarés si elle constitue une sous-partie de ces compteurs ;
3. ne pas additionner un facteur « par requête » et un facteur « par token » pour le même appel ;
4. ne pas reconstruire des kWh en divisant un CO₂e proxy par un facteur carbone ;
5. ne pas additionner eau directe et eau indirecte si le facteur utilisé inclut déjà les deux ;
6. ne pas soustraire des bénéfices terrain de l'empreinte numérique ;
7. ne pas considérer un quota gratuit comme un impact nul ;
8. ne pas considérer une donnée absente comme zéro.

## Ce qui est explicitement exclu du total central

Le total central quantifié ne comprend pas :

- une part arbitraire de l'entraînement des modèles ;
- la fabrication attribuée des accélérateurs cloud ;
- la construction des centres de données ;
- l'impact exact des générations d'images ;
- l'électricité locale du poste de travail ;
- les impacts non mesurés de Vercel, Supabase, GitHub Actions, Clerk et LWS ;
- les déplacements terrain ;
- les bénéfices environnementaux des cleanwalks.

Ces exclusions évitent de transformer une estimation partielle en fausse ACV exhaustive.

## Implications pour la sobriété

L'ordre de grandeur obtenu est suffisamment élevé pour justifier une stratégie de réduction, même si son incertitude reste importante.

Les leviers prioritaires sont ceux qui réduisent réellement le calcul sans dégrader la qualité du projet :

- utiliser le modèle le plus léger capable de réussir correctement la tâche ;
- conserver des instructions courtes, précises et bornées ;
- éviter les audits globaux répétés sans nouveau signal ;
- limiter le nombre d'agents parallèles ;
- réutiliser les résultats déjà validés plutôt que relancer les mêmes analyses ;
- réduire les contextes inutiles et les fichiers transmis sans nécessité ;
- arrêter un chantier dès que sa condition de clôture est atteinte ;
- préférer une règle déterministe ou une requête classique à un appel de modèle lorsqu'elles suffisent ;
- mesurer les services numériques lorsque leurs métriques deviennent disponibles.

Les risques techniques liés aux agents, aux secrets, aux prompt injections, au code généré et aux permissions sont traités en Partie V. Les choix de souveraineté et de dépendance fournisseurs sont traités en Partie IV. Le plan d'action opérationnel de réduction est détaillé en Partie IX.

## Relation avec l'impact terrain

CleanMyMap poursuit une finalité environnementale réelle : faciliter des actions de dépollution, organiser des bénévoles, cartographier des besoins et produire des données exploitables.

Cette utilité ne constitue toutefois **pas une compensation carbone automatique**.

Les indicateurs terrain et l'empreinte numérique répondent à des questions différentes :

```text
impact terrain
→ déchets retirés
→ mégots collectés
→ bénévoles mobilisés
→ zones documentées

empreinte numérique
→ électricité
→ CO₂e
→ eau
→ matériel
→ services numériques
```

Les deux familles peuvent être comparées pour discuter de l'utilité du projet, mais elles ne doivent pas être soustraites l'une de l'autre sans relation causale démontrée.

## Bilan de la Partie II-A

La principale conclusion est méthodologique autant que quantitative.

Le développement de CleanMyMap a utilisé intensivement plusieurs systèmes d'IA entre mi-février et septembre 2026. Les historiques disponibles ne permettent pas de mesurer exhaustivement l'activité fournisseur par fournisseur. Le rapport retient donc une hypothèse centrale transparente de **35 milliards de token-équivalents**, construite à partir de **50 milliards de tokens Codex déclarés sur deux comptes**, dont **50 %** sont attribués au projet, auxquels s'ajoute un équivalent de **20 %** pour les plateformes temporairement testées.

La télémétrie locale récente confirme qu'un volume brut de tokens peut être dominé par du contexte mis en cache ; elle ne permet pas pour autant d'extrapoler un taux de cache unique à toute la période.

Avec la méthode de sensibilité retenue, le poste IA se situe entre environ **2,1 et 21 MWh**, avec un scénario central de **10,5 MWh**. En appliquant les proxys environnementaux actuels de CleanMyMap, ce scénario central correspond à environ **3,7 tCO₂e** pour la composante électrique et **47,5 m³ d'eau indirecte**.

Ces valeurs restent des **proxys**. L'empreinte complète est supérieure sur certains postes non quantifiés — matériel cloud, bâtiments, réseaux, images, services applicatifs — mais il serait incorrect d'inventer leur contribution.

La règle finale est donc :

> **mesurer quand c'est possible, dériver seulement lorsque la formule est explicite, utiliser des proxys lorsque leur rôle est clairement annoncé, et laisser `NA` ce qui ne peut pas être attribué proprement.**
