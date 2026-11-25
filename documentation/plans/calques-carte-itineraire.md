# Plan | Calques explicables de la carte de création d'itinéraire

**Statut : PLAN, prolongement du pilote CURRENT.** Référence lue le 25 novembre 2026 : `e718cedcb545dcfe98fb8d3259875593ce60c3be`. Surface canonique : `/actions/new?panel=itineraire` ; `/sections/route` est une redirection de compatibilité. Voir [méthodologie du planner](../architecture/methodologie-creation-itineraire.md) et [projection segmentaire](../architecture/paris-street-pollution-heatmap.md).

## Décision d'architecture

Ne pas remplacer Leaflet, le fond CARTO ni la géométrie actuelle. `apps/web/src/components/sections/rubriques/route/components/route-map.tsx` contient déjà un rendu par tronçons `RouteRiskHeatmapLayer`, une sélection déchets/mégots/mixte, un cadrage borné, des couches parcours et groupes. `apps/web/src/lib/route/route-risk-heatmap-contract.ts` projette des données cartographiques sûres issues du même snapshot serveur que le planner. `route-response-contract.ts` distingue notamment potentiel relatif, priorité historique, trace et sélection.

**Arbitrage :** le souhait initial d'une grille hexagonale ou régulière est conservé comme option uniquement pour une source qui possède réellement cette unité. Pour le pilote existant, garder les tronçons ; pour une source IRIS/arrondissement, utiliser sa résolution native. Ni interpolation en heatmap continue, ni nouvelle grille qui simule une précision. Ne pas créer un second modèle de classement dans React, ni convertir des facteurs théoriques en mesures.

## Catalogue et règles de restitution

| Famille / calque | Géométrie et information attendue | Disponibilité et limites |
|---|---|---|
| Résultat : Priorité globale | Tronçons ou unité réelle du score final ; classes faible à très élevé selon seuils propriétaires ; détail des contributions et coût/détour lorsqu'ils existent. | Afficher seulement si le classement local exact est exposable, distinct du potentiel relatif. Pas de priorité par tronçon inventée à partir d'un score de route. |
| Résultat : Déchets probables | Même projection, `wasteRisk`, facteurs réellement disponibles, historique, fréquentation, événements et correction de propreté si utilisés. | Score relatif, pas pourcentage de probabilité. |
| Résultat : Mégots probables | `cigaretteButtRisk`, contributions propres (terrasses, transport, attente, tourisme, événements, historique si réellement utilisés). | Ne pas mélanger avec déchets ; expliquer la sélection liée aux mégots si la trace le démontre. |
| Résultat : Valeur bénévole | Utilité marginale réellement calculée, contraintes, micro-lieux et aptitude d'intervention. | Serviceabilité géométrique ne prouve ni fréquence ni absence de nettoyage municipal. Si score absent, ne pas en calculer un côté client ; calque indisponible jusqu'au contrat. |
| Comprendre : Affluence | Résolution des sources : résidents, transports, tourisme, marchés/événements selon données et période. | Proxy de pression humaine, pas mesure de foule ni pollution. |
| Comprendre : Propreté habituelle | Choroplèthe IRIS/arrondissement ou unité réellement disponible, source, date et correction connue. | Pas de résolution rue inventée à partir de données zonales. |
| Comprendre : Couverture municipale (conditionnel) | Serviceabilité et données de passage prouvées représentées distinctement. | Pas de fréquence présumée ; indisponible si donnée absente. |
| Repères : Événements | Marqueur passé/futur distinct ; halo seulement si le modèle fournit réellement emprise et influence, décroissance selon règle CURRENT. | Fenêtre de 5 jours proposée dans la demande, non norme à créer ; future opportunité sans halo de pollution actuelle. Capacité distincte de fréquentation mesurée. |
| Repères : Trash Spotter | Même projection, marqueurs, couleurs, popups et critères `validated` / `actionable` que la carte canonique. | Vérifier owner et `isTrashSpotterItem` ; pas de second fetch ni de données privées. Superposer au risque, ne pas fusionner. |
| Repères : Morphologie / contraintes | Géométrie réellement disponible ou symboles discrets à fort zoom : marches, arbres, terre-plein, passerelle, zone piétonne, corridors et obstacles. | Ne pas matérialiser de micro-corridor ou côté de rue sans preuve ; afficher le malus uniquement si utilisé. |
| Repères : Itinéraires / groupes | Origine, arrivée, stops, tracé, variantes et légende de groupes existants, distinction mouvement/nettoyage. | Conserver le cadrage, sélection, export, contraintes, interactions et preuve planner. |
| Repères : Zones évitées (expert) | Hachures discrètes sur emprises identifiables avec raison réellement enregistrée : sécurité, budget/détour, faible gain, attribution autre groupe, etc. | Une zone hors couverture ou non évaluée n'est pas « évitée ». Aucun motif ou budget reconstruit artificiellement. |
| Confiance (transversal) | Opacité, texture/hachures et texte accessible, selon confiance existante par risque et source. | Ne pas créer une nouvelle heatmap colorée ou une note arbitraire. Manquant distinct de faible. |

