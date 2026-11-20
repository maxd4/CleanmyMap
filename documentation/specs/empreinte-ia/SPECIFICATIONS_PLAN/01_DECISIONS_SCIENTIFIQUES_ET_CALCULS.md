# Décisions scientifiques et calculs : Mon empreinte IA et objectifs de collecte

**Statut : `PLAN / CANDIDAT D'INTÉGRATION`, pas `CURRENT`.** 20 novembre 2026.

**Source de vérité d'exécution :** branche `main` de `maxd4/CleanmyMap`, code et documents `CURRENT`. Lectures ponctuelles pour ce document : noyau `aba903a25dd4cbccc562af1a522397eb7d42bf08`, attribution et gamification `aa812eda971838370308418ed288672aae4944b0` (les futures intégrations doivent recontrôler `main`).

**Décision produit révisée :** les tokens alimentent les estimations IA puis deux **objectifs de comparaison distincts** (CO₂e et eau). La collecte de déchets et celle de mégots peuvent avoir des bénéfices dans les deux domaines, mais chaque contribution est quantifiée uniquement avec un facteur applicable à son mécanisme. Un mégot **effectivement recyclé** peut faire l'objet d'un scénario CO₂e spécifique ; un mégot non recyclé n'obtient aucun crédit carbone automatique. Les déchets recyclés peuvent avoir un bilan net d'eau positif, négatif ou inconnu. Le proxy `500 L/mégot` concerne le risque de contamination et **ne peut pas être additionné** à des litres d'eau consommée économisés. Le curseur représente une préférence d'effort et recalcule les quantités pour les objectifs démontrables et, séparément, pour l'analogie hydrique conventionnelle. Il n'établit aucune compensation physique ou certifiée.

> **Frontière scientifique impérative :** les litres d'eau consommés pour refroidir un datacenter ou produire son électricité ne sont pas des litres d'eau empêchés d'être pollués par le retrait d'un mégot. Même valeur en litres ≠ même eau, même mécanisme, même lieu, même période ou même dommage évité. Les émissions de CO₂e ne se compensent pas par une équivalence en litres.

## 1. Propriétaires et faits constatés dans le dépôt

- Calcul IA : `apps/web/src/lib/environmental-impact-estimator/` ; en particulier `personal-ai-estimator.ts`, `ecologits-adapter.ts`, `scientific-registry.ts`, `model-catalog.ts` et tests. Les calculs par requête EcoLogits et les scénarios génériques ne sont pas interchangeables.
- Facteurs terrain : `apps/web/src/lib/gamification/progression/impact-proxy-config.ts` (`IMPACT_PROXY_CONFIG`, `effectiveVersion`) et `apps/web/src/lib/impact/impact-terrain-2026-constants.ts`. Au code lu, facteurs par défaut `1,2 kgCO₂e/kg déchets` et `500 L/mégot`. Le premier est un **proxy de lecture terrain**, le second un **proxy de risque hydrique**, pas des mesures d'effets évités.
- Conversions de mégots existantes : `apps/web/src/lib/impact/impact-terrain-2026.ts`, notamment masses indicatives `0,22 g/mégot propre`, `0,50 g/mégot humide/mouillé`, à ne pas utiliser pour reconstruire la masse des **déchets hors mégots**.
- Référence scientifique du projet : `documentation/product/SCIENTIFIC_PROTOCOL.md`. Les valeurs terrain `DECLARED`, `OBSERVED`, `DERIVED`, `ASSUMPTION`, `PROXY`, `NA` doivent rester distinguées.
- L'ancien ratio `R_cw` vers une « cleanwalk de 5 kg, cinq personnes, une heure » est **ABANDONNÉ**. Aucun nombre de cleanwalks ne doit figurer dans la nouvelle interface. Les véritables rendements de collecte ne sont pas déductibles d'une convention de cleanwalk.
- Périmètre demandé : Web `/learn/empreinte-ia` (page unique, créée au lot 1), méthode publique `/methodologie` ; aucun moteur de gamification, aucune mutation des métriques ou des crédits terrain.

## 2. Entrées, preuves, granularité et tokens

Chaque usage normalisé conserve, selon disponibilité : `sourceProvider`, `sourceFormatVersion`, `sourceGranularity=request|bucket|invoice|manual`, `sourceScope` (compte/projet/organisation), `[startUtc,endUtc[`, `modelRaw`, `modelCanonical|null`, `publisher|null`, `inferenceOperator|null`, `inferenceRegion|null`, `executionEnvironment`, `modality`, nombre de requêtes, tokens par catégorie, énergie et frontière de mesure, provenance, statut et `normalizationVersion`. Ne pas transformer un bucket organisationnel en consommation personnelle prouvée.

Conventions :

- **OpenAI** : `input_tokens` inclut les sous-catégories cache ; `total=input_tokens+output_tokens` si la sémantique du relevé est vérifiée. Pas de deuxième addition des `input_cached_tokens`.
- **Anthropic** : additionner les catégories **mutuellement exclusives** de tokens d'entrée selon le format (non-cachés, création cache 5 min/1 h, lecture cache), puis la sortie. Nouvelle API Analytics 2026 ≠ ancienne API Usage Report.
- **Gemini** : `promptTokenCount` peut inclure le cache ; `thoughtsTokenCount` est à traiter selon le contrat fournisseur, distinct de `candidatesTokenCount`. Vérifier la concordance avec `totalTokenCount` ; ne pas doubler les tokens de raisonnement.
- Conserver `reasoningRelation=included|additional|unknown`, les unités, la modalité et le niveau de preuve. Un token d'un fournisseur n'est pas une unité physique universelle. Un coût monétaire ou un PDF sans tokens ne permet pas d'inventer des tokens.
- Si les tokens **sont réellement absents**, demander une déclaration ou un export : il n'existe pas de calcul rigoureux sans activité de départ. Si le modèle, le matériel, la région ou la répartition des tokens sont manquants, autoriser une **hypothèse explicite**, sans inventer une observation.

## 3. Estimation de l'énergie à partir des tokens

**Ordre de priorité des données :**

1. Mesure instrumentale avec frontière connue. Si `E_IT` est mesurée au niveau informatique et `PUE` est applicable, `E_site=E_IT×PUE`. Une énergie **site** déjà mesurée n'est **jamais** remultipliée par PUE. Une énergie « prise murale » locale reste distincte du coût incrémental imputable à l'IA.
2. Configuration locale documentée : `E_device[kWh]=P_mean[W]×duration_s/3 600 000`. Si puissance à vide comparable : `E_incremental=max(0,P_load-P_idle)×duration_s/3 600 000`. PUE local = 1 ; ne pas supposer l'usage exclusif de l'appareil.
3. EcoLogits v3 : calcul par requête **lorsque** les données de requête et d'architecture nécessaires sont présentes, puis somme. Un agrégat journalier ne constitue pas une requête fictive. Ne pas inventer GPU, latence, batch, TTFT, part MoE, localisation.
4. Scénarios génériques **existants** du registre, uniquement pour des **tokens textuels compatibles** : `a_bas=0,06`, `a_central=0,30`, `a_haut=0,60` **kWh IT / million de tokens**, statut `ASSUMPTION + PROXY / NON CALIBRÉ`.

Pour `T` tokens textuels, un scénario générique `a` et un PUE supposé de `1,15` :

```
E_IT [kWh]    = (T / 1_000_000) × a
E_site [kWh]  = E_IT × 1,15
```

Le PUE `1,15` est une hypothèse de démonstration, non une propriété du fournisseur. La conversion générique pour image, audio ou vidéo **n'est pas autorisée** sans coefficient spécialisé applicable.

Les déclarations publiées par Google pour un prompt textuel Gemini médian (mai 2025 : 0,24 Wh, 0,03 gCO₂e, 0,26 mL) ou les observations Microsoft/Joule 2026 par requête sont des **références de plausibilité contextuelles**, pas des lois par token.

## 4. CO₂e : électricité et frontières du calcul

```
C_op [kgCO₂e] = E_site [kWh] × I_elec [kgCO₂e/kWh]
```

- Facteur RTE **France, consommation, émissions directes, 2025** : `0,0200 kgCO₂e/kWh` (20,0 g/kWh). Distinct du **mix de production** France 2025 : 19,6 g/kWh ; de l'ACV de production : 29,0 g/kWh. Conserver pour les snapshots historiques le facteur 2024 du registre `0,0217 kgCO₂e/kWh`.
- Proxy US du dépôt : `0,35 kgCO₂e/kWh`, avec statut `ASSUMPTION / PROXY` et traçabilité. Le facteur RTE « Europe élargie » `0,178 kgCO₂e/kWh` décrit une **production**, pas une consommation, donc ne pas juxtaposer comme si les périmètres étaient homogènes.
- **Région d'inférence inconnue** : `C_op_attribuable=null` (`NA`). L'UI peut afficher un résultat **scénario France** ou **scénario US** calculable, jamais « l'émission réelle » de l'utilisateur.
- `location-based`, `market-based`, émissions directes et ACV ne sont pas interchangeables. Une valeur d'ACV partielle `+30 %` héritée d'un ancien rapport reste une **sensibilité distincte**, pas une ACV mesurée ni une addition au résultat EcoLogits déjà complet.

### Déchets : référence climatique proxy de repli, pas crédit carbone

La masse climatique **de référence de repli** (lorsqu'aucun scénario ACV matériau rigoureusement paramétré n'est disponible) pouvant être proposée à partir des tokens et d'un scénario carbone connu est :

```
f_dechets = IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg
M_ref [kg hors mégots] = C_scenario [kgCO₂e] / f_dechets
```

Conditions : `C_scenario` chiffré et fini, `f_dechets>0`, unités connues et provenance affichée. Avec le facteur **par défaut actuel** `1,2 kgCO₂e/kg`, une estimation `C_scenario=0,69 kgCO₂e` donne `M_ref=0,575 kg`. **Cette égalité est une correspondance de deux proxys, pas `0,69 kgCO₂e` effectivement évités.** Un déchet retiré de la rue peut être destiné à plusieurs traitements, avec des impacts différents.

## 5. Eau de l'IA : consommation, retrait et échauffement ne sont pas synonymes

Deux postes doivent être calculés et conservés séparément :

```
W_direct [L]   = E_IT [kWh] × WUE_site [L/kWh IT]
W_indirect [L] = E_site [kWh] × WUE_grid [L/kWh site]
W_total [L]    = W_direct + W_indirect, uniquement si les deux sont connus et compatibles
```

- `W_direct` concerne l'eau consommée sur site, notamment évaporée lors de certains refroidissements, **pas** automatiquement tous les prélèvements ou toutes les eaux « chauffées ».
- `W_indirect` concerne l'eau consommée dans la chaîne de production électrique. Le Lawrence Berkeley National Laboratory publie un **facteur moyen US 2023** de `4,52 L/kWh` pour l'eau indirecte associée à l'électricité des datacenters. **Ce facteur n'est ni mondial ni français**.
- L'eau **prélevée**, **consommée**, **rejetée plus chaude**, **contaminée**, ou **présentant un risque écotoxicologique** sont des grandeurs d'impacts distinctes, même quand on les exprime en litres. La dilution d'une substance à un seuil écologique ne fournit pas un volume d'eau « sauvé ».
- Une composante manquante reste `NA`. Un `WUE_site` inconnu ne vaut pas zéro ; un résultat indirect seulement doit s'appeler `W_indirect`, **pas** `W_total`.
- Quand région/WUE manquent, présenter les sensibilités compatibles et clairement choisies par l'utilisateur (par exemple **scénario US indirect seulement**) ; **ne pas attribuer cette eau au fournisseur réel**.

## 6. Mégots : facteur 500 L, équivalence arithmétique autorisée, compensation réelle non prouvée

### 6.1. Décision retenue

Le facteur `500 L par mégot` est **conservé**, parce qu'il figure dans `WATER_LITERS_PER_CIGARETTE_BUTT` du projet et qu'il est repris dans la pédagogie de l'ADEME. **Il n'est pas une mesure reproductible et universelle de litres qui seront effectivement protégés après retrait de chaque mégot**, et l'attribution causale du gain local reste `NON PROUVÉE`.

**Cette équivalence est demandée pour le produit et elle sera donc calculée**, sous deux formes différentes :

1. **Volume conventionnel de risque lié à un objectif de collecte** : `W_risque_indicatif [L-équivalent de risque] = N_megots × 500 L/mégot`. Il n'est **pas** une mesure d'eau dépolluée ou économisée.
2. **Équivalent arithmétique de mégots pour un volume d'eau IA** : `N_eau_theorique = W_IA [L] / (500 L/mégot)` ; pour un nombre entier d'objets à collecter `N_eau_action = ceil(N_eau_theorique)` si `W_IA>0`. Si `W_IA=0` connu, les deux valent 0. Si l'eau est `NA`, l'équivalence l'est aussi, sauf calcul dans un **scénario hydrique explicitement hypothétique**.

L'arrondi vers le haut est un choix **d'objectif pratique**, pas un chiffre exact de « compensation ». Quand `0 < N_eau_theorique < 1`, afficher **les deux** : « équivalence numérique inférieure à un mégot » et « objectif pratique minimal : 1 mégot ». **Ne pas prétendre que le mégot entier compense 500 L réels de l'IA.**

### 6.2. Pourquoi le mot « compensation réelle » est impropre

Les litres d'eau de l'IA sont consommés/évaporés indirectement ou directement pour une activité informatique, à un endroit et dans une période donnés. Les `500 L/mégot` sont un **ordre de grandeur conventionnel de risque de pollution**, dépendant de la substance, du milieu, du seuil et du scénario de dispersion. Ramasser un mégot n'apporte pas 500 L d'eau disponible au datacenter et ne recrée pas le volume consommé. Sans mesure de l'état contrefactuel, du milieu, de la destination des mégots, de la causalité, de l'additionalité et de la permanence, **aucun impact hydrique évité net et vérifié n'est établi**.

Le **simple retrait d'un mégot**, sans recyclage ni scénario contrefactuel documenté, ne dispose pas d'un coefficient carbone évité validé. Un scénario de **recyclage effectif** peut être chiffré séparément lorsque la filière et son facteur sont traçables. **Il reste interdit de convertir `500 L/mégot` en kgCO₂e ou de considérer le ramassage comme un crédit carbone.**

**Texte UI obligatoire, près du résultat chiffré, non masqué dans un accordéon :**

> « Équivalence indicative : 1 mégot correspond conventionnellement à un risque de pollution de 500 L d'eau. Cela ne signifie PAS qu'en ramassant ce mégot, 500 L d'eau consommée par l'IA sont récupérés ou compensés. Le CO₂ de l'IA n'est pas compensé. »

Si la valeur d'eau présentée est seulement indirecte : remplacer « eau consommée par l'IA » par « eau indirecte estimée pour la production électrique du scénario » ; ne pas la nommer « eau totale ».

## 7. Deux objectifs indépendants, deux types de collectes et curseur conditionnel

### 7.1. Matrice des mécanismes et niveau de preuve

La bonne représentation n'est plus « déchets = CO₂, mégots = eau ». **Chaque action peut contribuer à plusieurs enjeux**, sans qu'une contribution non quantifiée soit convertie arbitrairement en émissions ou en litres économisés.

| Action | Bilan climatique | Bilan eau consommée | Pollution de l'eau / sécurité |
| --- | --- | --- | --- |
| Déchets collectés puis recyclés/incorporés | Calcul ACV net conditionnel par matériau, destination et rendement | ACV nette **signée** en L/kg uniquement si indicateur et périmètre comparables | Retrait de déchets du milieu, microplastiques et autres nuisances ; pas de L/kg de pollution épargnée inventé |
| Mégots collectés, **recyclage non sélectionné** | **NA** pour les émissions évitées par le simple ramassage ; contribution de recyclage = 0 pour ce scénario précis | **NA** pour les litres consommés économisés | `500 L/mégot` de **risque conventionnel**, avec contrefactuel « aurait atteint l'eau » non observé |
| Mégots collectés, **filière de recyclage sélectionnée** | Scénario CO₂e possible avec facteur ACV propre à la filière ; voir §7.2 | **NA** sauf ACV nette compatible de cette filière | Même convention 500 L de risque évité potentiel, **pas 500 L supplémentaires parce que recyclé** |
| Mégot en ignition / prévention à la source | Réduction possible d'un risque d'incendie ; **aucun kgCO₂e/mégot** sans probabilité, combustible et contexte | Sans facteur général | Risque réel d'incendie si le mégot brûle, sans assimilation aux mégots froids déjà ramassés |

**Traitement de l'eau :** enlever des polluants avant leur entrée dans un milieu peut éviter une contamination, mais les émissions de pompage et d'épuration ne sont pas proportionnelles universellement au nombre de mégots. Un mégot abandonné ne finit pas nécessairement dans une filière d'eau potable/assainissement ; aucune économie d'électricité ou d'eau de traitement par mégot n'est donc calculable (`NA`). Ne pas confondre bénéfice possible et crédit mesuré.

**Incendies :** les mégots mal éteints sont une cause possible de départ de feu. Ramasser un mégot **déjà froid** n'établit aucune prévention d'incendie en cours. Un modèle d'émissions évitées devrait connaître au moins la probabilité contrefactuelle de départ de feu, son extension, les combustibles, le moment de retrait et le contexte météo. **Aucun coefficient général CO₂e/mégot n'est autorisé.**

### 7.2. Case « Mégots envoyés au recyclage » et facteur carbone fournisseur

Un procédé réel existe chez **TchaoMegot** : collecte, séparation des fractions, dépollution des filtres et transformation de la fibre en isolant. Un document public du syndicat **SMET 71** déclare **18 000 mégots recyclés** et **63 kg CO₂ non générés** pour une collecte 2023 ; le rapport est un **résultat communiqué de la filière**, pas une ACV indépendante auditable. Son rapport implique :

