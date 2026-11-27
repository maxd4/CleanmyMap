# Index de découverte des 13 chantiers fonctionnels

> **Statut : PLAN / INDEX INTERNE**, revue documentaire du 27 novembre 2026 sur `47db47ea289cbdcbfac77483d18e818ba2a2d5a0`. Ce fichier centralise les chemins et la lecture des intentions produit dispersées dans le dépôt. Il ne constitue ni une nouvelle roadmap, ni un registre de fonctionnalités CURRENT, ni une autorisation de lancer simultanément tous les chantiers. Les propriétaires spécialisés restent les seules sources de leurs contrats et arbitrages. Les points ci-dessous sont des résumés de routage, non des spécifications concurrentes.

## Mode d'emploi

Partir de la [roadmap priorisée](../product/roadmap-priorisee.md) pour décider de l'ordre, puis de l'[index des routes](../pages_site/INDEX.md) et des sources spécialisées ci-dessous. Les plans temporaires de réception sont indexés dans [specs/README.md](../specs/README.md). Lire les contrats réellement consommés et leurs tests avant de qualifier une capacité comme manquante, de modifier une source ou de préparer un lot.

- **Socle documenté** : capacité décrite dans une source CURRENT au SHA de référence. Son fonctionnement, sa CI et son déploiement doivent être prouvés séparément. Ne pas recréer le socle.
- **Backlog à requalifier** : idée dans un inventaire, une liste ouverte ou une ancienne spécification ; son absence effective du code n'a pas été auditée.
- **PLAN / CANDIDATE / conditionnel** : périmètre que sa source qualifie explicitement de futur ou de candidat ; la présence de fichiers préparés ne démontre pas leur intégration.
- **NON_PERTINENT / NON_GAMIFIED / HISTORY** : décisions négatives ou anciens états à respecter, et non tâches à réouvrir.
- Les fiches indiquent les dépendances et les résultats attendus à la lecture des plans. Les suggestions de séquencement et de réception sont des recommandations de cadrage, pas des décisions d'activation supplémentaires. Aucun seuil scientifique, droit, budget ou engagement externe n'est modifié ici.

| ID | Chantier | Source de décision ou d'orientation principale |
|---|---|---|
| 01 | Apprentissage et pédagogie | [Backlog Apprendre](../pages_site/routes/05-apprendre/apprendre-liste-propositions-a-traiter.md) |
| 02 | Quiz et mémorisation | Même backlog + [rappels cognitifs](../product/specification-rappels-cognitifs.md) |
| 03 | Mode École | Même backlog, section 5 |
| 04 | Cartographie et prédiction de la pollution | [Heatmap et pilote](../architecture/paris-street-pollution-heatmap.md) ; [index des plans](README.md) |
| 05 | Itinéraires intelligents et sciences participatives | [Calibration du planner](calibration-scientifique-planner.md) |
| 06 | Interopérabilité et données externes | [Synchronisation](synchronisation-actions-externes.md) ; [API Engagement](interoperabilite-api-engagement.md) ; [données externes](donnees-externes-cartographie-dechets.md) |
| 07 | Communauté et engagement citoyen | [Dimension communautaire](../product/dimension-communautaire.md) |
| 08 | Objectifs, défis et campagnes | [Objectifs mesurables et progression collective](../features/reports/impact-goals-and-progression.md) |
| 09 | Rapports d'impact et parcours scientifique | [Paramètres rapports](../features/reports/reports-generation-parameters.md) ; [décisions ouvertes](../product/decisions-en-attente.md) |
| 10 | Entreprises, associations et RSE | [Contrat organisations CURRENT](../features/enterprise-organizations-CURRENT.md) ; [persona](../product/persona-entreprise-rse.md) |
| 11 | Empreinte environnementale de l'IA | [Passation](../specs/empreinte-ia/README_CODEX.md) ; [arbitrages 24](../specs/empreinte-ia/SPECIFICATIONS_PLAN/24_ARBITRAGES_PREUVES_ET_PRIORITES.md) |
| 12 | Mobile inspiré de Strava | [README mobile](../../apps/mobile/README.md) ; [matrice fonctionnelle](../../apps/mobile/MATRICE_STRAVA_CLEANMYMAP_MOBILE.md) |
| 13 | Extension de la gamification | [Moteur](../features/gamification/GAMIFICATION_ENGINE.md) ; [manifeste expansion](../specs/gamification-expansion/README_CODEX.md) |

## 01. Apprentissage et pédagogie

**Finalité et surfaces.** Permettre de passer d'une question concrète à un contenu court, sourcé et à une prochaine étape utile. Les pages canoniques sont celles du [bloc Apprendre](../pages_site/routes/05-apprendre/apprendre-README.md) : Comprendre, Bonnes pratiques, S'entraîner, École et Mon empreinte IA. Le hub et la page Ressources autonomes sont déjà intégrés aux surfaces existantes ; ne pas les recréer.

