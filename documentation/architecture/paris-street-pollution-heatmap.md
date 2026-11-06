# Heatmap prédictive polarisée des voies piétonnes de Paris

**Statut : CURRENT / PILOT. Calque route facultatif livré pour le secteur Panthéon/Jardin des Plantes ; coefficients non calibrés.**<br>
**Périmètre : Paris intra-muros, commune INSEE 75056, domaine public accessible aux piétons.**<br>
**Identifiant de politique du pilote : `segment-zonal-neutral-v1`, dans `paris-pedestrian-risk-projection-v1`.**<br>
**Implémentation : projection Supabase matérialisée issue du graphe OSM piéton et des sources canoniques IRIS ; la carte Leaflet consomme le même cache serveur que le planner, sans requête OSM à l'ouverture.**<br>
**Chemin exact prévu : `documentation/architecture/paris-street-pollution-heatmap.md`.**<br>
**Document remplacé : proposition `paris-street-risk-heuristics-v0` soumise par l'utilisateur.**

## Décisions structurantes

1. **Polarisation assumée** : le modèle expérimental distingue franchement les zones de forte activité et les rues à très faible pression. L'amplitude de certains multiplicateurs est volontairement importante : environ `0,20` à `4,00` selon la famille. Il s'agit de *contrastes de classement*, **pas d'effets empiriques démontrés**.
2. **Deux risques autonomes** : `cigaretteButtRisk` et `wasteRisk`. Une seule activité ne reçoit pas nécessairement le même coefficient dans les deux familles. La visualisation `mixte` est toujours la moyenne arithmétique exacte des deux scores disponibles ; elle ne remplace jamais le vecteur à deux composantes exploité par l'optimiseur.
3. **Réseau d'abord** : l'unité d'optimisation est le segment piéton accessible, et non le centroïde IRIS ou un cercle approximatif de chaleur. Le rendu suit les tronçons, non les bâtiments.
4. **IRIS comme référence** : réutiliser le modèle zonal existant et sa provenance, sans réécrire ni doubler ses composantes. Les matrices polarisées sont une proposition de redistribution spatiale *au sein* des zones à partir de facteurs locaux crédibles.
5. **Données maximales, preuves explicites** : collecter autant de proxys locaux pertinents que leurs sources et licences le permettent, mais ne donner un effet numérique qu'aux facteurs effectivement vérifiés à leur maille réelle. Un champ absent reste inconnu ; « zéro observation » ne veut pas dire « rue propre ».
6. **Nettoyage et accessibilité séparés** : le risque de production de déchets, le stock résiduel disponible, l'additionnalité bénévole et l'autorisation de nettoyer sont quatre dimensions différentes. Pas de bonus automatique à une zone dangereuse ou inaccessible.
7. **Une seule source de vérité** : la heatmap route expose le cache `paris-pedestrian-risk-projection-v1`, construit avec `paris-pressure-snapshot`, `paris-pressure-risk-v3-urban-morphology`, la serviceabilité municipale et leurs provenances. Elle est activable comme calque prédictif et le planner sélectionne dans ce même cache ; aucun second modèle IRIS ni aucune donnée observée ne sont fabriqués dans l'interface.

La carte ne cadre pas sur les 40 661 sous-segments du pilote : elle cadre sur les
parcours et groupes affichés, puis rend seulement les segments intersectant la
fenêtre visible. Les détails scientifiques restent ceux du cache canonique.
La catégorie choisie et l'échelle d'intensité sont deux signaux visuels
distincts. Le mode mixte affiche les deux confiances séparément et ne prétend
pas garantir une quantité ou une composition de déchets collectés.

### Classification des affirmations

- `CURRENT` : implémenté ou documenté dans `main` à la révision indiquée ; cela ne vaut pas preuve de couverture réelle ou de test passé en production.
- `VERIFIED_SOURCE` : existence, description ou schéma d'une source publique vérifié. Une source disponible n'est pas nécessairement intégrée ni complète.
- `PROXY` : indicateur observable corrélé de façon *possible* à la pression ou à l'accumulation.
- `ASSUMPTION` : coefficient, rayon, seuil ou effet proposé sans calibration parisienne.
- `UNKNOWN` : direction ou ampleur d'un effet insuffisamment étayée. Ne pas inventer un zéro.
- `OBSERVED` : mesure de terrain ou fait explicitement enregistré avec date, méthode et provenance, et non simple donnée OSM.

**Avertissement scientifique.** Un score de `80/100` ne signifie ni « 80 % de probabilité de trouver des déchets », ni « 80 mégots », ni « 80 % des déchets » du quartier. Un coefficient `3,20` signifie une *hypothèse de pression relative* trois virgule deux fois supérieure au profil de référence avant redistribution et saturation. La matrice ne constitue pas une prédiction de rendement en objets/h ou en kg/h.

Les associations spatiales de la littérature sont transférables comme *hypothèses de facteurs*, pas comme paramètres numériques. Une étude SIG de Madrid a trouvé de fortes concentrations de mégots près des lieux d'hôtellerie-restauration et des arrêts de transport ; une étude française sur les déchets urbains souligne l'importance de l'usage des sols, des activités et de la rétention dans les espaces végétalisés. Ni l'une ni l'autre ne valide un coefficient précis pour Paris (références en section 4.9).

## 1. Indices de pollution déjà documentés dans CleanMyMap

### 1.1. Modèle de pression IRIS, état réel (`CURRENT`)

Le modèle `paris-pressure-risk-v3-urban-morphology` (`apps/web/src/lib/geo/paris-pressure-risk.ts` et `paris-pressure-risk-contract.ts`) produit deux scores zonaux entre 0 et 100. Le snapshot `paris-pressure-v1`, identifié `paris-iris-2024-pop-2021-r2-polygon`, décrit 992 IRIS parisiens. La complétude géométrique ne prouve pas la fraîcheur ni la complétude de chaque facteur. Les poids ci-dessous sont ceux du **code existant**, non ceux des nouvelles matrices :

| Facteur IRIS CURRENT | Déchets | Mégots | Notes |
|---|---:|---:|---|
| Pression résidentielle | 0,22 | 0,05 | Densité / population normalisées |
| Pression des transports | 0,16 | 0,18 | Signal agrégé de transport |
| Nombre de stations | 0,00 | 0,12 | Composante autonome mégots |
| Pression touristique | 0,16 | 0,15 | Source et résolution selon snapshot |
| Activités publiques et lieux fréquentés | 0,14 | 0,00 | Facteur déchets |
| Terrasses | 0,00 | 0,25 | Facteur mégots |
| Marchés | 0,08 | 0,08 | Signal agrégé |
| Événements récents | 0,12 | 0,12 | Contexte temporel sourcé |
| Historique validé de la bonne famille | 0,12 | 0,05 | Historique séparé par famille |
| **Somme** | **1,00** | **1,00** | Poids sur signaux normalisés |

Formule actuelle : `points_i = 100 × weight_i × normalized_i` si le signal est disponible ; absence de signal = contribution nulle *avec manque déclaré*, pas observation d'absence de pollution. Échelles de normalisation des comptages CURRENT : station `3`, terrasse `40`, marché `4`, historique déchets `6`, historique mégots `150` ; ce ne sont pas des ratios de salissure. La correction *Dans Ma Rue* est plafonnée à `±12` points à l'IRIS et `±9` à l'arrondissement, avec preuves de résolution.

### 1.2. Prior morphologique existant (`CURRENT`)

`urban-morphology-prior-v1` atténue certains scores par un malus plafonné à **10 points déchets** et **8 points mégots**, avec confiance minimale `0,55`. Ses valeurs internes servent à répartir ce malus, **pas à multiplier le niveau de déchets**.

| Morphologie | Coefficient interne déchets | Coefficient interne mégots |
|---|---:|---:|
| Rue locale à faible trafic | 0,30 | 0,15 |
| Impasse | 0,20 | 0,10 |
| Intérieur de parc | 0,35 | 0,35 |
| Secteur résidentiel à faibles flux | 0,15 | 0,10 |

Le modèle prévoit des exceptions de forte activité : `parkEntrance`, `parkEdge`, `parkAmenity`, `foodService`, `stationProximity`, `commerceProximity`, `schoolProximity`, `terraceProximity`, `touristProximity`. **Le malus IRIS ne doit pas être appliqué une deuxième fois comme pénalité indépendante du même facteur segmentaire.**

### 1.3. Éléments discutés mais non chiffrés dans le modèle CURRENT

- Boulevards et avenues à forte fréquentation : priorité potentielle, **sans coefficient positif garanti par le seul nom de voie**.
- Impasses, ruelles et rues locales : atténuation envisageable si faible fréquentation attestée ; ne pas conclure qu'elles sont sans déchets.
- Quartiers touristiques : pression IRIS déjà modélisée ; les *portes, quais, files d'attente, parcours et débouchés* peuvent apporter une localisation plus fine.
- Quartiers étudiants : distinguer les entrées de campus, pauses, restaurations et calendriers, plutôt qu'appliquer un bonus uniforme à un arrondissement.
- Terrasses et marchés : déjà représentés grossièrement dans le score zonal ; les localiser finement doit redistribuer la pression et non ajouter le même phénomène deux fois.
- Nettoyage municipal : serviceabilité et accessibilité géométrique ne valent pas preuves de fréquence ni d'absence de nettoyage. Le snapshot CURRENT est `municipal-cleaning-serviceability-v2`.

