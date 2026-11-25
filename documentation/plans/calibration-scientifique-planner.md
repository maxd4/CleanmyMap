# Plan | Validation scientifique, calibration et parcours réellement nettoyés

**Statut : PLAN / RECHERCHE.** Référence lue le 25 novembre 2026 : `e718cedcb545dcfe98fb8d3259875593ce60c3be`. Les lots D1 à G1 sont des objectifs de recherche et d'intégration conditionnelle, non des changements de formules déjà autorisés.

Owners : [méthodologie du planner](../architecture/methodologie-creation-itineraire.md), [protocole scientifique](../product/SCIENTIFIC_PROTOCOL.md), [heatmap par tronçons](../architecture/paris-street-pollution-heatmap.md), [gouvernance des données](../architecture/data-governance.md). Les plans [micro-lieux](./enrichissement-micro-lieux-risque-pollution.md) et [pondération socio-démographique](./ponderation-socio-demographique-heatmap.md) gardent leurs propres hypothèses. Pas de seconde formule concurrente.

## État observé et distinction des preuves

- Le client `apps/web/src/lib/weather/open-meteo-client.ts`, le contexte météo planner et le budget opérationnel existent. Le forecast connu lors de la planification peut limiter le budget selon le contrat de sécurité existant ; ce n'est pas la météo effectivement observée pendant la collecte, ni un coefficient de rendement.
- `apps/web/src/lib/route/route-calibration*.ts` contient des contrats, validations et versions de contexte. Le protocole indique qu'une estimation de durée calibrée exige un artefact vérifié et activé. La collecte et l'infrastructure ne prouvent pas la performance scientifique.
- `street-cleaning-corridor.ts` distingue corridor prouvé left/right/single/unknown, affectation opérationnelle A/B sans preuve de côté, overlap réseau et overlap de nettoyage. Réutiliser ce contrat.
- Le protocole documente déjà les unités opérationnelles 1 adulte / 0,5 enfant / 0,5 retraité, des modèles alternatifs de recherche et les lots de mégots `cleanmymap-butts-volume-v3`. Ne pas remplacer les calculs acquis par une nouvelle règle arbitraire.
- Le modèle de pollution théorique est distinct du travail de nettoyage estimé, de la durée réelle, des quantités mesurées et de la confiance des données. Aucun score relatif 0–100 n'est une probabilité sans calibration.

## Ordre des lots

D1 (collecte météo) et D3 (corridors) peuvent avancer indépendamment après stabilisation du parcours Actions. Puis F1a/F2a (protocole, baseline et chaîne de preuve), E1a (qualité descriptive), campagnes terrain, D2/E2/E3/E4 (recherche indépendante), F1b/F2b (validation et promotion), F3 (diffusion). G1 est une extension mobile distincte, déclenchée par la roadmap mobile. Une absence de données bloque la promotion scientifique, pas la collecte de preuves.

| Identifiant | Décision possible sans données nouvelles | Décision conditionnée |
|---|---|---|
| D1 | Collecter et versionner contexte météo réel/reconstruit | Aucune modification du rendement |
| D3 | Auditer réemploi des corridors, compléter les preuves | Côtés géographiques seulement si prouvés |
| F1a / F2a | Protocole comparatif et chaîne versionnée | Pas de gain revendiqué |
| E1a | Exposer la qualité descriptive | Note /5 seulement après règle défendable |
| D2, E2, E3, E4 | Études, données, résultats négatifs | Nouveaux coefficients seulement après validation |
| F1b / F2b | Comparaison et décision documentée | Activation si critères prédéfinis atteints |
| F3 | Contrat de diffusion non personnelle | Export réel après contrôle qualité et confidentialité |
| G1 | Cadrage avec mobile | Traces réelles avec droits et preuves |

## D1. Collecte météo et provenance

Réutiliser le client Open-Meteo et les owners de snapshot. Séparer immuablement forecast au moment du calcul, conditions effectivement observées sur le créneau réel si disponibles et reconstruction historique issue d'un produit météo identifié (pas une mesure sur place). Conserver source, produit et version si disponibles, résolution spatiale/temporelle, coordonnées ou zone minimale, fuseau et intervalle, date de récupération, couverture et valeurs dans leurs unités explicites : température, précipitations, humidité, vent, autres paramètres uniquement utiles. Éviter les appels à chaque consultation et les coordonnées personnelles superflues ; traiter hors réseau, hors horizon, données partielles et échec sans inventer de valeur.

Valider créneau et changement de date, forecast différent de l'historique, source indisponible, action incomplète, réessais et absence de modification rétroactive de la preuve planner. Ne pas modifier la politique de sécurité ni le score de rendement. **STOP :** contexte exploitable, provenance explicite, manque conservé, historique fiable et tests des consommateurs.