**Source propriétaire du backlog.** [Propositions à traiter](../pages_site/routes/05-apprendre/apprendre-liste-propositions-a-traiter.md), sections 1 à 3. Les numéros d'origine sont conservés pour rechercher exactement les décisions. Le [registre NON_PERTINENT](../pages_site/routes/05-apprendre/apprendre-objectifs-non-pertinents.md) prévaut sur les anciennes idées refusées.

| Groupe | Périmètre à requalifier | Résultat utile attendu |
|---|---|---|
| Navigation pédagogique (1, 2, 3, 18, 37, 38) | Parcours thématiques courts, progression locale sans compte imposé, prochaine étape, mode 5 minutes, favoris/à revoir et recherche du corpus | Retrouver une notion, reprendre un parcours et accéder à la ressource exacte sans recréer de hub |
| Vulgarisation (4, 5, 8.1, 9, 40) | Glossaire interactif, comparateur d'ordres de grandeur, sélection de travaux pionniers/établis/récents, idées reçues, art et environnement | Définitions, comparaisons homogènes, sources et limites accessibles |
| Politiques environnementales (8.2) | Registre des mesures mondiales, filtre France, identité des décisions européennes, adoption/publication/entrée en vigueur/application, historique versionné et résultats observés | Distinguer objectif annoncé, décision, état juridique et résultat ; revue avant publication |
| Qualité des contenus (34, 35, 36) | Bibliographie/tiroir commun, niveau de preuve, date de vérification | Aucun chiffre ni conclusion sans provenance ; mêmes composants dans le bloc |
| Guides pratiques (10 à 15) | Objets non standard, assistant de tri par matière/état/lieu, diagnostic compost, solutions territoriales, réemploi avant traitement, fiches avant/pendant/après cleanwalk | Une consigne contextualisée et une destination admissible, pas un catalogue de consignes génériques dupliqué |

**Dépendances et limites.** Les solutions locales rejoignent le chantier 06 pour leurs référentiels, et les exercices rejoignent 02. Les contenus suivent le [protocole scientifique](../product/SCIENTIFIC_PROTOCOL.md). Les mini-simulations scientifiques, le module autonome mégots et l'extension autonome de sobriété numérique ont été écartés dans le registre NON_PERTINENT ; ne pas les réintroduire via un nouveau nom. La page Empreinte IA suit ses propres décisions plus récentes (11).

**Réception proposée.** Vérifier chaque idée contre les pages, composants, registre éditorial et tests actuels ; établir les écarts restant réels. Préférer la consultation locale sobre, l'accès clavier, les sources vérifiées et un seul prochain CTA. Les cases non cochées du backlog ne démontrent pas l'absence du runtime.

## 02. Quiz et mémorisation

**Finalité.** Approfondir les connaissances sans créer un LMS ni multiplier des banques de questions. Le quiz et la progression d'apprentissage existent ; réutiliser le moteur individuel et les formats canoniques.

**Sources de vérité.** [Backlog, section 4](../pages_site/routes/05-apprendre/apprendre-liste-propositions-a-traiter.md), [spécification des rappels cognitifs](../product/specification-rappels-cognitifs.md) pour les intentions et labels, [cartographie des compétences](../features/quiz/quiz_competences_map.md) pour une analyse contextualisée de la couverture (ne pas traiter son nombre historique de questions comme le catalogue courant). Les règles XP sont celles du [moteur gamification](../features/gamification/GAMIFICATION_ENGINE.md), pas celles du document cognitif.

| Groupe | Périmètre à requalifier |
|---|---|
| Révision (19, 20) | Sessions à partir des notions réellement consultées ; répétition espacée des notions échouées, fragiles et anciennes ; date de prochaine révision et états Nouvelles, Échouées, À revoir, Maîtrisées |
| Maîtrise (21, 26) | Niveaux Découvrir, Comprendre, Appliquer, Analyser ; bilan des acquis, erreurs et ressources recommandées |
| Qualité des questions (22, 23, 24) | Exercices à partir de données publiques qualifiées, unités, interprétation, causalité, sources ; explication et lien utile après réponse |
| Micro-rappels | Mélange thématique, mini-défis et reprises sobres dans les surfaces existantes, selon la spécification cognitive et les arbitrages plus récents |

**Dépendances et limites.** L'ancien document cognitif ne permet pas de contourner le rejet explicite du parcours adaptatif léger (25) ni des passerelles systématiques pédagogie/terrain (39). Les états de révision doivent refléter une preuve réellement disponible ; ne pas inventer de mémorisation ou de suivi persistant. Vérifier la taxonomie réelle (thème, compétence, format) avant de l'utiliser pour les collections du chantier 13 ; une session de démonstration ou scolaire n'est pas une preuve personnelle.

**Réception proposée.** Vérifier le comportement des réponses et des révisions (identité, corrections, reprise, échéances, répétition), éviter le farming et les compteurs divergents, rendre explicite le caractère local ou authentifié du suivi.

## 03. Mode École

**Socle documenté.** Le mode École est une page canonique du bloc Apprendre et une porte d'entrée vers les ateliers. La promesse sans compte élève reste applicable.

