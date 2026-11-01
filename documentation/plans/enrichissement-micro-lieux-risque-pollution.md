# PLAN | Enrichissement du risque de pollution par les infrastructures et micro-lieux urbains

**Statut : `PLAN / PARTIAL PILOT` - snapshot OSM et calque UI livrés ; contrat complet différé.**<br>
**Objet :** conserver le catalogue des données urbaines et le contrat d'intégration future des micro-lieux dans les scores prédictifs de mégots et de déchets de CleanMyMap.<br>
**Chemin cible :** `documentation/plans/enrichissement-micro-lieux-risque-pollution.md`<br>
**Périmètre pilote :** voies et espaces publics accessibles aux piétons de Paris intra-muros ; réutilisation à terme dans les communes françaises, y compris les petites villes.<br>
**Établi le :** 1er novembre 2026.<br>
**Référence de travail :** `maxd4/CleanmyMap`, branche `main`, documents canoniques consultés le 1er novembre 2026. Relire `main` avant toute intégration.<br>
**Limite du pilote :** le snapshot statique 5e/6e et le calque facultatif sont intégrés sans activer le planner ni les annotations ; engager le contrat complet uniquement après satisfaction des conditions d'entrée de la section 2.

> Ce document est un inventaire exploitable et un plan de reprise, pas un calcul livré, un schéma de base de données approuvé, une preuve que toutes les sources ont été importées, ni une étude démontrant les coefficients de pollution. Les chiffres de risque éventuels doivent rester des hypothèses tant qu'ils ne sont pas calibrés. Aucun traitement de données ni aucune modification GitHub n'est effectué par ce fichier.

## 1. Objectif métier et résultat attendu

À l'échelle d'une rue, la pollution n'est pas uniforme. Une partie résidentielle peu fréquentée peut jouxter une sortie de métro, un arrêt de bus, une terrasse, un banc, un fast-food ou un marché. La carte doit pouvoir afficher :

- le **risque de fond** sur les tronçons piétons, avec une contribution du contexte IRIS existant ;
- les **micro-lieux géographiques distincts**, fondés sur une emprise, un accès, une façade, un tronçon ou un regroupement de points ;
- deux risques indépendants, `cigaretteButtRisk` (mégots) et `wasteRisk` (déchets diffus), et la présentation `mixte` égale à leur moyenne arithmétique quand les deux sont disponibles ;
- des **hotspots cliquables**, rattachés au réseau, expliquant les facteurs, leur provenance, leur actualité, leur niveau de confiance et la différence entre prévision et observation ;
- une **projection commune** aux cartes et à l'optimiseur d'itinéraires, sans deuxième moteur de scores ni appels aux fournisseurs en temps réel par requête d'itinéraire.

La couche des hotspots n'est **pas** une carte de déchets observés. Elle met en évidence des lieux à inspecter ou des concentrations de risque prédictif. Des signalements terrain validés peuvent être présentés séparément, sans être rebaptisés prévisions.

### Exemple à préserver

Une rue comprend successivement une zone résidentielle, une entrée de métro, une boulangerie, un fast-food et une terrasse. Le moteur doit permettre un niveau de fond par tronçon, puis une ou plusieurs concentrations locales à proximité des **accès réels** et non un score unique attribué à toute la rue. Si deux POI désignent en réalité la même activité (bar + terrasse + commerce BDCOM), ne pas les additionner comme trois pressions indépendantes. Si des obstacles, bâtiments, clôtures, voies de circulation ou propriétés privées séparent les lieux, la proximité euclidienne seule ne suffit pas.

## 2. Conditions d'entrée obligatoires avant codage

Le lot d'intégration reste `DEFERRED` tant que ces éléments ne sont pas disponibles et vérifiés sur `main` :

1. **Graphe piéton de référence** : géométrie segmentaire cohérente et versionnée ; conservation des restrictions d'accès, de l'admissibilité et des corridors utiles ; tests de connexité, coupures, intersections et traversées.
2. **Projection prédictive par segment** : contrat unique de risque `mégots/déchets`, adossé au modèle IRIS existant, avec cache et provenance, exploitable en lecture par la carte et le générateur.
3. **Carte segmentaire fonctionnelle** : rendu de tronçons avec légende et distinctions `predicted / observed / unavailable` ; capacité UI de sélectionner un objet géolocalisé et d'afficher ses explications.
4. **Traçabilité et mises à jour** : snapshots géographiques reproductibles, versionnement des sources et du modèle, schéma de confiance/complétude, recalcul hors requête, invalidation bornée.
5. **Frontière sécurité/données** : les annotations communautaires éventuelles, modérations, observations et données privées demeurent régies par leur propre contrat AuthN/AuthZ/RLS et ne sont pas présumées disponibles.
6. **Protocole d'évaluation** : métriques terrain, échantillonnage et protocole comparatif définis *avant* l'ajout de coefficients actifs.

Il est possible de préparer un **catalogue hors runtime** plus tôt (repérage des sources, test de licences, petit échantillon de qualité). Cela ne doit pas changer les scores en production.

### Sources de vérité à relire à la reprise