### 1.4. Quatre notions métier à ne pas confondre

| Notion | Mesure ou interprétation | Limite essentielle |
|---|---|---|
| Pression de génération | Potentiel relatif lié aux usages et flux | Ne prouve pas un dépôt au sol |
| Accumulation / stock accessible | Déchets encore présents et ramassables | Dépend du nettoiement, météo, rétention et interventions |
| `volunteerAdditionality` | Intérêt complémentaire potentiel d'une cleanwalk | Distinct de la quantité de pollution |
| Éligibilité du corridor | Accès public, sécurité, praticabilité, éventuel côté de rue prouvé | Jamais déduit d'un simple score ou trait de carte |

**Arbitrage.** La matrice ci-dessous prédit d'abord la *pression spatiale*. Les interventions de nettoyage, l'accessibilité et les observations restent des couches séparées pour éviter une fausse fusion de preuves.

## 2. Matrice polarisée des types de voie et d'espace

**Statut intégral : `ASSUMPTION`.** Tableau volontairement plus sélectif que la version `v0`. `1,00` représente le profil moyen avant normalisation ; `0,20` est un profil théorique beaucoup moins intéressant que `2,40`. Les deux scores sont indépendants. La colonne mixte est `(mégots + déchets)/2`, calculée avant arrondi.

**Règle d'activation :** classification par géométrie et attributs vérifiés. Le type officiel `boulevard`, `avenue`, `ruelle`, `impasse` ne suffit pas à certifier le passage ou la malpropreté. Les classes de type de rue sont **exclusives** : une rue reçoit un seul profil principal, déterminé par des règles de priorité documentées. Un élément fort documenté (ex. rue de restaurants dans une petite ruelle) prévaut sur le malus morphologique de faible fréquentation.

| Profil ou contexte | Mégots | Déchets | Mixte | Conditions et interprétation |
| --- | ---: | ---: | ---: | --- |
| Impasse résidentielle sans commerce ni flux attesté | 0,20 | 0,25 | 0,23 | Profil très faible ; nécessite `dead_end` et absence de pôle attracteur corroborée, non simple suffixe de nom |
| Ruelle ou sente publique à très faible fréquentation | 0,28 | 0,35 | 0,32 | Accès public vérifié et absence d’activité locale documentée |
| Passage public discret, faible flux | 0,35 | 0,40 | 0,38 | Ne pas confondre passage public et propriété privée |
| Rue résidentielle à faible flux confirmé | 0,38 | 0,48 | 0,43 | Pas de réduction issue des seuls revenus ou profils sociaux |
| Rue locale calme, pas de destination active | 0,50 | 0,55 | 0,53 | Faible connectivité/activité spatiale corroborée |
| Escalier public secondaire, peu fréquenté | 0,45 | 0,50 | 0,47 | Seulement si accès possible et sécurité compatible |
| Voie principalement automobile, trottoirs peu actifs | 0,62 | 0,72 | 0,67 | Le débit automobile n’est pas une preuve de piétons |
| Allée intérieure de parc à faible usage, entretien documenté | 0,45 | 0,60 | 0,53 | Très incertain : des déchets peuvent se retenir dans les espaces végétalisés |
| Rue résidentielle ordinaire sans signe distinctif | 1,00 | 1,00 | 1,00 | Référence neutre, non preuve de propreté |
| Rue mixte habitat et commerces épars | 1,15 | 1,20 | 1,17 | Activités reconnues, présence simple |
| Avenue principale avec flux piéton documenté | 1,75 | 1,90 | 1,82 | Pas de bonus automatique par libellé « avenue » |
| Boulevard à fort flux piéton et stationnements | 1,85 | 2,05 | 1,95 | Sources de fréquentation nécessaires |
| Rue commerçante continue et active | 1,80 | 2,15 | 1,98 | À partir des façades et commerces réellement géolocalisés |
| Rue piétonne très commerçante | 1,95 | 2,40 | 2,17 | Piétonnisation + intensité commerciale, non piétonnisation seule |
| Place publique de rassemblement récurrent | 2,10 | 2,30 | 2,20 | Lieu public et forte intensité d’usage documentées |
| Rue de cafés et bars, très animée | 2,35 | 1,90 | 2,12 | Tester interactions avec POI : ne pas recompter les terrasses |
| Rue universitaire avec fortes entrées et restauration | 2,05 | 1,75 | 1,90 | Entrées effectives et activité, pas « étudiant » comme étiquette |
| Rue touristique à forte marche et consommation | 1,95 | 2,30 | 2,12 | Flux local ou combinaison de proxies prouvés |
| Promenade de Seine très fréquentée | 1,60 | 2,05 | 1,82 | Vérifier régime d’accès, emprise publique et type de berge |
| Entrée ou bord de parc avec commerce et flux | 1,80 | 1,95 | 1,88 | Ne pas étendre à tout l’intérieur du parc |
| Intérieur de parc fréquenté avec pauses et pique-niques | 1,10 | 1,75 | 1,43 | Contredit l’hypothèse générale « parc = propre » |
| Sous-passage public utilisé et accessible | 1,35 | 1,60 | 1,48 | Accumulation possible ; restriction/risque à part |
| Grand carrefour piéton à temps d’attente notable | 1,75 | 1,65 | 1,70 | Nécessite un proxy crédible de flux piétons/attente |
| Ruelle touristique de restauration, dense malgré faible largeur | 2,15 | 2,60 | 2,38 | L’activité locale l’emporte sur « ruelle = faible risque » |

### 2.1. Politique d'arbitrage des classes

1. **Très forte activité prouvée** : classer d'abord par destinations/flux actifs, même si la rue est étroite, résidentielle sur le papier ou sans issue.
2. **Faible pression corroborée** : donner un coefficient bas seulement lorsqu'un faisceau de facteurs indépendants confirme une faible fréquentation ; l'absence de POI référencé ne suffit pas, car OSM/BDCOM peuvent être incomplets.
3. **Voie piétonne isolée** : piétonnisation = accessibilité, pas intensité. Une aire piétonne sans commerce ou sans flux ne reçoit aucun bonus de fréquentation.
4. **Espaces verts** : distinguer intérieur peu fréquenté, abords, entrées et espaces de rassemblement. Une étude française sur les déchets urbains rapporte aussi la rétention des déchets dans la végétation : aucun malus uniforme « parc = propre » sans indice d'usage et d'entretien.
5. **Conflit faible/fort** : privilégier l'activité forte **observée**, conserver les preuves contradictoires et abaisser la confiance de classification au lieu de cacher le conflit.
6. **Privé/dangereux** : un score élevé n'autorise ni entrée dans une cour privée, ni ramassage sur chaussée rapide, ni accès à une emprise de transport, ni collecte d'objet dangereux.

### 2.2. Effet volontairement fort mais non permanent

Les profils `0,20` à `2,60` sont des **priors de classement**. Ils ne doivent pas être appliqués comme une vérité toute la journée : un marché fermé, une rue d'étudiants pendant les vacances, une terrasse estivale retirée et une place occupée par un événement ne sont pas des situations équivalentes. Les composantes temporelles suivent la section 4 et conservent la dernière version vérifiable de leurs sources.

## 3. Matrice polarisée des activités et micro-lieux

**Statut intégral : `ASSUMPTION`.** Les valeurs ci-dessous expriment des influences *potentielles* de proximité lorsque le POI et son usage pertinent sont vérifiés. Ce ne sont ni des estimations de mégots au mètre carré, ni des rapports de densité issus d'une régression parisienne.

La polarisation privilégie les signaux documentables de **consommation/attente extérieure**, très différents selon mégots et déchets. Certains objets géographiques ont volontairement `1,00` lorsque l'effet est indécidable. Les proxys de vente de tabac et d'école sont marqués de forte incertitude : la vente ou la présence d'élèves n'est jamais une observation de tabagisme.

