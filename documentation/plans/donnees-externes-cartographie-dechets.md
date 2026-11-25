# Plan | Données externes de déchets, historique et infrastructures

**Statut : PLAN / INVENTAIRE CANDIDAT.** Référence dépôt lue le 25 novembre 2026 : `e718cedcb545dcfe98fb8d3259875593ce60c3be`. Le recensement fourni est daté du 23 octobre 2026 ; licences, accès, fréquence, couverture et conditions indiquées ci-dessous sont des pistes issues de ce recensement, **non revérifiées lors de cette réécriture**. Vérification primaire par source et par jeu de données avant ingestion, redistribution ou activation. Pas de garantie de couverture nationale ou de temps réel.

Owners : [gouvernance des données](../architecture/data-governance.md), [méthodologie Carte Actions](../product/methodologie-carte-actions.md), [méthodologie du planner](../architecture/methodologie-creation-itineraire.md), [protocole scientifique](../product/SCIENTIFIC_PROTOCOL.md). Ce plan concerne données d'observation, mesures et infrastructures, non import des annonces futures (voir [synchronisation-actions-externes](./synchronisation-actions-externes.md)) ni modèle de pression des micro-lieux (voir [plan dédié](./enrichissement-micro-lieux-risque-pollution.md)).

## Trois catégories à maintenir séparées

- **Observation / signalement** : présence à la date observée ; récente, non ramassée, accessible et sûre seulement si preuves suffisantes. Une observation ancienne, statut absent ou précision inconnue reste historique/à reconfirmer, pas une cible certaine.
- **Ramassage effectué / mesure historique** : quantités, dates, typologies, campagnes et géométries ; utile pour analyses historiques et récurrence, ne prouve pas la présence actuelle. Les mesures de surveillance littorale peuvent être historiques sans correspondre à une collecte bénévole.
- **Infrastructure / statistique territoriale** : corbeilles, cendriers, points d'apport, déchèteries, calendriers, tonnages. Usage logistique/contexte, jamais point de pollution. Vérifier déchets acceptés, volume autorisé et accès.

Une source open source ne confère aucun droit automatique sur ses données. Un fichier accessible ne confère pas automatiquement un droit de réutilisation ou de redistribution. Les enregistrements tiers restent distincts des actions et spots canoniques ; pas de faux auteur, de faux bilan, de double comptage ni d'XP.

## Inventaire de reprise

### A. Observations et surveillance (priorités de qualification)

