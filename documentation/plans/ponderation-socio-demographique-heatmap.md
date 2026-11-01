# PLAN | Matrice de pondération socio-démographique de la heatmap par tronçons

**Projet :** CleanMyMap
**Statut :** `PLAN / DEFERRED / HYPOTHESIS`, non implémenté, non calibré
**Date de décision :** 1er novembre 2026
**Chemin d'intégration proposé :** `documentation/plans/ponderation-socio-demographique-heatmap.md`
**Périmètre pilote :** Paris 5e et 6e, puis Paris et les autres communes françaises
**Objet :** formaliser la pondération de contexte par densité et revenu, sans remplacer la politique locale de coefficients polarisés.

> Ce document fixe une **matrice d'hypothèses numériques candidate**. Les valeurs chiffrées sont décidées pour préparer des essais, non déduites de comptages de mégots ou de déchets. Le constat de terrain exprimé par le porteur du projet, selon lequel des secteurs à faibles revenus peuvent présenter davantage de déchets abandonnés, est conservé comme **hypothèse à tester**. L'effet propre du revenu, sa direction et son amplitude restent **non prouvés** pour Paris. Aucune règle n'est activée dans le runtime par ce document.

## 1. Décisions à conserver

| Sujet | Décision | Statut | Justification / limite |
|---|---|---|---|
| Support principal de la heatmap | **Tronçons OSM colorés et cliquables**, pas des polygones IRIS | Décision UI | Les frontières statistiques servent à associer les données, pas à dessiner la pollution des rues. |
| Micro-urbanisme | **Micro-points distincts et cliquables**, avec score éventuellement différent du tronçon | Décision UI / PLAN | Métro, bus, terrasses, restauration, mobilier, etc. ; source réelle et déduplication exigées. |
| Coefficients urbains | **Politique polarisée uniquement** `paris-street-risk-heuristics-v1-polarized-proposal` | Décision de simulation | Les coefficients de rue et de POI restent ceux du plan polarisé. Aucun scénario local « modéré » concurrent. |
| Densité de population | Effet positif sur la pression potentielle, mais **pas de multiplicateur additionnel** au modèle zonal CURRENT | Décision anti-double comptage | `residentPopulation.normalized` contribue déjà à `wasteRisk` (poids 0,22) et `cigaretteButtRisk` (poids 0,05). |
| Revenu médian faible | Tester un **bonus limité**, plus fort sur les déchets que sur les mégots | `HYPOTHESIS / ASSUMPTION` | Hypothèse de terrain retenue. Ne pas présenter le revenu comme cause du jet de déchets. |
| Revenus élevés | Tester une atténuation symétrique mais plus faible | `ASSUMPTION` | Une zone riche n'est pas supposée propre. Les POI et observations locales peuvent maintenir un risque élevé. |
| Deux familles | `wasteRisk` et `cigaretteButtRisk` restent indépendants ; `mixte = (wasteRisk + cigaretteButtRisk) / 2` | Invariant | Pas de fusion préalable qui détruirait les distinctions par type de déchets. |
| Données manquantes | Neutralité du multiplicateur (`1,00`) **avec statut `UNKNOWN`** | Invariant | Ne pas attribuer une situation économique au quartier à partir d'une absence de statistique. |
| Activation | Simulation et évaluation hors production d'abord | `DEFERRED` | Nécessite sources compatibles, mesures indépendantes et tests de biais. |

**Frontière avec les sources canoniques :**

- `documentation/architecture/paris-pressure-risk-model.md` : modèle zonal CURRENT et poids déjà intégrés.
- `documentation/plans/enrichissement-micro-lieux-risque-pollution.md` : inventaire des sources et conditions d'activation du moteur segmentaire.
- `documentation/architecture/paris-street-pollution-heatmap.md` : chemin **prévu** de la proposition polarisée, à vérifier sur `main` ; ne pas le supposer implémenté.
- `documentation/product/SCIENTIFIC_PROTOCOL.md` : exigences de distinction entre mesure, proxy et hypothèse.