| Profil ou contexte | Mégots | Déchets | Mixte | Conditions et interprétation |
| --- | ---: | ---: | ---: | --- |
| Zone de fumeurs extérieure officiellement identifiée | 4,00 | 1,20 | 2,60 | Signal géographique réel requis ; interdictions et accès vérifiés ; pas d’inférence par population |
| Sortie de discothèque / bars en fin d’activité | 3,85 | 2,45 | 3,15 | Activité vérifiée et créneau pertinent ; ne pas extrapoler de nuit au matin |
| Entrée de bar fréquenté avec clientèle dehors | 3,65 | 1,65 | 2,65 | Vérifier l’usage réel de l’espace extérieur |
| Terrasse de bar très fréquentée | 3,35 | 1,55 | 2,45 | Autorisation + activité confirmées ; période estivale / permanente |
| Regroupement régulier extérieur de fumeurs en pause | 3,50 | 1,20 | 2,35 | Observations anonymes et espace public autorisé ; pas de traçage individuel |
| Entrée de gare importante, accès localisé | 3,05 | 2,15 | 2,60 | Validation ferrée à l’arrêt, pas flux par sortie |
| Sortie de métro fortement utilisée | 3,00 | 1,85 | 2,42 | Niveau station ≠ flux d’une sortie sans attribution étayée |
| Arrêt de bus avec validation élevée documentée | 2,60 | 1,50 | 2,05 | Donnée trimestrielle selon arrêt disponible, pas forcément récente |
| Arrêt de bus sans volume fiable | 1,55 | 1,20 | 1,38 | Présence seule : niveau moins affirmatif |
| Zone d’attente de station de taxi / transport | 1,95 | 1,50 | 1,73 | Plausible mais preuve locale faible |
| Restauration rapide à emporter, forte activité | 1,55 | 3,65 | 2,60 | Emballages, boissons et consommation sur place à distinguer |
| Sandwicherie, kebab ou boulangerie à emporter | 1,55 | 3,30 | 2,42 | Effet fort hypothétique des repas consommés dehors |
| Épicerie ouverte tard / supérette animée | 2,00 | 2,35 | 2,17 | Effet dépend du type de vente et de la fréquentation |
| Concentration de commerces alimentaires actifs | 1,75 | 2,70 | 2,23 | BDCOM / OSM dédupliqués ; pas de multiplicateur par boutique |
| Marché alimentaire pendant activité | 1,55 | 3,55 | 2,55 | Emprise réelle, jours de présence et nettoiement post-marché |
| Étal de vente ambulante actif | 1,35 | 2,65 | 2,00 | Présence temporaire documentée |
| Restaurant traditionnel avec attente extérieure | 2,25 | 1,85 | 2,05 | Exiger un signal extérieur plutôt que la seule cuisine |
| Commerce de tabac / vapotage | 1,85 | 1,20 | 1,52 | Vente ≠ rejet au sol, confiance faible, pas effet direct prouvé |
| Porte d’université / campus fréquenté | 2,45 | 1,65 | 2,05 | Entrée réelle et calendrier d’enseignement ; ne pas assimiler étudiants à fumeurs |
| Établissement d’enseignement, attente d’adultes à l’extérieur | 1,85 | 1,30 | 1,58 | Ne pas attribuer le tabagisme aux mineurs ; sensibilité forte au contexte |
| Entrée de grand immeuble de bureaux avec pauses | 2,35 | 1,25 | 1,80 | Usage extérieur effectivement constaté ou signal de fréquentation |
| Entrée de grand établissement de soins | 2,20 | 1,30 | 1,75 | Pas de conclusion sur les patients ; accès/sécurité et contexte explicites |
| Monument avec file touristique persistante | 2,45 | 2,50 | 2,48 | Entrée et file géolocalisées ; saisonnalité |
| Site photographique très fréquenté | 1,85 | 2,80 | 2,33 | Nécessite preuve d’intensité, pas un simple POI touristique |
| Sortie de musée / équipement culturel | 1,95 | 2,05 | 2,00 | Affluence variable selon horaires |
| Cinéma / salle de concert après séance | 2,70 | 2,30 | 2,50 | Session/activité temporelle nécessaire |
| Grand événement sur espace public avec restauration | 2,55 | 3,85 | 3,20 | Signal daté, géométrie, nettoyage post-événement |
| Stade / enceinte après manifestation | 2,55 | 3,65 | 3,10 | Périmètre public et autorisations à vérifier |
| Banc ou espace de pause prouvé très utilisé | 1,70 | 1,85 | 1,77 | Mobilier seul ne prouve rien ; contexte de fréquentation requis |
| Esplanade de pique-nique fréquentée | 1,45 | 2,75 | 2,10 | Accès et horaires du parc ; accent déchets |
| Rive / talus avec rétention documentée | 1,35 | 2,25 | 1,80 | Rétention ≠ dépôt ; présence de déchets et accès à vérifier |
| Pieds d’arbres / jardinières sur axe actif | 1,55 | 2,10 | 1,83 | Risque de rétention ; objets difficiles à atteindre exclu |
| Accumulation à l’avaloir / grille accessible | 1,45 | 2,05 | 1,75 | Ne pas manipuler les grilles ni entrer sur chaussée |
| Arrêt de cars touristiques actif | 2,15 | 2,30 | 2,22 | Géolocalisation réelle, flux et horaires |
| Livraisons / quai logistique commerçant | 1,15 | 2,10 | 1,62 | Déchets d’activité potentiellement professionnels, pas forcément admissibles |
| Proximité d’une corbeille sans autre indice | 1,00 | 1,00 | 1,00 | Signe de l’effet inconnu ; ne pas appliquer de bonus automatique |
| Toilettes publiques sans contexte de passage | 1,00 | 1,00 | 1,00 | Localisation disponible mais signe de pollution inconnu |

### 3.1. Application spatiale sans inflation artificielle

Une terrasse, un bar, un restaurant et une rue commerçante peuvent désigner le **même lieu d'activité**. Il est interdit de multiplier naïvement leurs coefficients pour produire un risque extrême. Proposition initiale :

- Regrouper les indices corrélés dans des **familles exclusives** : `hospitality_and_smoking`, `food_takeaway_and_market`, `transport_waiting`, `education_and_work`, `tourism_and_culture`, `public_event`, `retention_geometry`.
- À l'intérieur d'une famille, conserver le signal local **dominant fiable** ; les occurrences proches du même établissement sont dédupliquées par ID, adresse et géométrie avant calcul.
- Entre familles, préférer d'abord la **plus forte influence admissible** (et non leur produit), avec un plafonnement global ; la possibilité d'un effet conjoint ultérieur exige une justification et un test séparé.
- Appliquer une décroissance de proximité aux façades, accès et emprises réels et non aux seuls centroïdes. Une rue séparée par un bâtiment, une cour privée ou une clôture ne reçoit pas l'influence d'un POI à distance égale de l'autre côté.
- Les traces conserveront `featureFamily`, `sourceId`, `sourceDate`, `rawCoefficient`, `attenuation`, `appliedCoefficient`, `confidence`, `exclusionReason`.

### 3.2. Distances initiales pour la simulation uniquement

| Distance du segment au point d'influence *accessible* | Facteur de présence `a(d)` | Décision de prototype |
|---|---:|---|
| 0 à 15 m | 1,00 | Influence maximale près de la façade ou de l'entrée |
| Plus de 15 à 40 m | 0,65 | Influence atténuée |
| Plus de 40 à 80 m | 0,30 | Influence faible |
| Plus de 80 m | 0,00 | Pas d'influence directe |

**ASSUMPTION non calibrée** : ces seuils sont **provisoires**, en mètres, jamais présentés comme des rayons mesurés. Le calcul final doit privilégier la distance au réseau accessible, l'appartenance à la même face de rue lorsqu'elle est prouvée et la forme réelle d'une emprise. Pour les marchés, les quais, les grands campus et les événements, une géométrie polygonale ou linéaire doit remplacer l'entrée ponctuelle. Ne pas générer un couloir nettoyable `left/right` à partir de cette distance.

Formule d'atténuation pour la simulation : `C_atténué = 1 + a(d) × (C_table - 1)` ; une source inconnue ne reçoit pas un `a=1` présumé.

### 3.3. Temporalité : horaires, saison, jour type

La géométrie d'une terrasse autorisée ne prouve pas son activité permanente. Les POI dotés d'horaires utilisables doivent produire une activation contextualisée : en activité, sortie/fin d'activité, fermeture, statut inconnu. À défaut d'horaire fiable, **ne pas supposer `open_now`** et rétrograder la confiance ; le niveau de pression de fond peut rester disponible si sa source le justifie. Une fermeture après nettoyage documenté n'est pas un niveau zéro.

Éviter les multiplicateurs temporels agressifs non étayés : la polarisation principale réside déjà dans la matrice *localisée* ; le temps sert d'abord à **activer, désactiver ou dégrader les preuves** avant recalibration empirique.

## 4. Enrichissement massif des proxys théoriques pour Paris

Objectif : produire un inventaire aussi **riche et réellement mobilisable** que possible, sans transformer des corrélations plausibles en causalités. La qualité et la maille de chaque signal comptent davantage que le volume brut de champs. Les variables ci-dessous sont réparties par familles pour permettre des jointures et contrôles de dépendance.

**Priorité d'intégration :** `P0` = source vérifiable, utile et spatialement exploitable ; `P1` = utile avec préparation/contrôle de qualité ; `P2` = exploratoire ou ambigu. Les labels « signe + » indiquent une *hypothèse directionnelle*, pas un résultat mesuré à Paris.

### 4.1. Flux et destinations, première famille à enrichir