- `documentation/architecture/paris-pressure-risk-model.md` : score IRIS actuel, pression transport, stations, terrasses, marchés, correction de propreté, prior morphologique, provenance.
- `documentation/architecture/paris-municipal-cleaning-serviceability.md` : nettoiement municipal et accessibilité ; **ne pas fusionner** serviceabilité et pollution.
- `documentation/product/SCIENTIFIC_PROTOCOL.md` et `documentation/product/methodologie-carte-actions.md` : statuts de preuve, scores historiques/observés et hypothèses.
- `documentation/architecture/data-governance.md`, `documentation/security/authz-authn-regles.md` et `documentation/development/TESTING.md` : persistance, AuthZ, validations et niveaux de preuve.
- `apps/web/src/lib/geo/paris-pressure-risk.ts` et son contrat : owner métier à vérifier avant modification.
- Le document canonique [`../architecture/paris-street-pollution-heatmap.md`](../architecture/paris-street-pollution-heatmap.md) décrit désormais le `CURRENT/PILOT` statique 5e/6e ; [`heatmap-annotations-communautaires.md`](./heatmap-annotations-communautaires.md) reste une proposition indépendante. Ce plan couvre seulement les **sources de micro-lieux et leur raccordement**, le graphe complet et le planner restant différés.

## 3. Invariants de conception

1. **Observation != prédiction != fréquentation != propreté != capacité de nettoiement.** Un POI n'atteste pas la présence d'un mégot ; une autorisation de terrasse n'atteste pas une terrasse exploitée ; un défaut de signalement n'est pas une rue propre.
2. **Deux risques autonomes.** Les facteurs peuvent contribuer différemment aux mégots et aux déchets. Le score mixte est une vue, jamais un troisième calcul entraîné indépendamment.
3. **Pas de double comptage IRIS/POI.** Le modèle IRIS actuel possède déjà les dimensions stations, terrasses, marchés, tourisme, etc. L'enrichissement redistribue ou remplace une composante à une résolution supérieure selon un contrat explicite ; il ne l'empile pas sans contrôle.
4. **Pas d'agrégation naïve.** Plusieurs sources peuvent décrire la même entité physique, un même commerce, une même station ou un même événement. Dédupliquer par identifiant fiable ou rapprochement contrôlé, avec traçabilité des fusions incertaines.
5. **Pas de coefficient numérique produit par intuition.** Toute direction d'effet ci-dessous est `HYPOTHESIS / NON PROUVÉ` sauf preuve expérimentale transportable documentée ; aucun multiplicateur ni rayon d'influence universel n'est figé par ce document.
6. **Pas de faux zéro.** Une donnée absente, périmée, hors emprise ou incomplète conserve le statut `UNKNOWN/NA`. Une forte densité de POI renseignés ne doit pas avantager mécaniquement les zones mieux cartographiées.
7. **Unités spatiales réelles.** Privilégier emprise de terrasse/marché, point d'accès, façade, bordure, surface de parc, même côté de rue lorsque prouvé. Ne pas créer des corridors `left/right` à partir d'une simple distance à un POI.
8. **Temporalité réelle.** Horaire, jour de marché, saison, vacances, événement et fermeture doivent être distingués ; heure d'ouverture inconnue != établissement ouvert ni fermé.
9. **Lieux naturels hétérogènes.** Intérieur forestier peu fréquenté et entrée de parc animée n'ont pas le même profil. Ne jamais imposer « parc = propre » ou « banc = mégots » comme vérité générale.
10. **Restitution auditée.** Chaque score et chaque hotspot préservent sources, version du graphe, version du modèle, signal(s) déclencheur(s), incertitudes, date de préparation et méthode de calcul.
11. **Coûts prévisibles.** Exports et jointures géospatiales hors chemin HTTP critique ; cache versionné, invalidation ciblée, pas de requête répétitive à OSM, Paris Data ou IDFM à chaque interaction.
12. **Sécurité opérationnelle séparée.** Un lieu à risque fort n'est pas nécessairement autorisé ou sûr à nettoyer. L'accès piéton, les interdictions, la traversée et l'additionnalité bénévole restent des décisions distinctes.

## 4. Catalogue des sources de données

### 4.1. Niveaux de vérification du catalogue

- `PORTAIL_VERIFIE` : la page institutionnelle ou de téléchargement indiquée a été consultée le 1er novembre 2026 ; **aucun export intégral n'a été testé**.
- `SOURCE_CONNUE_A_REVERIFIER` : portail ou jeu cité dans le modèle existant ou dans la recherche, mais son export précis, sa couverture ou sa licence doivent être vérifiés lors du chantier.
- `CANDIDAT_NON_PROUVE` : disponibilité à la bonne granularité non démontrée. Ne pas en dépendre pour la première intégration.

`P0` : forte utilité géospatiale pour le pilote ; `P1` : enrichissement utile après contrôle ; `P2` : facteur contextuel ou ambigu. **P0 ne signifie pas que la licence, la qualité ou l'accès ont déjà été validés pour la réutilisation.**

### 4.2. Référentiels structurants