**Sources de vérité.** [Backlog Apprendre, section 5](../pages_site/routes/05-apprendre/apprendre-liste-propositions-a-traiter.md), [fiche d'entrée du bloc](../pages_site/routes/05-apprendre/apprendre-README.md) et fiche de la route retrouvée depuis l'[index des pages](../pages_site/INDEX.md). Les [plans d'ateliers](README.md) ne constituent pas des preuves de réalisation scolaire.

| Fonction | Détail du périmètre à requalifier |
|---|---|
| Ateliers pratiques (27) | Mesure, caractérisation, hypothèse, calcul, lecture de données, analyse selon le niveau |
| Supports enseignant (28) | Objectifs, matériel, durée, déroulé, réponses, précautions et nombre d'exemplaires |
| Supports élève (29) | Fiches d'observation, calculs et conclusions sans identité élève |
| Projection classe (30) | Affichage plein écran, question, vote collectif, réponse et explication |
| Évaluation pré/post (31) | Résultats agrégés par concept ; aucune causalité ni mesure de transfert supposée |
| Ressources territoriales (33) | Lieux, programmes et ressources locales vérifiés, sans annoncer de partenariat non établi |

**Dépendances et limites.** Impression économe en encre/papier et contenus adaptés ; réutiliser les mécanismes pédagogiques du 02 sans transformer les réponses scolaires en XP individuelle. Le passage systématique atelier-terrain (32) est explicitement écarté. Pas de comptes élèves, de classement individuel ou de collecte supplémentaire de données de mineurs.

**Réception proposée.** Vérifier les supports imprimés, projection, agrégats et parcours de l'enseignant ; distinguer une ressource disponible de l'utilisation réellement observée en classe.

## 04. Cartographie et prédiction de la pollution

**Socle documenté.** Le [modèle zonal](../architecture/paris-pressure-risk-model.md) calcule déjà deux risques prédits distincts. Le [contrat heatmap](../architecture/paris-street-pollution-heatmap.md) décrit le pilote statique 5e/6e et ses limites. L'historique, les observations Trash Spotter, les lieux propres, les prévisions et l'aptitude d'intervention restent des concepts distincts.

| Extension | Source propriétaire | Statut / décision restante |
|---|---|---|
| Extension spatiale du pilote, hotspots cliquables, micro-lieux, voies et activités urbaines | [Micro-lieux et infrastructures](enrichissement-micro-lieux-risque-pollution.md) | PLAN / PARTIAL PILOT : données géoréférencées, droits, fraîcheur et raccordement au graphe |
| Calques risques déchets/mégots, affluence, propreté, événements, serviceabilité, zones évitées et confiance | [Calques du planner](calques-carte-itineraire.md) | PLAN : projections du même modèle, affichage seulement si trace source disponible |
| Valeur marginale bénévole | Même plan des calques | Conditionnelle à un score réellement calculé ; serviceabilité municipale ≠ fréquence de passage |
| Calque public de pollution prédite, annotations et corrections administratives | [Annotations communautaires](heatmap-annotations-communautaires.md) | PLAN : cinq niveaux, corrections motivées, versionnées, auditables et réversibles ; conflits géométriques à arbitrer |
| Pondération socio-démographique | [Plan de pondération](ponderation-socio-demographique-heatmap.md) | PLAN / DEFERRED / HYPOTHESIS : calibration indépendante et analyse des biais ; aucune causalité du revenu établie |
| Historique de repollution | [Méthodologie carte/actions](../product/methodologie-carte-actions.md) | Requalifier les extensions à partir du contrat actuel ; prédiction ≠ observation actuelle |

**Dépendances.** Les observations et infrastructures externes du 06 alimentent uniquement les catégories compatibles ; le planner du 05 consomme le même référentiel spatial. La porte d'entrée du plan d'annotations exige notamment graphe piéton versionné, scores distincts, chargement borné, références spatiales communes et preuve du pilote. Pas de deuxième moteur client ou de coefficient présenté comme mesuré.

**Réception proposée.** Vérifier raccordement aux voies, identités et géométries, absence de données, distinction des couches, reprise après modification OSM, corrections et performances. L'étendue d'une future généralisation n'est pas acquise.

## 05. Itinéraires intelligents et sciences participatives

**Finalité.** Optimiser une intervention réelle sous contraintes et apprendre des écarts entre le parcours proposé et le terrain. Ne pas confondre optimisation déterministe et appel à un modèle d'IA.

**Sources de vérité.** [Calibration scientifique du planner](calibration-scientifique-planner.md), [couverture GPS multi-groupes](../product/couverture-gps-multi-groupes.md) (socle CURRENT / évolutions TARGET), [calques explicables](calques-carte-itineraire.md), [arbitrages ouverts](../product/decisions-en-attente.md) et [protocole scientifique](../product/SCIENTIFIC_PROTOCOL.md). Le plan de calibration porte les jalons et leurs conditions, non une preuve qu'ils sont exécutés.

| Lot du plan | Travail à qualifier |
|---|---|
| D1 / D2 | Provenance météo prévue/observée et étude de l'effet réel sur la durée et les rendements |
| D3 | Corridors de nettoyage et organisation des groupes ; distinguer traversée et intervention |
| F1a / F1b | Protocole puis benchmark reproductible des parcours planner/organisateur ; promotion seulement si gain prouvé |
| F2a / F2b | Dataset de calibration versionné, comparaison hors échantillon, mise en service conditionnelle et rollback |
| E1 à E4 | Confiance scientifique, rendement selon bénévoles/groupes/lieux, conversion volume de mégots |
| F3 | Open Data admissible de calibration, méthodes et provenance |
| G1 | GPS réel lié à l'action, extension mobile conditionnelle |
| Arbitrage complémentaire | Recommandations proactives d'itinéraires, utilité et contraintes d'activation encore ouvertes |

**Socle à préserver.** Le plan multi-groupes décrit déjà les contributions unitaires et projections de traces ; l'union spatiale et la couverture unique plus avancées sont conditionnelles. Ne jamais concaténer des traces indépendantes pour produire un faux parcours ou déduire une surface nettoyée du GPS. Le modèle 04, les sources 06 et le mobile 12 sont des dépendances, pas des moteurs à dupliquer.

**Réception proposée.** Fixer le protocole avant la collecte, distinguer données observées, calculs et proxys, documenter les erreurs, la couverture et la reproductibilité. Toute amélioration de rendement doit être mesurée, pas supposée.

## 06. Interopérabilité et données externes

**Finalité.** Une annonce publiée une fois peut être diffusée et, sous droits distincts, devenir une pré-action de travail. Les sources scientifiques enrichissent les cartes sans convertir une observation externe en action CleanMyMap réalisée.

| Flux | Source propriétaire | Périmètre et état documentaire |
|---|---|---|
| Synchronisation opérationnelle | [Plan de synchronisation externe](synchronisation-actions-externes.md), [registre des specs SYNC-A](../specs/README.md) | Moteur/commandes/cron publiés selon le registre ; réception transactionnelle à vérifier ; activation de sources autorisées et inscriptions privées encore conditionnelles |
| Publication unique et diffusion | [Interopérabilité API Engagement](interoperabilite-api-engagement.md) | PLAN / PROPOSITION : pilote Brigade Verte Paris, JVeuxAider comme source candidate, API Engagement diffuseur, relais J'agis pour la nature et Un Geste pour la Mer ; accords non présumés |
| Inscriptions externes | Plan de synchronisation, lot C | Mandat et accès privé distincts du droit de diffusion ; rapprochement sans transformer inscription en présence ou compte |
| Widgets, flux ICS/JSON, agendas locaux | Plan API Engagement, sections 7 et 8 | Préférer widget officiel ; widget CleanMyMap ou redistribution seulement si besoin/droits non couverts ; annonceur différé |
| Observations et historiques de déchets | [Inventaire des données externes](donnees-externes-cartographie-dechets.md), sections A à C | OpenLitterMap, Plastic Origins, Dans Ma Rue, OSM, Marine LitterWatch, EMODnet, OSPAR ; TrashOut, Litterati, MerTerre, Surfrider et autres sous conditions d'accès/licence |
| Infrastructures et contexte | Même inventaire, sections D et E | ADEME, SINOE, OSM, collectivités : points de tri, corbeilles, cendriers, composteurs, réemploi, services ; qualifier capacité/horaires/usage |
| API scientifique avancée | [Décisions ouvertes](../product/decisions-en-attente.md) | Arbitrer formats, quotas, AuthN et données autorisées au-delà de l'explorateur Open Data existant |

**Dépendances et frontières.** Réutiliser le moteur external-sync, les owners Actions, les références d'organisateurs et le registre privé de présence. Un événement peut avoir plusieurs annonces ; identifier occurrence, provenance et révisions, ne pas fusionner deux dates différentes. Les indisponibilités ne valent pas annulation, les boucles import→annonceur sont interdites. Les licences et accords mentionnés sont des candidats documentés ; accès, export exhaustif et redistribution réels non prouvés ici. Préserver le [contrat Open Data de la page](../pages_site/routes/04-reseau-discussions/open-data/open-data-README.md).

**Réception proposée.** Dry-run sans publication, puis pilote borné avec accès autorisé, rapprochement stable, annulation/révision et reprise démontrés ; vérifier les inscriptions séparément. Une nouvelle source n'est ouverte que si son usage réel et ses droits sont établis.

## 07. Communauté et engagement citoyen

**Sources de vérité.** [Dimension communautaire](../product/dimension-communautaire.md) pour les axes et propositions, [actions collectives](../features/group-action.md) pour les relations et la participation, [messagerie](../pages_site/routes/04-reseau-discussions/messagerie/messagerie-README.md) pour les échanges, [ambition territoriale](../product/ambition-territoriale-paris.md) pour l'expérimentation. Ne pas utiliser l'ancien MVP communautaire comme liste de capacités absentes.

| Groupe | Proposition ou reliquat | État / limite |
|---|---|---|
| Continuité post-action | Remerciement, prochaine action, retour terrain, rappels adaptés | Plusieurs éléments déjà décrits CURRENT (retour publié, suggestions territoriales, digest in-app) ; requalifier les seules extensions manquantes |
| Mentorat et référents | Aide de contributeurs réguliers, reconnaissance et accompagnement | Proposition ; pas de rôle ou droit automatiquement issu d'un badge |
| Missions courtes récurrentes | Relayer, vérifier, photographier, signaler, accompagner | Proposition ; préciser preuve de réalisation et owner avant création |
| Association et besoins locaux | Fiche utile, matériel, recrutement, impact historique, coordination territoriale | Backlog à comparer à l'annuaire, besoins et projections communautaires existants ; aucun effectif de référents supposé |
| Sondages | Multi-choix, expiration et clôture | Hors périmètre courant selon fiche messagerie ; préserver vote existant |
| Notifications | Push discussion opt-in, importance et préférences | PLAN ; canal in-app existant, futur canal mobile distinct |
| Dossier bénévole | PDF narratif complet à partir des participations et éléments éditoriaux | PLAN explicite dans le contrat Actions ; modèle d'attestation associative vierge déjà disponible, aucune signature ou certification inventée |

**Dépendances.** 08 pour les objectifs collectifs, 12 pour le push natif, 13 pour les badges. Ne pas construire un réseau social général concurrent de la messagerie, ni donner de nouveaux privilèges à des profils reconnus sans arbitrage AuthZ. La coordination territoriale reste dépendante de partenaires réels et de responsabilités établies.

**Réception proposée.** Examiner les parcours communautaires actuels, vérifier absence de spam et de divulgation de relations privées ; une extension doit résoudre un besoin documenté de retour, entraide ou coordination.

## 08. Objectifs, défis et campagnes

**Source propriétaire.** [Objectifs mesurables et progression collective](../features/reports/impact-goals-and-progression.md), explicitement PLAN hors P0 rapports. Comparer avec le [contrat organisations CURRENT](../features/enterprise-organizations-CURRENT.md) : il existe déjà des campagnes d'organisation rattachées à des actions ; ne pas créer une deuxième entité campagne sur la seule base du plan ancien.

| Groupe | Périmètre prospectif |
|---|---|
| Objectif persistant | Métrique, unité, cible positive, période, territoire, structure, campagne ou groupe, états brouillon/actif/terminé/pausé/annulé/archivé |
| Mesures | Actions, participants uniques lorsque prouvés, nouveaux/récurrents, temps bénévole, territoires, signalements traités, qualité ; masse/distance/surface uniquement avec contrat d'impact compatible |
| Suivi collectif | Valeur réelle comparable, progression, couverture, échéance, actions contributrices et rythme lorsque calculable |
| Défis | Objectifs temporaires ou territoriaux, galerie et inscription, paliers et reconnaissance après décision économique ; objectifs personnels à rapprocher du [plan mobile](../../apps/mobile/MATRICE_STRAVA_CLEANMYMAP_MOBILE.md) |
| Communauté | Groupe/canal associé, besoins, événements et jalons ; une seule projection d'avancement |
| Rapports | Bilan de campagne, état des objectifs et historique reproductible |

**Dépendances et décisions.** Le socle campagne 10, les métriques 09 et le registre 13 doivent converger. L'objectif est une cible distincte d'un filtre de rapport et d'une observation réelle. Le lieu de présentation reste à arbitrer, sans remplacer les onglets de rapports réellement livrés. Aucun XP proportionnel aux quantités ni XP collective automatiquement autorisée. Les tables esquissées dans le plan ne sont pas un schéma imposé.

**Réception proposée.** Prouver un besoin collectif distinct des campagnes existantes ; définir l'owner, les scopes, la métrique, la période, le traitement de l'inconnu et les règles de changement de cible. Démontrer une projection commune pour rapports et communauté avant d'étendre la gamification.

## 09. Rapports d'impact et parcours scientifique

**Socle documenté.** La [fiche CURRENT Rapports](../pages_site/routes/03-cartographie-impact/reports/reports-README.md) décrit Génération, Analyse, Mes fichiers, Tous les fichiers, snapshots, exports, filtres et bibliothèque. Le [contrat Markdown IA](../features/reports/ai-markdown-export.md) documente un fichier téléchargé, sans appel à un modèle ; le PDF natif et le partage contrôlé existants ne doivent pas être recréés.

| Extension | Source propriétaire | Reliquat / décision |
|---|---|---|
| Rédaction assistée par IA | [Export Markdown IA](../features/reports/ai-markdown-export.md) ; [roadmap](../product/roadmap-priorisee.md) | PLAN : projection sûre, modèle évalué, JSON structuré, validation factuelle, template PDF existant, relecture et coût |
| Paramètres et filtres avancés | [Paramètres de génération](../features/reports/reports-generation-parameters.md) | Requalifier les tableaux hérités avec les filtres CURRENT ; programmes, organisation, liens GPS/action, avant/après, fidélisation, surface seulement avec sources canoniques |
| Rapports de campagne et d'organisation | [Objectifs collectifs](../features/reports/impact-goals-and-progression.md) et [organisations CURRENT](../features/enterprise-organizations-CURRENT.md) | Bilan privé organisationnel déjà présent en agrégats/CSV ; PDF et historique privés restent ouverts ; ne pas dupliquer la génération |
| Parcours scientifique | [Décisions en attente](../product/decisions-en-attente.md) | Personnalisation, provenance, qualité, couverture, comparaison temporelle/territoriale, exports spécialisés ; capacités serveur non arbitrées |

**Dépendances et limites.** Priorité canonique P0 : rapport fiable issu d'une action réelle et réutilisation du snapshot. 05/06 pour les données et incertitudes ; 08/10 pour les scopes et campagnes. Ne pas traiter zéro/inconnu comme équivalents, ni attribuer un résultat d'impact par IA, ni donner accès à des données personnelles parce que le rôle UX est scientifique.

**Réception proposée.** Exécuter une restitution complète, vérifier identité du corpus et du snapshot, scopes, limites, exports et reproductibilité ; pour la rédaction IA, démontrer qualité factuelle, confidentialité et coût par rapport au pipeline déterministe existant avant activation.

## 10. Entreprises, associations et RSE

**Source de vérité prioritaire.** Le [contrat Organisations entreprise CURRENT](../features/enterprise-organizations-CURRENT.md) est plus précis pour l'état livré que les listes d'idées du [persona](../product/persona-entreprise-rse.md), les [arbitrages](../product/decisions-en-attente.md) et le [manifeste candidat](../specs/entreprise-rse/README_CODEX.md). Ceux-ci ne permettent pas de requalifier les fonctionnalités déjà décrites comme absentes.

**Socle documenté :** workspace `/sponsor-portal?tab=organization`, bootstrap administratif, adhésions/invitations, transfert de responsabilité, établissements, rattachement d'action admissible, campagnes et bilan privé agrégé/CSV. La source rapporte une preuve pgTAP éphémère au candidat identifié ; elle ne démontre pas l'état de la base liée ni un E2E navigateur→Supabase réel.

| Groupe | Reliquat explicite ou piste conditionnelle |
|---|---|
| Onboarding | Interface de vérification humaine du mandat, recherche de compte ergonomique pour les invitations |
| Gestion des actions | Correction/détachement audité d'une action, annulation du rattachement campagne-action |
| Rapports | Historique et PDF privés, consolidation annuelle, graphes et performances avancées, réutilisation des owners Reports |
| Coordination | Calendrier organisationnel, kit de communication factuel, invitations/QR à requalifier selon les acquis Actions |
| Engagement | Challenges distincts des campagnes, questionnaires de sensibilisation avant/après ; pas de nouvelle récompense sans arbitrage |
| Prestations | Devis, budgets et financement d'actions partenaires ; besoins exploratoires, relation contractuelle à prouver |
| Intégrations professionnelles | Plateformes ESG/RSE, SSO, automatisation, abonnements et facturation : conditionnels à la preuve commerciale, juridique, économique et de sécurité |

**Dépendances et limites.** Le rôle entreprise ne donne pas une adhésion ou un droit privé. Les acteurs, établissements, données et actions restent dans le scope serveur vérifié. Pas de certification ESG ou reporting CSRD automatique. 08 doit étendre les campagnes existantes si nécessaire, 09 porte les rapports, 11 les éventuels bilans IA ; ne pas créer de moteur, compte ou modèle d'organisation concurrent.

**Réception proposée.** Requalifier les manifestes de réception contre le checkout actuel, ne pas réintégrer aveuglément leurs patches. Traiter les reliquats réels avec preuves de scope, concurrence et usage ; préserver le socle déjà intégré et les limites de la base distante.

## 11. Empreinte environnementale de l'IA

**Sources de vérité.** [Fiche CURRENT de la page](../pages_site/routes/05-apprendre/learn-empreinte-ia/learn-empreinte-ia-README.md), [index de passation](../specs/empreinte-ia/README_CODEX.md), [arbitrages 24](../specs/empreinte-ia/SPECIFICATIONS_PLAN/24_ARBITRAGES_PREUVES_ET_PRIORITES.md) et errata indiqué par le manifeste. Lire les fiches exactes de chaque lot dans le dossier de spécifications en suivant l'ordre de dépendances du manifeste ; ne pas extrapoler à partir d'une passation historique.

**Socle documenté.** Calcul rapide public, saisie technique privée, déclarations, imports supportés et corrections d'identité publiés ; les preuves PostgreSQL/RLS et E2E authentifié restent partielles selon le manifeste daté. Les imports d'historiques personnels ChatGPT/Claude ne sont pas pris en charge par ce socle.

| Lot / thème | Fonctionnalités en attente |
|---|---|
| Extension du lot 2 | Adaptateurs locaux ChatGPT/Claude particuliers après fixtures représentatives ; analyse de métadonnées utiles, pas persistance du texte brut |
| [Lot 3 : suivi et budgets](../specs/empreinte-ia/SPECIFICATIONS_PLAN/06_LOT_3_SUIVI_BUDGET.md) | Historique privé filtrable, agrégats mensuels UTC, conflits, sources prioritaires, corrections et versions ; budgets facultatifs de tokens, monnaie distincte et scénarios énergétiques séparés selon arbitrages 24 |
| Lots 4 + 09 | Objectifs terrain volontaires, analogies pédagogiques et articulation avec les scénarios existants, sans compensation ni dette carbone |
| Lots 10 / 11 / 12 / 18 | Pédagogie, parts personnelles et gamification sous preuve indépendante, entraînement distinct de l'inférence, bénéfices environnementaux/humains/territoriaux non sommables |
| Lots 14 / 15 / 16 | Attestation choisie et partage maîtrisé, pilotes RSE, rapports et financement conditionnels ; aucune visibilité employeur automatique |
| Lot 21 | Comparateur modèles, hébergeurs, régions et abonnements sur tâche réussie ; coût/qualité/Wh/gCO2e séparés, Pareto, pas de classement d'offres concrètes sans preuves comparables |

**Dépendances et limites.** Les déclarations de messages ne mesurent pas les tokens internes. Les inconnues restent NA, l'énergie IT/facility/wall et l'eau conservent leurs frontières. Le prix ne mesure pas l'énergie ; aucun retrait de déchets ne compense une empreinte IA. Les anciens ratios en nombre de cleanwalks de 5 kg sont abandonnés. Les XP quantitatives du lot 11 restent une piste sous preuve et décision distincte ; elles ne sont pas autorisées par le chantier 13. Les lots 14/15/16/21 exigent des pilotes ou preuves spécifiques.

**Réception proposée.** Clore les preuves du socle, puis poursuivre le lot 3 et ses dépendants. Distinguer import accepté, normalisation, persistance owner-scoped, validité scientifique et production. Ne pas refaire les lots déjà publiés, ne pas intégrer de SQL candidat brut.

## 12. Application mobile inspirée de Strava

**Sources de vérité.** [README mobile](../../apps/mobile/README.md) pour le statut runtime et la V1 ; [matrice Strava](../../apps/mobile/MATRICE_STRAVA_CLEANMYMAP_MOBILE.md) pour les idées, identifiants A-H et priorités proposées ; [roadmap 2027 Web/mobile](roadmap-2027-dev-web-mobile-codex.md) pour l'horizon prévisionnel. Les fiches de référence UI liées depuis la matrice détaillent les surfaces. Le README mobile prévaut sur une ancienne idée de navigation.

**Socle documenté.** Agir / Carte / Compte, Clerk, missions GPS owner-scoped, buffer/reprise locale, finalisation serveur, contact d'urgence, parcours natifs de participation/création/signalement et ponts Web. Application en développement actif, non prête pour production. Ne pas confondre pont Web et capacité native.

| Famille de la matrice | Capacités PLAN / PARTIEL à requalifier |
|---|---|
| A : découverte sociale | Fil d'activités et filtres, cartes avec photo/tracé, encouragements, journal de terrain et contenus de collectifs |
| B : terrain GPS | Modes terrain si contrats distincts, itinéraire prévu superposé, alerte de déviation ; fiabilité background/reprise avant enrichissements |
| C : bilan | Bilan après action natif, catégories/provenance, carte statistique partageable, replay animé |
| D : carte et itinéraires | Carte native complète, fiches bottom sheet, filtres/POI, découverte locale, dessin et itinéraires enregistrés, navigation au départ, heatmap personnelle, secteurs, recherche en langage naturel conditionnelle |
| E : événements et clubs | Gestion avancée, coorganisation, calendrier/rappels, profils et relations de collectifs, statistiques, flyers, annonces |
| F : messagerie | Boîte native, discussions privées/groupes, salons/annonces, partage et modération, centre de notifications et push, préférences par canal |
| G : progression | Historique et calendrier, graphiques, objectifs, galerie de défis et badges, bilans mensuels/annuels, carte personnelle, rapports serveur, records personnels et reconnaissance territoriale |
| H : confidentialité | Visibilité par activité, masquage de portions GPS, paramètres de confidentialité et partage volontaire/sécurité |

**Dépendances.** 05 pour les traces, 07 pour la communauté, 08 pour les défis, 09 pour les rapports, 13 pour l'XP. Le backend et les calculs restent communs, les interfaces sont natives. La vision Strava ne prescrit ni une parité intégrale Web/mobile ni une nouvelle API de calcul concurrente.

**Réception proposée.** V1 : permissions, GPS, offline, interruption, changement de compte, reprise, finalisation et appareils physiques Android/iOS, distribution signée si décidée. Les évolutions avancées n'entrent dans la V1 que si la roadmap et les preuves les justifient.

## 13. Extension de la gamification

**Sources de vérité.** [Spécification canonique CURRENT](../pages_site/routes/03-cartographie-impact/gamification/gamification-SPEC_CANONIQUE.md), [Moteur CURRENT](../features/gamification/GAMIFICATION_ENGINE.md), [direction non compétitive](../product/gamification-non-competitive.md), [inventaire des surfaces](../product/gamification-inventory.md), [refactor moteur candidat](../specs/gamification-engine-refactor/README_CODEX.md) et [extension candidate](../specs/gamification-expansion/README_CODEX.md). Les deux derniers manifestes, et leurs BASE_FILES, possèdent les détails et l'ordre de réception. Le registre runtime est l'autorité des IDs, règles et catégories ; l'inventaire produit n'est pas un second registre.

| Groupe | Travail restant d'après les manifestes |
|---|---|
| Réception du moteur | Intégrer les candidats consolidés, lecteurs exhaustifs, classification, projections et réconciliation ; vérifier preuves et limites AuthZ/SQL avant changement économique |
| 9 collections évolutives | Mobilisation, mesures traçables, tri, formalités, parcours, parrainages, bugs, idées, améliorations ; policy et tests candidats déjà préparés |
| 9 one-shot | Du terrain à la carte, Savoir et agir, Bilan documenté, Mobiliser et documenter, Du terrain au produit, Améliorateur polyvalent, Engagement partagé, Agir et préserver, Contributeur complet |
| Échelles existantes | Prolongements Participation, Exploration, Zones propres et Apprentissage selon le manifeste ; aligner règles et projection du prochain palier ; anti-rejeu quiz préalable |
| Extensions par domaine | Signalements, SPOGOMI, entraide, veille des lieux, rapports, réseau, open data, feedback livré, école et apprentissage thématique/IA ; activation conditionnelle à la preuve de chaque owner |
| Consommation | Objectifs contextualisés, collections, badge actuel/prochain, révision de règles, reçu de réconciliation et cohérence du décompte public/privé ; clients Web/mobile sans moteur concurrent |

**Dépendances et limites.** Réception technique puis économique distinctes. Le manifeste expansion porte la politique XP, ses seuils et les plafonds : ne pas les copier dans cet index. L'XP reste distincte de l'impact et des permissions. Les clics, dons, messages, volumes bruts et simples inscriptions restent non gamifiés. Les défis collectifs (08) et quantités personnelles (11) ne sont pas automatiquement autorisés par les candidats. Les tests isolés du noyau candidat ne constituent pas une preuve Vitest ou SQL intégrée ; aucun rebuild global de production sans preuves préalables.

**Réception proposée.** Préserver les acquis et historiques, tester corrections/rétractions, doublons, dates, concurrence, lecture incomplète, seuils ouverts, droits et projections ; publier la documentation CURRENT dans le lot réellement intégré et retirer seulement les candidats consommés.

## Dépendances transversales et ordre de lecture

Les numéros 01 à 13 sont des identifiants de navigation, pas des rangs de priorité. Les flèches indiquent un partage de preuves ou de sources, pas une obligation de livrer intégralement un chantier avant l'autre.

- 01 → 02 et 03 : contenus et compétences ; 02 → 13 : preuves d'apprentissage.
- 06 → 04 → 05 : référentiels autorisés, modèle spatial et itinéraires ; 12 → 05 : traces réellement observées.
- 07, 09, 10 ↔ 08 : communauté, métriques et campagnes existantes ; 08 → 13 seulement après décision explicite sur les défis.
- 09 et 11 : moteurs, sources et périmètres distincts ; partage possible de restitution, pas compensation ni double comptage.
- 12 : consomme les contrats métier communs sans recréer les calculs.
- 13 : dépend d'abord de sa propre réception moteur, puis de preuves admissibles des domaines auxquels il se raccorde.

**Autorités transversales :** [vision produit](../product/vision-et-objectifs.md), [roadmap](../product/roadmap-priorisee.md), [gouvernance documentaire](../AGENTS.md), [politique documentaire](../development/DOCUMENTATION_POLICY.md), [protocole scientifique](../product/SCIENTIFIC_PROTOCOL.md), [données](../architecture/data-governance.md) et [AuthN/AuthZ](../security/authz-authn-regles.md). Aucun document de cet index ne remplace les AGENTS scoped ni les tests et les contrats du checkout.

**Maintenance et clôture.** Lorsqu'un chantier est ouvert ou reçu, relire son propriétaire, le code, les tests et ses consommateurs ; mettre à jour les contrats concernés, qualifier les preuves et retirer les plans/candidats consommés conformément à leur cycle de vie. Maintenir ici les liens et le périmètre de découverte sans recopier les seuils, schémas ni statuts runtime évolutifs. La condition d'arrêt de cet index est un routage exploitable des treize familles, sans nouveau contrat métier ni modification du produit. L'exhaustivité de tous les fichiers Markdown et l'absence runtime de chaque idée de backlog ne sont pas démontrées par cette revue.