## 2. Matrice candidate : revenu disponible médian

### 2.1. Variable et groupes de comparaison

Variable principale, quand elle est effectivement diffusée : **médiane du revenu disponible par unité de consommation**, en euros par an, selon l'Insee, par IRIS ou commune. Ne pas utiliser le revenu brut moyen et ne pas assimiler automatiquement revenu faible et taux de pauvreté.

**Attention, schémas distincts :** le fichier Filosofi **carroyé à 200 m / 1 km ne publie pas de médiane du niveau de vie par carreau**. Il publie notamment `men` (nombre de ménages), `men_pauv` (nombre de ménages pauvres), `ind` (individus) et `ind_snv` (somme des niveaux de vie winsorisés). En l'absence d'une médiane, sélectionner **un indicateur de substitution explicitement nommé**, proposé ici : `povertyHouseholdShare = men_pauv / men` si `men > 0`, et sans autre condition de secret ou de qualité interdisant son usage. Cet indicateur est la **part de ménages pauvres**, pas la médiane des revenus, et ses quintiles doivent être calculés et évalués séparément. `ind_snv / ind` serait une moyenne winsorisée, **pas une médiane** : ne pas l'injecter silencieusement dans la matrice de revenu médian.

Pour éviter des seuils nominaux arbitraires et l'effet de l'inflation, classer les unités géographiques effectivement renseignées en **quintiles de revenu** au sein d'un **territoire de comparaison documenté et suffisamment large** (priorité : unité urbaine ; sinon EPCI / département ou région, avec version et effectifs conservés). Pour le pilote Paris, l'unité urbaine ou un autre référentiel métropolitain cohérent évite de faire du seul 5e-6e le groupe de comparaison. Les valeurs manquantes ou couvertes par le secret statistique sont exclues du classement. **Pour les carreaux utilisant `povertyHouseholdShare`, classer en sens inverse : part de ménages pauvres la plus élevée = classe Q1 du tableau ci-dessous (défavorisation la plus forte) ; part la plus basse = Q5.** Garder `indicatorType = median_disposable_income` ou `poverty_household_share`, avec validation séparée. On ne compare jamais directement leurs valeurs numériques ni leurs quintiles sans traitement de domaine.

| Classe de revenu relatif | Position dans la distribution | Coefficient déchets `M_rev,w` | Coefficient mégots `M_rev,c` | Statut |
|---|---|---:|---:|---|
| Q1, revenu le plus faible | 0 à 20 % | **1,06** | **1,02** | Hypothèse forte, non prouvée |
| Q2, revenu inférieur | 20 à 40 % | **1,03** | **1,01** | Hypothèse |
| Q3, revenu intermédiaire | 40 à 60 % | **1,00** | **1,00** | Référence neutre |
| Q4, revenu supérieur | 60 à 80 % | **0,98** | **0,99** | Hypothèse |
| Q5, revenu le plus élevé | 80 à 100 % | **0,96** | **0,98** | Hypothèse |
| Indisponible, secret, géographie non alignée | Non classable | **1,00** | **1,00** | `UNKNOWN`, pas une mesure de neutralité |

**Règle métier :** l'hypothèse « faibles revenus et déchets » n'autorise ni un bonus supérieur à `+6 %` ni une déduction sur les comportements individuels. Le mégot reçoit un effet expérimental moindre (`+2 %` au maximum), car l'activité extérieure localisée, les terrasses et les attentes sont des proxys plus directs.

La part de ménages pauvres issue du carroyage peut servir de **variable alternative** au revenu médian lorsqu'il est indisponible. Elle ne doit **jamais être cumulée** avec celui-ci pour majorer un même lieu. Un même désavantage monétaire ne peut générer deux bonus indépendants. Vérifier en outre les unités, les populations de référence et l'effet des imputations avant toute comparaison entre IRIS et carreaux.

### 2.2. Fiabilité et résolution de la source

Appliquer une rétraction vers `1,00` lorsque la statistique est moins précise spatialement ou moins fiable :