| Proxy | Direction / famille | Granularité cible | Données candidates | Priorité et réserve |
|---|---|---|---|---|
| Débit piéton mesuré, par horaire | + mégots, + déchets | Compteur / rue / temps | Capteurs ou études de mobilité si disponibles | P0 si source vérifiée, sinon `UNKNOWN` |
| Entrée exacte de métro | + mégots fort | Point d'accès | OSM, PVP accès piétons métro | P0, ne pas attribuer le flux de station uniformément à chaque sortie |
| Validations rail par station | + deux, surtout mégots | Station + trimestre | Île-de-France Mobilités (IDFM) | P0, jointure station/accès avec incertitude |
| Profil horaire rail | Module temporel | Arrêt + jour type + plage | IDFM | P0/P1, respecter distinction validation/présence extérieure |
| Validations bus/tram par arrêt | + deux | Arrêt ou ligne selon millésime | IDFM | P0 uniquement si identifiant et maille arrêt réels |
| Abri voyageur / banc d'attente | + mégots possible | Point | PVP / OSM | P1, signe seul insuffisant |
| Convergence de correspondances | + attente extérieure hypothétique | Nœud de transport | IDFM / graphe | P1, détecter les doublons métro/bus |
| Zones de taxis, cars touristiques | + deux hypothétique | Point ou linéaire | OSM / transport | P1, horaires inconnus |
| Centralité piétonne du graphe (betweenness) | + deux hypothétique | Segment du réseau | OSM/Geofabrik, hors requête | P1, ne remplace pas le flux observé |
| Densité de destinations accessibles à 5-10 min | + deux hypothétique | Segment / iso-distance réseau | OSM/BDCOM | P1, fenêtre et profils non calibrés |
| Continuité des trottoirs et intersections | Accessibilité, non pollution brute | Segment | OSM / PVP | P0 comme contrainte, pas bonus automatique |

### 4.2. Commerces, restauration et tabac

| Proxy | Direction / famille | Granularité cible | Données candidates | Priorité et réserve |
|---|---|---|---|---|
| Commerce en rez-de-chaussée avec accès sur rue | + déchets, selon catégorie | Adresse/façade | Apur BDCOM | P0, millésime vérifié |
| Densité et continuité des façades actives | + deux | 100 m de voie, segment | Apur BDCOM | P0/P1, dédoublonner activités |
| Bar/café avec terrasse autorisée | + mégots fort | Terrasse/emprise/point | Paris Data + BDCOM | P0, autorisation ≠ fréquentation |
| Terrasse estivale / contre-terrasse | + mégots, variable | Point, période | Paris Data terrasses | P0/P1, saisonnalité |
| Bar nocturne / discothèque | + mégots et déchets après activité | Local + horaire | BDCOM / OSM + source d'horaires fiable | P1, activité actuelle incertaine |
| Restaurant avec consommation extérieure | + deux | Adresse/entrée | BDCOM / OSM | P1, distinguer salle intérieure et attente dehors |
| Vente à emporter / restauration rapide | + déchets très fort | Commerce / façade | BDCOM, OSM `takeaway=*` | P0/P1, couverture des tags inégale |
| Boulangerie / sandwicherie / kebab | + déchets | Commerce | BDCOM / OSM | P0/P1, ne pas inférer consommation extérieure systématique |
| Vente de boissons en emballage jetable | + déchets | Commerce | BDCOM/OSM, typologie | P1, catégorie commerciale ≠ articles vendus |
| Supérette / épicerie ouverte tard | + déchets, + mégots hypothétique | Point / horaire | BDCOM / OSM | P1, horaires non garantis |
| Bureau de tabac | + mégots **non prouvé** | Point | BDCOM / OSM | P2, vente de tabac ≠ mégots jetés à cet endroit |
| Commerce temporaire et food trucks | + déchets | Emprise + calendrier | Autorisations si disponibles | P2, couverture non vérifiée |
| Locaux vacants / rideaux fermés | Réduction d'activité possible | Adresse | Apur BDCOM | P1, ne prouve pas faible trafic alentour |

### 4.3. Tourisme, étudiants et temps forts

| Proxy | Direction / famille | Granularité cible | Données candidates | Priorité et réserve |
|---|---|---|---|---|
| Entrée et files de monuments | + deux | Accès et emplacement de file | OSM, exploitant, enquêtes | P1, fréquentation par entrée rarement connue |
| Circuit touristique réellement piéton | + deux | Séquence de segments | Itinéraires publics vérifiés, OSM | P1, circuit déclaré ≠ fréquentation |
| Visites de musées, sites et attractions | + deux | Site + période | Culture / opérateur | P1, fréquentation annuelle non localisée par porte |
| Arrêt de cars touristiques et dépose-minute | + deux | Point / créneau | OSM/transport | P1, sous-couverture possible |
| Entrée de campus/université | + mégots hypothétique, + déchets | Entrée de bâtiment | MESR implantations + OSM | P0/P1, établissement ≠ nombre de personnes à la porte |
| Effectifs étudiants quand publiés par implantation | Pression potentielle | Implantation / année | MESR | P1, ne pas attribuer tout l'effectif à la même entrée |
| Calendrier universitaire/vacances/examens | Activation temporelle | Campus + jour | Établissements | P1, forte disparité d'établissements |
| Restaurants et commerces autour des campus | + déchets | Tronçons proches | BDCOM/OSM | P0/P1, attribution spatiale nécessaire |
| Places et seuils de grands bâtiments de bureaux | + mégots potentiels | Accès extérieur | OSM, données d'emploi si disponibles | P1, aucun profil de fumeur individuel |
| Cinémas/théâtres/salles de concert | + deux à la sortie | Accès + horaires | OSM/programmation publique | P1, horaires concrets nécessaires |
| Manifestation, fête, événement de quartier | + déchets, + mégots | Emprise + créneau | Calendriers publics autorisés | P1, jauge et présence incertaines |
| Matchs, événements sportifs et parades | + déchets après événement | Emprise et accès | Calendriers publics | P1, éviter lieux privés et chaussée interdite |
| Marchés hebdomadaires, brocantes, vide-greniers | + déchets au bon moment | Polygone + jour | Paris Data / agendas | P0/P1, nettoiement après fermeture |

### 4.4. Morphologie et rétention des petits déchets

| Proxy | Rôle possible | Maille | Source candidate | Priorité et limite |
|---|---|---|---|---|
| Sens sans issue / degré de nœud du graphe | Réduction de flux possible | Segment | OSM | P0, malus seulement si faible activité corroborée |
| Niveau de voie et largeur de trottoir | Praticabilité, accumulation possible | Segment | OSM / PVP | P1, données souvent manquantes |
| Rue piétonne permanente | Accessibilité, pas affluence | Polygone | Paris Data `aires-pietonnes` | P0, aucun bonus de fréquentation par défaut |
| Voie piétonne périodique | Accessibilité selon horaire | Polygone + créneau | Paris Respire si couche validée | P1, régime horaire à intégrer |
| Entrée/limite/intérieur de jardin | Usage et permission distincts | Polygone + accès | OSM / Ville de Paris | P0/P1, intérieur protégé parfois non autorisé |
| Massifs, pieds d'arbres, jardinières | Rétention potentielle | Point / petite surface | Paris Data PVP | P1, pas de manipulation dangereuse |
| Bandes enherbées et talus | Rétention de fragments | Polygone | OSM / espaces verts | P1, étude française suggère stockage de déchets |
| Grilles, avaloirs, caniveaux | Accumulation locale possible | Point/ligne | PVP si disponible | P2, la chaussée reste exclue du nettoyage bénévole |
| Bancs / espaces d'attente | Usage possible | Point | Paris Data PVP | P1/P2, signe non établi sans fréquentation |
| Corbeilles et dispositifs de tri | Effet net ambigu | Point | Paris Data PVP | P1 pour contexte, coefficient neutre |
| Toilettes publiques | Potentiel lieu d'attente | Point | Paris Data `sanisettesparis` | P2, coefficient neutre sans preuve |
| Passages couverts / arcades / sous-ponts | Rétention/usage spécifiques | Ligne/polygone | OSM / PVP | P1/P2, sécurité d'abord |
| Berges et quais accessibles | Pression de loisirs et rétention | Lignes/polygones | OSM / Ville de Paris | P1, distinguer eau et passage public |
| Exposition au vent et pluie | Redistribution/lessivage possible | Segment / temps | Météo + morphologie | P2, signe et amplitude non calibrés |
| Pente et ruissellement vers avaloirs | Transport de fragments | Segment | MNT, PVP si disponibles | P2, ne pas fabriquer un dépôt au point bas |
| Travaux de voirie / déviations | Modification des flux et sécurité | Polygone + temps | Open data travaux si vérifiée | P1, présence de chantier ≠ déchets bénévoles |

### 4.5. Historique de propreté, entretien, accumulation et observations