```
fC_megot_Tchao_indicatif = 63 kgCO₂ / 18 000 mégots
                        = 0,0035 kgCO₂ par mégot recyclé (3,5 g)
```

Ce **proxy prestataire non vérifié indépendamment** est autorisé uniquement dans un **scénario fournisseur explicitement choisi et étiqueté**, jamais comme bénéfice causal du ramassage de n'importe quel mégot. Ne pas le confondre avec l'empreinte complète **de fabrication** d'une cigarette (fabrication passée et non évitée par le recyclage du filtre). Vérifier l'unité, la date, le périmètre et le statut du rapport ; aucun retrait d'émissions déjà attribué à un autre acteur n'est revendiqué comme crédit CleanMyMap.

Contrôle UI : case **« Mégots envoyés au recyclage »** (désactivée par défaut), indication **« destination prévue ou confirmée ? »**, filière identifiée et indication `HYPOTHESIS / PROVIDER_CLAIM` ou `CONFIRMED_ROUTE` selon preuves. **Cocher ne prouve pas l'acheminement réel** ; sans sélection d'une filière ou sans facteur admissible, `fC_megot=NA`, pas 3,5 g par défaut. Le document SMET utilise « kg CO₂ non générés » sans préciser un inventaire ACV net complet en kgCO₂e : l’hypothèse de comparabilité des périmètres doit être explicite avant tout rapprochement numérique avec les kgCO₂e de l’IA. Un **reçu de filière** atteste au mieux du transfert, pas d'une ACV indépendante. Ne pas enregistrer des justificatifs sensibles hors périmètre du produit.

### 7.3. Deux objectifs calculés depuis les tokens et deux registres de l'eau

Références du scénario IA : `C_IA [kgCO₂e]` et `W_IA [L eau consommée, périmètre direct/indirect/total qualifié]`. Les inconnues restent `NA`. Le carbone attribuable à une infrastructure géographiquement inconnue reste `NA`, mais un scénario régional explicitement hypothétique peut être calculé.

**Registre carbone quantitatif**, pour déchets hors mégots et mégots en filière :

```
q_i       = fraction massique des déchets de catégorie i, somme=1
z_i       = rendement de matière secondaire réellement incorporée, 0..1
fC_i      = bénéfice NET ACV kgCO₂e/kg matière incorporée, scénario documenté
F_C_mix   = somme_i(q_i*z_i*fC_i) [kgCO₂e / kg déchets collectés]
fC_megot_declare = 0,0035 kgCO₂/mégot, chiffre fournisseur rapporté par SMET 71
fC_megot_scenario = fC_megot_declare seulement SI scénario fournisseur choisi
                    ET hypothèse de comparabilité CO₂ déclaré / CO₂e ACV explicitée,
                    sinon NA
B_C_illustratif(M,N) = M*F_C_mix + N*fC_megot_scenario
                    [kgCO₂e comparatifs sous hypothèse, PAS bilan ACV validé]
```

Si la filière mégots n'est **pas sélectionnée**, sa contribution **recyclage** est `0` ; cela ne signifie **pas** que le bilan climatique global du ramassage est précisément zéro. Si elle est sélectionnée mais son facteur est absent, contribution `NA` avec couverture partielle, jamais zéro masqué. Les facteurs ADEME par kg de matière incorporée ne sont pas à appliquer sans rendement `z_i`. Le facteur générique terrain `1,2 kgCO₂e/kg` est un **repli de comparaison de proxys**, jamais cumulable avec les ACV par matériau.

**Registre eau consommée, physiquement homogène**, pour les deux filières si des ACV nettes comparables existent :

```
fW_i      = eau consommée scénario vierge - eau consommée scénario recyclé
            [L nets/kg de matière incorporée], peut être négatif
fW_megot  = économie nette L/mégot recyclé, uniquement si ACV comparable publiée
B_W_cons  = M*somme_i(q_i*z_i*fW_i) + N*fW_megot [L nets]
```

**Au stade actuel, aucun `fW_megot` applicable et aucune collection complète de `fW_i` en litres consommés/kg n'a été validé : ce total reste `NA` ou explicitement partiel.** Un bilan sur les **ressources en eau** pondéré (`AWARE`) ou sur les prélèvements ne peut pas remplir un poste en litres de consommation sans modèle correspondant. L'ADEME BNR 2021 signale même un coût net défavorable pour l'utilisation des ressources en eau des plastiques étudiés.

**Registre pollution/risque hydrique conventionnel, distinct :**

```
V_risque_megots [L conventionnels potentiellement affectés] = N*500
N_repere_hydrique = ceil(W_IA/500)  [analogie de volumes, PAS eau restituée]
```

Les déchets retirés de l'environnement peuvent aussi prévenir de la pollution hydrique, mais **aucun facteur général `L de pollution évités/kg de déchets`** n'est disponible. Ne jamais faire `B_W_cons + V_risque_megots` : même unité graphique « L », mais indicateurs et effets non commensurables. Il est impossible de prétendre que les **deux types de collecte remplissent numériquement les deux obligations physiques** pour toutes les combinaisons du curseur avec les preuves actuelles. La page peut présenter **deux objectifs thématiques**, leurs contributions prouvées/scénarisées et la comparaison conventionnelle à 500 L, avec un statut `NON_QUANTIFIABLE` pour les contributions inconnues.

### 7.4. Curseur contraint à deux critères et amplitude admissible

La **préférence d'effort** `p` est comprise entre 0 et 1. Les objectifs `C_IA` (kgCO₂e de scénario) et `W_IA` (L d'un périmètre IA **qualifié**) dérivent tous deux du relevé de tokens ou d'une mesure admissible. Les cibles de collecte ne sont **pas libres et indépendantes des tokens**. Les rendements `rD = 9,9 kg/personne-heure` et `rM = 380 mégots/personne-heure` sont des proxys observés dans des contextes différents, **non prédictifs en France**.

```
M(H,p) = H × rD × (1-p)                          [kg de déchets hors mégots]
N_th(H,p) = H × rM × p                           [mégots théoriques]
N_entiers(H,p) = ceil(N_th)                      [objectif pratique]
kC(p) = rD × (1-p) × F_C_mix + rM × p × fC_megot   [kgCO₂e comparatifs/h]
kR(p) = rM × p × 500                            [L-équivalents de risque/h]
kWcons(p) = rD × (1-p) × F_W_mix + rM × p × fW_megot [L consommés évités/h]
```

`kC` n'est calculable que pour les contributions **scientifiquement admissibles dans le scénario** ; une filière absente donne zéro pour son **mécanisme de recyclage**, une filière déclarée sans facteur donne `NA`. Le facteur fournisseur mégots `3,5 g CO₂/mégot` requiert l'hypothèse explicite de comparabilité `CO₂` / `CO₂e`, sans revendiquer un bilan ACV. Un matériau `autres` inconnu ne devient jamais automatiquement du plastique recyclable. En cas de données partielles, afficher des contributions connues qualifiées comme **minorants de scénario**, et une couverture de facteurs incomplète ; ne pas annoncer une atteinte totale démontrée sur des inconnues.

**Choix hydrique explicite et figé pour le défi** :

- `RISQUE_CONVENTIONNEL` : critère eau `kR(p)>0` et `W_IA` disponible ou scénario déclaré. Cette voie traduit uniquement une analogie **numérique** à `500 L/mégot`, pas une compensation de consommation d'eau.
- `EAU_CONSOMMEE_ACV` : critère `kWcons(p)>0` avec facteurs ACV nets homogènes en L consommés, y compris valeurs **négatives** ; faute de facteurs qualifiés, `NA`, **pas zéro**. Cette voie peut valoriser des déchets et, à terme, des mégots si une ACV compatible existe. En 2026, aucun coefficient hydrique net universel n'est validé ici.
- Les deux voies peuvent être **présentées côte à côte**, mais ne sont jamais additionnées ; changer de voie est un **changement de scénario** qui exige une nouvelle révision et réévaluation du défi. Ne jamais faire un `OR` silencieux entre voies pour créditer les progrès ou badges.

Pour la voie sélectionnée `kH(p)`, définir pour des cibles positives :

```
H_C(p) = C_IA / kC(p)       si C_IA > 0 et kC(p)>0
H_H(p) = W_IA / kH(p)       si W_IA > 0 et kH(p)>0
H_min(p) = max(H_C(p), H_H(p))  pour les deux critères connus et satisfaisables
```

Si une cible vaut **zéro connu**, sa contrainte demande `0` effort ; si elle vaut `NA`, la double atteinte est **indéterminée**. Si une cible est positive et son coefficient `0` ou `<=0` avéré, ce `p` est **impossible** ; aucun effort fini ne le satisfait. Si un facteur manque, le point est **inconnu**, pas automatiquement impossible. S'il existe un plafond facultatif `H_max` d'effort choisi par l'utilisateur (heures-personne), le point n'est admissible que si `H_min(p)<=H_max`. **Aucun plafond arbitraire invisible** n'est appliqué par défaut.

