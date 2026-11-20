# Sources et exemples vérifiables : entraînement, inférence et impacts des modèles IA

**Statut : `PLAN / CANDIDAT SCIENTIFIQUE`, 20 novembre 2026.** Complète `01_DECISIONS_SCIENTIFIQUES_ET_CALCULS.md` §14 ; doit être intégré à la documentation canonique du projet par le lot 12, et ne pas demeurer comme deuxième contrat CURRENT. Données de publications, pas mesures utilisateur.

## 1. Sources primaires et faits utilisables

### 1.1 BLOOM, étude scientifique évaluée par les pairs

- Luccioni, Viguier, Ligozat, *Estimating the Carbon Footprint of BLOOM, a 176B Parameter Language Model*, Journal of Machine Learning Research, 2023 : https://www.jmlr.org/papers/v24/23-0069.html
- Énergie dynamique d'entraînement annoncée : **433 195 kWh** ; frontière : consommation dynamique pour le calcul d'entraînement, **pas** automatiquement énergie totale d'un datacenter et **pas** ACV de toute la recherche.
- Émissions associées à cette frontière : **24,7 tCO2e**. Avec périmètre élargi, incluant notamment les charges matérielles et auxiliaires : **50,5 tCO2e**. Ces deux valeurs sont des **alternatives de frontières**, pas des quantités à sommer.
- Étude d'inférence **sur une instance expérimentale particulière** : **914 kWh en 18 jours** et environ **340 kgCO2e** ; ne pas généraliser la charge à toutes les installations, ni assimiler automatiquement frontière de l'entraînement dynamique et frontière de cette instance d'inférence.
- Ratio arithmétique exploratoire entre ces deux séries : `433195 / (914/18) ≈ 8530 jours`, soit environ 23,4 ans à charge constante pour **une** instance. **Ce n'est pas une comparaison physique homogène**, car la frontière d'énergie GPU dynamique d'entraînement est plus étroite que l'énergie de service d'inférence. Ne pas afficher ce résultat comme un seuil validé. La comparaison carbone `24700/(340/18) ≈ 1308 jours` compare également des frontières distinctes et doit rester pédagogique avec garde-fou.

### 1.2 Meta Llama 3, Llama 3.1 et Llama 3.2, déclarations de l'éditeur

- Llama 3 : https://raw.githubusercontent.com/meta-llama/llama-models/main/models/llama3/MODEL_CARD.md
  - Llama 3 8B : **1,3 million de GPU-heures**, puissance de référence **700 W** et **390 tCO2e** déclarées pour son pré-entraînement. La multiplication `1 300 000 × 0,7 = 910 000 kWh` est une **estimation fondée sur une puissance nominale/pointe**, pas une énergie IT instrumentée. Ne pas ajouter mécaniquement PUE.
- Llama 3.1 : https://raw.githubusercontent.com/meta-llama/llama-models/main/models/llama3_1/MODEL_CARD.md
  - Llama 3.1 8B : **1,46 million de GPU-heures**, **700 W** et **420 tCO2e** en location-based. Calcul nominal `1 460 000 × 0,7 = 1 022 000 kWh`, non mesuré. La même fiche annonce **0 tCO2e market-based** ; cette annonce comptable ne signifie pas absence de consommation physique.
  - HumanEval 0-shot pass@1, modèles instruct de Llama 3 8B et 3.1 8B, même tableau : **60,4 % puis 72,6 %**, soit **+12,2 points**. Variation des émissions **+30 tCO2e**, soit **+7,7 %** du chiffre de 390 tCO2e. **Il ne s'agit pas du coût incrémental de mise à jour d'un unique modèle ni d'une preuve de rentabilité environnementale.**
  - Fiche familiale : **15T+ tokens de pré-entraînement**. Le nombre représente du texte pré-entraîné, pas une énergie, et ne suffit pas à construire un rapport de « pollution par token » comparable à l'inférence.
- Llama 3.2 : https://raw.githubusercontent.com/meta-llama/llama-models/main/models/llama3_2/MODEL_CARD.md
  - 3B : **133 tCO2e** location-based pour l'entraînement, variante 3B QLoRA : **0,461 tCO2e** déclarée pour le post-entraînement QLoRA, soit ≈ **0,35 %** de 133 t. La phase supplémentaire ne remplace pas les 133 t : elle s'y **ajoute** selon les frontières documentées.
  - La fiche indique l'emploi de la **distillation** et de stratégies de quantification. Distillation, quantification et fine-tuning sont des opérations distinctes ; une version quantifiée n'est pas par définition un modèle entièrement réentraîné.

### 1.3 Gemini, énergie d'inférence, et absence de coût d'entraînement public imputable ici

- Google, *Measuring the environmental impact of delivering AI at Google Scale*, relevé médian de Gemini Apps en **mai 2025** : https://arxiv.org/abs/2508.15734 et https://cloud.google.com/blog/products/infrastructure/measuring-the-environmental-impact-of-ai-inference
- **0,24 Wh, 0,03 gCO2e, 0,26 mL** par requête textuelle médiane de **Gemini Apps dans le contexte rapporté** ; ce n'est pas la mesure de tous les modèles Gemini, de toutes les tâches ou de l'entraînement. Ne pas appliquer à un autre modèle ou service sans preuve.
- Si une consommation d'entraînement de la version précise est indisponible : `NA`, même si l'inférence est bien instrumentée.

### 1.4 Distillation documentée, sans empreinte énergétique générale prouvée