```text
M_revenu_effectif(k,z) = 1 + q(z) * (M_rev(k,z) - 1)
```

`q` est une **borne de prudence choisie pour la simulation**, pas un taux statistique de fiabilité mesuré :

| Signal revenu utilisable | `q` proposé | Interprétation |
|---|---:|---|
| IRIS directement raccordé, variable publiée, millésime géographique compatible | 1,00 | Effet intégral de la matrice candidate |
| Carreau Insee 200 m non imputé, **proxy distinct** `men_pauv/men` correctement géoréférencé | 0,75 | Différence d’indicateur et de population de référence ; test séparé |
| Carreau 200 m **imputé**, avec indicateur d'imputation | 0,35 | Atténuation et drapeau de qualité obligatoires |
| Carreau 1 km non imputé utilisant `men_pauv/men` | 0,40 | Information plus grossière et proxy distinct |
| Commune entière sans unité infracommunale fiable | 0,25 | Très faible différenciation ; ne pas fabriquer de micro-contrastes |
| Absence, suppression, conflit de géographie, secret statistique | 0,00 | `M = 1,00`, statut inconnu |

Un carreau `1 km` imputé ne reçoit pas automatiquement le même `q` que les carreaux non imputés : **mettre `q = 0,00` dans le pilote tant qu'un protocole spécifique n'a pas été validé**.

En l'absence de données locales fiables, la présence de bâtiments sociaux, la catégorie socioprofessionnelle présumée des habitants, des photographies de façades ou le statut QPV **ne constituent pas un substitut automatique au revenu**. Ces variables peuvent être documentées dans une étude de sensibilité distincte, avec examen des biais, mais pas transformer seules une rue en hotspot.

## 3. Matrice candidate : densité résidentielle

### 3.1. Contrat CURRENT, sans double comptage

Le modèle CURRENT `paris-pressure-risk-v3-urban-morphology` intègre déjà la pression résidentielle dans les scores IRIS :

| Branche du score de base | Poids de pression résidentielle CURRENT | Correction de densité supplémentaire à appliquer aujourd'hui |
|---|---:|---:|
| Déchets diffus | 0,22 | **×1,00** |
| Mégots | 0,05 | **×1,00** |

Ces poids ne sont **pas** des coefficients de causalité. La densité urbaine n'est pas identique à la fréquentation des trottoirs. Une IRIS densément peuplée mais résidentielle ne doit pas nécessairement dépasser un pôle commercial ou touristique.

### 3.2. Matrice de remplacement pour une future architecture nationale

**N'utiliser la table ci-dessous que si le nouveau modèle remplace explicitement la composante résidentielle actuelle ou produit un score de base dont la densité est absente.** Ne jamais multiplier cette table *par-dessus* le score CURRENT qui inclut déjà cette dimension.

Densité de résidents rapportée à la surface géographique justifiée, comparée à des secteurs d'**urbanité comparable**. Ne pas comparer directement une IRIS de parc, une forêt et un îlot de logements sans filtrer les usages du sol. Quintiles dérivés des seules valeurs publiées et comparables.

| Classe de densité relative | Coefficient déchets `M_dens,w` | Coefficient mégots `M_dens,c` | Conditions |
|---|---:|---:|---|
| Q1, très faible | 0,96 | 0,98 | Résidentiel et faible flux corroborés ; sinon `1,00` |
| Q2, faible | 0,98 | 0,99 | Proxy démographique seulement |
| Q3, médiane | 1,00 | 1,00 | Référence |
| Q4, élevée | 1,02 | 1,01 | Proxy démographique seulement |
| Q5, très élevée | 1,04 | 1,02 | Ne pas confondre population résidente et fréquentation |
| Non comparable / inconnue | 1,00 | 1,00 | `UNKNOWN` |

**Décision pour le pilote et le modèle publié actuel : `M_dens = 1,00` pour chaque rue.** Cette matrice existe uniquement pour le futur remplacement contrôlé du facteur résidentiel.