| Proxy | Utilité | Granularité | Source candidate | Règle de prudence |
|---|---|---|---|---|
| Anomalies *Dans Ma Rue* filtrées « propreté » | Proxy historique local | Point, type, date | Paris Data | Seules catégories pertinentes ; délai de diffusion d'environ 3 mois |
| Anomalies récurrentes au même endroit | Hotspot potentiel | Zone d'influence dédupliquée | Paris Data | Fréquence des plaintes ≠ fréquence des dépôts |
| Signalements validés CleanMyMap / Trash Spotter | Observations historiques | Géométrie et horodatage | Supabase domaine canonique | `observed`, pas simple preuve de stock actuel |
| Résultats terrain de cleanwalks | Supervision et calibration | Rue, côté connu, date | Actions et preuves terrain | Distinguer avant collecte / ramassé / après |
| Passage de nettoiement documenté | Baisse possible du stock disponible | Emprise + date | Couche municipale avec preuve directe | Pas d'équivalence « nettoyé = zéro » |
| Fréquence municipale officiellement rattachée | Contextualiser l'additionnalité | Rue / secteur uniquement si documenté | Ville de Paris | Ne pas déduire une tournée de l'accessibilité mécanisée |
| Ancienneté depuis mesure ou collecte | Risque de repollution | Segment + période | Historique terrain | Aucune constante de repollution sans calibration |
| Organisation d'événement puis intervention | Contexte de stock temporel | Emprise + date | Agenda + nettoyage prouvé | Ne pas compter l'événement comme pollution observée |
| Corbeille proche et vidange connue | Contexte de gestion | Point + temps | Ville si publiée | Signe ambigu, coefficient neutre sans preuve locale |

### 4.6. Signaux explicitement exclus du modèle de pollution initial

- Origine ethnique, nationalité, religion, profil individuel des usagers et autres caractéristiques protégées : **aucun coefficient, aucune inférence**.
- Revenu médian ou valeur immobilière comme marqueur direct de « saleté » : **écarté**, car confond facteurs sociaux, pratiques de signalement, politiques de nettoyage et fréquentation.
- Prix d'un restaurant, prestige d'un arrondissement ou réputation d'un quartier : **écarté** sans observations pertinentes indépendantes.
- Présence de mineurs ou d'élèves comme indicateur de tabagisme : **interdit comme inférence** ; l'étude des zones d'attente d'adultes ne porte que sur les usages publics objectivement décrits.
- Accessibilité mécanisée comme preuve d'absence de passage municipal : **interdit** par les contrats CURRENT.
- Pollution atmosphérique, NO₂, particules ou bruit routier utilisés comme pollution de déchets solides : **non équivalents**, ne pas confondre les variables.
- Nombre brut de contributions citoyennes comme quantité de pollution : **écarté** sans correction du biais de couverture/participation.

### 4.7. Politique de sélection effective des variables

Chaque proxy possède un identifiant stable, `sourceId`, `sourceVersion`, `geometry`, `observedAt`, `refreshedAt`, `spatialResolution`, `temporalResolution`, `coverage`, `license`, `status`, `confidence`, `effectHypothesis`, `family`, `activationStatus`, `rejectionReason`.

Décisions fermes :

1. **Famille de pression principale** : ne pas attribuer le même événement à plusieurs variables multiplicatives ; par exemple un bar muni d'une terrasse ne vaut pas deux POI indépendants.
2. **Facteurs réellement proches** : proximité mesurée à l'emprise/entrée et au réseau admissible, pas uniquement distance euclidienne au centroïde.
3. **Facteurs fortement incomplets** : garder leur signal avec confiance faible ; ne pas conclure « faible risque » lorsqu'il manque des activités.
4. **Décision finale de nettoyage** : un bon score théorique ne peut forcer ni le passage dans un lieu privé, ni un trottoir non prouvé, ni une zone à risque bénévole.
5. **Aucune table de coefficients par nom propre** (« rue Mouffetard vaut 2,8 ») sans observation et facteurs quantifiés : le nom est un label, pas une mesure.

### 4.8. Registre de données vérifiées ou candidates au 1er novembre 2026

| Référence | Existence vérifiée ou rôle | Réserve de disponibilité |
|---|---|---|
| [D1] Apur BDCOM | Recensement localisé des commerces et rez-de-chaussée, millésimes ouverts 2017/2020/2023 ; nouvelle enquête avril 2026 | **Ne pas confondre enquête 2026 et export 2026 public** ; 2023 est vérifié comme diffusé |
| [D2] Paris Data Terrasses | Autorisations de terrasses permanentes et estivales géolocalisées | Autorisation ≠ ouverture / utilisation ; ODbL |
| [D3] Paris Data Marchés découverts | Emprises géométriques, typologie des marchés | Activité et entretien dépendent du jour/heure |
| [D4] IDFM validations rail par arrêt | Comptage des validations 2e trimestre 2026 | Station ≠ entrée, millésime et titre à traiter |
| [D5] IDFM profils horaires rail | Profils horaires par jour type 2e trimestre 2026 | Flux extérieur/présence réelle non observés |
| [D6] IDFM validations réseau de surface | Jeux aux niveaux **ligne ou arrêt selon le jeu exact**, avec millésimes différents | Ne jamais attribuer les validations d'une ligne à un arrêt individuel |
| [D7] MESR implantations publiques | Implantations géolocalisées d'enseignement supérieur | Noms et établissements peuvent refléter des structures historiques ; effectifs non systématiques |
| [D8] Paris Data Dans Ma Rue | Signalements d'anomalies historiques | Décalage de diffusion d'environ trois mois, biais de participation |
| [D9] Paris Data PVP mobilier | Bancs, jardinières, corbeilles | Couverture de voirie **non exhaustive** explicitement signalée |
| [D10] Paris Data Aires piétonnes | Emprises de piétonnisation permanente | Périodique « Paris Respire » est une autre politique |
| [D11] Paris Data Toilettes publiques | Points de toilettes publiques, y compris parcs et quais | Présence d'une toilette n'est pas une preuve de pollution |
| [D12] Geofabrik OSM Île-de-France | Extrait de graphe, POI et tags | ODbL, géométries/tags incomplets ; filtrer Paris réel |
| [D13] INSEE population IRIS | Proxy démographique de base déjà présent | Millésime population, granularité IRIS, non comportement individuel |
| [D14] Propreté Paris.fr | Organisation et fréquences générales de nettoiement | **Pas de fréquence exacte par rue / IRIS** sans preuve spécifique |

### 4.9. Références vérifiables (sources primaires et recherche)

**Données publiques :**

- [D1] Apur, « Base de données sur les commerces parisiens » : https://www.apur.org/fr/open-data-cartes/open-data/base-donnees-commerces-parisiens ; observatoire BDCOM et enquête 2026 : https://www.apur.org/fr/open-data-cartes/observatoire/observatoire-commerce-paris-bdcom
- [D2] Ville de Paris, `terrasses-autorisations` : https://opendata.paris.fr/explore/dataset/terrasses-autorisations/
- [D3] Ville de Paris, `marches-decouverts` : https://opendata.paris.fr/explore/dataset/marches-decouverts/
- [D4] IDFM, validations réseau ferré, 2e trimestre 2026 : https://data.iledefrance-mobilites.fr/explore/dataset/validations-reseau-ferre-nombre-validations-par-jour-2eme-trimestre/
- [D5] IDFM, profils horaires ferrés, 2e trimestre 2026 : https://data.iledefrance-mobilites.fr/explore/dataset/validations-reseau-ferre-profils-horaires-par-jour-type-2eme-trimestre/
- [D6] IDFM, réseau de surface, 2e trimestre 2026 au niveau ligne : https://data.iledefrance-mobilites.fr/explore/dataset/validations-reseau-surface-nombre-validations-par-jour-2eme-trimestre/ ; exemples au niveau arrêt, 4e trimestre 2025 : https://data.iledefrance-mobilites.fr/explore/dataset/validations-reseau-surface-nombre-validations-par-jour-4eme-trimestre/
- [D7] MESR, implantations d'enseignement supérieur public : https://data.enseignementsup-recherche.gouv.fr/explore/dataset/fr-esr-implantations_etablissements_d_enseignement_superieur_publics/
- [D8] Ville de Paris, `dans-ma-rue` : https://opendata.paris.fr/explore/dataset/dans-ma-rue/
- [D9] Ville de Paris, mobilier urbain PVP : https://opendata.paris.fr/explore/dataset/plan-de-voirie-mobiliers-urbains-jardinieres-bancs-corbeilles-de-rue/
- [D10] Ville de Paris, `aires-pietonnes` : https://opendata.paris.fr/explore/dataset/aires-pietonnes/
- [D11] Ville de Paris, `sanisettesparis` : https://opendata.paris.fr/explore/dataset/sanisettesparis/
- [D12] Geofabrik OSM : https://download.geofabrik.de/europe/france/ile-de-france.html
- [D13] INSEE, population IRIS, source conservée dans le snapshot CURRENT : https://www.insee.fr/fr/statistiques/8268806
- [D14] Ville de Paris, propreté : https://www.paris.fr/pages/la-proprete-239

**Études :**