Les exemples numériques de la demande initiale (78/100, 8 000 participants, +24 min) sont des exemples de présentation, pas des données à intégrer. Un clic « Pourquoi cette zone ? » expose contributions, provenance, résolution, fraîcheur et limites vraiment fournies par le moteur ; pas de commande « forcer le moteur » dans ce chantier.

## Gestionnaire de calques

Un bouton flottant accessible « Calques » ouvre un panneau compact, avec trois familles : **Résultat** (une couche parmi celles disponibles), **Comprendre** (au plus une couche explicative, désactivable), **Repères** (plusieurs). Les trois familles peuvent coexister sans recouvrir les commandes de carte. Présenter légende, état indisponible et raison, chargement et couverture. Priorité globale souhaitée par défaut seulement quand sa donnée existe ; à défaut garder le risque correspondant à l'objectif planner, explicitement libellé, ou aucune prédiction si hors couverture. Trash Spotter actionnable, événements pertinents, origine et trajet courant visibles par défaut si les projections autorisées existent ; autres calques masqués. Après calcul multi-groupes, variantes visibles selon les commandes existantes. Conserver le mode mixte CURRENT et ses deux confiances sans l'assimiler à la priorité globale.

Réutiliser les primitives du design system, FR/EN, clavier, focus, fermeture et retour focus, légendes lisibles et alternatives non chromatiques. Ne pas déclencher un recalcul planner lors d'une simple bascule de calque, ni multiplier les appels fournisseurs. Charger les données lourdes uniquement si nécessaires, réutiliser le cache/projection serveur, borne d'emprise, simplification et limites déjà définies. Les couches de repères n'élargissent pas le scope public du produit.

## Lots d'intégration

### L1. Convergence du socle et panneau

Auditer composants, `route-section`, contrats, tests, consommateurs /actions/new, carte Action et Trash Spotter. Préserver le rendu segmentaire, ajouter le panneau et brancher Déchets/Mégots/Mixte ainsi que les couches trajets/groupes existantes ; états partiels, sélection et confiance. Ne pas modifier le classement ni la calibration. Tests unitaires du choix des couches et rendu réel desktop/mobile. **STOP :** sélection, couches existantes, légende et interactions préservées, pas de requête inutile ou de donnée fabriquée.

### L2. Repères canoniques et couches explicatives

Réutiliser la projection Trash Spotter actionnable et les données réellement exposables d'événements, affluence, propreté, morphologie et éventuellement serviceabilité. Si un contrat serveur manque, ajouter le plus petit delta versionné de projection cartographique (pas de nouveau modèle), avec provenance et couverture, tests positifs/négatifs et contrôle des données publiques. L'import de nouvelles sources reste dans [le plan données externes](./donnees-externes-cartographie-dechets.md) ; ne pas le dupliquer. **STOP :** couches disponibles fidèles, passé/futur distincts, repères partagés, manques affichés sans faux zéro.

### L3. Résultat local et explication du choix

Vérifier si priorité locale, valeur bénévole et raisons de non-sélection existent dans la trace/selection serveur. Si oui, exposer la projection minimale liée au même snapshot et à sa version ; sinon planifier l'extension d'explicabilité, sans inventer de coefficient ni de score par segment. Éviter de recompter le malus morphologique et le risque. Ajouter clic « Pourquoi cette zone ? » et zones évitées uniquement sur décisions tracées. **STOP :** détail cohérent avec le résultat exact du serveur, raisons réellement connues, calques absents explicitement signalés ; les évolutions de modèle restent conditionnées à leurs plans scientifiques.

### L4. Réception et consommation

Valider les trois familles, superpositions, route/groupe, repli hors pilote, donnée absente et partielle, viewport borné, zoom et sélection, performance mesurée sans seuil inventé, réseau, accessibilité et responsive ; conversion de coordonnées GeoJSON [lon,lat] / Leaflet [lat,lon], compatibilité des snapshots et absence de fuite. Rejouer A10 du [plan d'audit](./audit-parcours-web.md) sur le delta. Intégrer les contrats durables dans les owners et retirer les candidats consommés selon gouvernance. **STOP :** couches réellement alimentées testées, inconnues explicites, aucune régression planner, data ou droits ; publication vérifiée. Une couche encore sans contrat n'est pas déclarée livrée.