## 4. Formule candidate et ordre d'application

La politique de rue reste polarisée. Le contexte socio-démographique est **zonalisé et faible**, tandis que les POI déterminent les différences à quelques mètres.

Pour la zone de référence `z`, la branche `k` (déchets ou mégots) et le tronçon `e` :

```text
S_z,k       = score zonal CURRENT, calculé par le moteur canonique
M_rev,z,k   = 1 + q_z * (coefficient_revenu_z,k - 1)
M_dens,z,k  = 1 pour le modèle CURRENT ; table de remplacement uniquement si requis

S_cible,z,k = clamp(S_z,k * M_rev,z,k * M_dens,z,k, 0, 100)

C_raw,e,k   = clamp(C_road,e,k * C_poi,e,k, 0.15, 5.00)
S_e,k(a)    = clamp(a_z,k * C_raw,e,k, 0, 100)

Déterminer a_z,k >= 0 par bissection afin que :
  somme_e(longueur(e,z) * S_e,k(a_z,k)) / somme_e(longueur(e,z))
  = S_cible,z,k

S_mixte,e = (S_e,waste + S_e,cigaretteButts) / 2
```

**Pourquoi cet ordre est important :** ajuster d'abord la **cible zonale**, puis redistribuer les scores polarisés entre tronçons. Si l'on applique un coefficient de revenu constant à tous les segments *avant* une redistribution qui conserve l'ancienne moyenne IRIS, il s'annule mathématiquement et n'a aucun effet. La cible `S_cible` est donc la valeur à conserver, pas l'ancien `S_z`.

**Provenance obligatoire :** `baseZoneRisk`, `indicatorType`, `incomeQuantile`, `sourceVintage`, `geometryVintage`, `dataStatus`, `q`, `M_rev`, `M_dens`, `adjustedZoneTarget`, `roadCoefficient`, `poiCoefficient`, `finalSegmentRisk`, `modelVersion`. Les inconnues restent explicites. Si `S_z,k` est indisponible, le score final reste `null` et ne devient pas zéro.

**Exemple fictif, déchets :** score IRIS `40/100`, revenu Q1 non imputé (`1,06`), densité déjà intégrée (`1,00`) : `S_cible = 40 × 1,06 = 42,4`. La redistribution polarisée doit préserver une moyenne pondérée par la longueur de **42,4**, même après saturation de certains tronçons. Les valeurs de revenu et de déchets de cet exemple ne correspondent à aucun quartier réel.

### Plafonds et coexistence des facteurs

- La correction de revenu est bornée par la matrice ci-dessus, au maximum `+6 % / -4 %` pour les déchets et `+2 % / -2 %` pour les mégots, avant une éventuelle rétraction liée à la source.
- La correction s'applique **une seule fois**, au niveau zonal, et **ne crée jamais un micro-point autonome « revenu faible »**.
- Terrasses, commerces, stations et marchés déjà présents dans `S_z,k` doivent être **redistribués** à la résolution locale, pas comptés une deuxième fois. La politique polarisée et ses plafonds globaux continuent de s'appliquer.
- La morphologie urbaine déjà incluse dans le score zonal ne doit pas être pénalisée deux fois. La documentation polarisée détaille les deux stratégies à comparer avant activation.
- Un score `0` issu du calcul zonal reste `0` sous ce multiplicateur ; cela ne prouve pas une rue propre. Le manque de facteurs IRIS doit être pris en compte dans l'évaluation de couverture.

## 5. Sources : Paris et généralisation aux autres villes

### 5.1. Sources publiques prioritaires vérifiées