| Source / lien | Géométries et intérêt | Priorité | Statut de vérification et limite |
|---|---|---|---|
| [Geofabrik, extrait OSM Île-de-France](https://download.geofabrik.de/europe/france/ile-de-france.html) | Réseau piéton, voies, POI, commerces, bancs, espaces verts, entrées, bâtiments | P0 | `PORTAIL_VERIFIE` ; ODbL, couverture contributive inégale, extrait régional à découper |
| [IGN BD TOPO](https://geoservices.ign.fr/bdtopo) | Bâtiments, voirie, hydrographie, équipements, morphologie | P0 | `SOURCE_CONNUE_A_REVERIFIER` ; caractéristiques, précision et droits selon produit/millésime |
| [Base Adresse Nationale](https://adresse.data.gouv.fr/outils/telechargements) | Points d'adresse, appariement commerce/établissement | P0 | `SOURCE_CONNUE_A_REVERIFIER` ; adresse != entrée effective |
| [IGN OCS GE](https://geoservices.ign.fr/ocsge) | Occupation et couverture du sol, surfaces artificialisées/végétalisées | P1 | `SOURCE_CONNUE_A_REVERIFIER` ; millésimes territoriaux et classes |
| [Institut Paris Region, MOS 2025](https://www.institutparisregion.fr/mode-doccupation-du-sol-mos.html) | Typologie du sol francilien, places, habitat, activité, espaces verts | P0 | `PORTAIL_VERIFIE` ; nomenclature 2025 à 79 postes, ne pas confondre usage des sols et fréquentation |
| [Apur, base BDCOM](https://www.apur.org/fr/open-data-cartes/open-data/base-donnees-commerces-parisiens) | Commerces et types d'activité à l'échelle adresse / local | P0 | `SOURCE_CONNUE_A_REVERIFIER` ; millésime, géolocalisation et conditions d'export à confirmer |
| [Insee, équipements géolocalisés BPE 2025](https://www.insee.fr/fr/statistiques/8217525) | Commerces, services, santé, enseignement, loisirs, tourisme | P1 | `PORTAIL_VERIFIE` ; CSV/Parquet, suppression/anonymisation de certaines données personnelles ; doublons possibles avec BDCOM/OSM |
| [Sirene, établissements](https://www.data.gouv.fr/datasets/base-sirene-des-entreprises-et-de-leurs-etablissements-siren-siret) | Activité administrative, géocodage via adresse, existence et ancienneté de structure | P1 | `SOURCE_CONNUE_A_REVERIFIER` ; code d'activité != activité de rue, siège administratif != point de vente ; restrictions individuelles |
| [Apur, équipements Paris/MGP](https://www.apur.org/fr/open-data-cartes/open-data/equipements-paris-metropole-grand-paris) | Équipements et emprises métropolitaines | P1 | `SOURCE_CONNUE_A_REVERIFIER` ; doublons et taxonomie à vérifier |

### 4.3. Transports et attente

| Source / lien | Micro-lieux à localiser | Priorité | Points de vigilance |
|---|---|---|---|
| [IDFM, référentiel Arrêts](https://data.iledefrance-mobilites.fr/explore/dataset/arrets/) | Points d'attente, quais, arrêts bus/tram, gares | P0 | `PORTAIL_VERIFIE` ; distinction arrêt, quai, zone d'arrêt, station ; licence ouverte Etalab 2.0 |
| [IDFM Open Data](https://data.iledefrance-mobilites.fr/) | Lignes, desserte, validations par station/arrêt selon jeu | P1 | `SOURCE_CONNUE_A_REVERIFIER` ; validations != piétons présents ni voyageurs par sortie ; éviter les projections de ligne à arrêt |
| [Transport.data.gouv, données de transport](https://transport.data.gouv.fr/) | Horaires planifiés GTFS/NeTEx, arrêts et correspondances | P1 | `SOURCE_CONNUE_A_REVERIFIER` ; horaires théoriques != affluence réelle |
| [PVP, accès piétons métro et parkings](https://opendata.paris.fr/explore/dataset/plan-de-voirie-acces-pietons-metro-et-parkings/) | Escaliers et accès physiques, pas centroïde de station | P0 | `SOURCE_CONNUE_A_REVERIFIER` ; non exhaustivité possible du PVP |
| [PVP, abris voyageurs et arrêts bus](https://opendata.paris.fr/explore/dataset/plan-de-voirie-mobiliers-urbains-abris-voyageurs-points-darrets-bus/) | Abris, mobilier de station, points d'arrêt de bus | P0 | `SOURCE_CONNUE_A_REVERIFIER` ; mêmes lieux que référentiel IDFM, dédupliquer |
| [Vélib', emplacements des stations](https://opendata.paris.fr/explore/dataset/velib-emplacement-des-stations/) | Stations de vélo et éventuelles pauses | P2 | `SOURCE_CONNUE_A_REVERIFIER` ; pas de lien de causalité établi avec déchets |

### 4.4. Activités, mobilier et occupation temporaire

| Source / lien | Micro-lieux et mécanismes candidats | Priorité | Points de vigilance |
|---|---|---|---|
| [Paris Data, autorisations de terrasses](https://opendata.paris.fr/explore/dataset/terrasses-autorisations/) | Terrasses et contre-terrasses, potentielle concentration de mégots | P0 | `PORTAIL_VERIFIE`, ODbL ; autorisation != présence, horaires, fréquentation ; saisonnalité |
| [Paris Data, marchés découverts](https://opendata.paris.fr/explore/dataset/marches-decouverts/) | Emprises, jours et horaires, emballages potentiels | P0 | `PORTAIL_VERIFIE`, ODbL ; emprise multi-polygone, hors jour de tenue != active |
| [PVP, jardinières / bancs / corbeilles](https://opendata.paris.fr/explore/dataset/plan-de-voirie-mobiliers-urbains-jardinieres-bancs-corbeilles-de-rue/) | Bancs, corbeilles, rétention physique, aménagements | P0 | `PORTAIL_VERIFIE`, ODbL ; couverture explicitement **non exhaustive** ; effets nets ambigus |
| [Paris Data, espaces verts](https://opendata.paris.fr/explore/dataset/espaces_verts/) | Parcs, squares, promenades, espaces privatifs, végétalisation | P0 | `PORTAIL_VERIFIE`, ODbL ; séparer entrée, lisière, intérieur, usages et accessibilité |
| [Paris Data, arbres](https://opendata.paris.fr/explore/dataset/les-arbres/) | Pieds d'arbres et zones de rétention | P1 | `SOURCE_CONNUE_A_REVERIFIER` ; arbre seul != pollution |
| [Paris Data, escaliers de voirie](https://opendata.paris.fr/explore/dataset/plan-de-voirie-voies-en-escalier/) | Escaliers, changement de morphologie et accessibilité | P1 | `SOURCE_CONNUE_A_REVERIFIER` ; ne pas en déduire une fréquence de nettoyage |
| [Paris Data, aires piétonnes](https://opendata.paris.fr/explore/dataset/aires-pietonnes/) | Places, rues piétonnes, traversées | P1 | `SOURCE_CONNUE_A_REVERIFIER` ; cheminement autorisé != forte fréquentation |
| [Paris Data, permis de végétaliser](https://opendata.paris.fr/explore/dataset/permis-de-vegetaliser/) | Jardinières, pieds d'arbres végétalisés | P2 | `SOURCE_CONNUE_A_REVERIFIER` ; possible duplication PVP/arbres |
| [Paris Data, fontaines](https://opendata.paris.fr/explore/dataset/fontaines-a-boire/) | Pauses et consommation d'eau | P2 | `SOURCE_CONNUE_A_REVERIFIER` ; influence déchets non prouvée |
| [Paris Data, sanitaires](https://opendata.paris.fr/explore/dataset/sanisettesparis/) | Attente et flux de passage | P2 | `SOURCE_CONNUE_A_REVERIFIER` ; pas de majoration sans validation |
| [Paris Data, chantiers](https://opendata.paris.fr/explore/dataset/chantiers-a-paris/) | Perturbations et limitations d'accès temporaires | P1 | `SOURCE_CONNUE_A_REVERIFIER` ; signal plutôt réseau/sécurité que pollution |
| [Paris Data, Paris Respire](https://opendata.paris.fr/explore/dataset/secteurs-paris-respire/) | Changement temporel d'usage des rues | P2 | `SOURCE_CONNUE_A_REVERIFIER` ; contrat circulation/sécurité, pas coefficient direct |
| [Paris Data, événements Que Faire](https://opendata.paris.fr/explore/dataset/que-faire-a-paris-/) | Événements datés, lieux de rassemblement | P1 | `SOURCE_CONNUE_A_REVERIFIER` ; annonce != présence constatée |
| [Data ES, équipements sportifs](https://www.data.gouv.fr/datasets/data-es-recensement-des-equipements-sportifs-et-lieux-de-pratique-complet-1) | Stades, gymnases, équipements et événements | P1 | `SOURCE_CONNUE_A_REVERIFIER` ; sport != niveau de déchets |
| [Dans Ma Rue, anomalies](https://opendata.paris.fr/explore/dataset/dans-ma-rue/) | Signalements de propreté ou d'encombrants, géolocalisés | P0 | `PORTAIL_VERIFIE`, ODbL ; jeu retardé et filtrage thématique obligatoire ; anomalies ≠ mégots comptés |

### 4.5. Sources et variables encore incertaines

| Variable ou source candidate | Résolution utile recherchée | Statut et décision |
|---|---|---|
| Compteurs de flux piétons municipaux / études mobilité | Flux piétons par tronçon et tranche horaire | `CANDIDAT_NON_PROUVE` en couverture exhaustive ; très fort intérêt si mesuré |
| Entrées de métro avec trafic affecté par sortie | Nombre de personnes par sortie et tranche temporelle | `CANDIDAT_NON_PROUVE` ; ne pas ventiler arbitrairement les validations station |
| Fréquentation réelle et occupation des terrasses | Clients et durée par façade/terrasse | `CANDIDAT_NON_PROUVE` ; autorisation et surface ne suffisent pas |
| Horaires effectifs des commerces | Ouvert/fermé selon date, heure, saison | Partiel via sources hétérogènes ; ne pas supposer `open_now` |
| Nettoyage municipal réellement effectué et daté | Segment, date, méthode, fréquence, preuve | `CANDIDAT_NON_PROUVE` pour une couverture publique exhaustive ; à conserver dans la couche nettoyage |
| Corbeilles pleines ou débordements | Observation datée par corbeille | `CANDIDAT_NON_PROUVE` ; ne pas transformer « corbeille présente » en pollution |
| Cendriers et points de collecte de mégots | Emplacement, équipement, entretien | Inventaires possiblement incomplets ; effet net à mesurer |
| Observations terrain CleanMyMap, sous contrat réel | Comptages de mégots et déchets normalisés par longueur ou surface inspectée | Future source primaire pour calibration, droits et fiabilité à respecter |
| Météo, pluie, vent et saison | Conditions au moment du relevé et du calcul | Candidat contextuel ; influence de dépôt, dispersion et persistance à tester |
| Photos, classification visuelle ou capteurs | Comptages instrumentés sur portions contrôlées | Dépend d'une chaîne de preuve, de qualité et de confidentialité distincte |

## 5. Taxonomie exhaustive de micro-lieux candidats

La matrice ci-dessous conserve la **direction de recherche**, sans chiffre ni signe causal garanti. `M` : mégots ; `D` : déchets autres que mégots ; `A` : aménagement/accumulation ; `T` : effet temporel. Une lettre indique une **variable à tester**, pas une hausse démontrée.

| Famille | Types à rechercher | Dimensions à tester | Attention particulière |
|---|---|---|---|
| Transports | Sorties de métro, gares RER/transilien, arrêts bus/tram, abribus, quais, correspondances, terminaux de cars | M, D, T | Localiser le véritable accès extérieur et les éventuels espaces d'attente |
| Arrêts et stationnement | Taxis, VTC, dépose-minute, parkings, bornes de recharge, Vélib', parking vélos | M, D, T | Pas de majoration implicite sans indication de rassemblement ou de consommation |
| Restauration assise | Bars, cafés, restaurants, terrasses fixes, contre-terrasses, terrasses estivales | M, D, T | Ne pas compter bar + commerce + terrasse trois fois |
| Vente à emporter | Fast-foods, kebabs, sandwicheries, boulangeries, pizzerias, snacks, food trucks | D, M, T | Distinguer emballages réellement abandonnés et collecte professionnelle |
| Autre commerce alimentaire | Supérettes, épiceries, boissons, supermarchés, distributeurs, cavistes | D, T | Activité commerciale ne suffit pas à prédire le dépôt |
| Nuit et rassemblement | Discothèques, bars nocturnes, salles de concert, clubs, cinémas, théâtres | M, D, T | Concentrations temporelles aux accès/sorties |
| Marchés et vente temporaire | Marchés alimentaires, brocantes, puces, marchés saisonniers, manifestations commerciales | D, T | Emprises, calendrier et opérations de nettoyage associées |
| Éducation | Écoles, lycées, universités, campus, résidences étudiantes | M, D, T | Interprétation sensible : ne pas attribuer le tabagisme à un groupe sans données ; uniquement flux observables des accès |
| Santé, emploi et services | Hôpitaux, administrations, grands bureaux, bibliothèques, services publics, centres commerciaux | M, D, T | Différencier activité intérieure et regroupements extérieurs |
| Sport et tourisme | Stades, gymnases, musées, monuments, lieux photographiques, hôtels, auberges | D, M, T | Calendrier et fréquentation non disponibles partout |
| Loisirs publics | Parcs, squares, jardins, aires de jeux, tables de pique-nique, pelouses, quais, berges, plages urbaines | D, M, A, T | Entrées, lisières et intérieurs très différents ; accès réel à préserver |
| Nature et faible flux | Boisements, chemins forestiers, impasses résidentielles, allées calmes, voies locales | D, M, A | Faible fréquentation seulement si corroborée ; pas de vert automatique |
| Mobilier urbain | Bancs, assises, tables, corbeilles, cendriers, jardinières, abris, bornes | M, D, A | Corbeille et cendrier peuvent diminuer les dépôts ; la direction n'est pas fixée |
| Rétention de déchets | Pieds d'arbres, haies, massifs, grilles, caniveaux, escaliers, sous-ponts, fossés, murs | D, M, A | Accumulation physique et accessibilité au nettoyage sont deux notions différentes |
| Interfaces de voie | Traversées, carrefours, passages piétons, passages souterrains, entrées/sorties d'immeubles | M, D, A | Éviter les influences de l'autre côté d'une barrière sans preuve de traversée |
| Transformations urbaines | Chantiers, piétonnisation, déviations, fermeture temporaire, nouveaux commerces | T, A | D'abord disponibilité/sécurité/temporalité, pas majoration brute |
| Historique de terrain | Signalements géolocalisés, nettoyage documenté, observations post-action, inventaires de déchets | M, D, T | Preuve indépendante, fraîcheur, biais de signalement et validité avant utilisation |

## 6. Contrat spatial proposé pour la reprise

### 6.1. Unités et rattachement

- **IRIS** : contexte zonal de référence déjà calculé ; il ne devient pas une localisation de hotspot.
- **Tronçon piéton** : portion versionnée du graphe accessible, segmentée là où la géométrie et les profils d'activité le justifient. Une rue peut contenir plusieurs tronçons de risque différent.
- **Micro-lieu** : entité canonique dédupliquée, liée à sa géométrie source (`Point`, `LineString`, `Polygon` ou `MultiPolygon`), à son ou ses accès réellement identifiés et à des tronçons proches admissibles.
- **Hotspot présenté** : projection cliquable calculée à partir d'une ou plusieurs influences, ou observation explicitement distinguée. Plusieurs POI proches peuvent être regroupés par responsabilité géographique sans supprimer leur provenance.

Le rattachement doit expliciter : qualité de géométrie ; distance **sur le réseau accessible** ou distance à une emprise ; même côté de rue si démontré ; séparateurs physiques ; accès public ; validité temporelle. Si ces informations manquent, rétrograder la confiance, limiter la portée ou laisser le rattachement `UNKNOWN`.

**Attention Paris :** la commune INSEE `75056` couvre aussi des bois extérieurs à l'emprise « intra-muros ». Le périmètre du pilote doit utiliser un masque explicite validé et documenté, distinct du simple code de commune. Le modèle doit pouvoir être transposé dans une petite ville avec le même contrat et des sources moins nombreuses.

### 6.2. Contrat minimal de données logique, non schéma SQL approuvé

```text
SourceRecord:
  provider, datasetId, objectId, sourceVersion, capturedAt,
  observedAt?, license, attribution, geometry, sourceResolution,
  coverageStatus, qualityFlags

MicroPlace:
  canonicalId, category, geometry, accessGeometry?,
  sourceRecordRefs[], entityMergeConfidence, publicAccessStatus,
  activitySchedule?, season?, dataCompleteness

SegmentInfluence:
  graphVersion, segmentId, microPlaceId, riskFamily,
  geometryRelation, activationStatus, directionHypothesis,
  contributionStatus, confidence, rejectionReason?, provenance[]

DisplayedHotspot:
  hotspotId, geometry, attachedSegmentIds[], predictedRisk?,
  observedEvidenceRefs[], riskFamily, sourceTrace[],
  modelVersion, snapshotVersion, computedAt, confidence,
  displayStatus
```

Ces noms servent à cadrer les invariants. Ils **n'autorisent pas** la création automatique de tables, colonnes, API, indices ou services. Avant implémentation, rechercher l'owner existant et préférer son extension à une nouvelle persistance.

### 6.3. Calculs à définir et à calibrer plus tard

- Préserver l'identité du **score IRIS de départ** et ses facteurs actuels ; si un signal local et un signal IRIS sont corrélés, décider de remplacer/redistribuer la contribution zonale, pas de l'ajouter à l'identique.
- Définir séparément l'influence spatiale des mégots et celle des autres déchets, avec preuves de signe, de portée et de temporalité. Une distance provisoire testée en simulation n'est pas un rayon scientifique validé.
- Privilégier une représentation stable, bornée et explicable, tenant compte des saturations, regroupements de points et incertitudes. **Ne pas fixer ici** une somme, un produit de multiplicateurs ou une plage de coefficients sans calibration.
- Si la proposition de conservation de moyenne IRIS est retenue, vérifier sa compatibilité avec les bornes `0..100`, les tronçons de longueurs différentes et les zones sans couverture locale ; documenter la loi de redistribution unique dans l'owner de risque.
- Conserver la différence entre **pression de dépôt**, **stock de déchets observé**, **persistance après nettoyage**, **nettoyabilité municipale** et **intérêt bénévole**.
- Calculer la vue `mixte` à la lecture comme moyenne arithmétique exacte des deux composantes disponibles, sans inférer une composante manquante à partir de l'autre.

## 7. UI, cartographie et interaction futures

L'interface doit permettre :

1. Sélection **Mégots / Déchets / Mixte**, avec légende explicite et unités de score relatif (`0..100` affiché en `%` selon le formatter courant), sans afficher de probabilité en pourcentage.
2. **Tronçons colorés** selon le risque prédit, pas un nuage opaque centré sur des bâtiments ou sur des IRIS. Une donnée `unavailable` est visuellement distincte d'un risque faible.
3. **Hotspots distincts cliquables**, idéalement un point de présentation situé sur l'emprise ou un accès légitime, et un lien explicite vers les tronçons affectés.
4. Panneau descriptif indiquant : catégories de source, éventuel nombre d'entités regroupées, mégots/déchets, valeur relative et confiance, activité actuellement **connue ou inconnue**, date/source/licence, méthode et avertissement « estimation ».
5. Superposition des **observations terrain** distincte du modèle théorique. Une observation « propre » ne doit pas être confondue avec un score nul ; une alerte communautaire conserve son cycle de vie propre.
6. Performance mobile/desktop adaptée aux tuiles ou géométries préparées, sélection accessible au clavier et navigation compréhensible sans multiplier les marqueurs individuels sur toutes les cartes.

Le partage avec l'optimiseur est une **source calculée commune**, pas seulement des couleurs similaires. L'optimiseur conserve les filtres de sécurité, de capacité et de corridor indépendamment du score affiché.

## 8. Import, qualité et gouvernance des sources

### 8.1. Pipeline cible hors chemin utilisateur

```text
Lister et qualifier les catalogues publics
  -> télécharger exports/snapshots contrôlés
  -> tracer licence, millésime, date, empreinte et géométrie
  -> nettoyer types, identifiants, unités et géométries
  -> dédupliquer / rapprocher entreprises, terrasses, transports, POI
  -> découper sur emprise réelle et rattacher au graphe public
  -> calculer influences avec statut de preuve et complétude
  -> produire snapshot unique versionné
  -> valider puis publier atomiquement
  -> servir la même projection aux cartes et aux itinéraires
```

### 8.2. Contrôles qualité obligatoires

- **Fraîcheur** : `capturedAt`, `observedAt`, date de diffusion, statut saisonnier, durée de validité, politiques de rafraîchissement par source.
- **Couverture** : par commune, secteur, catégorie et précision géographique ; jamais « zéro POI = rue calme » sans preuve de couverture.
- **Identité** : doublons BDCOM/OSM/Sirene/BPE, multi-accès de station, terrasses multiples d'un établissement, emprises composites des marchés.
- **Géométrie** : coordonnées WGS84/CRS, surfaces invalides, points hors emprise, inversions latitude/longitude, trous de polygone, accès non piéton, fragmentation et relation aux tronçons.
- **Sémantique** : autorisation administrative vs activité ouverte, type d'établissement vs vente effective, point d'attente vs flux observé, borne de carte vs installation physiquement présente.
- **Biais** : couverture contributive OSM, densité des signalements, zones touristiques mieux décrites, remontées terrain dépendant du nombre de bénévoles.
- **Confiance** : confiance de localisation, d'identité, d'actualité et d'hypothèse métier séparées ; une source fiable ne rend pas automatiquement l'effet de pollution fiable.
- **Licence** : ODbL, Licence Ouverte, conditions des autres éditeurs, attribution, publication de données dérivées et contraintes d'utilisation vérifiées avant fusion/distribution.
- **Données personnelles** : ne pas exposer des identifiants nominatifs, historiques ou localisations privées ; appliquer minimisation, périmètre public et règles AuthZ existantes.
- **Résilience** : indisponibilité fournisseur, export malformé, retrait d'une donnée, retour arrière vers dernier snapshot valide, aucune modification silencieuse du modèle publié.

## 9. Programme d'exécution ultérieur, sans codage immédiat

### Phase 0 - Préparation documentaire et mesure de référence

- Vérifier les **conditions d'entrée**, le `main` courant, les owners, les consommateurs, les tests et le périmètre réel Paris intra-muros.
- Produire un inventaire **machine-vérifiable uniquement si un pipeline consommateur le justifie**, avec URL, ID source, licence, millésime, nombre d'objets utilisables, précision et taux de couverture.
- Fixer les métriques de référence de la heatmap et du générateur (qualité et performances) et choisir les échantillons d'observation terrain.

**STOP :** le catalogue est fiable, le pipeline existant est compris, les hypothèses et métriques de référence sont explicites. Aucun score nouveau activé.

### Phase 1 - Import des référentiels P0 et raccordement géographique

- Réutiliser le graphe existant et préparer OSM/IGN/BAN/MOS selon besoin ; importer les **terrasses, commerces, arrêts, accès, bancs/corbeilles, marchés et espaces verts** dont la licence et la qualité sont acceptables.
- Dédupliquer les entités et calculer un rattachement aux tronçons avec preuve géométrique, sans inventer de `left/right`.
- Générer des fixtures et contrôles de couverture, de doublons et de géométries.

**STOP :** jeu de micro-lieux versionné et reproductible, géométriquement fiable sur le secteur pilote ; aucun effet numérique non justifié.

### Phase 2 - Modèle local et restitution explicable

- Définir dans l'owner existant la redistribution ou le remplacement des contributions IRIS par catégorie de risque.
- Ajouter une couche hotspots/segments consommant **le même snapshot** que le générateur d'itinéraires ; afficher confiance, état `UNKNOWN` et sources.
- Couvrir les quartiers à profils contrastés : résidentiel, transport, commerce/restauration, parc/entrées, marché et petites rues.

**STOP :** comportement déterministe, versionné, reproductible, performant, sans double comptage ni régression de sécurité/itinéraire, validé par tests exécutés.

### Phase 3 - Calibration terrain indépendante

- Recueillir des relevés homogènes : **mégots comptés / 100 m de tronçon inspecté**, **autres déchets comptés / 100 m** ; si la largeur réellement inspectée est connue, analyser également par surface. Les kilogrammes sont une métrique complémentaire, pas interchangeable avec les comptages.
- Documenter date, heure, durée, météo, largeur/surface inspectée, proximité des POI, dernière opération de nettoyage **si documentée**, mode d'échantillonnage, observateur, qualité et absence réelle de mesure.
- Tester sur rues, secteurs et périodes **indépendants de l'étalonnage**, pas seulement sur des données voisines du même lieu.
- Comparer la baseline IRIS, le modèle de segments sans POI et le modèle avec POI, par classe et avec vérification des faux hotspots ; mesurer calibration, erreurs de classement, couverture et incertitude, ainsi que coûts et temps de calcul.
- N'activer les poids et les seuils en production que si un bénéfice défendable et reproductible est démontré ; sinon conserver les POI comme couche exploratoire sans augmentation automatique du risque.

**STOP :** les gains ou limites sont mesurés, les coefficients sont documentés et versionnés, les tests et les données d'évaluation sont traçables. `NON PROUVÉ` reste le statut en l'absence de preuve.

### Phase 4 - Extension et maintenance

- Étendre aux sources P1 puis P2 **si elles apportent un gain marginal démontré** ; adapter les sources municipales d'autres communes sans créer une formule différente par ville.
- Ajouter, seulement si disponibles et licenciées, flux piétons, horaires réalistes, cendriers vérifiés et informations de nettoyage.
- Définir un protocole périodique d'actualisation de sources et de recalibration, avec suivi de dérive et réversion.

**STOP :** mise à jour reproductible, modèle parcimonieux, transparence des limites locales, coûts d'exploitation maîtrisés.

## 10. Scénarios d'acceptation obligatoires à la reprise

1. Une rue possède trois tronçons et une terrasse : seul l'espace géographiquement pertinent reçoit l'influence ; la rue entière n'est pas artificiellement saturée.
2. Bar BDCOM + restaurant OSM + terrasse Paris Data désignant **un établissement** : rapprochement explicite, pas de triple comptage.
3. Entrée de métro située près d'un boulevard séparateur : influence interdite de l'autre côté si aucune connexion admissible n'est attestée.
4. Arrêt bus IDFM et abri PVP de même emplacement : une seule entité d'attente enrichie, provenance double.
5. Marché multi-emprise un jour sans activité connue : géométrie conservée, activation temporelle correcte, pas de fréquentation inventée.
6. Parc avec un intérieur calme, une entrée proche d'un arrêt et une aire de pique-nique : plusieurs profils locaux possibles ; aucun « parc propre » global.
7. Banc sans signe de fréquentation ou corbeille sans débordement : aucun fort risque imposé a priori.
8. Source OSM manquante ou secteur PVP incomplet : `UNKNOWN` et confiance réduite ; aucun score de risque faible justifié par l'absence.
9. Commerce supprimé de l'export après recalcul : invalidation bornée, disparition de sa contribution et conservation du modèle/snapshot précédent si échec.
10. `mixed = (wasteRisk + cigaretteButtRisk)/2` quand les deux sont disponibles, sans transformer un risque de mégots en risque d'emballages.
11. Changement de méthode : version de modèle et provenance mises à jour, rendus et sorties d'itinéraire cohérents sur la même version.
12. Observations terrain et annotations administratives : aucun contournement AuthZ, aucune observation déclarée « mesurée » sur la seule base d'un POI.
13. Sécurité et itinéraire : un hotspot au milieu d'une propriété privée ou sur une voie interdite ne rend jamais le lieu accessible par calcul de score.
14. Évaluation : les données de calibration et de test sont séparées spatialement et temporellement ; un gain visuel ne vaut pas preuve d'une meilleure prédiction.

## 11. Risques, décisions et exclusions

| Risque | Décision de maîtrise |
|---|---|
| Sur-précision visuelle sans validité empirique | Afficher « risque théorique », confiance et provenance ; calibration obligatoire |
| Corrélation abusive (banc, parc, fast-food, station) | Conserver hypothèse, ne pas activer majoration automatique |
| Biais de complétude des catalogues | Mesurer couverture et inconnus par géographie/catégorie |
| Pollution déjà comptée au niveau IRIS | Redistribution ou remplacement contrôlé, pas addition naïve |
| Multiplication d'entités et saturation | Déduplication des POI, regroupement et plafonnement décidés après tests |
| Confusion avec nettoiement/effort bénévole | Services et contrats séparés ; pas d'inférence « peu nettoyé » depuis les obstacles |
| Fausses dates/heures d'activité | Schedule typé et `UNKNOWN`, pas de `open_now` supposé |
| Temps de réponse et frais cloud | Snapshots préparés, réutilisation d'owners, pas d'API géo live par itinéraire |
| Fragilité juridique des données croisées | Vérification licence/attribution et restrictions de publication par source |
| Déploiement trop tôt | Condition d'entrée et phases avec STOP explicites |

**Hors périmètre de ce plan :** implémentation d'un moteur de prédiction complet ; rédaction de SQL ou nouvelles tables ; migration Rust ; collecte temps réel de localisation individuelle ; création d'un nouveau système communautaire de signalements ; modification de la sécurité ou des règles de validation des actions.

## 12. Liens de reprise et références

Les références suivantes sont des **portails sources**, pas une preuve d'import dans CleanMyMap :

- [OpenStreetMap, attribution et licence](https://www.openstreetmap.org/copyright)
- [Geofabrik, extrait Île-de-France](https://download.geofabrik.de/europe/france/ile-de-france.html)
- [Paris Data, terrasses](https://opendata.paris.fr/explore/dataset/terrasses-autorisations/)
- [Paris Data, mobilier urbain](https://opendata.paris.fr/explore/dataset/plan-de-voirie-mobiliers-urbains-jardinieres-bancs-corbeilles-de-rue/)
- [Paris Data, marchés découverts](https://opendata.paris.fr/explore/dataset/marches-decouverts/)
- [Paris Data, espaces verts](https://opendata.paris.fr/explore/dataset/espaces_verts/)
- [Paris Data, Dans Ma Rue](https://opendata.paris.fr/explore/dataset/dans-ma-rue/)
- [IDFM, arrêts](https://data.iledefrance-mobilites.fr/explore/dataset/arrets/)
- [Insee, BPE 2025 géolocalisée](https://www.insee.fr/fr/statistiques/8217525)
- [Institut Paris Region, MOS 2025](https://www.institutparisregion.fr/mode-doccupation-du-sol-mos.html)
- [IGN BD TOPO](https://geoservices.ign.fr/bdtopo)
- [Base Adresse Nationale](https://adresse.data.gouv.fr/outils/telechargements)
- [Apur, données de commerces](https://www.apur.org/fr/open-data-cartes/open-data/base-donnees-commerces-parisiens)

### Procédure de reprise obligatoire

1. Re-lire `main` et les sources canoniques avant toute décision ; ce document peut être dépassé.
2. Vérifier si les propositions heatmap et annotations ont réellement été intégrées ; ne pas recréer un document déjà canonique ni une seconde table de calcul.
3. Confirmer pour chaque source **un export téléchargeable, son schéma, sa licence, sa couverture, son millésime et sa qualité** avant de coder son import.
4. Adapter le périmètre au plus petit lot complet, avec tests exécutables, documentation `CURRENT` des contrats réellement modifiés, vérifications des consommateurs carte et itinéraire.
5. Ne clôturer un lot que lorsque sa `STOP CONDITION` est effectivement démontrée et que les preuves de validation sont conservées.

**État final de ce document : `PLAN / DEFERRED`. Aucune donnée importée, aucune formule ajoutée, aucun hotspot implémenté, aucun test exécuté.**