- [R1] *Estimating and mapping cigarette butt littering in urban environments: A GIS approach*, Environmental Research, 2020, Madrid, DOI : https://doi.org/10.1016/j.envres.2020.109142. L'étude signale une concentration près des lieux de restauration/hôtellerie et arrêts de transport, puis d'entrées d'établissements d'enseignement et a réalisé une validation terrain. **Aucun multiplicateur numérique de ce document n'en découle directement.**
- [R2] *Litter in French urban areas, part 1: composition, sources, and spatio-temporal variations on urban surfaces*, 2024 : https://pubmed.ncbi.nlm.nih.gov/39397236/. Décrit la variabilité suivant activités/usage des sols et l'accumulation dans des espaces végétalisés ; contredit une simple règle universelle « les parcs sont propres ».
- [R3] *Methods for monitoring urban street litter: a comparison of municipal audits and an app-based citizen science approach*, 2024 : https://doi.org/10.1039/D4VA00008K. Les variables étudiées incluent type de rue, arrêt, restauration rapide, corbeille, espaces verts et réclamations ; les performances et les coefficients ne sont pas des calibrations parisiennes.
- [R4] *Understanding the factors affecting the quantity and composition of street litter*, 2023 : https://doi.org/10.1016/j.heliyon.2023.e14245. Montre l'intérêt de modèles multivariés et rappelle que différents flux de déchets répondent à des contextes distincts.

**Conclusion probatoire :** les études appuient le *choix des familles de variables* et la nécessité d'une hétérogénéité forte, mais **n'établissent aucune des valeurs proposées dans les matrices 2 et 3**. Le terme « polarisé » désigne ici un **paramétrage exploratoire volontairement contrasté**, pas une vérité établie.

## 5. Transformer les matrices polarisées en scores par tronçon

### 5.1. Unité, contraintes et décomposition

Pour une catégorie `k ∈ {cigaretteButts, waste}`, une zone IRIS `z` et une arête piétonne élémentaire `e`, définir :