- DeepSeek-R1-Distill-Qwen-7B : https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-7B
- Les variantes distillées utilisent notamment des modèles Qwen comme base et un jeu de **800 000 exemples** de raisonnement issu de DeepSeek-R1. Ce procédé ne signifie pas que la totalité du coût de DeepSeek-R1 est transférée au modèle dérivé, et ne suffit pas à établir un coût d'énergie sans mesure de la phase de distillation et de l'inférence.

## 2. Contrat de comparaison / exemple chiffré sans faux modèle réel

**Rapport principal recommandé : énergie ÷ énergie**, jamais tokens ÷ tokens présenté comme une pollution, et jamais CO2e ÷ kWh.

```text
model_id_match AND version_match
energy_boundary_match OR documented_boundary_conversion
E_train > 0 AND E_user > 0
R_E = E_train[kWh] / E_user[kWh]
```

**Fixture exclusivement synthétique**, à ne jamais relier à BLOOM, Llama, Gemini ou un utilisateur réel :

- Modèle imaginaire `example/fictional-model-v1` ; **énergie IT mesurée d'entraînement fictive** : 1 200 kWh.
- Même modèle imaginaire ; **énergie IT d'utilisation fictive** : 0,30 kWh sur une période déclarée.
- `R_E = 1 200 / 0,30 = 4 000`. Texte : « Dans cet exemple fictif à frontière IT identique, l'entraînement représente 4 000 fois l'énergie de cette utilisation. »
- Si la frontière utilisateur devient `facility_total` sans conversion justifiée, le ratio devient `NA`. Si `E_user=0` ou `null`, ratio `NA`. Si la phase a seulement des `trainingTokens`, ratio énergétique `NA`.
- Si l'inférence de l'utilisateur inclut plusieurs modèles, calculer **par modèle exact** sans attribuer une seule phase d'entraînement à tout le total.

**Exemple de partage hypothétique**, avec la même énergie fictive 1 200 kWh : `U = 1 000` utilisateurs, `D = 100` jours, `E_train/personne/jour = 1 200 / (1 000×100) = 0,012 kWh/jour`, soit **12 Wh par personne et par jour alloués comptablement**. Si `E_inf/personne/jour = 0,030 kWh`, `D_egalite_flotte = 1 200/(1 000×0,030)=40 jours`. Aucun de ces chiffres ne correspond à une valeur réelle d'un modèle existant.

## 3. Comparaison performance / coût : trois cas pédagogiques, pas un classement universel

1. **Llama 3 8B / Llama 3.1 8B :** chiffres éditeur carbone et HumanEval ci-dessus ; amélioration de performance sur un benchmark, coût de deux entraînements distincts, résultat non transposable automatiquement à l'énergie par requête.
2. **Llama 3.2 3B / 3B QLoRA :** entraînement initial vs phase additionnelle ; une nouvelle phase peut être peu coûteuse relativement à la précédente, mais le rapport `0,461/133` n'est pas une économie d'inférence. Le bénéfice doit être évalué par tâche et mesure.
3. **Gemini Apps mai 2025 :** mesure d'inférence à une date et un opérateur spécifiques ; illustre l'importance de l'infrastructure, sans preuve que toutes les générations ultérieures de modèles coûtent moins à l'entraînement.

`N_amortissement = E_dev_incremental / (E_old_par_tache - E_new_par_tache)` seulement quand chaque terme est connu, frontières identiques, métrique de qualité acceptable et économie positive. Sinon `NA`. Tenir l'effet rebond à part.

## 4. Enjeux humains, écologiques et sociaux à restituer sans score personnel

- **Annotation/modération :** conditions de travail humain, exposition à des contenus pénibles, rémunération et droits. Enquête contextualisée : https://time.com/6247678/openai-chatgpt-kenya-workers/ ; source interne CleanMyMap : « Impacts sociaux, humains et informationnels de l'IA ». Ne pas attribuer une quantité universelle de souffrance/annotation par token.
- **Eau et électricité :** refroidissement local, production électrique, eau directe/indirecte, prélèvement vs consommation, tensions de bassins ; risque local et saisonnier, non rendu par une consommation mondiale moyenne. Rapport Ceres : https://www.ceres.org/resources/reports/water-behind-the-watts-the-hidden-risk-of-powering-data-centers et source interne CleanMyMap : « IA, data centers, matériel et ACV ».
- **Bruit :** équipements électriques, groupes de secours, refroidissement ; nuisance locale plausible mais intensité, distance, durée et effets sur faune/humains dépendent du site. Pas de « dB/personne » ou « dommage biodiversité/token » universels.
- **Matériaux et déchets :** fabrication GPU, métaux, eau et produits chimiques des semi-conducteurs, durée de vie, e-déchets ; périmètres ACV séparés du service IA opérationnel.
- **Comptabilité carbone :** location-based vs market-based, crédits et offsets, additionalité ; un « zéro contractuel » ou une cleanwalk ne supprime pas les émissions physiques de l'entraînement.

## 5. Tests et exclusions obligatoires

- Entrée sans modèle, version ambiguë, entraînement non publié, énergie inconnue, tokens d'entraînement seuls, eau inconnue : **NA**, sans estimation inventée.
- Mesure GPU dynamique vs énergie totale site, TDP × GPUh vs mesure instrumentée, émissions carbone location vs market : ne pas produire des ratios non qualifiés.
- `0` ≠ `null`, unités Wh/kWh/MWh, tCO2e/kgCO2e, quantité très grande, petit dénominateur, chiffres significatifs, scénarios personnalisables sans fuite privée.
- Méthode d'allocation avec `U>0`, `D>0`, énergie d'inférence par jour positive ; scénarios de 1 et 1 million d'utilisateurs ; impact historique constant quelle que soit `U`.
- Tester aussi l'absence d'effet sur les quotas, historiques et gamification des lots 0 à 11.