L'ensemble admissible est calculé sur les positions de curseur réellement proposées (par exemple entier `0..100`) et **peut ne pas être une seule plage continue**. L'UI désactive les points non admissibles, signale séparément `INFEASIBLE`, `UNKNOWN` et `OVER_BUDGET`, et recale une préférence devenue interdite uniquement après confirmation. Si l'ensemble est vide, il n'existe **aucune solution de scénario dans les hypothèses retenues** : montrer les leviers (recyclage, composition, voie hydrique, période, plafond d'effort) sans augmenter artificiellement les coefficients.

- À `p=0`, `N=0` ; l'analogie hydrique par mégots est impossible si `W_IA>0`, mais un bilan net **d'eau consommée** des déchets pourrait satisfaire une **autre voie** si son facteur est établi.
- À `p=1`, `M=0` ; la partie carbone est impossible pour le **mécanisme recyclage mégots absent** lorsque `C_IA>0`, mais peut devenir scénarisable si un facteur fournisseur applicable est explicitement sélectionné. L'analogie de risque hydrique reste calculable.
- Lorsqu'une seule borne est impossible, ne pas afficher l'autre comme si elle l'était ; l'amplitude dépend de la voie eau sélectionnée et du statut de recyclage.

Après choix de `p`, calculer `H_min`, `M`, et `N_entiers`. **Recalculer les contributions à partir des quantités réellement proposées**, gérer les arrondis à la hausse sur les objets et l'affichage de grammes avant kg. La position du curseur reste une **préférence théorique** ; les arrondis peuvent changer le ratio effectif. Les rendements ne prédisent pas la disponibilité réelle des déchets dans une ville.

Pour une région d'inférence inconnue, la mesure `C_IA` reste `NA` ; l'utilisateur peut choisir un **scénario de référence explicite** (par exemple US pour carbone ET eau indirecte, sans prétendre connaître le datacenter). Si le scénario eau ne contient que l'eau indirecte, le seuil est qualifié **indirect seulement**. Les hypothèses et la version sont fixées pour le défi et ne changent pas au gré des imports.

**Exemple contrôlable de plage non totale** (les hypothèses chiffrées sont celles du §9.5) : scénario US de 1 M tokens, `C=0,12075 kgCO₂e`, `W_indirect=1,5594 L`, `F_C_mix=2,7709 kgCO₂e/kg`, aucune filière mégots recyclés sélectionnée, voie `RISQUE_CONVENTIONNEL`, plafond volontaire `H_max=0,25 heure-personne`. Aux pas de 1 %, seuls `p=1 %` à `98 %` sont admissibles. `0 %` n'atteint pas le repère d'eau par mégots, `100 %` n'atteint pas le repère carbone du scénario, et `99 %` requiert environ `0,440 h`, au-dessus du plafond choisi. **Sans plafond**, `99 %` reste mathématiquement admissible ; aucune impossibilité opérationnelle n'est déduite de la seule ville de l'utilisateur. Les résultats en grammes et mégots entiers doivent être recalculés après arrondi.

**Important :** `H_min` est une exigence de quantité et d'effort *théoriques*. Ni `C_IA` ni `W_IA` ne sont physiquement réduits par la collecte ; la double atteinte est **symbolique et conditionnelle**, sans crédits, neutralité ni compensation certifiée.

### 7.5. Statuts et présentation

**Deux grands tableaux de bord :** `CO₂e` et `EAU`, chacun affichant les deux voies de collecte, avec contributions `QUANTIFIÉES / PROXY FOURNISSEUR / PARTIELLES / NA`. Dans la carte `EAU`, afficher **deux sous-lignes incompatibles à sommer** : (a) eau consommée nette selon ACV ; (b) risque de pollution estimé selon `500 L/mégot`. Présenter comme acquis seulement une **égalité de scénario**, pas une réduction d'impact réelle ni une certification.

Pour les choix de curseur, ajouter les statuts `FEASIBLE_SCENARIO`, `INFEASIBLE`, `UNKNOWN`, `OVER_BUDGET` et `NO_FEASIBLE_POSITION`. Les usages futurs du défi n'emploient jamais les seuls titres des cartes comme certificat de neutralité.

Les statuts `SCENARIO_CARBONE_CONVENTIONNEL_ATTEINT`, `SCENARIO_CARBONE_CONVENTIONNEL_NON_ATTEINT`, `ANALOGIE_RISQUE_HYDRIQUE_ATTEINTE`, `ANALOGIE_RISQUE_HYDRIQUE_NON_ATTEINTE`, `EAU_CONSOMMEE_ACV_NA`, `PARTIAL_COVERAGE`, `NON_APPLICABLE` sont distincts ; ne pas déclarer `CO₂_COMPENSÉ` ou `EAU_COMPENSÉE`.

## 8. Ventilation des matériaux et bilan d'eau du recyclage

### 8.1. Composition déclarée : calcul possible, aucune observation inventée

Les tokens déterminent la **quantité totale proposée**, pas les matériaux présents dans une ville. La composition choisie par l'utilisateur `q_i` est une **hypothèse de mix**, pas une déduction géographique.

```
q_i >= 0 ; somme(q_i) = 1
M_i_collecté = q_i × M_cible
M_i_MPR = M_i_collecté × y_i    # fraction effectivement récupérée/incorporée (scénario)
```

Catégories V1 : `plastique` (avec sous-type facultatif PET/PEHD si identifiés), `aluminium`, `acier/ferreux`, `verre`, `autres/non identifiés`. `papier-carton` seulement si source et UI de tri le justifient. **Mégots séparés** du plastique recyclable. La catégorie « autres » ne bénéficie d'aucun facteur d'ACV inventé ; tout mix partiellement inconnu doit signaler la couverture limitée. Les masses doivent conserver leur somme malgré les arrondis d'affichage.

### 8.2. Carbone net ACV du recyclage : facteurs documentés, destination conditionnelle

Pour `y_i` connu/choisi, `B_C_i = M_i_collecté × y_i × fC_i`. Les facteurs ADEME BNR 2012-2021 concernent le **recyclage et l'incorporation** de MPR en France, avec scénarios historiques 2021, et non l'acte de ramassage. Exemples `fC_i` : aluminium `6,407`, plastique moyenne `2,702`, verre moyenne `1,948` kgCO₂e/kg MPR. La qualité, la fraction perdue, la filière effective, les sous-types de plastique et la date doivent apparaître ; sans ces éléments, `B_C_i` reste une **simulation optimiste ou conditionnelle**, pas du CO₂ réellement évité. Ne pas ajouter le `1,2` terrain aux facteurs ACV (double comptage potentiel).

### 8.3. Eau : ne jamais présumer d'une économie nette

Une économie d'eau liée au recyclage **est techniquement calculable** si une ACV fournit deux consommations d'eau comparables de même définition et frontières :

```
fW_i_net [L consommés / kg MPR] = eau_scenario_vierge - eau_scenario_recyclé
B_W_i [L consommés potentiellement évités] = M_i_MPR × fW_i_net
```

`fW_i_net` peut être **positif, nul ou négatif** ; il n'est jamais borné artificiellement à `>=0`. Ne pas convertir des **prélèvements** (L prélevés), des **volumes de dilution/pollution** (500 L/mégot) ou des **m³ équivalents de privation AWARE** en consommation brute L sans modèle explicite.

**Constat majeur vérifié dans l'ADEME BNR, p. 106 (évaluation 2021) : le recyclage des plastiques étudiés présente un coût environnemental net défavorable pour l'indicateur d'utilisation de ressources en eau**, en partie en raison du lavage avant recyclage et de la séparation par flottaison. **Interdiction d'annoncer « le plastique recyclé économise de l'eau » sans scénario et preuve contradictoire plus spécifique.**

- **Aluminium :** extraction de bauxite et raffinage Bayer (eau, réactifs, résidus) remplacés partiellement par un recyclage secondaire, mais bilan d'eau net par kg récupéré à documenter selon géographie, électricité, rendement et frontières. Pas de `L/kg` universel activé dans l'UI faute de calibration comparable.
- **Plastique :** résines pétrosourcées et procédés de recyclage avec consommation d'eau. Le BNR 2021 signale précisément une catégorie hydrique **défavorable** malgré un bénéfice carbone favorable. Pas de gain hydrique positif par défaut.
- **Verre :** calcin qui remplace une partie du **sable siliceux**, du carbonate de sodium et du calcaire et réduit l'énergie de fusion. Il n'évite pas « la création du sable » : le sable est une ressource minérale extraite. Bilan d'eau positif **non démontré** par le chiffre carbone du BNR ; lavage/recyclage peuvent consommer de l'eau.
- **Acier et autres :** facteurs d'eau `NA` tant qu'une ACV compatible manque.

Pour éviter un chiffre faussement rassurant, la V1 fournit surtout des **explications qualitatives sourcées par matériau**, avec résultats carbone ACV purement conditionnels et `waterNetLiters=NA` si aucun couple de facteurs eau vierge/recyclé compatible n'est extrait. Il ne faut pas inventer un facteur « eau économisée par kg de déchet ramassé » pour satisfaire un seuil.

**Séparation irréductible :** (a) eau **consommée** par datacenter ou électricité, (b) eau industrielle **évitée ou additionnelle** selon ACV de recyclage, (c) volume d'eau **potentiellement contaminé** par mégot, (d) impact de rareté **AWARE** en m³ équivalents, (e) **écotoxicité** des lixiviats. Des unités apparemment similaires ne les rendent pas écologiquement interchangeables.

## 9. Exemples numériques contrôlables

### 9.1. Empreinte IA, 1 million de tokens texte, hypothèse France 2025

| Hypothèse | Énergie IT (kWh) | Énergie site (kWh) | CO₂e scénario (g) | Eau totale |
|---|---:|---:|---:|---|
| Bas, 0,06 kWh/M | 0,060 | 0,069 | 1,38 | `NA` |
| Central, 0,30 kWh/M | 0,300 | 0,345 | 6,90 | `NA` |
| Haut, 0,60 kWh/M | 0,600 | 0,690 | 13,80 | `NA` |

Aucune conversion complète en double seuil n'est disponible pour ce scénario tant que les facteurs hydriques ne sont pas documentés. Une **référence de masse** générique à `1,2 kgCO₂e/kg` reste possible mais n'établit aucun bénéfice ACV de recyclage.

### 9.2. 1 million de tokens, scénario US, eau indirecte seulement

`E_site=0,345 kWh`, `C_US_scenario=0,12075 kgCO₂e`, `W_indirect_US=1,5594 L`, `W_total_US=NA`. La référence hydrique conventionnelle donne `1,5594/500=0,0031188 mégot théorique`, soit **1 mégot entier** pour le repère d'eau **indirecte seulement**. Le mélange de matériaux et la récupération sont nécessaires pour fixer `M_min` en méthode ACV ; voir §9.5. Ne pas appliquer automatiquement ces facteurs US à une infrastructure inconnue.

### 9.3. Ancienne formule d'effort fixe (ABANDONNÉE)

L'ancienne relation `M(p)=(1-p)×M_ref` et `N(p)=p×N_ref`, avec effort conservé, est **obsolète** pour le parcours à deux seuils. Elle reste interprétable uniquement comme exemple historique de répartition du temps, **pas** comme preuve d'atteinte de deux seuils. Le moteur CURRENT envisagé pour le chantier est exclusivement le calcul contraint de la section 7.

### 9.4. Énergie locale, distincte de l'inférence cloud

À `160 W` moyens pendant une heure : `0,160 kWh` à la prise, soit `3,20 gCO₂e` avec le **scénario de consommation électrique France 2025**. Si `P_idle=70 W` comparable, le différentiel imputable est `0,090 kWh`, soit `1,80 gCO₂e`. Ne pas additionner consommation totale et différentielle.

### 9.5. Exemple indicatif, 1 million de tokens, scénario US, recyclage mégots conditionnel

Hypothèses `T=1 million`, `a=0,30 kWh/M`, `PUE=1,15`, `I_US=0,35 kgCO₂e/kWh`, eau US **indirecte seulement** `4,52 L/kWh`. Mix de déchets illustratif `50 % plastique / 10 % aluminium / 40 % verre`, rendements `z_i=1` **idéaux**, jamais présumés en production.

```
E_site = 0,345 kWh
C_IA_scenario = 0,12075 kgCO₂e
W_indirect_US = 1,5594 L, W_total_US = NA
F_C_mix = 0,5×2,702 + 0,1×6,407 + 0,4×1,948 = 2,7709 kgCO₂e/kg
M_carbone_si_p0 = 0,12075 / 2,7709 ≈ 0,0435779 kg
N_risque_analogie = ceil(1,5594 / 500) = 1 mégot
fC_megot_illustratif = 0,0035 kg CO₂ déclaré/mégot recyclé (SMET 71 / TchaoMegot)
Hypothèse supplémentaire : périmètre réputé comparable aux kgCO₂e IA POUR LA SIMULATION SEULEMENT
N_carbone_si_p1_et_recyclé = ceil(0,12075/0,0035) = 35 mégots
```

- `p=0` : environ **43,58 g de déchets** pour la référence carbone idéale, **0 mégot** ; analogie hydrique des mégots non atteinte. L'économie industrielle d'eau reste `NA`.
- `p=1`, case mégots recyclés **désactivée** : le repère carbone n'est **pas atteignable via un recyclage de mégots non sélectionné**, quel que soit le nombre ; analogie hydrique des mégots calculable.
- `p=1`, **scénario TchaoMegot explicitement activé** : environ **35 mégots** correspondent au repère climatique numérique du facteur fournisseur, et `35×500=17 500 L` au risque hydrique conventionnel. **Ce n'est PAS 17 500 L d'eau consommée restaurée.** Le niveau du carbone est « scénario fournisseur », non audit indépendant.
- `p=50 %`, scénario fournisseur activé : `kC=9,9×0,5×2,7709+380×0,5×0,0035≈14,380955 kgCO₂e comparatifs/h (hypothèse de périmètres compatibles)`; `H_C≈0,008397 h`, soit 30 s de temps théorique ; environ **41,6 g de déchets** et **2 mégots** après arrondi. Le seuil 500 L est numériquement dépassé, mais l'eau consommée économisée reste `NA`.
- Le **volume d'eau direct** n'est pas connu, donc le résultat indirect n'est pas une « eau totale de l'IA ». Ces masses et efforts sont extrêmement sensibles aux hypothèses de production et de collecte.

**Rectification du facteur verre (ADEME BNR 2012-2021, référence 2021) :** le bénéfice net potentiel est de **1 948 kgCO₂e par tonne de MPR verre incorporée**, soit **1,948 kgCO₂e par kg incorporé**. La valeur antérieure `0,948` était une erreur de transcription. Source primaire : https://economie-circulaire.ademe.fr/bnr/verre (rubrique « Bénéfices potentiels nets ... incorporation d'une tonne recyclée en 2021 »). Ce bénéfice dépend d'un scénario ACV et de l'incorporation effective, pas de la seule collecte. Le mélange `50/10/40`, le rendement `z=1`, les productivités horaires et le proxy fournisseur mégots sont des hypothèses et non des caractéristiques observées d'une cleanwalk. Les snapshots et tests de référence doivent employer `F_C_mix=2,7709`, `M_p0≈43,58 g` et `kC_p50_recyclé≈14,380955 kgCO₂e comparatifs/h`.

**Précision OpenAI/Codex (scénario, non mesure) :** l'estimation moyenne `0,34 Wh par requête ChatGPT` déclarée en juin 2025 n'est pas un facteur par token, ni une mesure applicable à une session agentique Codex. Le fournisseur ne publie pas ici la consommation électrique par modèle Codex, par modalité ou par requête individuelle ; les comptes `input`, `cached input`, `output` et raisonnement doivent être conservés séparément. Les émissions attribuables et l'eau consommée totale restent `NA` sans localisation, mesure et frontières compatibles. Sources : https://blog.samaltman.com/the-gentle-singularity/ et https://academy.openai.com/en/public/clubs/higher-education-05x4z/resources/environmental-impact-of-ai .

**Attention aux indicateurs de recyclage des mégots :** le rapport SMET 71 (2023) décrit 18 000 mégots, 5,1 kg d'isolant et 63 kg de CO₂ déclarés « non générés », sans documentation ACV nette indépendante correspondante. Les `9 000 m³ d'eau épargnée` du même document correspondent exactement à `18 000 × 500 L`, volume de pollution potentielle conventionnel et **non** à une économie mesurée d'eau consommée. Source : https://www.smet71.fr/media/Documents/RA_2023.pdf . Ne convertir aucun de ces volumes en économie nette d'eau de traitement ou en crédit de neutralisation.


## 10. UI, traçabilité et tests

1. Résumé du nombre de tokens, énergie, CO₂e, eau **directe/indirecte/total lorsque complet**, statut et région de scénario.
2. Deux cartes **CO₂e** et **EAU** affichant **toutes les contributions potentiellement pertinentes des déchets et mégots**, mais sans additionner les indicateurs incompatibles. Dans Eau, toujours séparer `eau consommée ACV nette` et `volume de pollution potentielle lié aux mégots`.
3. Case **« Mégots envoyés au recyclage »**, décochée par défaut ; demander une filière identifiée, distinguer **prévu** et **confirmé**, montrer le proxy fournisseur `3,5 g CO₂ déclaré/mégot` uniquement si l'utilisateur a sélectionné le scénario TchaoMegot avec sa provenance et sa limite de validation. Cocher la case ne constitue pas un justificatif d'ACV ou de recyclage accompli.
4. Curseur de préférence d'effort entre déchets et mégots ; les deux objectifs sont **dérivés du scénario IA**, avec `p=0/1` et états d'impossibilité conditionnels. Ne pas promettre de double compensation réelle. Valeurs physiques minuscules conservées, arrondies pour l'affichage seulement.
5. Composition facultative des déchets (`plastique`, `aluminium`, `acier/ferreux`, `verre`, `autres`) et taux de récupération hypothétiques. ACV carbone nette documentée, eau ACV **signée** ou `NA`. Aucun `L/kg` de pollution d'eau attribué arbitrairement aux déchets.
6. Cartes pédagogiques distinctes : **recyclage des filtres**, **risque de contamination**, **eau de traitement non quantifiable**, **risques d'incendie liés aux mégots mal éteints**, et **le recyclage peut dégrader un indicateur eau malgré des gains CO₂e**. Relier `/learn/comprendre`, `/sections/recycling`, `/learn/sentrainer`, `/methodologie` et les actions existantes.
7. Préserver les périmètres privés et AuthN/AuthZ, les imports et budgets ; pas de nouvelles récompenses, crédit carbone, « tonnes neutralisées » ou prétendue certification.

**Tests indispensables :** absence de double comptage des mégots, case non cochée/cochée, filière inconnue, ratio fournisseur 63/18000, absence de facteur ACV, `p=0` et `p=1` sous recyclage activé/désactivé, carbone/eau `NA`, eau recyclage signée négative, couverture partielle, termes d'eau incompatibles non additionnés, scénario US 1M tokens, rendements et arrondis, réactivité, accessibilité et modes de présentation.

## 11. Références et niveau de preuve

1. **EcoLogits**, modèle de calcul de l'inférence et des impacts : https://ecologits.ai/latest/methodology/llm_inference/ . Méthode scientifique, estimations dépendant des entrées.
2. **RTE**, Bilan électrique 2025, intensité carbone production/consommation : https://analysesetdonnees.rte-france.com/bilan-electrique-2025/emissions . Facteurs géographiques de scénario, non preuve du lieu d'inférence.
3. **Lawrence Berkeley National Laboratory**, *2024 United States Data Center Energy Usage Report*, eau indirecte US 2023 `4,52 L/kWh` : https://escholarship.org/uc/item/32d6m0d1 . Proxy national, pas mondial, ni eau totale d'un modèle IA.
4. **ADEME**, *Stop aux mégots dans l'espace public* : https://agirpourlatransition.ademe.fr/particuliers/reduire-dechets/bien-jeter/stop-megots-espace-public . Mentionne `500 L/mégot` ; **pas preuve qu'une collecte restaure effectivement 500 L**.
5. **Sawdey, Lindsay et Novotny (2011)**, *Smoke-free college campuses: no ifs, ands or toxic butts*, relevés 23 885/63 et 6 525/17 mégots par personne-heure : https://pmc.ncbi.nlm.nih.gov/articles/PMC3088459/ . Observations localisées, non taux universel.
6. **Scottish Government (2023)**, *Scale and Cost of Litter and Flytipping*, chapitre 4 : https://www.gov.scot/publications/scale-cost-litter-flytipping-scotland/pages/5/ . `1,5 sacs×6,6 kg` par bénévole-heure : hypothèse d'évaluation, pas mesure française.
7. **ADEME**, *Bilan national du recyclage 2012-2021, évaluation environnementale* : https://librairie.ademe.fr/economie-circulaire-et-dechets/6993-8665-bilan-national-du-recyclage-bnr-2012-2021-evaluation-environnementale.html ; pages `https://economie-circulaire.ademe.fr/bnr/aluminium`, `/bnr/plastiques`, `/bnr/verre`. Résultats par tonne de matière recyclée incorporée, et **pas** par tonne ramassée dans la rue.
8. **CleanMyMap**, `documentation/product/SCIENTIFIC_PROTOCOL.md`, `IMPACT_PROXY_CONFIG` et `documentation/plans/rapport_impact/impact_IA/annexes/B-methodologie-calcul-incertitudes.md` : **conventions internes**, non preuves externes de compensation.

9. **ADEME, Bilan national du recyclage 2012-2021** (rapport officiel, mars 2024), pages imprimées 35 pour aluminium, 86 pour verre, 105-106 pour plastiques, et rapport ACV détaillé : https://www.ademe.fr/wp-content/uploads/2024/12/Bilan-national-du-recyclage-2012-2021.pdf . Sources primaires : CO₂e net par tonne MPR, **coût net d'utilisation de ressources en eau pour les plastiques** dans la modélisation 2021.
10. **Commission européenne, Environmental Footprint (EF)** : les méthodes distinguent changement climatique, utilisation d'eau pondérée par pénurie (`AWARE`), écotoxicité et ressources : https://green-forum.ec.europa.eu/green-business/environmental-footprint-methods/lca-ef-methods_en et https://eur-lex.europa.eu/eli/reco/2021/2279/2021-12-30/eng . Les `m³ world-eq` AWARE ne sont pas des litres bruts.
11. **Commission européenne, JRC, profil de durabilité bauxite/aluminium** : https://rmis.jrc.ec.europa.eu/uploads/library/jrc125390_sustainability_profile_bauxite__aluminium_online.pdf . Mécanismes miniers, raffinage et résidus, pas facteur net universel d'eau économisée par canette.

12. **TchaoMegot**, description du recyclage et de sa méthode : https://tchaomegot.com/comment-sont-recycles-les-megots-chez-tchaomegot/ et https://tchaomegot.com/depollution/ . Preuve d'existence d'une filière, pas facteur ACV indépendant.
13. **SMET 71**, rapport d'activité 2023 : https://www.smet71.fr/media/Documents/RA_2023.pdf . `18 000 mégots`, `63 kg CO₂ déclarés non générés`, soit `3,5 g/mégot`, **chiffre d'une opération rapportée via le prestataire, non preuve universelle**.
14. **Nantes Métropole**, mégots recyclés par TchaoMegot : https://metropole.nantes.fr/actualites/que-deviennent-les-megots-collectes-dans-les-cendriers-de-rue . Preuve publique de filière effective ; `500 L/mégot` y reste une convention de risque.
15. **Gouvernement français**, prévention des feux de forêt : https://www.info.gouv.fr/actualite/comment-prevenir-les-feux-de-forets . Risque de mégots mal éteints, sans coefficient CO₂e évité par mégot déjà collecté.

## 12. Défi personnel cumulatif, attribution individuelle et gamification (PLAN, non CURRENT)

### 12.1. Trois objets métier indépendants

1. **Fait environnemental de l'action** : masse totale de déchets hors mégots et nombre total de mégots réellement déclarés et validés pour l'action, dans leurs unités propres. Les KPI publics d'Actions ne changent pas lorsqu'une personne attribue sa part à une autre structure.
2. **Part personnelle attribuée** : pour chaque participant dont la présence finale est confirmée, une quantité de déchets hors mégots et une quantité de mégots, par action et par métrique, avec une provenance `individual` (mesure individuelle revue), `quote_part` (part calculée du collectif) ou `unavailable`. Le **propriétaire du fait reste définitivement le participant Clerk**, non la structure bénéficiaire. Une quote-part est une estimation attribuée, pas une mesure individuelle pesée.
3. **Bénéficiaire organisationnel** : affectation de cette même part personnelle à une structure pour **ses statistiques de contribution attribuée**. C'est un champ distinct de la quantité et de sa provenance. **PLAN séparé : aucune interface ou mutation de transfert vers une autre structure n'est demandée dans les lots de cette fonctionnalité IA.** La règle cible, lorsque ce mécanisme sera livré, sera `structure organisatrice canonique de l'action` par défaut, ou `non résolue` si l'identité de cette structure n'est pas fiable. L'utilisateur pourra choisir une autre structure éligible (par exemple son employeur), avec autorisation et historique, sans changer ses propres kg/mégots.

L'agrégat physique `actions.waste_kg` / `actions.cigarette_butts` et les sommes de parts redirigées entre structures sont **deux lectures du même terrain**. Ne jamais les additionner. Le futur tableau de bord des structures devra agréger exclusivement les affectations par bénéficiaire sur une même base, et ne pas cumuler les totaux organisateur bruts avec les parts transférées. La structure organisatrice de l'action reste organisatrice même si elle n'est plus bénéficiaire de certaines parts. Aucune part ne peut être attribuée simultanément à deux bénéficiaires dans la même version effective.

### 12.2. Source actuelle, gel et corrections de parts

**Constat sur `main` au 20/11/2026 :** `action_participants` conserve des mesures individuelles et `allocateActionParticipantImpact` peut calculer `individual`, `quote_part` ou `unavailable`. Les quote-parts sont aujourd'hui des **projections recalculées**, sans preuve d'immuabilité pérenne. Le registre `GAMIFICATION_REGISTRY` classe actuellement les kg et mégots bruts comme `NON_GAMIFIED`. La fonctionnalité de transfert d'une part à une autre structure n'a pas été vérifiée comme `CURRENT` et doit rester `PLAN`.

Pour rendre l'attribution assez stable pour servir à des récompenses, introduire **dans l'owner Actions** un instantané versionné, persisté **à la mutation métier de validation** (et non lors d'un `GET`) : `(actionId, participantId, userId, sourceRevision, wasteKg, buttsCount, provenanceParMétrique, eligibility, validationDate, factorVersions)`. Rechercher d'abord un instantané de preuve durable existant dans le checkout Codex ; si absent, ajouter le strict support nécessaire, protégé server-only et par RLS/grants. Les valeurs et leur identité de version sont **immuables une fois écrites** ; ne pas réutiliser les événements XP comme stockage des faits terrain.

- Prérequis : action finale `approved`, `post_action_complete`, publique, publiée, visible, non annulée et hors `data_provenance=test` ; participation finale `confirmed` ; données finies et cohérentes ; provenance conservée. Une simple inscription future, une présence supposée, un formulaire non validé ou une absence de total ne suffisent pas.
- Calculer les parts depuis **une unique révision cohérente** du bilan et des participants confirmés, en conservant les mesures individuelles revue et en répartissant seulement le reliquat collectif parmi les personnes sans mesure individuelle, conformément à l'owner existant. `null` reste indisponible, jamais zéro inventé. Refuser les totaux individuels supérieurs au collectif et les lectures tronquées/contradictoires. Le nombre de mégots demeure entier dans les attributions figées, avec un mode d'arrondi déterministe conservant exactement le total entier ; la masse conserve une précision contrôlée et le résidu d'arrondi est attribué sans dépassement. Une part collective `quote_part` est **gamifiable en tant que quantité attribuée estimée**, pas renommée « mesure individuelle ».
- Si un bilan, une mesure, un effectif confirmé ou une participation est corrigé après attribution, **ne jamais réécrire l'instantané historique** : une nouvelle révision autorisée devient effective et la précédente est conservée ou invalidée comme preuve historique selon la gouvernance. Les compteurs et badges suivent la révision effective, avec retrait ou réattribution idempotents. « Immuable » signifie la stabilité de l'identité personnelle et de chaque révision validée, **pas** l'interdiction d'une correction justifiée.
- **Actions historiques avant déploiement** : aucun gel rétroactif n’est présumé. Un backfill explicite et idempotent peut figer la **projection à la date du backfill**, avec `backfilledAt`, révision de source effectivement relue et marqueur `HISTORICAL_RECONSTRUCTION`; ne pas prétendre que cette part était immuable lors de la collecte. En cas de source historique ambiguë ou incomplète, conserver `unavailable` et exclure des récompenses, sans extrapolation.
- Dédupliquer par `(actionId, userId, metric)` dans la révision effective. Une personne ne reçoit jamais le total collectif plus sa part personnelle, ni simultanément la part estimée et une mesure individuelle la remplaçant. Un changement de structure bénéficiaire ne touche **jamais** `userId`, `wasteKg`, `buttsCount`, la source, la révision de mesure ou les événements personnels de gamification ; il change uniquement la projection organisationnelle future.

### 12.3. Défi IA cumulatif et contribution des Actions

- **Usages IA privés** : relevés normalisés et dédoublonnés des lots 1 à 3, avec la date de départ et la méthode choisies. Aucune copie des tokens ou des prompts n'est créée par le défi ; les inconnues/exclusions n'entrent pas comme zéros.
- **Un seul défi IA cumulatif actif par compte V1** : état `active|paused|archived`, date, voie hydrique, facteurs scientifiques versionnés, scénario de recyclage, matériaux et curseur. L'historique des corrections d'import et de facteurs est préservé.
- **Collectes personnelles** : somme des parts attribuées de la révision effective de chaque action, comprenant les mesures individuelles qualifiées et les quotes-parts **figées** et étiquetées comme estimées ; distinguer dans l'écran les sous-totaux `individuel_mesuré` et `quote_part_estimée` ainsi que leur somme attribuée. Les collectes restent créditées à l'utilisateur quelle que soit la future structure bénéficiaire, y compris l'entreprise d'un bénévole.
- **Projection environnementale** : mêmes formules conditionnelles que §7 : `B_C_done` et `B_H_done` calculés sur les parts attribuées, en conservant deux voies hydriques incompatibles à sommer. Le mélange matériaux et le recyclage prévu dans le défi restent des hypothèses, **pas des preuves** du traitement de chaque action ; conserver la mention `SCENARIO` et `NA` selon les facteurs disponibles. `C_reste=max(0,C_IA-B_C_done)` et `W_reste=max(0,W_IA-B_H_done)` uniquement pour comparaisons calculables. Les émissions de l'IA ne disparaissent pas physiquement.
- Les nouveaux tokens peuvent augmenter le besoin ; les nouvelles actions peuvent augmenter la collecte ; corrections, annulations et invalidations réévaluent le solde et peuvent faire perdre des paliers. Une part excédentaire reste une quantité terrain historique, pas un crédit carbone revendable. Aucun réservoir séparé de kg, mégots ou XP, ni allocation vers une structure inventée.

### 12.4. Couverture des tokens et exception de gamification

Avec une méthode de référence et une voie hydrique cohérentes :

```
ratio_C = clamp(B_C_scenario / C_IA_scenario, 0, 1)   si C_IA > 0 connu
ratio_H = clamp(B_H_scenario / W_IA_scenario, 0, 1)   si W_IA > 0 connu
ratio_symbolique = min(ratio_C, ratio_H)
T_couverts_symboliquement = floor(T_eligibles * ratio_symbolique)
```

Zéro connu dans un objectif signifie contrainte neutre ; inconnu `NA` ne devient jamais couverture acquise. Les 500 L/mégot ne sont qu'une analogie hydrique. Ces calculs ne prouvent pas une compensation physique.

**Exception de gamification décidée :** autoriser des paliers **personnels**, depuis les seules parts attribuées éligibles des Actions, y compris les `quote_part` figées et identifiées comme telles. **Aucun coefficient XP par gramme ou par mégot.** Les badges de quantités sont valables pour un compte même sans défi IA ; le défi IA réutilise ces mêmes quantités, sans badge ou XP supplémentaire pour la même collecte.

| Famille | Seuils initiaux | Politique proposée | Libellé honnête |
| --- | --- | --- | --- |
| Mégots | 25 / 100 / 500 / 2 000 | Un `XP_MILESTONE` de **+1 XP** par palier atteint, non répétable, avec badge associé | « Mégots retirés, quantité personnelle attribuée » |
| Déchets hors mégots | 1 / 5 / 25 / 100 kg | Un `XP_MILESTONE` de **+1 XP** par palier atteint, non répétable, avec badge associé | « Déchets collectés, quantité personnelle attribuée » |
| Tokens couverts symboliquement | 1 M / 10 M / 100 M | `BADGE_ONLY`, **0 XP**, privé et lié au défi IA | « Couverture symbolique selon scénario » |

Les seuils et +1 XP sont des **choix produit**, non des valeurs scientifiques ou des mécaniques actuellement intégrées. Total maximum initial : 8 XP des paliers de collecte par compte, sauf évolution explicite du catalogue. Les paliers de collecte restent privés par défaut et ne doivent jamais produire de classement de volumes ni un avantage de permissions.

**Révision nécessaire du contrat existant :** le signal `NON_GAMIFIED` de conversion **directe** du poids/mégots total collectif en XP demeure interdit ; ajouter une exception ciblée aux paliers sur **parts personnelles figées et finalisées**, avec identité stable, version de règles, preuve de source et réconciliation existante de `progression_events`/badges. Ne pas réutiliser les compteurs MOHS de l'action comme attribution personnelle. Une annulation ou une correction retire le palier et l'XP correspondante via la réconciliation ; une affectation future à une autre structure ne provoque **aucun** nouvel événement utilisateur. Les lectures sont strictement sans effets secondaires.

**Sécurité et confidentialité :** owner Clerk, server-only pour révisions et données privées, RLS/grants, contrôle des rôles sur les mutations des faits Actions ; tests de deux comptes et de source falsifiée. Aucune écriture terrain depuis le calculateur IA. Les badges de tokens restent privés, sans exposition publique des usages, et seules les actions éligibles contribuent au défi ou aux récompenses.

### 12.5. Affectation à une structure : contrat d'évolution, non implémenté ici

**PLAN séparé** : après le gel de la part personnelle, `beneficiaryOrganizationId`/type de structure devient une affectation distincte, par défaut la structure **organisatrice canonique**, avec révisions d'affectation et droit explicite du participant de choisir une autre structure (entreprise ou association). En cas d'organisateurs multiples ou d'identité organisationnelle non résolue, ne pas deviner le bénéficiaire ; utiliser le propriétaire métier canonique s'il existe, sinon `NA` jusqu'à qualification. Une affectation n'ajoute ni masse ni mégot à l'environnement : elle distribue uniquement le **compte organisationnel** d'une part personnelle existante. Les totaux publics physiques d'Actions restent inchangés, mais les compteurs de contribution par structure devront, quand cette capacité existera, lire **une seule destination effective par part**, pas les totaux bruts de l'action plus les parts redistribuées. Une attribution à l'employeur ne retire pas le badge personnel ; une structure ne peut pas s'approprier l'identité ni modifier la masse attribuée.

Ne pas ajouter de transfert de structure, de table d'allocations organisationnelles, de sélecteur ou de notification dans les lots « Mon empreinte IA ». Un prochain lot autonome, après vérification du propriétaire des structures et de leurs statistiques, portera cette capacité.

## 13. STOP scientifique révisé

**Calculable avec statut approprié :** tokens vers scénarios énergie/CO₂e/eau ; facteur de pollution conventionnel `500 L/mégot`, séparé des économies d'eau **consommée** ; émissions potentielles d'une filière de déchets recyclés et incorporés suivant ACV ; scénario fournisseur de recyclage de mégots `3,5 g CO₂ déclaré/mégot` identifié, hypothétique et non audité ; curseur d'effort fondé sur les contributions réellement connues, avec cas limites et `NA`.

**Non prouvés et à ne pas facturer comme crédits :** compensation réelle de l'empreinte IA, bénéfice net d'eau généralisé du recyclage, économie de traitement d'eau par mégot, CO₂ évité par mégot froid au titre de la prévention des incendies, bénéfices de filière sans transfert réel ni contrefactuel, additionalité et non-double comptage de crédits entre acteurs.

**Invariants :** chaque carte eau/carbone présente séparément les contributions possibles des déchets et des mégots ; les composants partiels ou incompatibles ne s'additionnent pas ; `p=1` peut présenter un **scénario climatique de mégots recyclés**, `p=0` peut présenter un **scénario d'eau consommée économisée par recyclage de matériaux** seulement si facteurs d'eau compatibles existent. Les extrêmes ne sont plus automatiquement déclarés impossibles dans tous les cas. La case recyclage est une hypothèse de destination, jamais une preuve physique.

**Condition de clôture :** deux thèmes d'objectifs **issus des tokens** et contributions croisées sans fausse égalité entre litres d'eau consommée et litres de risque ; provenance explicite, UI accessible, fiches Apprendre et questions Quiz alignées, aucun moteur métier ou crédit parallèle.


## 14. PLAN : entraînement des modèles, simulations d'allocation et impacts non compensables

**Périmètre strict :** extension pédagogique de `/learn/empreinte-ia` par le lot `12_POST_LOT_11_ENTRAINEMENT_MODELES_IMPACTS.md`. Les coûts de développement, pré-entraînement, post-entraînement, fine-tuning, distillation, expérimentation, évaluation et fabrication **ne sont pas ajoutés** aux résultats individuels, au défi IA, aux émissions opérationnelles, au calcul des mégots/déchets, aux budgets, ni aux badges. Aucune dette d'entraînement personnelle n'est créée.

### 14.1. Registre de preuves lié au modèle canonique

Prolonger la lecture canonique `apps/web/src/lib/environmental-impact-estimator/model-catalog.ts`, sans deuxième moteur ni renommage de ses IDs. Prévoir, pour les modèles documentés uniquement, des **enregistrements facultatifs** de preuves de phase :

- `modelId` exact et `modelVersion` ; `phase=pretraining|post_training|fine_tuning|distillation|quantization|research|evaluation` ; `recordId`, `revision`, `publishedAt`, `sourceUrl`, `sourceKind=paper|model_card|operator_disclosure|other` ; `proofStatus=OBSERVED|DERIVED|ASSUMPTION|PROXY|NA`.
- `trainingEnergyKwh|null`, `energyBoundary=gpu_dynamic|it_total|facility_total|peak_capacity_estimate|unknown`, `energyMethod`, `pueIncluded`, `coverageNotes`. La conversion de GPU-heures en kWh à partir d'une **puissance de pointe** constitue une **estimation nominale**, pas une mesure instrumentale. Ne pas additionner sans preuve les mêmes phases ou les modèles d'une même famille.
- `locationBasedKgCo2e|null`, `marketBasedKgCo2e|null`, `carbonBoundary`, `waterConsumedLiters|null`, `waterWithdrawnLiters|null`, `trainingTokens|null`, `trainingTokenSemantics`, `lineage`, `benchmarkId`, `benchmarkConditions`, `score`. Une annonce contractuelle « zéro net » n'efface pas les émissions physiques location-based.
- Un entraînement de famille (ex. « tous les modèles Llama 3.1 ») ne devient pas le coût d'une version 8B, et une publication ne permet pas de déduire des valeurs d'un autre modèle non publié. Les données partielles s'affichent avec leurs statuts, les champs inconnus restent `NA`.

### 14.2. Comparaison individuelle : **énergie contre énergie**, jamais tokens contre énergie

L'unique ratio présenté comme « l'énergie nécessaire à l'entraînement est environ X fois celle de votre utilisation » est :

```text
R_E = E_train_match[kWh] / E_user_match[kWh]
```

Conditions simultanées :

1. `modelId`/version de l'usage réellement liés au `modelId`/version de la preuve, ou relation exacte clairement établie pour une phase de version ; aucun regroupement arbitraire par éditeur ou « type » ; pas de fusion des usages d'autres modèles.
2. `E_train_match` et `E_user_match` positifs, finis, exprimés en kWh, avec **frontières compatibles** (`IT ↔ IT` ou `facility ↔ facility`), ou conversion de frontière justifiée et tracée, **sans double PUE**. Une valeur `gpu_dynamic` ne constitue pas automatiquement toute l'énergie IT ; une estimation `peak_capacity_estimate` doit être identifiée comme hypothèse nominale.
3. Si le modèle d'inférence utilisateur est inconnu, si seule une catégorie « ChatGPT » est connue, si l'usage mélange plusieurs modèles sans ventilation, ou si l'énergie utilisateur est `NA`, **ne pas calculer le rapport par modèle**.
4. Si les deux énergies reposent sur des proxys documentés et des hypothèses compatibles, autoriser `R_E` avec la mention **« scénario indicatif, non mesuré »**, source de chaque terme et sensibilités, jamais le présenter comme valeur observée. Un facteur énergétique générique non calibré ne devient pas le coût réel d'une inférence sur BLOOM, GPT ou Llama.
5. Le libellé par défaut est « L'énergie publiée/estimée pour entraîner **ce modèle et cette phase** représente environ X fois l'énergie **estimée de votre utilisation de cette version**, selon ces hypothèses. » Montrer dans le détail `E_train / E_user`, unités, phase, modèle, période, opérateur et frontière. Si valeurs non compatibles, `NA` et lien vers « Comprendre les modèles ».

**Interdiction sémantique :** `T_train / T_user` compare deux **volumes de tokens**, pas les consommations électriques, CO₂e, eau ni une « pollution X fois supérieure ». Les tokenizers, pré-entraînement à grande échelle, répétition de passages et modalités peuvent différer ; si les deux tokens existent, créer au besoin un indicateur auxiliaire explicitement intitulé « comparaison de volumes de tokens sans portée environnementale ». Ne jamais utiliser cet indicateur comme calcul de l'empreinte.

### 14.3. Répartition théorique sur les personnes et durée de retour énergétique

Simulateur volontaire, en dehors du suivi personnel :

```text
E_train_par_personne  = E_train / U                          [kWh/personne]
E_train_par_personne_jour = E_train / (U × D)                [kWh/personne/jour]
D_egalite_flotte = E_train / (U × E_inf_par_personne_jour)  [jours]
D_egalite_personnelle = E_train / E_inf_personnelle_jour   [jours]
```

`U` : **hypothèse** de nombre de personnes utilisant cette version du modèle, et non chiffre déduit du nombre total d'abonnés à une application multi-modèles. `D` : durée supposée d'activité. `E_inf_par_personne_jour` : énergie d'inférence par jour de la même version, même frontière, sans réintégrer l'entraînement. Si zéro ou inconnu, `NA`. Les deux valeurs de jours représentent respectivement une flotte hypothétique et une seule personne : elles ne doivent pas être confondues. La « dilution » comptable ne réduit pas l'énergie historique de formation du modèle et ne signifie pas que la pollution a disparu.

Les seuils peuvent être calculés en CO₂e **séparément**, mais uniquement à périmètres compatibles et à intensités carbone explicites ; **ne pas** remplacer un seuil d'énergie par un seuil carbone. L'eau d'entraînement est `NA` en l'absence de données directement attribuables.

### 14.4. Usage Chat, document et agent

Ces trois parcours sont des **profils de composition d'opérations**, pas des multiplicateurs d'énergie. Les mêmes owners des lots 0 à 3 normalisent appels, tokens, modèles, images, outils et sessions.

- Chat : nombre de tours, entrées, sorties, cache/raisonnement et éventuellement contextes longs.
- Document : génération, révisions, recherches, traitements annexes effectivement instrumentés ; aucune conversion implicite de « page générée » en joules.
- Agent de code : appels multiples, alternances de modèles, appels d'outils et tests locaux mesurés si disponibles. Pas de multiplication énergétique par « agent » en l'absence de traces.

Les simulations de profils ne servent qu'à montrer **comment** les usages changent, avec un scénario modifiable, pas à profiler une personne depuis son intitulé d'application. Ne pas additionner une estimation par tokens et une estimation par durée pour la même opération.

### 14.5. Versions et bénéfice environnemental d'une amélioration

Distinguer `new_pretraining`, `continued_pretraining`, `fine_tuning`, `distillation`, `pruning`, `quantization` et `model_replacement`, avec filiation **uniquement prouvée** et coût de phase associé. La version nouvelle ne remplace pas rétroactivement les dépenses des versions antérieures.

```text
Delta_E_par_tache = E_ancien_par_tache - E_nouveau_par_tache
N_amortissement = E_developpement_incremental / Delta_E_par_tache
```

`N_amortissement` est calculable seulement si `Delta_E_par_tache > 0` et si l'énergie supplémentaire de développement est documentée, les tâches comparables, la qualité au moins acceptable et la frontière identique. Sinon `NA` ou « pas de gain énergétique sur ce scénario ». Les benchmarks utilisent même version/dataset/protocole, et ne permettent pas à eux seuls de conclure sur la dépense énergétique, la qualité métier ou l'empreinte totale. Tenir compte séparément de l'effet rebond et de l'augmentation potentielle des usages.

### 14.6. Faits non compensables et liens pédagogiques

Documenter sans faux coefficient individuel : conditions de l'annotation humaine et de la modération ; fabrication des accélérateurs et extraction de ressources ; conflits d'usage d'eau et électricité, effets territoriaux ; bruit des datacenters et nuisances possibles ; déchets électroniques ; émissions location-based vs market-based ; limites du compensationnisme et de la simple collecte. Les nuisances locales ou sociales n'ont pas d'équivalent de ramassage de mégots/kg.

**Point de vérité :** `13_SOURCES_ENTRAINEMENT_ET_EXEMPLES.md` est un document de recherche pour Codex, `documentation/product/SCIENTIFIC_PROTOCOL.md` et les fiches `CURRENT` demeurent les contrats publiés après intégration. Le lot `12` ajoute les preuves et l'UI ; le complément `10` enrichit le quiz existant en réutilisant ces contenus. Les comparaisons d'entraînement et les simulations de répartition sont strictement **non gamifiées**.

## 15. Extension B2B : preuve d'engagement salarié et valorisation professionnelle (PLAN)

### 15.1. Frontières comptables et vocabulaire

Les trois comptabilités suivantes restent étanches :

1. **Empreinte IA** : émissions et consommation d'eau estimées pour l'usage IA, principalement en `PERSONAL_AI_USAGE`, avec `NA`, méthodes et hypothèses. Un export professionnel séparé n'est pas l'empreinte de toute l'entreprise, encore moins un BEGES officiel.
2. **Fait physique de terrain** : quantités validées et non duplicables `actions.waste_kg` et `actions.cigarette_butts`, puis part personnelle effective figée par révision au lot 11. Les parts constituent une attribution statistique de la même collecte, pas une nouvelle dépollution.
3. **Reconnaissance organisationnelle et mobilisation** : l'entreprise peut documenter des participations partagées, puis recevoir éventuellement une affectation exclusive des kg/mégots d'un participant. Une présence valorisée n'est pas un transfert de la contribution et ne crée aucune nouvelle quantité physique.

Les bénéfices de recyclage ACV, les 500 L/mégot et les scénarios de couverture symbolique de l'IA demeurent des **indicateurs distincts**. Ils ne se soustraient jamais au bilan d'émissions d'une entreprise, ne deviennent pas des crédits carbone et ne prouvent aucune neutralité numérique. Une entreprise ne peut pas déclarer « x tonnes de CO₂ compensées par nos salariés » sur cette base.

### 15.2. Données, rôle du salarié et accord de partage

- Un salarié détient sa preuve de participation et sa part personnelle indépendamment de son contrat de travail et de la structure bénéficiaire. Son employeur n'acquiert pas de droits sur ses déclarations IA, factures, prompts, révisions, besoins de collecte, résultats du défi et autres informations privées.
- Par défaut, **aucun partage**. Deux actes distincts : `partager une attestation ou une sélection de participations` et `affecter la quantité attribuée à un bénéficiaire organisationnel`. Le premier n'entraîne jamais le second. Un compte doit pouvoir présenter un dossier à sa hiérarchie sans donner sa part à l'entreprise. L'accord de partage est granulable, daté, lié à une audience ou un destinataire, révocable, et n'autorise ni suivi RH ni scoring d'individus.
- Un employeur ne reçoit pas de relevés de tokens individuels automatiquement, même quand il finance l'IA. Un éventuel indicateur IA d'organisation doit utiliser une **source professionnelle autorisée** distincte, ou des données volontairement partagées après vérification du cadre légal et des limites d'agrégation. Ne jamais assimiler consentement de salarié et base légale automatiquement valable en raison du déséquilibre employeur-salarié.
- Les attestations CleanMyMap identifient ce que la plateforme a vérifié ; l'attestation associative officielle reste un modèle vierge à signer par le représentant habilité. Une exportation n'est ni une signature électronique d'une association, ni une certification carbone, ni un reçu de don.

### 15.3. Affectation unique au bénéficiaire, non au détenteur

Pour chaque couple `(actionId, participantUserId, metric)` avec une part valide sur une révision effective, définir séparément une **affectation** et un **état de partage**.

- `personalQuantity` et `personalSourceRevision` restent dans l'owner Actions. Par défaut, le bénéficiaire est la **structure organisatrice canonique** si elle est identifiée sans ambiguïté et éligible ; sinon `UNRESOLVED`, pas une société déduite d'un nom libre.
- `selectedBeneficiary` ne peut prendre effet qu'après choix exprès du participant et vérification d'identité et de droits de la structure bénéficiaire. Une demande non vérifiée est `PENDING` et ne modifie pas le bénéficiaire effectif. Possibilité de revenir à l'organisateur ou de retirer son affectation sous les mêmes garde-fous.
- Une seule affectation effective par part et par révision, avec historique append-only de changement de bénéficiaire et correction transactionnelle. Les totaux des structures sont une **partition des parts attribuables**, jamais le total de l'action PLUS la somme de ses participants. Les kg/mégots non attribuables restent `NA` ou `non répartis`, jamais une part inventée.
- Le nombre de participations d'une équipe peut être affiché à titre de mobilisation quand le partage l'autorise, **sans** crédit de kg/mégots si la quantité reste affectée à une association. Une affiliation salariée n'implique ni présence confirmée ni transfert automatique. La structure organisatrice conserve son rôle historique même si une quantité est attribuée à une autre structure.
- La mutation d'affectation n'altère en aucun cas `personalQuantity`, l'action source, les instantanés de preuve personnelle, les badges et l'XP. Une correction source produit la nouvelle révision effective et recalcule les agrégats organisationnels ; le passé reste auditable.

### 15.4. Rapports, financement et prétentions autorisées

Un rapport professionnel doit afficher période, périmètre, source/révision, nombre d'actions, nombre de personnes distinctes partageantes, distinction entre présence confirmée et quantité attribuée, kg et mégots **non double comptés**, part mesurée ou estimée, taux de couverture, exclusions, corrections, organismes organisateurs et bénéficiaires, dates de génération, limites méthodologiques et éventuel statut périmé.

Si des coûts sont rapportés, les stocker et afficher séparément comme **dépenses déclarées et justifiées selon la pièce disponible** : financement promis / versé / dépensé / justificatif contrôlé / inconnu. Ne pas convertir les euros en émissions évitées, en heures de bénévolat ou en impact sans méthode sourcée ; un budget ne prouve pas la réalisation. Distinguer prestation commerciale, don, subvention et mécénat ; le système ne délivre **aucun reçu fiscal** ni affirmation de conformité réglementaire.

Pour les communications externes : « 12 salariés ont participé à 3 actions confirmées » si le partage et les preuves le permettent ; « 45 kg attribués à notre structure » seulement si les affectations effectives le démontrent. Interdire « 45 kg supplémentaires ramassés par l'entreprise » si ces 45 kg sont une partie de la collecte de l'association, « IA compensée / neutralisée », « eau restaurée », « réduction garantie de facture d'eau » et « certification carbone CleanMyMap ».

### 15.5. Risques, garde-fous, preuves

- L'identité de la structure et les permissions de ses représentants doivent être **prouvées**, et non présumées depuis un domaine e-mail, une fiche publique, une invitation générique ou un rôle administrateur CleanMyMap. Ne pas réutiliser une surface de revue admin comme espace entreprise ordinaire.
- La portée de visibilité est `owner-only` par défaut ; toute ouverture repose sur une sélection explicite, une audience et des droits. Exports partagés limités et révocables ; un PDF déjà téléchargé ne peut pas être effacé à distance et doit mentionner sa date et un statut de validité consultable. Ne jamais ajouter de pseudonymisation faible qui exposerait des salariés par de très petits groupes.
- RLS/grants et contrôle serveur pour Clerk, liaison et retrait d'une structure, gestion des accès, double rôle, anti-IDOR, jetons de partage, révocation, abandon d'une entreprise, départ salarié, correction/annulation et concurrence. Les routes publiques d'Actions et de rapports ne deviennent pas des voies alternatives pour lire les données privées.
- Les règles de conformité dépendent du contexte. Le cadre BEGES/CSRD peut imposer un reporting à certaines entreprises mais **n'impose pas une empreinte numérique nulle**. Une estimation CleanMyMap n'est pas un audit, une attestation signée par un tiers ou une vérification indépendante.

Références, exemples de messages, matrice des preuves et critères de pilote : `17_CADRE_RSE_REGLEMENTATION_PILOTE.md`, document d'accompagnement de cette extension. Les contrats CURRENT restent gouvernés par les fichiers réels du dépôt et seront mis à jour par Codex lors des lots 14 à 16.


## 16. PLAN : sensibilité OpenAI, trois niveaux d'impact et destination des déchets

Références détaillées `19_SCENARIOS_OPENAI_15_MILLIARDS_ET_FIN_DE_VIE.md` (formules et fixtures) et `20_SOURCES_IA_ELECTRICITE_RECYCLAGE_ET_PREUVES.md` (provenance et bornes de validité). Ce chapitre prolonge les §§3-9 sans modifier rétroactivement les exemples versionnés. À implémenter dans le moteur existant au lot 0 + 08 pour les scénarios, puis dans les projections métier et surfaces au lot 18. Les lots 11 et 15 demeurent propriétaires respectivement des parts personnelles et des affectations organisationnelles.

### 16.1. Trois familles distinctes, aucun solde global

1. **EMPREINTE_IA** : tokens déclarés/importés, énergie IT/site, carbone opérationnel et eau directe/indirecte/total avec frontière, provenance, région réelle si connue, `NA` sinon. L'entraînement reste seulement pédagogique et n'est jamais ajouté au compte personnel. La quantité de tokens n'est ni une énergie ni une mesure d'émissions.
2. **BENEFICES_ENVIRONNEMENTAUX_TERRAIN** : masses et mégots réellement attribués, types de déchets, destination connue ou inconnue, quantité réellement réincorporée, bénéfice carbone ACV **conditionnel** lorsque la filière et son contrefactuel sont justifiables, risques de pollution hydrique et de fragmentation (unités/proxys séparés), propreté mesurée avant/après lorsque disponible, biodiversité sans animaux « sauvés » inventés. Les événements matériels peuvent être documentés même sans recyclage ou crédit CO₂e.
3. **BENEFICES_HUMAINS_TERRITORIAUX** : participants et actions uniques, activité physique réellement déclarée, ateliers tenus, présence vérifiée, retour et engagement réitéré. Le lien social, la santé gagnée et la démonstration par l'exemple ne possèdent pas de coefficient causal numérique par défaut : ils sont documentés comme activités et observations, avec `NA` pour les effets non mesurés. Ne pas collecter d'information médicale sensible pour donner un badge.

Ces trois familles forment une navigation et un rapport, **pas une addition en unités incompatibles**. L'allocation personnelle des Actions reste indépendante de l'affectation à l'employeur ou à l'association. Les badges terrain prévus au §12 ne sont pas multipliés par le nombre de dimensions présentées ; aucun nouveau barème XP dans ce complément.

### 16.2. Cas OpenAI : 15 milliards de tokens Codex, provenance à vérifier

- `T=15_000_000_000` est une **déclaration utilisateur**. Ne pas décider sans preuve s'il désigne les tokens de sortie générés seulement ou tous les tokens d'activité ; si « sortie seulement », l'entrée et les traitements par outils sont incomplets. Ne jamais reconstruire automatiquement `T_total` à partir d'un prix.
- Les trois `a` non calibrés du §3 valent `0,06 / 0,30 / 0,60 kWh IT/10^6 tokens`; `PUE=1,15` hypothétique. Cela donne respectivement `1 035 / 5 175 / 10 350 kWh site`, **facteur dix entre extrêmes**. Aucune borne statistique « 95 % » ni facteur vérifié OpenAI ne découle de cette sensibilité.
- Pour `I_US=0,35 kgCO₂e/kWh` (proxy américain non localisé), `C=362,25 / 1 811,25 / 3 622,5 kgCO₂e`. Pour `I_FR=0,0200 kgCO₂e/kWh` de consommation 2025 RTE (scénario régional **non attribuable à OpenAI**), `C=20,70 / 103,50 / 207,00 kgCO₂e`. Comparer des scénarios à énergie identique, pas des émissions réelles d'OpenAI.
- À `4,52 L/kWh` d'eau **indirecte d'électricité américaine** seulement, `W_indirect=4 678,2 / 23 391 / 46 782 L`. `W_direct=NA` et `W_total=NA`. Ne pas appliquer ce WUE à un site français ou à des sites dont le refroidissement, le mode d'approvisionnement et la frontière sont inconnus.
- Selon le texte de Sam Altman de juin 2025, requête ChatGPT moyenne : `0,34 Wh` et `0,000085 gallon US` d'eau (environ `0,322 mL`). Le périmètre, le modèle, le nombre de tokens, la méthode de mesure et l'équivalence pour Codex ne sont pas publiés avec ces chiffres. **Interdiction de les diviser ou de les multiplier par `T` pour estimer Codex.** La référence GPT-4o environ `0,3 Wh/requête` rapportée par OpenAI Academy reste indépendante et limitée au type de requête évalué.
- Les messages OpenAI `input_tokens`, `cached_tokens`, `output_tokens`, détails de raisonnement et coûts sont des métriques de consommation/facturation et de comportement, pas des instruments énergétiques. Les tokens de raisonnement comptés dans les outputs ne sont pas additionnés une seconde fois. Documenter fournisseur, modèle et période ; région réelle, carbone et eau attribuables = `NA` si non publiés.

### 16.3. Électricité nucléaire/renouvelable et analyse climatique

L'intensité carbone dépend des productions mobilisées sur le réseau à la période et au lieu du calcul. Électricité nucléaire et renouvelable peuvent réduire fortement les émissions opérationnelles comparées à un mix fossile, **sans annuler** l'énergie consommée, la consommation d'eau, le besoin en matériel ou les impacts ACV du nucléaire/renouvelable. Le PUE, l'utilisation GPU et la longueur des opérations agissent sur le numérateur kWh, tandis que le mix agit sur les émissions par kWh.

Distinguer `location_based` (facteur du réseau concerné) et `market_based` (instruments d'achat/attributs environnementaux), conditions temporelles et géographiques, contrats d'achat, renouvelables additionnelles vs certificats. Ni contrat nucléaire/renouvelable ni implantation annoncée ne démontrent que **cette requête Codex** a été alimentée à une heure et une région données. L'existence d'un datacenter « vert » n'autorise aucun remplacement silencieux du facteur réel par zéro.

### 16.4. Destinations et rendements : incorporation, incinération, stockage, inconnue

Par catégorie `i`, conserver `M_i` [kg] attribuée à la collecte, `destination` connue ou inconnue et éventuellement `r_i` part dirigée au recyclage puis `z_i` part de ce flux réellement réincorporée (fractions de 0 à 1) ; le rendement global `y_i=r_i*z_i`. Ne pas attribuer `70 %` aux catégories sans source observée : `0,70` reste une hypothèse illustrative de `19`. Une masse non typée ou non suivie ne devient pas recyclée par défaut.

```text
M_reincorp_i = M_collectee_i * r_i * z_i
B_C_recyclage_i = M_reincorp_i * f_C_BNR_i  [kgCO2e potentiels nets, conditionnels]
```

Les facteurs ADEME 2021 par kg **de MPR incorporée** sont `2,702 plastique moyen`, `6,407 aluminium`, **`1,948 verre`** ; la valeur de verre `0,948` est erronée et ne doit subsister dans aucun facteur CURRENT, fixture ni copie d'écran. Ils dépendent d'un contrefactuel et des filières : sans destination ni traçabilité, afficher `NA` comme bénéfice réel tout en autorisant un résultat de simulation identifié.

Pour les autres destinations :

- `INCINERATION_SANS_VALORISATION` : pas d'incorporation, donc **zéro bénéfice ACV de recyclage sur cette masse**, mais **émissions du traitement = NA** sans données locales, et jamais « zéro émission ».
- `INCINERATION_AVEC_VALORISATION` : même absence d'incorporation, émission directe de combustion (dont CO₂ fossile si plastique), capture éventuelle et énergie utile à quantifier ; bilan net relatif à une technologie remplacée et au mix électrique/chaleur doit être documenté dans une ACV distincte. En l'absence de données, **bénéfice net climatique = NA**, et non valeur ADEME ou bénéfice garanti.
- `STOCKAGE/ENFOUISSEMENT`, `REEMPLOI`, `TRAITEMENT_SPECIALISE`, `DESTINATION_INCONNUE` : documenter sans détourner vers les coefficients recyclage ; différences chimiques/biogènes/émissions de CH4 possibles selon matière et conditions. Les produits dangereux sont hors collecte bénévole gamifiée.

Une collecte qui évite la dispersion dans un milieu naturel peut donc avoir un bénéfice de propreté et une réduction plausible d'exposition animale/microplastique **même si ses déchets sont incinérés**, mais sa contribution carbone issue du recyclage sera nulle pour les quantités non réincorporées et son bilan net complet `NA`. Ne pas annoncer « kgCO₂e évités » ou « matière recyclée » pour une masse seulement ramassée ou mise en bac de tri.

### 16.5. Mégots recyclés et vérification du seuil d'environ 20 %

Le scénario fournisseur optionnel `f_b=63/18 000=0,0035 kg CO₂ déclaré/mégot` n'est ni un facteur d'incinération ni une ACV vérifiée. Seule une filière de recyclage de mégots explicitement sélectionnée **en simulation** ouvre ce terme. En provenance observée, il faut documenter effectivement le prestataire et le traitement. **L'opération de cocher une case est une hypothèse, pas une preuve**.

```text
k_C(p) = 9,9*(1-p)*(Σ q_i*y_i*f_C_i) + 380*p*f_b
H_C(p) = C_IA_scenario/k_C(p)    si k_C > 0
M(p) = 9,9*H_C(p)*(1-p)
N(p) = ceil(380*H_C(p)*p)
Gain_relatif_effort = (H_sans - H_avec)/H_sans
```

Pour `15 milliards`, `C=1 811,25 kgCO₂e`, `q=(0,5;0,1;0,4)`, `y_i=0,70` et `p=0,80` : `H_sans=471,6223 h`, `H_avec=369,3062 h`, soit **21,695 % de moins** ; `M=933,812 kg` sans vs `731,226 kg` avec ; `N=143 374` sans vs `112 270` avec. Pour `p=0,20` : `117,9056 -> 115,8987 h`, soit **1,702 % de moins**. **Ce pourcentage n'est pas universel** ; il varie avec `p`, `y_i`, `f_b`, le mix et l'existence d'une filière. Ce ne sont pas des crédits carbone émis ou annulés. Le scénario eau basé sur `500 L/mégot` reste une voie pédagogique `RISQUE_CONVENTIONNEL`, non une compensation d'eau consommée.

### 16.6. Déchets à enjeu particulier et santé/territoire

Les filtres de mégots et fragments plastiques peuvent être une source de microplastiques ; distinguer ceux-ci des particules fines aériennes `PM2.5`. Les sachets de nicotine/snus ne sont pas des mégots et n'héritent d'aucun de leurs facteurs. Matériaux à risque pour animaux (fils/filaments, hameçons), verrerie brisée, petits déchets non dangereux à proximité de l'eau : suivi par **catégorie de risque et quantité documentée**, sans coefficient inventé d'animaux « sauvés ». Seringues, piles endommagées, solvants et autres objets dangereux : signalement ou équipe formée, jamais incitation à la prise manuelle ni badge au volume.

Minutes d'activité physique observées ne sont pas équivalentes à une amélioration causale de santé ; nombre de participants ne prouve pas la création de lien social ; une action visible ne démontre pas seule un changement durable de comportement. Le produit peut compter des actions, des suivis de site et des ateliers réalisés ; toute amélioration sanitaire, biologique ou sociale chiffrée exige une méthodologie et des données indépendantes.

### 16.7. Contrat de versionnement, affichage et clôture

Chaque indicateur doit posséder un ID stable, `value` ou `NA`, `unit`, `scope`, `evidenceStatus`, `sourceId/url`, `factorVersion`, `collectionRevision`, `beneficiaryRevision` lorsque pertinent, `scenarioId`, `observedOrAssumed`, `computedAt` et une raison d'indisponibilité. Les chiffres terrain n'ont pas à être associés à une saisie de tokens. La lecture ne crée pas de faits et n'autorise pas une personne à créditer une masse collective une deuxième fois. En cas de correction d'une Action, reconstruire les projections depuis la nouvelle révision selon le contrat métier existant, sans réécrire l'historique.

**STOP scientifique :** aucune donnée inconnue convertie en zéro, aucun facteur recyclage appliqué à l'incinération, aucune différence « -20 % » annoncée hors scénario prouvé et aucune addition des trois familles en une unité de neutralité.


## 17. PLAN : alternatives de modèles IA à qualité comparable et comparaison avant/après

**Owner :** `apps/web/src/lib/environmental-impact-estimator/` et catalogue `model-catalog.ts` ; parcours `/learn/empreinte-ia`. Le lot d'intégration est `21_POST_LOT_18_ALTERNATIVES_MODELES_IA.md`, références `22_SOURCES_METHODO_ALTERNATIVES_IA.md`. **Statut : PLAN, aucun calcul ni recommandation déjà déployés.** Les notions de modèle, hébergeur, espace comptable et estimation physique restent celles du moteur CURRENT, sans création de moteur d'empreinte parallèle.

### 17.1. Contrat strict de substituabilité

- Un candidat n'est comparable que si le **mode d'exécution est identique** : `cloud_api -> cloud_api` ou `local_device -> local_device`. Une option `local_self_hosted` du catalogue n'implique pas `local_device` si le calcul est en réalité sur une machine distante. Jamais de substitution implicite d'opérateur, de compte ou de région ; un hébergement candidat cloud peut être différent si l'utilisateur autorise explicitement le changement de fournisseur et comprend les conséquences.
- Correspondance métier obligatoire : même modalité, langue, plage de contexte utilisable, capacités réellement requises (outils, JSON structuré, images, code, autonomie agentique, raisonnement, sécurité, quotas), disponibilité à la date de la recommandation et droit d'usage. Le modèle doit fonctionner sur le matériel disponible en local (RAM/VRAM, quantification, runtime, énergie mesurée sur machine adaptée) ou être accessible via une API cloud réelle. Modèle non disponible, déprécié, inconnu ou hors contraintes => exclu.
- Une valeur totale de `15 milliards de tokens Codex` sans ventilation par modèle/version, entrée/sortie/cache/raisonnement, tâches et opérateur ne détermine **aucun candidat vérifié** ni gain énergétique modèle à modèle. Montrer un chemin pour ventiler les données et l'absence de preuve, jamais une alternative inventée.

### 17.2. Comparabilité des performances

- Comparer d'abord des résultats sur des **tâches équivalentes** : chat de difficulté donnée, documents longs avec contraintes de format, génération/revue de code agentique avec tests, recherche outillée, raisonnement, image/audio/vidéo si utilisés. Une performance proche en MMLU ou dans un chat ne prouve pas l'équivalence en résolution d'issues GitHub ni en appels d'outils.
- Chaque comparaison documente : `benchmarkId/version`, source, date, jeu de tâches, langue, scores, unité et sens, variance si disponible, échantillons, température/effort de raisonnement, longueur de contexte, budget de tokens/temps, outils, nombre de tentatives, règle de succès et limites de contamination. Un résultat marketing isolé ou un benchmark non comparable n'autorise pas le badge « recommandé ».
- **Tolérance produit proposée, non résultat scientifique :** la qualité ne descend pas de plus de 3 points de pourcentage absolus pour un indicateur de succès bien défini, et aucune exigence bloquante (tests, sécurité, conformité, format, fonctionnalité, vie privée) ne régresse. Pour une tâche sans taux de succès en %, utiliser le critère métier défini pour le jeu de tâches, pas une transposition numérique. Si les incertitudes/tailles d'échantillon ne permettent pas de conclure, qualité comparable = `NA`. Une validation par l'utilisateur reste nécessaire avant une substitution réelle.
- Pour les agents, comparer **énergie par tâche réussie**, en tenant compte des tentatives et du surcoût des appels d'outils lorsque mesurables, plutôt que seulement les joules par token. Pour tout type d'usage, un benchmark de laboratoire ne démontre pas automatiquement le comportement d'une plateforme commerciale complète.

### 17.3. Preuves physiques et classement prudent

- Priorité 1 : mesures directes `Wh par tâche ou requête` couvrant **la même frontière** (GPU uniquement, IT complet, site/PUE) et le même protocole de charge, modèle/version, hardware, déploiement, précision et batching. Les mesures locales doivent être réalisées sur une machine comparable et inclure si possible CPU, GPU, RAM et éventuel surcoût de fonctionnement à vide.
- Priorité 2 : estimation indirecte sous **un protocole identique et versionné** (EcoLogits / modèle physique ouvert avec paramètres disponibles), explicitement `PROXY`. Un même coefficient générique `0,30 kWh/million de tokens` appliqué à deux modèles ne démontre pas un gain modèle-spécifique.
- `AI Energy Score` (Hugging Face) est pertinent pour une comparaison énergétique **GPU par tâche sur matériel/protocole identiques**, mais ce n'est pas une mesure de la consommation électrique réelle d'une API OpenAI/Anthropic/Google, ni des coûts CPU/PUE/réseau. `MLPerf Power` mesure des systèmes dans leurs propres charges et configurations ; ne pas recopier des ratios de deux systèmes différents sans alignement. Les limites documentées sont détaillées dans `22`.
- Le gain relatif pour une charge comparable est `g_E = 1 - E_apres / E_avant` si `E_avant > 0`, `E_apres` et `E_avant` ont **même unité, même frontière et même protocole**. Une politique d'affichage initiale exige `g_E >= 0,30` (réduction d'au moins 30 %) **pour qualifier « nettement plus sobre »**, et robustesse statistique/ranges compatibles avec cette conclusion ; ce seuil est **éditorial**, pas une frontière scientifique. Un gain moindre peut être présenté comme « option mesurée », pas « impact bien inférieur ».
- Le gain carbone distinct vaut `g_C = 1 - C_apres / C_avant` uniquement si les **deux facteurs géographiques, périodes, ACV et frontières sont comparables**. Un modèle peut utiliser moins de kWh mais produire davantage de CO₂e sous un mix plus carboné. `g_E` ne détermine pas `g_C` lorsque la région change. Eau totale, matériel, risques sociaux et qualité restent `NA` quand non documentés, jamais zéro.
- Une recommandation réelle fondée **sur la baisse énergétique** exige substituabilité démontrée, qualité comparable, énergie réduite et preuve de mesure/modélisation contrôlable ; le seuil de 30 % qualifie seulement le terme éditorial « nettement moins énergivore ». Une recommandation **modèle + déploiement + région** est désormais régie par les statuts multi-critères du §19 : une baisse du CO₂e peut être forte grâce au réseau sans baisse des kWh, mais ne justifie pas de l’appeler « modèle énergétiquement plus efficace ». En cas de manque de preuve, afficher « Aucune alternative suffisamment étayée » et les raisons précises ; une **simulation exploratoire** peut rester disponible avec bannière `HYPOTHÈSE` et sans allégation de gain réel.

### 17.4. Simulation de substitution sans changer les comptes

- L'interface doit isoler les **lignes d'usage compatibles** attribuables au modèle d'origine (version et runtime identifiés), et laisser **inchangées** les autres lignes. Des lignes partagées entre plusieurs modèles sans répartition fiable sont `NA` pour la substitution, jamais toutes basculées silencieusement.
- L'original reste une photographie de ses inputs/outputs, qualité et facteurs ; le candidat reçoit une **copie** des paramètres de tâches et une hypothèse explicite sur la variation des tokens d'entrée/sortie/cache/raisonnement, requêtes, itérations, batch et outils. Par défaut, conservation des volumes comme **contre-factuel iso-charge**, jamais prédiction des volumes futurs. Pour les agents, une variante énergie par tâche réussie peut corriger le nombre attendu de tentatives, uniquement avec mesures de succès et traces.
- Calcul `E_apres` avec la **même méthode physique et sa provenance**, ou `NA` si indisponible ; le modèle physique existant reste propriétaire. Le total personnel recomposé reste `NA` si une partie nécessaire est inconnue, et n'est jamais assemblé par addition de périmètres hétérogènes. Deltas `ΔE`, `ΔCO₂e`, `Δeau` uniquement si **les deux valeurs comparables sont connues**. Proposer un lien « Voir sources et limites » vers `#modeles`/`#alternatives`.
- Bouton **« Recalculer avec ce modèle »** : action de simulation **lecture seule**, ne change ni source historique, ni import, ni budget, ni part d'action, ni montant de collecte prévu/validé, ni badge/XP, ni publication, ni empreinte enregistrée. Un éventuel enregistrement futur nécessiterait un acte distinct explicite, une preuve et une version de simulation ; il n'est pas inclus dans le lot.
- Aucun prompt, extrait de document, dépôt Git ou secret n'est transmis à un autre opérateur pendant le calcul. Une simulation mathématique locale côté serveur/cliente réutilisant des compteurs agrégés suffit. Ne pas confondre comparaison prospective de modèles et migration effective d'un fournisseur.

### 17.5. Cas de référence, falsifications et règle STOP

Cas synthétique test : pour **1 000 tâches comparables**, `E_avant = 2 kWh`, `E_apres = 1,2 kWh` **au même périmètre**, `succès_avant = 90 %`, `succès_apres = 89 %`, fonctions conservées. `g_E = 40 %` sur **l’énergie totale de la même campagne**, mais `g_E_par_succès = 1 - (1,2/890)/(2,0/900) ≈ 39,33 %` si 900 tâches réussies pour le témoin et 890 pour le candidat ; l’option pourrait être **éligible sur ces hypothèses de test**, et non recommandation réelle d'un modèle nommé. Si l'énergie plus basse est seulement GPU tandis que l'énergie initiale est IT, ratio `NA`. Si la qualité de l'agent passe de 90 % à 75 % ou que le contexte requis manque, candidat refusé. Si l'énergie est identique et les intensités électriques diffèrent, aucun « gain d'énergie du modèle » n'est autorisé.

**STOP CONDITION scientifique :** cloud/cloud et local/local stricts ; pas de score non comparable ; pas de faux gains avec proxies génériques ; réduction relative calculée sur la même charge et la même frontière ; avant/après transparent et réversible dans l'UI ; aucune altération des comptes ni du défi symbolique ; en l'absence de preuve, résultat `NA` avec motif clair.


## 18. PLAN : efficacité du modèle vs intensité carbone de la région, recalcul des objectifs terrain après comparaison

**Owner :** mécanisme de recommandations du lot `21_POST_LOT_18_ALTERNATIVES_MODELES_IA.md`, moteur canonique `personal-ai-estimator.ts`, curseur déjà défini aux §§7 et 8. Documentation de preuve : `22_SOURCES_METHODO_ALTERNATIVES_IA.md`, exemples `19_SCENARIOS_OPENAI_15_MILLIARDS_ET_FIN_DE_VIE.md`. Ne créer ni nouvel estimateur, ni table d’empreinte dupliquée, ni nouvelles écritures lors d’un simple clic. Statut `PLAN`.

### 18.1. Deux variables indépendantes et un éventuel troisième effet

Pour une tâche et un périmètre **identiques** (GPU, IT ou site), l’énergie diffère selon l’architecture, le nombre de paramètres effectivement actifs, la longueur d’entrée/sortie, la durée de raisonnement, la quantification, le matériel, le batch, les outils, les appels/reprises et la stratégie de service. Des benchmarks publics montrent des écarts **réels** entre modèles de qualité proche ; ils ne permettent pas d’extrapoler une API propriétaire sans mesure comparable. La taille du modèle et le nombre total de tokens ne sont pas des mesures d’énergie.

La région de consommation électrique modifie **l’intensité carbone par kWh**. Un datacenter situé physiquement en France n’est pas prouvé par un modèle édité en France, un compte français ou un certificat « 100 % énergie verte ». La disponibilité d’une région configurable, la résidence des données, les transferts réseau, la latence et les conséquences du changement de fournisseur doivent être explicités. `cloud_api -> cloud_api` et `local_device -> local_device` sont invariants ; un serveur privé distant n’est pas un terminal local. Le comparateur ne promet pas de contrôle de région si l’API ne l’offre pas. Un même modèle peut être servi dans plusieurs régions ; plusieurs modèles peuvent être servis dans une même région.

Formules, uniquement si les **frontières et unités sont homogènes** :

```text
E_avant_site, E_apres_site [kWh]
f_C_avant, f_C_apres [kgCO2e/kWh ; location-based, période homogène]
C_avant = E_avant_site × f_C_avant
C_apres = E_apres_site × f_C_apres
gain_energie = 1 - E_apres_site / E_avant_site
gain_carbone = 1 - C_apres / C_avant
                = 1 - (E_apres_site/E_avant_site) × (f_C_apres/f_C_avant)
```

Un changement de modèle sur région identique modifie `E`. Une localisation plus décarbonée à modèle identique modifie `f_C`. Les deux peuvent se combiner, mais **un gain énergétique peut coexister avec une hausse de CO₂e** si la nouvelle région est plus carbonée. `E_avant=0` ou `C_avant=0` => pourcentage `NA`, pas 100 %. Les émissions indirectes eau, eau directe de refroidissement et ACV du matériel exigent leurs facteurs propres : une diminution de CO₂e n’implique pas leur baisse.

### 18.2. Preuves et politique de proposition

- Si données **énergie par tâche + performances** cohérentes : proposer une option **plus sobre en kWh** avec sa provenance, sans promettre un gain carbone de production lorsque la région est inconnue.
- Si données **localisation contrôlable** et facteur réseau daté et sourcé : proposer une **option d’hébergement moins carbonée** dans le même environnement d’exécution, distincte d’un « modèle moins énergivore ». Si le service ne permet pas de choisir la région, il s’agit uniquement d’un scénario pédagogique. Une moyenne annuelle nationale n’atteste ni du site, ni de la tranche horaire d’une requête.
- Si les deux sont prouvés, présenter les effets séparés et combinés. Le seuil éditorial `30 %` du §17 concerne le **gain d’énergie mesuré**, pas un critère obligatoire pour montrer un bénéfice carbone régional. Ne jamais promouvoir un modèle à qualité inférieure pour une tâche critique, ni assimiler la couleur du mix à une supériorité globale du modèle.
- Pour le **local**, aucune région cloud substituable : conserver le terminal et sa localisation électrique, comparer d’abord les modèles et les configurations réellement exécutables sur ce matériel. Une machine de remplacement doit être un scénario distinct avec ses coûts incorporés.
- `location-based` (mix physique du réseau) et `market-based` (attributs contractuels) sont des périmètres distincts qui ne se mélangent pas. L'électricité renouvelable et nucléaire est généralement peu carbonée à l’exploitation, mais la production, l’eau, les matériaux et le territoire restent des impacts séparés. PUE et énergie mesurée ne doivent pas être comptés deux fois.

### 18.3. Le bouton « Recalculer avec ce modèle » actualise les chiffres **théoriques** de collecte

Conserver `p`, composition des déchets, rendement d’incorporation `y`, statut d’orientation des mégots, facteur fournisseur optionnel, voie hydrique, seuil d’heures, historique de collecte confirmé et versions **constants** entre avant/après. Recalculer d’abord `C_IA_apres` et `W_IA_apres` par les équations scientifiques existantes ; ne **jamais** appliquer directement `nouveaux mégots = anciens mégots × (1-gain_energie)` lorsque le carbone et l’eau ne varient pas dans les mêmes proportions ou lorsque les cibles sont partielles.

Utiliser exclusivement le solveur du §7 :

```text
C_restant = max(0, C_IA_apres - B_C_terrain_valide)
W_restant = max(0, W_IA_apres - B_W_terrain_valide)   [voie homogene uniquement]
H_apres(p) = max(C_restant/k_C(p), W_restant/k_H(p))   [si les deux connus]
M_apres = 9.9 × H_apres × (1-p) [kg, scénario de rendement]
N_apres = ceil(380 × H_apres × p) [mégots]
M_i_apres = M_apres × part_i [kg, uniquement si part_i déclarée]
```

Pour l’analogie `RISQUE_CONVENTIONNEL`, `W_restant` est une **comparaison de repères de volume**, jamais une économie d’eau physique. Ne soustraire les bénéfices de terrain que si preuves/allocations et hypothèses compatibles, conformément au lot 11 ; à défaut montrer `reste indéterminé`. Si l’eau est `NA` ou la voie ACV impossible, montrer **objectif carbone seul** et statut « double objectif indéterminé », pas une réussite totale. Recalculer les statuts `FEASIBLE_SCENARIO`, `UNKNOWN`, `INFEASIBLE`, `OVER_BUDGET`, les positions `p` admissibles, l’effet des arrondis et les quantités déjà réalisées **sans mutation**. L’interface « Avant / Après » doit afficher à la fois énergie, CO₂e, eau (ou `NA`), heures-personne, kg par matériau, mégots entiers, delta et provenance ; proposer « changer le curseur » seulement dans le simulateur, sans écraser le défi du compte.

### 18.4. Fixture OpenAI fictive : baisse énergétique de 40 %, même région US hypothétique

Base de sensibilité **non mesurée** de 15 milliards de tokens : `E_site = 5 175 kWh`, `C_US = 1 811,25 kgCO2e`, `W_US_indirect = 23 391 L`. Un modèle hypothétique à **40 % d’énergie de site en moins** pour une charge/qualité comparable, même hébergement `US` (`f_C = 0,35 kgCO2e/kWh`, `f_W_indirect=4,52 L/kWh`) donne `E_site_apres = 3 105 kWh`, `C_apres = 1 086,75 kgCO2e`, `W_apres_indirect = 14 034,6 L`. On conserve `y=70 %`, `F_mix=2,7709 kgCO2e/kg`, `9,9 kg/h`, `380 mégots/h`, et le coefficient fournisseur **non certifié** `0,0035 kg CO₂ déclaré/mégot` si activé. Curseur en voie conventionnelle, objectif carbone dimensionnant dans ces fixtures :

| Effort mégots | Facteur mégots activé ? | Avant kg | Avant mégots | Après kg | Après mégots | Après heures-personne |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `p=20 %` | Non | 933,81 | 8 961 | 560,29 | 5 377 | 70,74 |
| `p=20 %` | Oui | 917,92 | 8 809 | 550,75 | 5 285 | 69,54 |
| `p=80 %` | Non | 933,81 | 143 374 | 560,29 | 86 024 | 282,97 |
| `p=80 %` | Oui | 731,23 | 112 270 | 438,74 | 67 362 | 221,58 |

Dans la dernière ligne, détailler `438,74 kg` en `219,37 kg plastique`, `43,87 kg aluminium`, `175,49 kg verre`. Il s’agit d’une composition fictive, pas d’un tri constaté. Le facteur verre demeure **`1,948 kgCO₂e/kg de matière recyclée incorporée`** selon l’ADEME BNR 2021. La décroissance presque proportionnelle des quantités à `g_E` dans cette fixture provient du **même facteur carbone et eau, mêmes coefficients de collecte et carbone dominant**, pas d’une formule universelle de conversion « énergie économisée = mégots évités ».

### 18.5. Fixture changement de région uniquement, pas d'alternative de modèle démontrée

Si `E_site=5 175 kWh` demeure identique et qu’on illustre `0,35 -> 0,020 kgCO₂e/kWh` (**US hypothétique vers France 2025, consommation moyenne RTE**), alors `C=1 811,25 -> 103,50 kgCO2e`, baisse carbone **94,29 %**, mais **énergie inchangée**. Pour `p=80 %`, facteur fournisseur mégots activé et mêmes fractions, le **seul objectif carbone** donne `41,78 kg déchets` et `6 416 mégots` (21,10 heures-personne). L’eau indirecte américaine 4,52 L/kWh est **inapplicable** automatiquement en France : le double objectif eau+carbone est `UNKNOWN/NA`, et ces quantités **ne doivent jamais être annoncées comme remplissant les deux seuils**. De même, aucune région française n’est réputée choisissable pour Codex OpenAI sans preuve de routage. Cet exemple est un **scénario de facteur réseau**, pas une recommandation d'un produit commercial.

**STOP scientifique :** aucune recommandation réelle sans preuves de performances, d’énergie et de capacité ; comparaison bidimensionnelle (kWh, CO₂e), zones/sources vérifiées ; après clic, renouvellement des kg/matériaux/mégots *dans la simulation* avec indicateur eau honnête ; historique, compte, défi, parts terrain et gamification strictement inchangés.

## 19. PLAN : choix économique et environnemental du déploiement modèle + hébergeur + lieu de calcul

**Statut : PLAN, à intégrer dans le lot 21.** Complète les sections 17 et 18 sans modifier le domaine personnel `PERSONAL_AI_USAGE`, les paramètres déjà persistés, le solveur de double seuil ou les règles de gamification. Les catalogues existants `model-catalog.ts` et `scientific-registry.ts` demeurent propriétaires. Les nouveaux contrats sont des projections/qualifications versionnées, pas une seconde source de vérité des modèles, des facteurs ou des impacts.

### 19.1. L'unité de sélection est un triplet déployé, pas un modèle isolé

Une option admissible identifie au minimum :

```text
modelId + immutableModelVersion
providerId + deploymentId + deploymentMode
executionEnvironment = cloud_api | local_device
inferenceProcessing = SINGLE_REGION | REGIONAL_SET | GLOBAL_ROUTED | UNKNOWN
processingRegionId | allowedProcessingRegionIds | UNKNOWN
workloadProfileId + taskMeasurementVersion + deploymentEvidenceVersion
factorRegionId + factorMethod + factorTimestamp + factorSource
workloadSuccessDefinition + attemptCount + successfulTaskCount
priceBasis + costBoundary + currency + tariffOrInvoiceTimestamp + priceEvidence
weightsAvailability = open_source | open_weights | proprietary  [attribut du modèle, pas du runtime]
```

- **Origine et candidat** doivent être deux déploiements réellement **disponibles**, et pas une permutation cartésienne de `AI_MODEL_CATALOG × possibleHosters × regions` : le catalogue donne des possibilités, non une attestation de présence, de disponibilité ou de localisation. Un `defaultRegion` ou `defaultPue` d'hébergeur n'est pas une preuve de traitement dans ce pays, pas même une estimation personnelle attribuable si l'hébergeur véritable est inconnu.
- **Éditeur du modèle ≠ opérateur de l'API ≠ propriétaire du datacenter ≠ région de traitement**. « Modèle chinois », « compte américain », « endpoint européen » et « datacenter français » sont quatre affirmations distinctes. Une identité de fournisseur cloud n'implique pas que ses requêtes soient traitées dans son pays de siège.
- Les modes sont obligatoirement conservés : `cloud_api -> cloud_api` ; `local_device -> local_device`. Pour le local, conserver matériel/runtime et son lieu déclaré/mesuré : aucune suggestion de datacenter étranger. Un modèle libre hébergé sur une machine distante est un déploiement cloud/distant pour ce contrat, même si ses poids sont ouverts. Si le matériel local change, scénario distinct dont l'ACV matérielle peut rester `NA`.
- Pour l'accès, vérifier la version précise, la compatibilité d'API, outils, quotas, contexte, coût éventuel, licence, région ou zone permise, résidence des données et **réelle possibilité pour l'utilisateur de choisir ce déploiement**. Un endpoint paramétrable n'est pas une preuve que le modèle demandé y est disponible.

### 19.2. La preuve géographique porte sur l'inférence, pas sur le routage réseau

Le champ `processingRegionEvidence` contient : `providerDocumentationUrl`, `checkedAt`, `modelVersion`, `deploymentMode`, `endpointOrProfileId`, `scope`, `guarantee`, `physicalRegionIds` éventuels et `routingWeights` **uniquement s'ils sont observés**.

| Portée | Conditions scientifiques | Usage pour le conseil |
| --- | --- | --- |
| `SINGLE_REGION_VERIFIED` | Contrat/exécution documenté explicitement dans une région physique et modèle déployable | Autorise un facteur électrique de cette région, à granularité/méthode compatibles, mais reste un proxy sans mesure d'énergie |
| `REGIONAL_SET_VERIFIED` | Ensemble exhaustif de destinations physiques possibles connu ; part par région non observée | **Fourchette conditionnelle** si énergie totale comparable et facteurs disponibles, pas un chiffre central inventé |
| `WEIGHTED_ROUTING_VERIFIED` | kWh ou répartition **de la charge énergétique** connue par région | Permet `Σ_z E_z × f_z`, avec provenance et périodes ; des pourcentages de requêtes ne deviennent pas automatiquement des parts de kWh |
| `GLOBAL_ROUTED` / `UNKNOWN` | Lieu de calcul non garanti ou ensemble non exhaustif | CO₂e attribuable régional `NA`, comparaison énergétique possible si énergie connue ; simulation géographique uniquement pédagogique |
| `INPUT_OR_STORAGE_REGION_ONLY` | Région de point d'accès, de stockage, de facturation ou de terminaison TLS seulement | **Ne prouve pas** où les GPU calculent : `physicalRegion=UNKNOWN` |

Le fournisseur peut proposer des modèles en `In-Region`, `Geo Cross-Region`, `Global`, `Data Zone`, voire des endpoints régionaux sans garantie d'inférence dans la région : leurs sémantiques et **leur disponibilité par modèle** doivent être vérifiées à la date de consultation. Ne pas déduire un « datacenter bas carbone » d'un libellé marketing `EU`, d'une région d'API ou d'un certificat renouvelable ; ne pas assimiler 100 % de couverture contractuelle à un zéro physique.

### 19.3. Comparabilité avant optimisation : qualité, prix, énergie, carbone

Qualité et sécurité d’abord : utiliser le même jeu de tâches et la même définition de succès, même modalités, contexte, outillage, langues, contraintes, budget de tentatives et seuil de non-infériorité métier (§17.2). Une offre doit d’abord être réellement disponible et fonctionnellement substituable. Comparer ensuite **prix total, énergie et émissions par tâche réussie**, en comptant les tentatives échouées, les reprises et les appels d’outils dans le même protocole. Un coût par million de tokens ou un score général d’intelligence ne constitue pas un coût par tâche ; un abonnement sans attribution fiable reste `NA`. Les modèles propriétaires sans énergie mesurée/dérivable avec méthode compatible restent `NA`, même si les scores marketing sont proches.

Énergie ensuite : `E_site(model, providerDeployment, workload)` doit être mesurée sur **le déploiement réel** ou modélisée avec des paramètres de matériel/batching explicitement applicables. Une note `GPU_ONLY` expérimentale n'est pas substituable à un `FACILITY` cloud. Deux offres du même modèle sur des hébergeurs différents peuvent avoir des consommations différentes : matériel, disponibilité, batching, quantification, PUE, politique de cache et latence. Un coefficient générique identique par million de tokens n'apporte **aucune preuve** de différence entre triplets.

Électricité ensuite : `f_C(z,t)` est le facteur carbone **location-based**, par kWh consommé sur le réseau de la région physique pendant le travail. En priorité la granularité horaire locale documentée ; une moyenne nationale/annuelle peut être utilisée **uniquement comme scénario qualifié**, jamais comme observation d'une requête. Vérifier `kgCO₂e/kWh` vs `gCO₂e/kWh`, consommation vs production, `direct` vs `lifecycle`, année et mode de calcul identiques entre origine et candidat. `market-based`, CFE%, PPAs, RECs, nucléaire/renouvelable et facteur du mix physique sont exposés séparément ; ne pas soustraire arbitrairement le pourcentage CFE au facteur moyen du réseau.

### 19.4. Formules, statut et classement multi-critères

Pour chaque option avec une tâche comparable et une frontière mesurée identique :

```text
E_kWh = E_mesuree_pour_les_taches_ou_E_reference × facteur_energie_eligible
C_location_kgCO2e = E_site × f_C(region,t)
  si régions physiques connues et énergie par région connue : C = somme_z(E_site,z × f_C(z,t))
  si ensemble complet des régions connu, répartition inconnue, E_site connu :
    C_min = E_site × min_z f_C(z,t) ; C_max = E_site × max_z f_C(z,t)
  si régions inconnues ou facteurs manquants : C = NA
reduction_E = 1 - E_apres/E_avant           [E_avant > 0, frontières comparables]
reduction_C = 1 - C_apres/C_avant           [C_avant > 0, conventions comparables]
```

Si `E` dépend de la région (machines différentes, PUE différents), la fourchette doit inclure aussi les **énergies par destination**, et non multiplier une énergie supposée fixe par un intervalle de facteurs. Un routage connu en termes de requêtes mais pas de consommations ne justifie pas des moyennes pondérées de CO₂e. Ne pas produire de pourcentage quand dénominateur nul/inconnu ; un résultat impossible ou hors preuve vaut `NA`.

**Règle de choix révisée :** filtrer d’abord qualité, sécurité, capacités, déploiement et **coût complet par tâche réussie** ; retenir toutes les offres `P_candidate ≤ 1,15 × P_ref`, y compris toutes les offres moins chères sans plancher à 85 %. Sur les options dont les émissions localisées sont quantifiables, présenter **tous les points admissibles** en `€/tâche réussie` contre `gCO₂e/tâche réussie`, et mettre en avant le front de Pareto **prix/carbone**. Préserver l’énergie `Wh/tâche` comme **troisième critère** dans les détails et l’éventuel front tridimensionnel, pour ne pas masquer un compromis énergie/carbone. Les statuts environnementaux originaux ci-dessous demeurent indépendants de l’éligibilité économique :

1. `ROBUST_LOWER_ENERGY_AND_CARBON` : énergie et carbone connus, aucune hausse robuste sur les deux axes, baisse substantielle au moins sur un, qualité non inférieure ; candidat à la recommandation principale « combinaison plus sobre » si bénéfice résiste aux incertitudes.
2. `LOWER_ENERGY_CARBON_UNKNOWN` : énergie comparable améliorée mais région/carbone `NA` ; « option moins énergivore », **pas** « moins polluante ».
3. `LOWER_CARBON_ENERGY_TRADEOFF` : CO₂e estimé plus bas mais énergie plus haute ; présenter explicitement un **compromis** carbone/électricité, pas « meilleure solution environnementale » sans autre arbitrage.
4. `SCENARIO_ONLY` : région, modèle ou énergie supposés ; expliquer l'hypothèse, aucun modèle recommandé comme réel.
5. `NO_DEFENSIBLE_COMBINATION` : aucune combinaison éligible documentée ; montrer les manques concrets, ne pas choisir un modèle au hasard.

Le seuil de 30 % de §17.3 reste un libellé **éditorial** pour « nettement moins énergivore », pas un prérequis mathématique ni un seuil applicable au carbone d'une seule région. Pour l'affirmation « plus sobre sur les deux axes », une différence doit dépasser les incertitudes de mesure comparables. Les compromis ne sont pas classés comme dominants, et eau, matériel incorporé et risques sociaux ne sont pas « optimisés » sans leurs données. Le prix est désormais une contrainte explicite, distincte de la preuve de sobriété : **moins cher ne signifie pas moins énergivore ni moins carboné**. À égalité de preuves, préférer le même opérateur et déploiement moins coûteux en données/switch, sans sacrifier les contraintes métier.

### 19.5. Recalcul non destructif, y compris les objectifs de collecte

Le bouton **« Recalculer avec cette combinaison »** calcule un contrefactuel sur les seules lignes d'usage couvertes par la preuve (modèle, version, travail, opérateur identifiés). Les lignes mixtes non ventilées restent inchangées et signalées. Conserver les acquis terrain, l'option de recyclage des mégots, le rendement d'incorporation, le mix matière, le curseur `p` et la voie hydrique. Calculer à nouveau le bilan via `personal-ai-estimator.ts` et le solveur métier lot `0 + 08`, **sans** multiplier directement les kg ou mégots par le pourcentage carbone ou énergie.

L’écran montre `modèle / hébergeur / région avant -> après`, `€/tâche réussie` et coûts totaux comparables, `Wh ou kWh par tâche réussie`, `kgCO₂e` (si méthodes compatibles), `kg plastique/aluminium/verre` et autres catégories connues, mégots entiers, heures-personne et statuts de faisabilité. Si la région ou le facteur eau sont `NA`, n'afficher que les dimensions effectivement calculables ; le « double objectif satisfait » est indisponible. Une offre moins carbonée ne fait pas mécaniquement baisser l'eau. Tout calcul de collecte est étiqueté **analogie conditionnelle non certifiante**, jamais compensation physique.

Ne **rien enregistrer** dans le compte et ne rien modifier : imports, historique IA, décompte de tokens, défi, budget, parts/structures, collecte accomplie, badges, XP et rapports. Aucun appel à un fournisseur externe avec les prompts, dépôts, fichiers, tokens ou données du compte pour une comparaison : seuls des identifiants de modèles, catalogues publics et métriques non sensibles sont utilisés dans ce lot.

### 19.6. Contrôles de cohérence et condition de clôture

Voir `23_FIXTURES_TRIPLETS_MODELE_HEBERGEUR_REGION.md` : offres réelles vs fictives, provenance d’hébergement, endpoint différent de processing, ensemble multi-régions, comparaison horaire versus annuelle, échelles carbone, frontière GPU/site, modèles indisponibles, succès et coût par tâche, seuil +15 %, fronts de Pareto, baisse d’énergie avec hausse de carbone, et recalcul des objectifs sans écriture.

**STOP :** la recommandation porte sur une offre **déployable et vérifiée**, pas sur une nationalité de modèle ou un simple indice de mix électrique. Un facteur de région absent interdit de promettre un gain carbone ; le refus est un résultat accepté. Aucun classement n'utilise la localisation prétendue d'un compte Codex OpenAI non instrumenté, et les gains avant/après restent des scénarios jusqu'à mesure du travail réel.

### 19.7. Coût complet par tâche réussie : unité fonctionnelle et preuve

**Décision métier figée pour le lot 21 :** le coût comparable est celui d'un **travail effectivement réussi**, pas un tarif par token, un score « d'intelligence », un prix mensuel forfaitaire sans utilisation attribuée ou un coût par requête ignorant les relances.

```text
N_attempted = nombre de tâches distinctes soumises au protocole, avec relances et appels internes tracés
N_success = nombre de ces tâches satisfaisant la même règle de succès validée
P_success = C_total_attribuable / N_success                       [EUR/tâche réussie ; N_success > 0]
E_success = E_total_attribuable / N_success                       [kWh/tâche réussie ; même frontière]
C_success = C_total_location_based_attribuable / N_success      [kgCO2e/tâche réussie ; périmètre cohérent]
P_cap = 1.15 * P_reference_success                             [si P_reference_success > 0 et connu]
eligible_price = P_candidate_success <= P_cap
```

**Coûts cloud API à intégrer selon la tarification observée** : tokens d'entrée/sortie/cache selon règles contractuelles effectivement facturées (ne pas compter deux fois les tokens de raisonnement), appels facturables, recherche/outils, images, tentatives, frais obligatoires et taux de change daté si devises différentes. Ne pas extrapoler des compteurs Codex ou ChatGPT vers une facturation API : l'offre sous abonnement et le produit API sont distincts. Pour un abonnement dont le coût par tâche **marginal** n'est pas défini, afficher `PRICE_UNKNOWN` plutôt que `0 €` ; un coût moyen attribué par utilisateur est possible seulement avec sa période et sa clé d'allocation explicites, qualifié comme scénario non substituable au tarif API.

**Endpoints dédiés et serveurs distants** : instance-horaire × heures effectivement facturées × réplicas, allocations explicites d'inactivité et démarrage, coût de stockage/réseau/outillage s'il fait partie de la frontière, éventuellement amortissement matériel si l'utilisateur supporte ce coût. Coût par requête ≠ coût d'un endpoint tournant à vide. Ne pas comparer un prix de GPU isolé avec le prix complet d'un service qui inclut outils et gestion.

**Terminal local** : même terminal et durée d'évaluation, électricité réellement consommée × prix marginal local sourcé, plus amortissement matériel/maintenance **uniquement si inclus symétriquement dans la frontière économique déclarée**. Distinguer `LOCAL_MARGINAL` (machine déjà possédée, seul coût supplémentaire mesurable) et `LOCAL_TCO` (machine et coûts fixes répartis sur période/volume justifiés) ; ne jamais comparer une variante `LOCAL_MARGINAL` et un `LOCAL_TCO` comme deux coûts homogènes. Le coût d'un serveur distant self-hosted n'est pas celui d'un terminal local.

Pour chaque prix : `currency`, `currencyConversionSource/date` si nécessaire, `tariffVersion`, `operator`, `deploymentId`, `billableItems`, `costAllocationMethod`, `period`, `costBoundary`, `N_success`, `observedAt`, URL/version de facture ou tarif, qualité `BILLED` / `PUBLISHED_TARIFF_MODELED` / `ALLOCATION_SCENARIO` / `PRICE_UNKNOWN`. `BILLED` prouve un prix effectivement facturé, pas le coût futur garanti. Énergie, coût, carbone et qualité conservent leurs **preuves indépendantes**. Pas de tarif fixé en dur pour un fournisseur réel.

**Dénominateur et incertitudes :** `N_success=0`, coût nul de référence, tarif obsolète, devise non convertible avec taux sourcé, périmètres économiques différents, volume d'usage inconnu et frais non attribuables => `PRICE_UNKNOWN` ou `COST_BOUNDARY_MISMATCH` ; aucun ratio ni point X. Pour des fourchettes de coûts documentées, établir une éligibilité **robuste** seulement si `P_candidate_max <= 1,15 × P_reference_min`. Si les intervalles recouvrent le seuil, afficher `PRICE_ELIGIBILITY_UNCERTAIN` et ne pas prétendre que le plafond est respecté.

### 19.8. Sélection et représentation graphique : coût X, émissions Y

- **Étape A :** même tâche, même règle de réussite, capacités, sécurité, licence, politique de données, délai maximal et disponibilité réellement vérifiés ; appliquer la non-infériorité du §17.2. L'utilisateur n'est pas forcé d'accepter un fournisseur différent.
- **Étape B :** comparer `P_success` dans la **même monnaie, la même période pertinente et une frontière de service homogène** ; inclure toute offre moins chère et toute offre allant jusqu'à **+15 % inclus**. Le `±15 %` n'est **pas** une fourchette `[85 %, 115 %]` : le plafond supérieur seul est restrictif. Une offre à 50 % du prix reste admissible. Le pourcentage reste **paramètre produit fixe en V1**, testable, non une incertitude de prix ou de qualité.
- **Étape C :** afficher tous les candidats admissibles ayant `C_success` comparable sur un **nuage de points**, X = `€/tâche réussie`, Y = `gCO2e/tâche réussie`, origine et `P_cap` signalés. Les points ont un identifiant `modelId + version + providerId + deploymentId + physicalRegionEvidence` ; ne pas placer artificiellement un modèle sur l'axe de son éditeur ou sur un prix/token. Pour intervalle CO₂e, afficher l'étendue verticale si le composant et les preuves le permettent, sinon dans une table « plage connue », **jamais** un milieu fictif.
- **Étape D :** distinguer visuellement les non-dominés **prix/carbone**, sans cacher les autres options conformes : le choix appartient à l'utilisateur. Le front de Pareto `prix/carbone` n'est pas un score ; à égalité de contraintes, X/Y faibles sont préférables sur ces axes seulement. **Énergie Wh/tâche** reste visible pour chaque candidat, avec un signal explicite quand une baisse carbone exige une hausse d'électricité. Le front tridimensionnel prix/énergie/carbone peut être indiqué sans déplacer le graphique principal.
- **Étape E :** candidats à prix connu mais carbone `NA` : section « coût connu, impact carbone indéterminé », avec énergie si mesurable et motif ; prix `NA` : « comparaison économique impossible » et pas de position X. Qualité non prouvée : exclusion des conseils, éventuelle fiche informative, sans point prétendument admissible. `market-based`, eau/ACV et carbone incorporé ne sont pas fondus dans Y.

L'expression « pollution » est impropre comme unité Y : l'ordonnée représente **uniquement les émissions opérationnelles `location-based` en gCO2e/tâche réussie**, pas les déchets, la toxicité, l'épuisement des ressources, l'eau ou une ACV complète. La réduction carbone et la réduction de coût sont affichées **séparément**. Les gains de CO₂e ne sont pas des « équivalences de collecte ».

### 19.9. Open-weight, local et hybride : axes orthogonaux, V1 bornée

- **Poids ouverts** (`open_source` / `open_weights`) ou **propriétaires** : caractéristique de licence/distribution du modèle, **pas** une troisième valeur d'`ExecutionEnvironment`. L'owner `model-catalog.ts` porte déjà `weightsAvailability` indépendamment de `cloud_api | local_device`. Un modèle open-weight peut être exécuté via API managée, endpoint dédié, serveur distant auto-hébergé ou terminal local. Comparer l'offre effectivement déployée, pas l'origine géographique de ses poids.
- **Local fixe** : garder le même matériel, runtime, configuration de puissance et localisation physique. En comparaison *sur ce même terminal et à intensité carbone électrique constante*, la baisse de CO₂e opérationnel suit la baisse des kWh ; toutefois la région **n'a pas disparu** : l'intensité du réseau de l'utilisateur intervient. Si la localisation ou le facteur local sont inconnus, carbone `NA` même si les Wh sont mesurables. Matériel différent, capex ou ACV matériels => scénario à périmètre propre, sans raccourci « plus vert ».
- **Self-hosted distant** : classer comme `cloud_api` ou exécution distante équivalente **dans la V1**, si accès par service distant ; appliquer prix de serveur et localisation physique réelle, sans assimiler `isSelfHosted` à `local_device`.
- **Hybride local + cloud** : composition ordonnée d'étapes, potentiellement avec routeur, cache, outils, échecs et retours cloud. Pour une tâche réussie complète : `P_hybrid = Σ P_stage + P_router` avec allocation par taux d'appels observés, `E_hybrid = Σ E_stage`, `C_hybrid = Σ(E_stage,region × f_region)` **sur frontières homogènes et sans double comptage**. Une étape dont la région/énergie est inconnue rend le **total carbone attribuable** `NA`, pas zéro. Le coût et le taux de réussite concernent le workflow complet, pas son « petit modèle local » isolé.
- **Décision de périmètre** : **pas d'implémentation hybride V1 dans le lot 21** ; ne pas ajouter `hybrid` au type `ExecutionEnvironment` et ne pas coupler arbitrairement un agent cloud et un modèle local sous l'interdiction `cloud ↔ local`. Une évolution ultérieure pourrait composer les propriétaires d'étapes existants, sous mesure réelle et vérification de confidentialité, mais aucun lot additionnel n'est autorisé ici.
- **MoE** (Mixture of Experts) est une **architecture interne du modèle**, pas un workflow hybride d'hébergement ; éviter cette confusion dans les filtres et labels.

### 19.10. Réductions conventionnelles pré-calculables, sans pourcentage universel

Fixer **les formules et conventions**, non les gains réels de fournisseurs. À une **frontière de site identique**, pour **une région d'exécution unique par offre**, intensités `location-based` homogènes (même méthodologie et période), dénominateurs strictement positifs et travail réellement comparable :

```text
gE = 1 - E_after / E_before                         # gain relatif d'énergie par tâche réussie
gI = 1 - f_after / f_before                         # baisse relative d'intensité électrique
gC = 1 - C_after / C_before                         # gain relatif de CO2e opérationnel
gC = 1 - (1 - gE) * (1 - gI)                       # identité algébrique CONDITIONNELLE
gP = 1 - P_after / P_before                         # économie de coût par tâche réussie
```

Exemples **mathématiques** : `gE=40 %`, `gI=50 %` => `gC=70 %` ; `gE=20 %`, `gI=20 %` => `gC=36 %` ; `gE=40 %`, **intensité doublée** (`gI=-100 %`) => `gC=-20 %` (CO₂e augmente de 20 %). Dans les flux multi-régions, utiliser les émissions réelles par région ou une borne sourcée, **pas** une intensité moyenne arbitraire et pas l'identité simplifiée sans ses hypothèses. Aucun pourcentage CO₂e ne détermine directement une baisse d'eau, une économie en euros ou des kg/mégots à collecter ; tous les objectifs du lot `0 + 08` sont **résolus à nouveau** avec leurs propres unités et bornes.

Le seuil **+15 % prix** est un plafond de produit, le seuil **30 % énergie** qualifie seulement le libellé « nettement moins énergivore », et la tolérance qualité **3 points absolus** de §17.2 est un garde-fou métier provisoire, jamais une licence de détériorer sécurité ou fonctionnalités. Ces trois valeurs ne sont pas des mesures scientifiques, ne doivent pas être combinées en un score unique et sont fixées/versionnées dans la politique du comparateur pour éviter des divergences entre UI, calculs et tests.


### 19.11. Contrat de qualité du code, raisonnement et mode commercial, révision du lot 21

**Ordre non négociable** : (1) capacités et exigences bloquantes de code, (2) non-infériorité démontrée sur les mêmes tâches de code au même niveau de difficulté, (3) disponibilité de la **configuration** modèle + raisonnement + outils + plateforme + forfait, (4) coût **par tâche de code réussie**, (5) comparaison énergie/carbone, (6) simple préférence de continuité d'environnement. Une forte économie en euros ne compense jamais un échec au stade 1 ou 2. Le taux de réussite dans le dénominateur économique ne suffit pas à caractériser la qualité : vérifier aussi la difficulté et les classes de tâches couvertes.

**Preuve requise pour une tâche de programmation** : `codingWorkloadId`, `benchmarkId/version`, définition de succès, catégories et niveau de difficulté (`débogage`, `modification multi-fichiers`, `tests`, `revue de code`, `agent avec outils` si requis), même harnais d'évaluation, langues, paramètres de contexte, outils et limite de temps. Ajouter `reasoningConfigurationId` propre à chaque offre, valeurs réellement prises en charge et date ; `successRate` **avec intervalle**, tests/contraintes critiques respectés et sources. Comparabilité robuste, par défaut : `passRateCandidate.min >= passRateReference.max - 0,03`, aucune régression sur une exigence bloquante. Cet écart maximal de **3 points de pourcentage absolus** est une politique provisoire à éprouver, jamais une assimilation de deux familles de modèles ou un score de benchmark universel. Si les jeux de tests sont différents, trop faciles, insuffisants ou les intervalles trop larges : `QUALITY_UNPROVEN` / `CODING_PROFILE_MISMATCH`, **pas** une équivalence présumée.

**Raisonnement** : ne pas attribuer un score énergétique ou de réussite fixe aux intitulés `low/medium/high/max/pro`. Les valeurs diffèrent suivant le modèle, l'API et l'application. Comparer des **configurations exécutables distinctes**, dont coûts en tokens de raisonnement, sorties et éventuels frais d'agent sont déjà inclus dans la même campagne de tâches. Le mot « max » ne valide jamais implicitement la non-infériorité d'un modèle faible. Les exemples de hiérarchie Astra/Sol/Luna ne deviennent ni classement officiel ni test d'éligibilité sans benchmark comparable.

**Interface de facturation :** champ `Abonnement ou API` (avec troisième état local `LOCAL_OWNED` lorsque pertinent), et uniquement en `SUBSCRIPTION` champs facultatifs `Plateforme de code utilisée` et `Forfait souscrit`. Les plateformes possibles incluent Codex, Cursor, Claude Code, Copilot, etc., **sans supposer que chaque version/modèle/effort est accessible sur chaque plateforme**. `API` et `SUBSCRIPTION` sont des produits économiques distincts. Les forfaits à coût fixe, crédit, quota, facturation de dépassement et accès par palier de modèle doivent être prouvés à la date et au profil de l'utilisateur ; si données de quota/usage/période manquantes : coût par succès `NA`. Pour un abonnement, comparer le **coût complet attribuable à une période et à un volume de tâches réussies**, frais fixes et dépassements compris, dans une frontière identique `SUBSCRIPTION_ALLOCATED`. Ne pas comparer les euros d'un forfait mensuel à une grille API par million de tokens. En cas de changement de fournisseur, considérer les deux abonnements maintenus ou l'ancien résilié selon l'hypothèse documentée ; ne pas nier les coûts engagés. Une comparaison de forfaits sur des périodes différentes est invalide.

**Bonus de continuité, sans score « vert »** : seulement lorsque l'utilisateur a indiqué plateforme **et forfait**, et que l'offre candidate est **prouvée disponible** dans l'application et sur ce forfait avec le mode de raisonnement étudié. Parmi des offres déjà éligibles, un candidat dans l'environnement existant est signalé et placé en tête **uniquement face à une autre offre qu'il n'excède pas de plus de 3 % sur chacun des deux axes prix et CO₂e**. Cette tolérance de proximité est un **choix UX révisable**, pas une réduction des frais, de la pollution, ni une autorisation de dépasser +15 % du prix de référence. Aucune promotion sans preuve ; en cas de prix ou carbone `NA` ou en intervalle, pas de bonus. La sélection effective reste à l'utilisateur. La frontière Pareto reste inchangée par cette préférence.

**Exécution locale :** `LOCAL_OWNED` exprime une facturation propre au matériel existant, sans modifier `ExecutionEnvironment = local_device`. Un modèle open-weight dans le cloud peut utiliser `API` ou `SUBSCRIPTION` selon l'offre commerciale réelle ; l'accès aux poids ne détermine aucune facture.

**Invariants sécurité** : les préférences peuvent être manipulées par le client ; elles ne sont jamais une preuve d'accès, de paiement, d'abonnement, de qualité de code ou de disponibilité fournisseur. Le composant reste contrôlé, sans appel API au fournisseur, migration ou écriture à la sélection. Les preuves sont constituées et contrôlées hors des saisies libres, par l'owner serveur ou la couche de données de confiance. Tous les statuts sont `PLAN`.

**Preuve d'accès au raisonnement dans le contrat de pré-intégration :** `reasoningConfigurationId` dans `OfferAccess`, `subscriptionPlatformId`, `subscriptionPlanId`, `subscriptionPlanAvailability` et `verifiedReasoningConfigurationIds[]` doivent lier la même offre et le même `reasoningConfigurationId`. Une liste commerciale de modèles ou de plateformes non liée au forfait ne suffit pas. Un écart entre mode `LOCAL_OWNED` et runtime `cloud_api`, ou entre un usage local et une offre `SUBSCRIPTION/API`, donne `ACCESS_RUNTIME_MISMATCH` ou `ENVIRONMENT_MISMATCH`, jamais un tarif comparé.