## D3. Corridors de nettoyage et groupes

Auditer le contrat existant, la partition des groupes, la géométrie routée, les passages et les exceptions. Affecter A/B de manière stable et non redondante sur les mêmes segments opérationnels ; ne pas confondre même nom de rue et même segment. Une géométrie de trottoir left/right n'est acceptable qu'avec source, orientation, précision et traversée autorisée documentées ; pas de décalage graphique présenté comme un trottoir réel. Respecter les exceptions à un seul corridor, le sens inverse, intersections, rues longues/denses, budget de chaque groupe, passages nécessaires et sécurité. Distinguer parcours commun nécessaire et recouvrement du nettoyage. Conserver `unknown` si preuve absente.

Tests : groupe unique et multiples, aller/retour, tronçons homonymes, sens inversés, voies mono-corridor, traversée inconnue ou dangereuse, couverture non prouvée et compatibilité historique. **STOP :** affectations et limites explicables, diminution de duplication démontrée sur fixtures représentatives sans prétendre une amélioration terrain.

## F1a. Benchmark planner / organisateur : protocole avant les résultats

Comparer sur des actions réellement comparables, avec mêmes contraintes d'accès, période, lieu, nombre de bénévoles, budget et objectifs déchets/mégots. Établir un parcours organisateur indépendant et garder le parcours planner original avant départ ; éviter l'auto-évaluation par score du moteur. Choisir à l'avance un protocole apparié ou répartition comparable, les critères principaux et secondaires, le traitement des absences et le volume requis selon la variabilité observée. Documenter sélection des secteurs, contamination entre passages et biais de recrutement.

Mesures : déchets/mégots observés avant intervention quand protocole possible, quantité réellement collectée selon méthode, couverture de tronçons et corridors, distance et temps de déplacement/nettoyage séparés, quantité par personne-heure avec effectifs/temps réels connus, cohérence et recouvrement des sous-groupes, incidents et abandons. Séparer quantité mesurée du score théorique ; conserver unités, incertitude et observations négatives. Ne pas augmenter la pollution pour les tests. **STOP :** protocole reproductible et baseline verrouillée avant analyse.

## F2a. Dataset et chaîne de calibration versionnée

Réutiliser le dataset et les statuts `calibrated`, `data_insufficient`, `unavailable`, `excluded`, les contextes signés et les owners de persistance existants. Éligibilité documentée : action finalisée admissible, mesure et méthode, provenance, temps, couverture, version de modèle et contexte intègre. Ne pas entraîner sur une estimation issue du même moteur comme vérité. Protéger les actions historiques et rejeter les contextes non vérifiés ; séparer entraînement, validation et test par secteur/période pour limiter les fuites. Capturer version de dataset, empreinte, date, paramètres, code, métriques et limites ; conserver baseline et artefact précédent. Pas de nouveau stockage si l'existant suffit.

## E1. Confiance scientifique

E1a : présenter d'abord la qualité descriptive à partir de la méthode de mesure (pesée/comptage/estimation), étendue connue, couverture, fraîcheur, source et complétude. Distinguer confiance d'une observation, qualité du dataset, confiance d'une prédiction et incertitude d'un résultat ; un score de pollution n'est pas un score de qualité. Absence de preuve = non qualifiable, jamais zéro.

E1b : une note /5 n'est envisageable qu'après définition d'une grille versionnée, justification des dimensions/pondérations, vérification de reproductibilité et validation sur données indépendantes. Aucun remplissage automatique de notes fictives. **STOP :** qualité explicable et règle publiée seulement si défendable ; sinon conserver la description et documenter le blocage.

## D2. Effet de la météo sur la durée et le rendement

À partir de D1/F1a/F2a, comparer un modèle de référence sans météo aux variantes intégrant pluie, température, humidité et vent. Contrôler saison, lieu, type de déchets, effectifs, méthodes de mesure, durée, état humide des déchets et nettoiement connu. Rapporter effets, incertitudes, taille d'échantillon et performance hors échantillon ; un effet sur masse humide n'est pas forcément un effet sur rendement. Aucun coefficient si effet non prouvé, instable ou sans gain pratique. Séparer calibration du rendement et règles de sécurité opérationnelle. **STOP :** résultat reproductible (y compris négatif), aucune activation avant F2b.

## E2. Rendement des bénévoles et taille des groupes