| Source officielle | Millésime et niveau disponibles | Utilisation recommandée | Vigilance |
|---|---|---|---|
| [Insee, Filosofi revenus et niveau de vie 2021 à l'IRIS](https://www.insee.fr/fr/statistiques/8229323) | 2021, géographie au 01/01/2022, IRIS admissibles | Revenu disponible médian par unité de consommation | Secret statistique, non-additivité des médianes, compatibilité des codes et contours IRIS avec le snapshot CleanMyMap |
| [Insee, revenus / pauvreté 2021 carroyés](https://www.insee.fr/fr/statistiques/8735243) | 2021, données publiées en février 2026, carreaux de 200 m et 1 km | Proxy de **part des ménages pauvres** (`men_pauv/men`), pas de médiane | Données imputées, informations manquantes, indicateurs non interchangeables, grille projetée |
| [Insee, description des carreaux 200 m](https://www.insee.fr/fr/statistiques/8735162) | 200 m, `men`, `men_pauv`, `ind`, `ind_snv` et `i_est_200` | Déterminer la qualité et le **type exact de proxy** | `ind_snv/ind` n'est pas une médiane ; ne pas afficher une imputation comme une mesure directe |
| [Insee, population à l'IRIS 2023](https://www.insee.fr/fr/statistiques/9054332) | Population 2023, géographie au 01/01/2025 | Évaluer la fraîcheur d'une future baseline nationale | Différente de la population 2021 du snapshot CURRENT ; pas de remplacement silencieux |
| [Insee, table d'appartenance des IRIS](https://www.insee.fr/fr/information/7708995) | Zonage IRIS / communes | Contrôle des identifiants | Communes non découpées assimilées à un seul IRIS ; la résolution n'est pas locale |
| [Insee, Filosofi 2, revenus et pauvreté 2023](https://www.insee.fr/fr/statistiques/8984752) | Résultats communaux et supra-communaux publiés en 2026 | Repli à la commune si nécessaire | **Pas de diffusion IRIS / carroyage 2023 dans cette publication** ; rupture de méthode, comparaison directe avec 2021 déconseillée |

La disponibilité d'une publication ne signifie pas que ses données ont été téléchargées, jointes ou contrôlées pour les 5e et 6e arrondissements. Vérifier le schéma exact des fichiers de chaque millésime avant codage. Éviter de prendre pour acquis un millésime IRIS 2022 ou 2023 de Filosofi, la diffusion infracommunale de 2023 n'étant pas assurée.

### 5.2. Matrice de repli géographique hors de Paris

| Cas territorial | Source de revenu privilégiée | Source densité privilégiée | Résolution déclarée | Stratégie |
|---|---|---|---|---|
| Paris / ville avec IRIS et revenu publié | Filosofi 2021 IRIS, après contrôle géographique | Population IRIS du recensement | IRIS | Modifier légèrement la cible des tronçons, sans afficher le contour IRIS |
| Ville avec IRIS mais revenu indisponible / secret | Carroyage Filosofi 2021 si diffusable, **part de ménages pauvres** | Population IRIS / carroyée | 200 m ou 1 km | Proxy distinct : quintiles inversés, statut et confiance propres, pas de médiane inventée |
| Commune sans IRIS infracommunal | Carroyage Filosofi 2021, proxy `men_pauv/men` | Carroyage / population communale | Carreau ou commune | Préférer le carroyage, sinon correction communale faible et uniforme |
| Commune sans carreau de revenu fiable | Filosofi 2 communal 2023 si publié | Recensement communal | Commune | `q = 0,25` ; aucune différenciation artificielle de ses rues |
| Zone rurale / faible population / diffusion secrète | Aucune valeur substituée automatiquement | Population et occupation des sols selon disponibilité | `UNKNOWN` / commune | `M_rev = 1,00`, confiance dégradée ; les POI réels restent dominants |
| Ville hors de France | Inventaire à faire auprès de l'institut statistique local | Sources démographiques nationales ou locales | À vérifier | **Pas d'extrapolation automatique** de la matrice française |

**Règle de résolution :** une maille de revenu n'est pas équivalente à l'emprise réelle d'une rue ou à une concentration observée de mégots. La jointure d'un segment et d'une zone utilise les géométries réelles, pas la seule proximité d'un centroïde. Une médiane statistique ne s'agrège pas par moyenne arithmétique d'autres médianes. Les millésimes et les limites géographiques doivent être alignés ou raccordés par une méthode explicitement validée.

**Règle sur les « proxies équivalents » :** il s'agit d'une **substitution pragmatique documentée**, pas d'une équivalence numérique ou sémantique. La médiane du niveau de vie par IRIS et la part de ménages pauvres par carreau représentent des statistiques différentes. Elles peuvent fournir des **classements de contexte** étudiés séparément, mais pas être fusionnées en une mesure homogène sans validation. Les pourcentages de logements sociaux, la typologie des logements, les prestations ou les catégories socioprofessionnelles ne remplacent pas automatiquement la médiane de revenu : cela exige une corrélation vérifiée, des contrôles d'éthique et de confidentialité et une validation indépendante.

## 6. Affichage de la heatmap

| Élément | Affichage | Calcul |
|---|---|---|
| Fond de carte OSM | Oui | Aucun score par défaut |
| Tronçons piétons / voies accessibles | **Oui, couleur par tronçon et clic** | Risques polarisés mégots / déchets / mixte |
| Micro-points d'infrastructure | **Oui, indépendants, cliquables** | Risque local et provenance distincts de la rue |
| Polygones IRIS | **Non, jamais dans le rendu heatmap** | Utilisés en interne pour jointure et cible zonale |
| Carreaux statistiques / revenu | **Non** | Utilisés en interne seulement |
| Points « quartier pauvre » | **Non** | Interdits : aucune infrastructure réelle ni déchet observé correspondant |
| Parcs, jardins et autres emprises réellement surfaciques | Selon besoin cartographique | Géométries utiles, pas un remplissage de risque IRIS |

Les infobulles peuvent indiquer la présence d'une « correction de contexte socio-démographique expérimentale » et la valeur exacte du coefficient, sans présenter la pauvreté comme une propriété des personnes ni attribuer à leurs habitants une responsabilité de pollution. Les observations terrain ont un statut visuel distinct des scores prédits.

## 7. Validation, biais et condition de lancement

Cette hypothèse doit être confrontée à des **mesures indépendantes** et non au nombre de signalements volontaires bruts :

1. Fixer une unité homogène : mégots comptés par 100 m de trottoir inspecté, déchets diffus par 100 m, largeur ou surface inspectée si connue ; enregistrer horaires, saison, météo et nettoiement documenté.
2. Échantillonner plusieurs classes de revenus et de densités, mais **apparier des rues de fréquentation, commerces, terrasses, transports, usages du sol et nettoiement comparables**. Tester des quartiers aisés très actifs et des quartiers modestes peu fréquentés pour éviter les conclusions automatiques.
3. Comparer au moins trois modèles hors échantillon spatial : **A** (IRIS + polarisé, sans revenu), **B** (A + revenu), **C** (même modèle avec la composante densité remplacée et non doublée). Conserver les mêmes observations et les mêmes découpages de validation.
4. Mesurer la qualité de classement des hotspots, les erreurs absolues, les faux positifs par profil de quartier, la couverture des facteurs et la robustesse aux quintiles de comparaison. Vérifier si B améliore A après contrôle des autres variables.
5. Réaliser les analyses de sensibilité au moins pour `M_rev = 1,00` (neutralisation), la matrice présente et une amplitude réduite de moitié. Tester séparément revenus par IRIS, grille 200 m et repli communal, sans déclarer ces représentations interchangeables.
6. **Ne pas activer automatiquement une majoration liée aux revenus en production** tant qu'une amélioration indépendante n'est pas démontrée et que l'analyse des biais n'est pas acceptable. Si l'effet disparaît après contrôle, garder `M_rev = 1,00` en production et conserver la matrice comme hypothèse historisée.

**Risque de stigmatisation et d'erreur écologique :** un quartier à faible revenu peut aussi être très bien entretenu ; un quartier aisé peut concentrer des mégots devant ses terrasses ou transports. Une corrélation à l'échelle IRIS ne permet pas d'inférer les comportements des habitants, visiteurs ou travailleurs. Le modèle sert à orienter une **inspection de l'espace public**, jamais à catégoriser des personnes, attribuer des fautes ou déterminer un accès à un service.

### Conditions d'entrée pour Codex (plus tard)

- Récupérer et vérifier les fichiers de revenus réellement diffusés, les variables, millésimes, licences, secrets, taux d'imputation, géométries et taux de jointure.
- Relire le `main`, les règles scoped, le contrat zonal, le plan polarisé, les consommateurs carte/planner et les tests.
- Ajouter la composante de revenu uniquement dans l'owner du calcul de risque existant, avec version de modèle et trace; éviter un deuxième moteur socio-démographique.
- Maintenir `M_dens = 1,00` tant que le modèle CURRENT inclut la pression résidentielle.
- Respecter `null/unknown`, la non-duplication des facteurs, le plafonnement, la conservation de la cible zonale après écrêtage et la séparation des scores mégots / déchets.
- Ne pas ajouter de polygones IRIS visibles à la heatmap ; conserver une UI de rues et points cliquables.
- Tester absence de revenus, secret, jointure décalée, communes sans IRIS, cas de saturation, neutralité, conservation des moyennes et impact différentiel entre quartiers.
- Documenter les résultats expérimentaux ; **STOP CONDITION :** décisions et tests de la matrice validés hors production, sans activation du facteur revenu avant preuve empirique.

## 8. Sources et traçabilité

### Sources primaires vérifiées au 1er novembre 2026

- Insee, *Revenus, pauvreté et niveau de vie en 2021 (Iris)*, 31 juillet 2024 : https://www.insee.fr/fr/statistiques/8229323
- Insee, *Revenus, pauvreté et niveau de vie en 2021 - Données carroyées*, 16 février 2026 : https://www.insee.fr/fr/statistiques/8735243
- Insee, *Données au carreau de 200 m*, 12 février 2026, variables `men`, `men_pauv`, `ind`, `ind_snv`, `i_est_200` : https://www.insee.fr/fr/statistiques/8735162
- Insee, *Données au carreau de 1 km*, 12 février 2026, variables et statut d'imputation : https://www.insee.fr/fr/statistiques/8735171
- Insee, *Population en 2023, recensement à l'IRIS*, octobre 2026 : https://www.insee.fr/fr/statistiques/9054332
- Insee, *Table d'appartenance géographique des IRIS* : https://www.insee.fr/fr/information/7708995
- Insee, *Indicateurs sur les revenus et la pauvreté au niveau local en 2023*, août 2026 : https://www.insee.fr/fr/statistiques/8984752
- Insee, *Note de refonte du dispositif Filosofi* : https://www.insee.fr/fr/metadonnees/source/fichier/Note_accompagnement_Filosofi_2023.pdf (référence de documentation, PDF non analysé dans ce travail).

### Provenance des décisions numériques

- **Poids IRIS CURRENT** `0,22` et `0,05` : `apps/web/src/lib/geo/paris-pressure-risk-contract.ts` sur `main`, lu le 1er novembre 2026.
- **Matrice revenu** `0,96...1,06` déchets, `0,98...1,02` mégots : **choix de simulation**, non estimation Insee et non calibrage scientifique.
- **Matrice densité de remplacement** `0,96...1,04` déchets, `0,98...1,02` mégots : **choix de simulation**, non activé sur CURRENT.
- **Rétraction `q`**, seuils de quintiles, géographie de comparaison : **conventions expérimentales** à valider.
- **Matrice POI et routes polarisées** : document de proposition dédié, conservé comme référence logique indépendante du nouveau volet socio-démographique.

> **Consigne de reprise :** ce document est un plan autonome de décision, pas une seconde source de vérité runtime. Lors de l'implémentation, intégrer les valeurs qui auront été retenues dans le contrat versionné propriétaire, mettre à jour sa documentation `CURRENT`, et ne conserver ici que la traçabilité de la proposition et des arbitrages.