- `S_z,k` : score CURRENT de référence avec son statut, issu de `paris-pressure-risk-v3-urban-morphology` (0 à 100, distinct d'une probabilité) ;
- `L_e,z` : longueur exacte de l'intersection du tronçon `e` avec l'IRIS `z` (mètres, avec découpe aux frontières) ;
- `C_road,e,k` : **un** coefficient de catégorie de voie de section 2 ;
- `C_poi,e,k` : **l'influence admissible dominante** parmi familles dédupliquées de section 3, après atténuation ;
- `C_raw,e,k = clamp(C_road,e,k × C_poi,e,k, 0.15, 5.00)` : intensité relative expérimentale, bornes `ASSUMPTION` ;
- `S_e,z,k` : score spatialement redistribué, calculé hors requête et non observé.

Le couple de maxima `C_road` et `C_poi` peut atteindre des valeurs excessives sans plafonnement : `2,40 × 3,85 = 9,24`. **Le plafond relatif `5,00` est un choix produit provisoire** qui empêche de transformer une combinaison déjà corrélée en risque automatiquement proche de 100 partout. Les scores `wasteRisk` et `cigaretteButtRisk` conservent leurs propriétaires et ne sont pas réécrits dans le pipeline de routage.

### 5.2. Redistribution avec moyenne zonale conservée, même après saturation

La proposition v0 précédente utilisait `clip(S_z,k × C_e,k / moyenne(C))`. Cette opération ne conserve pas exactement le score IRIS lorsqu'un segment est écrêté à 100. Pour une politique fortement polarisée, ce cas devient plus fréquent. **Décision v1 : résoudre le facteur d'échelle de manière à conserver la moyenne zonale *après* écrêtage** :

```text
C_raw(e,k) = clamp(C_road(e,k) * C_poi(e,k), 0.15, 5.00)
S(e,z,k; a) = clamp(a * C_raw(e,k), 0, 100)

Trouver a >= 0 tel que :
  sum_e( L(e,z) * S(e,z,k; a) ) / sum_e L(e,z) = S(z,k)

S_mixte(e) = (S_megots(e) + S_dechets(e)) / 2
```

On résout `a` par bissection sur une distribution discrète de segments, à tolérance numérique documentée. Pour `0 < S_z,k < 100` et des `C_raw` strictement positifs, la fonction moyenne est continue, monotone et atteint 0 puis 100 : une solution existe. Pour `S_z,k = 0` ou `100`, tous les segments sont respectivement 0 ou 100 ; c'est une conséquence du **choix conservatif de conservation**, non une preuve de propreté ou saleté absolue. Avec données IRIS manquantes, le score reste `null`.

**Nécessité de ne pas recompter la morphologie :** le `S_z,k` CURRENT intègre déjà un prior morphologique. Avant d'activer un nouveau `C_road` représentant la *même* information de faible trafic/impasse/parc, identifier et neutraliser l'effet dupliqué de manière contractuelle, ou reporter cette caractéristique à `1,00` en version de production. Le prototype peut comparer : (A) distribution à partir de `finalRisk` sans nouvel effet des facteurs dupliqués ; (B) redistribution du `beforeMorphology` avec attribution unique de la morphologie au segment, nouvelle version du contrat. Ne jamais appliquer les deux pénalités à l'aveugle.

### 5.3. Exemple calculable de polarisation (données entièrement fictives)

Considérons trois segments de même longueur dans un IRIS dont le score `mégots` hypothétique est `50/100` et avec `C_raw = 0,25 ; 1,00 ; 4,00`. On cherche `a` pour que `moyenne(clamp(a*C_i, 0, 100)) = 50`. Avec écrêtage du dernier segment à 100, l'équation devient `(0,25a + a + 100)/3 = 50`, donc `a = 40`. Les trois valeurs calculées sont alors : `10 ; 40 ; 100`, moyenne `50`. Le point fort est dix fois plus élevé que le point faible **en score relatif de simulation**. Ce n'est pas une différence de mégots mesurée dans Paris. Sans saturation, l'ancien choix `a=50/(1,75)` aurait donné une autre répartition et une moyenne modifiée par écrêtage.

### 5.4. Importance du mode mixte

**Contrat de calcul de la heatmap** : `mixte = (cigaretteButtRisk + wasteRisk) / 2` **avant arrondi**. Si l'un des deux scores manque, `mixte = null`, sans imputations artificielles.

**Contrat de sélection de parcours** : la moyenne n'est pas suffisante pour promettre une collecte équilibrée. L'optimiseur conserve les deux gains cumulés sur les tronçons uniques visités, vérifie une couverture de chaque famille et évite de sélectionner un circuit entièrement dédié aux mégots en le présentant comme mixte. Les seuils éventuels de couverture minimale sont un contrat *distinct* à tester et à calibrer ; ne pas mélanger les valeurs de `mixte` à un rendement présumé.

### 5.5. Priorités, seuils et décisions de classement

Seuils **exclusivement pour la visualisation initiale**, pas niveaux de preuves ou probabilités :

| Score segment prédit | Libellé de rendu | Usage |
|---:|---|---|
| `0 ≤ S < 20` | Risque relatif très faible | Rue peu prioritaire en comparaison locale, pas rue certifiée propre |
| `20 ≤ S < 40` | Risque relatif faible | Comparable aux autres segments de la zone |
| `40 ≤ S < 60` | Risque relatif intermédiaire | Pas de vérité scientifique attachée à « moyen » |
| `60 ≤ S < 80` | Risque relatif fort | Priorité prédictive relative |
| `80 ≤ S ≤ 100` | Risque relatif très fort | Cible théorique prioritaire, toujours sous contrainte de sécurité |
| `null` | Risque inconnu | Couleur distincte, **jamais** vert faible |

Pour la recommandation, la priorité relative n'efface jamais le statut de `observed`, l'additionalité, la praticabilité, le budget, les secteurs des groupes ni les limitations de sécurité. Les poids d'arbitrage multi-objectif ne sont pas décidés par la table des couleurs.

### 5.6. Protection contre les erreurs de modèle

- **Risque de surpolarisation** : un POI mal géolocalisé peut saturer artificiellement les scores. Exiger résolution de géométrie et conserver l'incertitude. Si une même zone contient 200 cafés, ne pas multiplier 200 fois.
- **Effet de seuil** : un tronçon à 79,9 et un autre à 80,0 ne diffèrent pas scientifiquement ; les paliers servent uniquement à l'affichage.
- **Microtrous cartographiques** : géométrie non renseignée = `unavailable`, pas interpolation silencieuse.
- **Voies traversant des IRIS** : découpage à la frontière ou agrégation pondérée des sous-segments avec vérification de cohérence ; ne pas utiliser uniquement le centroïde.
- **Conflit et poids** : compter séparément disponibilité du score IRIS, qualité du rattachement géospatial et qualité du signal local. Un score haut avec provenance faible ne doit pas apparaître comme une certitude.
- **Sensibilité** : comparer systématiquement les classements et itinéraires en scénario `neutral` (tous coefficients 1), `mild` (coefficients rapprochés de 1) et `polarized` (tables de ce document). Mesurer l'instabilité des premiers tronçons, les zones saturées, les distances et la couverture. **Aucune performance n'est déclarée meilleure avant mesure**.
- `neutral` et `mild` sont réservés aux tests de sensibilité ; aucun de ces modes n'est exposé dans l'UI publique, qui propose uniquement `Mixte`, `Mégots` et `Déchets`.
- **Stock vs pression** : une rue avec nombreux usages peut être fréquemment nettoyée. Ne pas inventer une conversion automatique en quantité résiduelle disponible.
- **Ethique** : ne pas stigmatiser des populations ou quartiers par des caractéristiques sociales ; vérifier seulement des usages observables de l'espace public et leurs effets testables.

### 5.7. Validation empirique indispensable

Calibrer le contraste `0,20...4,00` à partir de mesures **indépendantes**, notamment `mégots / 100 m de chemin parcouru et inspecté`, `déchets comptés / 100 m`, puis éventuellement `kg/100 m` selon une méthode homogène. Conserver : largeur/surface nettoyée réellement connue, temps effectif, date, horaire, météo, jours depuis dernier nettoyage *documenté*, type de voie, POI visibles et statut d'accès. Pour éviter la fuite d'information, séparer les données d'entraînement et de validation **par secteurs et par périodes**, pas simplement en mélangeant les observations d'une même rue. Comparer aux modèles neutre et zonal ; mesurer gains, calibration, faux hotspots, biais du déclaratif et incertitudes. Une simulation à deux quartiers ne suffit pas à valider tout Paris.

## 6. Architecture de stockage, prévisualisation et consommation du modèle

### 6.1. Une projection segmentaire unique et versionnée

```text
IRIS + modèle de pression CURRENT      OSM/Geofabrik + contraintes piétonnes
             |                                       |
             +----------------------+----------------+
                                    |
                          Graphe de segments Paris
                                    |
      Apur BDCOM, terrasses, marchés, IDFM, MESR, PVP,
      Dans Ma Rue, observations validées et calendrier
                                    |
                           Validation et provenance
                                    |
                   Classification exclusive des rues
                   + influence locale dominante/atténuée
                                    |
                 Redistribution polarisée par IRIS (hors requête)
                                    |
                 Snapshot de segments publié atomiquement
                            /                      \
                  Carte vectorielle          Optimiseur sur arcs
                  mégots/déchets/mixte       choix des rues parcourues
                            \                      /
                          Itinéraires par groupe
                          GPX / PDF / vue carte
```

Le modèle conserve un **seul propriétaire** pour chaque signal. Le snapshot du pilote est une projection statique reproductible, jamais une seconde source canonique d'observations. Aucun nouveau modèle IRIS parallèle n'est créé.

### 6.2.1. Pilote Panthéon/Jardin des Plantes (`CURRENT / PILOT`)

Le pilote matérialisé est construit par
`apps/web/scripts/build-pedestrian-risk-projection.mjs` à partir du graphe
OSM borné `apps/web/data/geospatial/paris-pedestrian-network-pilot-osm-source.json`,
du snapshot `paris-pressure-snapshot` et du snapshot municipal de
serviceabilité. Le calcul est hors requête et la publication passe par
`publish_pedestrian_risk_projection(jsonb)` dans
`apps/web/supabase/migrations/20261104000005_pedestrian_risk_projection.sql`.
La lecture active du générateur passe exclusivement par la lecture paginée
`get_active_pedestrian_risk_projection_page(...)`. Chaque page est ordonnée
par `edge_key, projection_segment_id`, reste sous la limite API de 1000 lignes
et porte l'identité du snapshot, la version exacte du graphe actif et la date
persistée `generated_at`. Le serveur rejette une page incomplète, une erreur,
un changement d'identité entre pages ou une projection sans graphe compatible ;
il ne transforme jamais ce cas en projection partielle silencieuse.

La propriété `retrievedAt` est la date de récupération OSM réellement portée
par la source d'acquisition et ne doit pas être remplacée par une date de
génération ou de publication. Le générateur standard la recopie sans
paramètre de substitution ; `--retrieved-at` est refusé afin de ne pas
fabriquer une provenance temporelle. Une éventuelle date de publication relève
du versionnement externe et ne change pas `retrievedAt`.

Chaque arête acceptée du graphe est découpée aux frontières réelles des
géométries IRIS. Une portion est associée à une seule zone seulement lorsque
son rattachement est démontrable. Une portion hors couverture ou sur une
frontière ambiguë est conservée comme `unavailable`, avec scores `null` ; elle
ne devient jamais un risque nul. Les segments portant le même rattachement
IRIS reçoivent le même score zonal : aucune différenciation de rue n'est
inventée sans facteur local sourcé et versionné.

Le planner conserve cette granularité de sous-segment jusqu'à la route finale :
une arête OSM traversant plusieurs IRIS ne permet pas de valoriser toute l'arête
à partir d'un seul sous-segment. Les portions comptées, leurs longueurs, risques
et identifiants de couverture sont ceux des segments effectivement sélectionnés
et parcourus ; les raccordements nécessaires à la circulation restent exclus des
indices et de la couverture. Un départ proche du réseau est ancré au nœud piéton
vérifié le plus proche dans la limite autorisée de 50 m, sans transformer la distance
hors réseau en trajet collectable.

La projection réutilise `paris-pressure-risk-v3-urban-morphology` pour la
référence zonale et conserve séparément `wasteRisk` et
`cigaretteButtRisk`, leurs confiances, facteurs disponibles/manquants,
résolution effective, dates, versions, provenance et serviceabilité
municipale. `mixedRisk` est la moyenne arithmétique exacte des deux scores
avant arrondi. Le risque est explicitement théorique et non calibré ; il ne
représente ni une probabilité, ni une quantité de déchets, ni un rendement de
collecte.

La publication remplace les lignes d'une version sous verrou transactionnel,
puis bascule un unique snapshot actif. Une erreur laisse l'ancien snapshot
actif intact. Le stockage et la lecture sont réservés à `service_role` et les
géométries sont indexées par GiST. L'installation distante de PostGIS et la
présence effective des tables restent des preuves d'intégration distinctes de
la migration versionnée.

### 6.2.2. Cache incrémental des observations de terrain (`CURRENT`)

Le cache d'observations est une projection auxiliaire du graphe et ne devient
pas une seconde source de vérité. Les triggers des signalements et des actions
de nettoyage éligibles déposent dans
`pedestrian_risk_cache_invalidation_events` une seule entrée idempotente par
mutation, avec les géométries ancienne et nouvelle. Un déplacement invalide
donc l'union des segments touchés ; une suppression conserve la géométrie
ancienne pour permettre le retrait local. Les signalements non validés et les
actions sans statut `approved` ne déclenchent pas cette actualisation.

Le worker `apps/web/scripts/refresh-pedestrian-observation-cache.mjs` réclame
des lots avec `SKIP LOCKED`, puis délègue le calcul et la publication à
`refresh_pedestrian_observation_cache`. La RPC calcule les lignes en base,
construit explicitement le transport `projectionSegmentId`, `observationIds`,
`observedCount`, `latestObservedAt`, et publie sans transférer un corpus qui
pourrait être plafonné par PostgREST. Le verrou d'advisory, l'identité immuable
de chaque acquisition de lot (`lease_token` commun à tous ses événements), le propriétaire et l'expiration persistée
(`lease_expires_at`) sont vérifiés sur chaque événement, avant la mutation puis
juste avant la clôture ; l'horloge réelle `clock_timestamp()` refuse un bail
expiré pendant une reconstruction. Un worker expiré, réattribué ou réutilisant
le même `worker_id` ne peut donc pas clore ni remettre en attente le lot d'un
autre worker. `p_replace_segment_ids` conserve l'actualisation locale,
les événements terminés et les lignes du cache sont publiés dans la même
transaction, et le dernier snapshot actif reste lisible tant qu'une publication
ne réussit pas.

Une actualisation temporelle ou un changement de modèle, de source ou de graphe
OSM appelle `enqueue_pedestrian_risk_cache_rebuild` avec respectivement
`temporal`, `model` ou `network`. Ces événements système demandent une
reconstruction complète, alors qu'une mutation locale ne recalcule que les
segments spatialement affectés. Les lignes observées restent séparées des
risques théoriques et ne prétendent pas mesurer une probabilité calibrée.

### 6.2. Contrat de sortie proposé

```ts
// Contrat conceptuel aligné sur la projection matérialisée ; le graphe et les
// sources restent versionnés séparément.
interface ParisStreetRiskSegment {
  segmentId: string;                 // stable pour graphVersion seulement
  graphVersion: string;
  geometry: GeoJSON.LineString;      // [longitude, latitude]
  lengthMeters: number;
  pedestrianAccess: 'allowed' | 'restricted' | 'unknown';
  irisParts: Array<{ irisId: string; lengthMeters: number }>;
  sourcePressureSnapshotId: string;
  sourceRiskModelVersion: string;
  projectionPolicyVersion: string;
  wasteRisk: number | null;
  cigaretteButtRisk: number | null;
  mixedRisk: number | null;
  effectiveResolution: 'iris' | 'unknown';
  calibrationStatus: 'not_calibrated_theoretical';
  evidence: Array<{
    sourceId: string;
    factorId: string;
    status: 'ASSUMPTION' | 'PROXY' | 'OBSERVED' | 'UNKNOWN';
    observedAt: string | null;
    contributionCoefficient: number | null;
  }>;
  riskConfidence: number | null;
  spatialMatchConfidence: number | null;
  calculatedAt: string;
  publicationVersion: string;
}
```

`GeoJSON` échange `[lon,lat]`, les `RouteGeometry` CURRENT utilisent `[lat,lon]` : convertir explicitement et tester sur des coordonnées parisiennes. Ne pas confondre `segmentId` interne et identifiant OSM natif, qui ne correspond pas nécessairement à la subdivision piétonne utilisée.

### 6.3. Données, coût et couverture Paris

- **Couverture territoriale** : géométrie réelle de Paris intra-muros, avec le périmètre intérieur au boulevard périphérique défini par un polygone administratif/géographique validé, puis restriction du réseau OSM à cette emprise. **La seule commune INSEE `75056` ne suffit pas au masque intra-muros** : Paris comprend aussi les bois de Boulogne et de Vincennes hors de ce périmètre. Ne pas utiliser un rectangle comme masque de publication, ni confondre les limites des IRIS et celles du pilote.
- **Stockage** : préférer une projection géographique PostgreSQL indexée, si les capacités du projet et son budget le permettent ; vérifier PostGIS et les migrations canoniques avant toute création. Alternative technique : artefact/tuiles spatiales pré-calculées si le stockage et les coûts le justifient.
- **État CURRENT du dépôt** : les snapshots IRIS de pression et de serviceabilité restent des sources locales versionnées pour le rebuild hors requête ; la projection segmentaire est stockée dans Supabase, avec une version active unique et un RPC borné pour le générateur. Le pilote reste limité au graphe Panthéon/Jardin des Plantes et son extension à Paris réutilisera le même contrat, sans copie concurrente du modèle IRIS.
- **Index et accès** : requêter uniquement les segments d'une emprise bornée, avec quantité de géométries et volume de réponse plafonnés ; la carte publique n'expose pas de donnée personnelle ou de données administrateur.
- **Licence** : conserver provenance et millésime des données OSM/Apur/Paris/IDFM ; ne pas effacer les obligations de redistribution et d'attribution en fusionnant des jeux sous licences différentes.
- **Versioning** : `networkSourceSha256`, `networkImporterVersion`, `pressureSnapshotId`, `riskModelVersion`, `serviceabilitySnapshotId`, `policyVersion` et l'identifiant de publication sont indispensables pour une lecture cohérente et un rerun déterministe.
- **Rendu** : colorer des **lignes de réseau piéton** plutôt qu'un nuage de chaleur opaque sur les immeubles. Une couleur distincte exprime `unavailable`, jamais le risque faible.

### 6.4. Invalidation incrémentale et actualisation du cache

| Événement | Zone invalide à recalculer | Garantie |
|---|---|---|
| Spot validé ou nouveau relevé réel | Emprise + zone d'influence définie | Source et famille distinctes, pas de faux observed |
| Spot déplacé | Ancienne **et nouvelle** emprise | Recalcul des contributions retirées et ajoutées |
| Spot invalidé / supprimé | Ancienne influence | Pas de contribution fantôme |
| Cleanwalk documentée | Segments effectivement nettoyés si mesurés | Nettoyage ≠ pollution nulle |
| Changement de terrasse ou commerce | Segments de voisinage du POI | Déduplication et millésime |
| Fin de marché / événement | Emprise concernée + horaire | Pas de replay de signal expiré |
| Nouveaux coefficients / modèle IRIS | Zones affectées, éventuellement Paris entier | Nouveau snapshot cohérent |
| Changement du graphe OSM | Rebuild des références de segments | Ne pas mélanger des versions incompatibles |
| Échec ou source indisponible | Aucun snapshot incohérent publié | Dernière version valide, statut de fraîcheur visible |

Le traitement recommandé est une file durable d'invalidation, des workers bornés et idempotents, et une **publication atomique** par version. Ne pas déclencher une recomposition complète de Paris au cours d'un `POST /api/route/recommend`. Ajouter un rafraîchissement périodique pour les sources temporelles même sans modification SQL. Préserver l'état précédent en cas d'échec.

### 6.5. Prévisualisation et générateur, même base de calcul

**Carte** : sélecteur Mégots/Déchets/Mixte, légende des scores *théoriques*, date et version des sources, indice de confiance, description des facteurs du tronçon, superposition des deux groupes. Le `mixte` est strictement arithmétique à la lecture, pas un nouveau modèle indépendant.

**Générateur** : lire uniquement la projection active des segments piétons, puis optimiser les segments *uniques* parcourus et nettoyables sur le graphe routable. Dans le mode mixte, utiliser `mixedRisk` matérialisé et contrôler la couverture de chacune des deux familles ; ne jamais sélectionner simplement les tronçons maximisant `max(wasteRisk, cigaretteButtRisk)`. Ne pas confondre trajet à travers une rue et nettoyage effectif du trottoir. Respecter origine/arrivée et topologie, budgets de marche et de collecte, accessibilité et interdictions.

**Observations locales** : chercher ensuite les signalements validés proches du parcours théorique. Évaluer leur détour via le graphe (pas la seule distance à vol d'oiseau) et leur validité temporelle. Insérer seulement les détours faisables sans écraser la préférence de parcours ni changer leur provenance `observed`.

**Exports** : GPX exact de la géométrie finale planifiée, réutilisant le sérialiseur existant, PDF conforme, Google Maps seulement comme navigation approximative puisque ses itinéraires sont recalculés. Aucun export planifié ne devient observation GPS par réimport.

### 6.6. Ordre de réalisation proposé

1. **Catalogue et extraction** : figer les sources effectivement accessibles, licences, clés géographiques et schémas ; dédupliquer les POI sur la base du graphe et des façades. Choisir un pilote autour du Panthéon, rue Mouffetard, place de la Contrescarpe, rue Monge, Jardin des Plantes et boulevard Saint-Marcel.
2. **Graphe piéton versionné** : importer tronçons/sens/restrictions/emprises du secteur pilote, sans assertion de côté de rue nettoyable.
3. **Évaluation des trois politiques** : calculs `neutral`, `mild` et `polarized`, tableau de sensibilité et explication des facteurs par tronçon. Montrer les surfaces à score `null`.
4. **Publication** : snapshot pilote atomique et même loader consommé par carte et planner ; mesures de performance et quota avant Paris complet.
5. **Extension Paris intra-muros** : ingestion/recalcul par zones, index spatial, tuiles ou requêtes bornées ; rafraîchissement événementiel.
6. **Évaluation terrain indépendante** : au minimum plusieurs rues contrastées par quartier, comparées sur les deux catégories et à plusieurs moments. Tester les faux hotspots avant de figer des paramètres.

### 6.7. Tests et critères d'acceptation

- Tous les coefficients des tableaux sont calculés à la bonne précision, `mixte` égal à la moyenne des deux valeurs **avant arrondi**.
- Une rue calme avec forte activité prouvée n'est pas maintenue artificiellement en catégorie basse ; une avenue sans flux piéton ne reçoit pas une forte priorité par son seul nom.
- Une absence de source ne devient ni score zéro ni fausse donnée d'activité ; les proxys ambiguës (corbeille, WC publics, prix des logements) ne créent pas de majoration implicite.
- Aucun POI n'est compté deux fois sous identités corrélées ; le produit des coefficients est borné et explicable.
- Pour chaque IRIS complet, la moyenne pondérée après saturation conserve le niveau zonal à tolérance de calcul déclarée.
- Les segments chevauchant plusieurs IRIS respectent les fractions de longueur, les restrictions du réseau et l'ordre des coordonnées.
- La version du graphe, les modèles, les sources et les hypothèses sont conservés par les snapshots et exports utiles.
- Les circuits de deux groupes de cinq peuvent être générés sur le pilote sans inventer des spots observés ; la répétition du même segment utile n'est pas comptée deux fois comme collecte.
- Les modes `waste`, `cigarette_butts` et `balanced` donnent des critères distincts sans prétendre prévoir un rendement absolu.
- Les mises à jour locales recalculent l'ancien et le nouveau voisinage, jamais seulement le point après déplacement ; publication incohérente impossible.
- Les tests de sensibilité comparent polarisation, stabilité, proportion de segments saturés et classement des rues, avec baselines *neutral* et zonale.
- **STOP SCIENTIFIQUE** : ne pas communiquer la polarisation comme « validée à Paris » tant que des relevés terrain indépendants n'existent pas. Le statut reste `ASSUMPTION`.

### 6.8. Synthèse des décisions

**Décision produit proposée** : retenir une polarisation forte dans le prototype `v1` : faible activité prouvée autour de `0,20...0,55`, rues à forte activité autour de `1,75...2,60`, micro-POI très actifs jusqu'à `4,00` ; combinaison plafonnée à `5,00`, redistribution conservant la référence IRIS, carte mixte strictement moyenne. Ces bornes restent **non prouvées scientifiquement**.

**Décision d'architecture** : un unique cache segmentaire versionné, construit à partir du modèle IRIS CURRENT et de sources géographiques vérifiées, commun à la carte et au générateur. Les proxys de gestion/nettoyage restent séparés du risque de pollution et de la sécurité.

**Décision de validation** : mesurer la pertinence réelle des tronçons en terrain avant d'attribuer un statut scientifique à ces coefficients. La forte densité urbaine de Paris rend l'étude intéressante, mais ne valide ni une corrélation particulière, ni les amplitudes retenues.