| Source | Couverture / donnée attendue | Accès ou licence annoncés dans le recensement ; usage candidat |
|---|---|---|
| [OpenLitterMap](https://openlittermap.com/) | Monde/France, GPS, dates, catégories, photos, indicateur ramassé | ODbL/API/export annoncés ; premier pilote, vérifier statut, droits des médias et précision. |
| [Plastic Origins](https://www.data.gouv.fr/datasets/dechets-en-riviere-en-france) | Berges françaises, relevés de campagnes | ODbL/CSV annoncé ; historique, dates observées distinctes de mise à jour. Le recensement cite des relevés 2022, fichier actualisé décembre 2025, à vérifier. |
| [Dans Ma Rue](https://opendata.paris.fr/explore/dataset/dans-ma-rue/) | Paris, anomalies de propreté et dépôts | ODbL/API annoncé ; historique. Délai d'environ trois mois rapporté, non revérifié. |
| [Dans Ma Rue historique](https://opendata.paris.fr/explore/dataset/dans-ma-rue-historique-anomalies-signalees/) | Archives parisiennes depuis 2012 selon inventaire | ODbL/exports annoncés ; récurrence historique. |
| [OpenStreetMap](https://www.openstreetmap.org/) | Dépôts durables et équipements, couverture variable | ODbL/Overpass/PBF annoncé ; examen, jamais présomption d'accessibilité ou d'actualité. |
| [Marine LitterWatch](https://www.eea.europa.eu/en/datahub/datahubitem-view/fc3a040f-ee73-4747-97c1-458c02108cf5) | Plages européennes, suivis et catégories | Exports EEA, droits à vérifier ; surveillance historique. |
| [EMODnet Chemistry](https://erddap.emodnet-chemistry.eu/erddap/tabledap/BEACH_LITTER.html) | Littoral européen, stations et relevés | ERDDAP, droits et recouvrements à vérifier. |
| [OSPAR Beach Litter](https://beachlitter.ospar.org/) | Atlantique/Manche, campagnes | Conditions de réutilisation à contrôler ; historique. |
| [OFB Saint-Florent](https://www.data.gouv.fr/datasets/observations-de-macro-dechets-dans-le-golfe-de-saint-florent-etude-caracterisation-des-biocenoses-marines-du-golfe-de-saint-florent) | Macrodéchets en Corse | Métadonnées publiques, licence à vérifier ; science uniquement. |
| [OFB Erbalunga](https://www.data.gouv.fr/datasets/observations-de-macrodechets-sur-les-fonds-marins-a-erbalunga-commune-de-brando-cap-corse) | Déchets immergés et profondeur | Licence à vérifier ; hors parcours terrestre. |
| [Ifremer DCSMM](https://www.data.gouv.fr/datasets/dcsmm2018-d10c1-repartition-des-densites-de-dechets-sur-le-fond-entre-2012-et-2016) | Densité sur fonds marins, 2012–2016 | WMS/WFS annoncés, droits à vérifier ; science historique. |

### B. Sources nécessitant accès ou partenariat

| Source | Recherche et décision |
|---|---|
| [TrashOut](https://trashout.ngo/) | Dépôts et statut de nettoyage ; export/API partenaire et droits non établis. |
| [Sentinelles de la Nature](https://sentinellesdelanature.fr/) | Signalements d'atteintes environnementales ; partenariat, droits, confidentialité. |
| [Litterati](https://litterati.org/) / [outil d'export](https://dev.opendata.litterati.org/) | Observations, campagnes et photos. Le recensement cite un accès libre-service historique antérieur à mars 2022 et une demande spécifique pour les données récentes ; non revérifié. |
| Trash Spotter | Vérifier la provenance, l'autorisation de réutilisation et les accès déjà prévus ; réutiliser l'owner canonique, pas un import concurrent. |
| Plateformes de collectivités | Licences, exports, retard, couverture et droit de diffusion variables ; étude individuelle. |

### C. Ramassages, campagnes et historiques

| Source | Priorité et données attendues |
|---|---|
| [MerTerre / Zéro Déchet Sauvage](https://mer-terre.org/zero-dechet-sauvage/) et Adopt'1 Spot | P1 partenariat, mesures, caractérisation, géométries, suivi temporel ; export complet non établi. [Code Data For Good](https://github.com/dataforgoodfr/12_zero_dechet_sauvage) n'est pas une licence de base de production. |
| [Surfrider Retrace!](https://retrace.surfrider.eu/projet/) | P1 partenariat, collectes aquatiques et Initiatives Océanes, mesures, dates et lieux ; droit d'export complet non établi. |
| OpenLitterMap | P1 ; points marqués ramassés dans le jeu autorisé, distincts des observations candidates. |
| Marine LitterWatch / OSPAR / EMODnet | P2 ; comptages, relevés et méthodes, distinguer observation de ramassage, dédupliquer les programmes agrégés. |
| [SINOE performance de collecte](https://www.data.gouv.fr/datasets/sinoe-r-performance-de-collecte-oma-par-type-de-dechet-et-par-departement) | P3 ; tonnages de service public, Licence Ouverte annoncée, contexte statistique uniquement. |
| [Trackdéchets](https://www.data.gouv.fr/datasets/trackdechets-donnees-statistiques-relatives-aux-dechets-dangereux-en-france) | P3 ; statistiques déchets dangereux, licence à vérifier ; jamais cible bénévole. |
| World Cleanup Day France | P2 partenariat, données de campagnes et droits à établir. |
| Associations locales | P2 ; fichiers/rapports non standardisés, méthodes et droits à vérifier avant intégration. |

### D. Infrastructures de collecte (logistique)

| Source | Couverture et type ; accès candidat |
|---|---|
| [ADEME Que faire de mes objets et déchets ?](https://www.data.gouv.fr/datasets/acteurs-de-leconomie-circulaire-que-faire-de-mes-objets-et-dechets) | France, points de tri/apport/réemploi ; Licence Ouverte 2.0 et API annoncées. Filtrer services effectivement autorisés. |
| [SINOE annuaire des déchèteries](https://www.data.gouv.fr/datasets/sinoe-r-annuaire-des-decheteries-dma) | France, localisation et caractéristiques ; Licence Ouverte 2.0/API annoncées. |
| OpenStreetMap | France, corbeilles, cendriers, conteneurs et recyclage ; ODbL. |
| [Paris corbeilles](https://opendata.paris.fr/explore/dataset/plan-de-voirie-mobiliers-urbains-jardinieres-bancs-corbeilles-de-rue/) | Mobilier et corbeilles, ODbL/API annoncés. |
| [Paris composteurs](https://opendata.paris.fr/explore/dataset/dechets-menagers-points-dapport-volontaire-composteurs/) | Compost collectif, API ; vérifier licence et déchets admissibles. |
| [Toulouse PAV](https://www.data.gouv.fr/datasets/points-dapport-volontaire-dechets-et-moyens-techniques-2) | Conteneurs et déchets acceptés, Licence Ouverte 2.0 annoncée. |
| [Orléans PAV](https://data.orleans-metropole.fr/explore/dataset/dechets_pav/) | Bornes, Licence Ouverte 2.0/API annoncées. |
| [Versailles Grand Parc PAV](https://www.data.gouv.fr/datasets/points-dapport-volontaire-2) | Bornes, licence à établir. |
| [Meudon cendriers](https://www.data.gouv.fr/datasets/cendriers) | GeoJSON, licence à établir. |

Tags OSM candidats à vérifier : `amenity=waste_basket` (petits déchets), `amenity=waste_disposal`, `amenity=recycling`, `waste=cigarettes` avec équipement compatible ; `landuse=landfill` et `informal=yes` si réellement documentés correspondent à un site à examiner, jamais une destination de dépôt. Vérifier capacité, permission, type de déchets et horaires. Une corbeille ordinaire ne constitue pas une solution pour le volume d'une cleanwalk.

### E. Contexte territorial

| Source | Usage exclusivement statistique/logistique |
|---|---|
| [SINOE-Déchets](https://data.sinoe-dechets.ademe.fr/) et [tonnages DMA](https://www.data.gouv.fr/datasets/sinoe-r-repartition-des-tonnages-de-dma-collectes-par-type-de-collecte) | Tonnages, services et flux par territoire. |
| [SDES production et traitement](https://www.data.gouv.fr/datasets/production-et-traitement-des-dechets) | Indicateurs nationaux. |
| [Toulouse jours de collecte](https://data.toulouse-metropole.fr/explore/dataset/dechets-collecte-des-ordures-menageres/) | Tronçons et calendriers. |
| [Métropole européenne de Lille](https://www.data.gouv.fr/datasets/zones-de-collecte-de-dechets-en-porte-a-porte-par-flux-de-collecte-jour-et-horaire-de-tournee) | Secteurs, horaires, flux. |
| [La Rochelle secteurs](https://www.data.gouv.fr/datasets/dechet-secteur-de-collecte) | Fréquence et créneaux. |
| Trackdéchets | Statistiques filières dangereuses, contexte séparé. |

## Contrat logique et pipeline

Réutiliser les owners d'import, projection et géographie présents, notamment `actions/unified-source` consommé par le planner ; vérifier les frontières réelles. Pas de nouveau service générique tant que deux pilotes ne le justifient pas. Un enregistrement externe porte au minimum source et ID stable, catégorie de données, date d'observation/collecte distincte de publication et récupération, géométrie et précision, méthode/unité de mesure si disponibles, état de nettoyage et état d'accès, licence et attribution, version de dataset, qualité, disponibilité et provenance. Métadonnées personnelles et photos exclues par défaut des projections publiques, selon droits. Conserver les valeurs absentes.

Pipeline : qualification de la source → téléchargement borné/caché hors consultation → normalisation et déduplication idempotente → contrôle qualité et droits → projection par catégorie → qualification opérationnelle indépendante. Les interruptions, réponses partielles et révisions ne deviennent pas des suppressions ou des confirmations implicites. Mettre à jour selon cadence justifiée, pas d'appel massif depuis la carte. Gérer attribution et obligations ODbL (y compris base dérivée et diffusion), Licence Ouverte et conditions spécifiques par jeu ; ne pas mélanger les bases en supposant une compatibilité. Aucune extraction authentifiée non autorisée.

### Qualification opérationnelle du planner

Séparer présence actuelle ou hypothèse de présence, intérêt du nettoyage, accès/sécurité et coût du détour. Appliquer les règles canoniques actionnable/validé, fraîcheur et exclusion ; ne pas créer une deuxième règle par fournisseur. Les seuils de fraîcheur doivent être documentés et fondés, pas fixés arbitrairement ici. Écarter déchets dangereux, zones interdites ou immergées, emprises scientifiques protégées, sites non accessibles. Une observation sans preuve suffisante est « à reconfirmer » ; aucune action ou spot CleanMyMap n'est automatiquement créé.

| Cas | Qualification | Planner |
|---|---|---|
| OpenLitterMap récent, non ramassé, accès sûr prouvé | Observation candidate, contrôle de fraîcheur | Conditionnel |
| OpenLitterMap ramassé | Historique | Non comme déchet présent |
| Signalement parisien ancien / Plastic Origins 2022 | Historique, à reconfirmer | Non sans preuve récente |
| Décharge OSM | Site à examiner | Non par défaut |
| Action MerTerre terminée | Ramassage historique | Non comme pollution actuelle |
| Corbeille OSM / point ADEME | Infrastructure | Logistique seulement |

Ne pas convertir photo ou comptage en masse sans méthode et preuve scientifique. Les densités historiques et la repollution heuristique ne sont pas des observations. Les stations de surveillance ne deviennent jamais automatiquement des arrêts de collecte.

## Lots d'intégration et critères

**X0. Qualification documentaire et technique.** Pour chaque source prioritaire, relever lien primaire, jeu, licence précise/version, conditions/API autorisée, dates réelles, statut, couverture et granularité, volume, coût/quotas, formats, champs, médias, données personnelles, test d'échantillon et attribution. Rechercher import déjà existant et recouvrements. **STOP :** décision documentée `eligible`, `historical_only`, `partnership_required` ou `blocked`, sans activation si droit non établi.

**X1. Pilotes complémentaires.** OpenLitterMap pour observations et ADEME pour points de collecte, plus réutilisation OSM déjà disponible. Import limité, idempotent, provenance et états, filtrage et déduplication, tests d'erreur/partiel, projection cartographique séparée et contrôle sécurité. Distinguer données sources et données canoniques ; pas d'effet sur classement tant que qualification et raccordement ne sont prouvés. **STOP :** import réel autorisé sur périmètre borné, tests et lecture de projection, ou blocage explicite par source.

**X2. Historique territorial.** Plastic Origins et Dans Ma Rue, puis autres collectivités, littoral et statistiques seulement si besoin et droits. Réutiliser les snapshots et projections existants, distinguer mesure de campagne, historique de collecte et statistique, éviter doublons EMODnet/OSPAR. **STOP :** contexte historique exploitable, dates et résolution fiables, aucune conversion en pollution courante.

**X3. Partenariats.** Priorité MerTerre et Surfrider, puis World Cleanup Day, associations et autres plateformes. Demander enregistrements géolocalisés datés, méthodes, unités, statut, identifiant et droits explicites, plutôt que chiffres agrégés seuls. Aucun connecteur réel non autorisé. **STOP :** accès contractualisé et pilote validé, ou attente documentée ; ne pas bloquer les autres sources.

**X4. Consommation planner, carte et Open Data.** Raccorder uniquement les observations admissibles aux mécanismes existants, avec validation de la fraîcheur, de la sécurité et de l'absence de double comptage ; infrastructures distinctes et historique visible selon licence. Les calques sont régis par [leur plan](./calques-carte-itineraire.md), la calibration par [le plan scientifique](./calibration-scientifique-planner.md). Tester les cas du tableau, source coupée, conflit de droits, géométrie incorrecte, réimport, retrait, exposition publique et non-régression des actions natives. **STOP :** intégrations effectivement autorisées et prouvées, limites affichées, docs propriétaires et tests alignés, publication vérifiée ; sources bloquées non présentées comme intégrées.

Aucune source n'est ici déclarée importée, validée ou connectée. Ne pas mettre en production une source simplement parce qu'elle figure dans cet inventaire.