Tester les unités opérationnelles CURRENT et les variantes de recherche déjà documentées, sur mesures et effectifs réels, par type de collecte. Étudier enfants/adultes/retraités seulement à l'échelle agrégée, durée active, groupes de deux ou plus, taille, coordination, lieu et interactions. L'âge ou le statut de retraité ne prouve pas une capacité individuelle. Ne pas profiler, inférer l'âge, attribuer automatiquement une productivité personnelle ni créer une hiérarchie de droits. Préserver les conventions actuelles tant qu'aucun modèle alternatif robuste n'est validé ; taille de groupe et composition inconnue restent inconnues. **STOP :** analyses séparées, limites et résultats hors échantillon, proposition conditionnelle ou conservation du modèle.

## E3. Type de lieu et rendement

Réutiliser la taxonomie canonique existante (rue, parc, berge, place et autres catégories documentées) ; tester vitesse, quantité par unité de temps, quantité par bénévole et interactions avec taille de groupe. Distinguer lieu de déplacement et surface effectivement nettoyée. Contrôler densité initiale, accessibilité, méthodes, période et météo. Éviter de compter deux fois les mêmes facteurs morphologiques ou de serviceabilité dans score de risque et durée. **STOP :** preuve indépendante d'un effet utile ou absence d'effet démontrée, modèle CURRENT inchangé jusqu'à promotion.

## E4. Conversion du volume de mégots

Conserver la mesure brute en litres et les méthodes/états existants, notamment propre, humide, mouillé, avec les lots séparés du protocole. Construire une campagne de mesures appariées volume/masse/nombre sur échantillons tracés, étalonnage des instruments, conditionnement et humidité, dispersion et répétabilité. Ne pas appliquer un facteur universel non prouvé ni convertir un mélange d'états sans méthode. Examiner une relation par état seulement si les données la supportent ; conserver les conversions déjà approuvées selon leur périmètre et ne pas inventer de masse ou de nombre supplémentaire. **STOP :** relation avec unités et incertitude validées ou absence de conversion supplémentaire ; preuves et version conservées.

## F1b / F2b. Comparaison, promotion et rollback

Exécuter le benchmark selon F1a, comparer aux baselines (manuel, modèle neutre ou zonal selon le problème), mesurer gain, dispersion, erreurs, faux hotspots, recouvrement et contraintes violées. Évaluer par secteur et période, publier limites et résultats négatifs. Définir avant le test final les conditions de non-régression, de gain pratique et de sécurité ; aucune valeur arbitraire fixée ici. En cas de gain défendable, promouvoir via le registre et la politique d'activation existants, versionner la formule et ses consommateurs, conserver les preuves de chaque action et la version antérieure. Si artefact invalide ou inférieur : non-activation ou rollback contrôlé, repli non calibré explicite, pas de durée inventée. **STOP :** décision de promotion ou de maintien argumentée, réexécution reproductible et tests du repli.

## F3. Open data de calibration

Exporter exclusivement les données admissibles à la recherche : méthodes, unités, lieu agrégé si nécessaire, météo/provenance, rendement, couverture et métadonnées du dataset. Pas de comptes, identifiants stables de personnes, traces personnelles, informations de contact, présences individuelles ou petits groupes réidentifiables. Réutiliser le portail Open Data et son owner, pas une API parallèle. Fixer schéma, version, licence, conditions de réutilisation, exclusions, dates, résolutions et traitement des valeurs manquantes. Examiner la réidentification par croisement géographique/temporel ; agréger ou supprimer si nécessaire. **STOP :** export reproductible et validé pour confidentialité, droits, intégrité et documentation, ou export retenu avec cause.

## G1. GPS réel de l'action (extension mobile conditionnelle)

Planifier seulement au jalon mobile prévu. Conserver séparément route planner, route opérationnelle modifiée et trace réellement observée (GPS, GPX ou autre preuve selon contrat). Réutiliser les contrats partagés Web/mobile ; ne pas remplacer la route originale. Mesurer distance réellement observée avec méthode et trous explicites ; support sous-groupes seulement avec besoin et consentement/autorisations définis. Gérer permissions système, démarrage/arrêt explicites, batterie, hors connexion, reprise, doublons, perte GPS, points aberrants, protection, rétention et suppression ; pas de suivi passif ni de trace publique individuelle par défaut. Un GPX du planner n'est jamais une observation réelle. **STOP :** parcours réel distinct, preuve et confidentialité vérifiées sur appareil, synchronisation et comparabilité sans écrasement historique.

## Clôture scientifique

Les lots de recherche peuvent être clos avec un résultat négatif ou `data_insufficient`, sans changement du runtime. Un lot d'activation nécessite une preuve positive et les validations du domaine. Les données externes et calques ont leurs plans distincts : [données](./donnees-externes-cartographie-dechets.md), [calques](./calques-carte-itineraire.md). Aucune calibration, collecte ou activation n'est réputée exécutée par ce plan.
