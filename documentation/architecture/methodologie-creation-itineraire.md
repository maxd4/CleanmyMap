# Méthodologie de création d’itinéraire

## Statut et périmètre

Ce document est la référence canonique de l’architecture pédagogique du
moteur de création d’itinéraire. Il explique comment CleanMyMap transforme des
données disponibles en une proposition de parcours de nettoyage priorisée et
contrainte.

Cette version ne publie ni formule, ni poids, ni coefficient du moteur. Ces
détails relèvent de contrats et de versions de modèle distincts lorsqu’ils
sont suffisamment stabilisés pour être documentés.

Le moteur produit une proposition d’itinéraire. Il ne mesure pas directement
la pollution et ne garantit pas la présence de déchets sur un lieu donné.

## 1. Objectif du moteur

Le moteur cherche un parcours praticable à partir d’une origine, d’un budget
et de contraintes de planification. Il met en relation des candidats de
nettoyage, leur niveau de preuve et les contraintes de déplacement afin de
proposer un ordre d’arrêts explicable.

Le résultat est une décision du planner, pas une observation supplémentaire.
La présence d’une zone ou d’un arrêt dans la proposition ne transforme pas une
estimation en constat de terrain.

## 2. Données d’entrée

Le planner reçoit les grandes familles de données suivantes :

- une origine, avec sa source et son éventuel caractère approximatif ;
- les contraintes utilisateur, notamment le budget de déplacement, le nombre
  maximal d’arrêts et la préférence entre priorité et déplacement ;
- les observations terrain disponibles et éligibles pour une intervention ;
- les données contextuelles disponibles, par exemple les signaux urbains et
  les événements utilisables par le contrat courant ;
- les événements éventuellement associés à la demande, avec leurs données de
  localisation et de contexte lorsqu’elles sont disponibles ;
- les prédictions locales disponibles, avec leur zone, leur provenance, leur
  version de modèle, leur confiance et leurs risques distincts pour les
  déchets et les mégots ;
- l’état de santé et de complétude des sources nécessaires au parcours.

Une donnée absente, partielle ou approximative reste identifiée comme telle
dans les contrats et dans la trace. Elle n’est pas silencieusement remplacée
par une observation ou par une valeur équivalente.

## 3. Construction des candidats

### Candidats observés

Les candidats observés correspondent aux signalements terrain effectivement
disponibles dans le périmètre du planner. Leur preuve est portée par le contrat
`observed` et reste distincte des risques calculés par le modèle prédictif.

### Candidats prédits

Les candidats prédits représentent une zone ou une cellule à risque. Ils
référencent la source `urban-pressure-model`, la version du modèle, les
risques déchets et mégots, les contributions explicatives, la confiance, la
provenance et l’état de complétude associés.

Le centroïde d’une zone peut servir aux calculs de distance et de corridor ;
il ne crée pas un signalement observé ponctuel au centre de cette zone.
L’emprise et le rayon de la zone restent disponibles pour qualifier la
proximité et le détour.

### Exclusions

Un candidat peut être écarté parce qu’il n’est pas éligible pour une
intervention bénévole, parce qu’il ne respecte pas une contrainte de sécurité,
parce qu’il est hors du corridor admissible ou parce qu’il ne peut pas être
rejoint dans le budget disponible. Une exclusion est une décision du pipeline,
pas une conclusion sur l’état réel du lieu.

### Déduplication

Les candidats prédits voisins sont dédupliqués avant leur transmission au
planner. Cette étape évite qu’une même opportunité spatiale augmente
artificiellement sa priorité parce qu’elle est représentée par plusieurs
zones proches. Les identifiants de zones dédupliquées et les avertissements
associés restent auditables.

Les candidats observés et prédits ne sont pas fusionnés en un seul type de
preuve. Le pool peut les comparer pour planifier, mais conserve leur famille
jusqu’à l’interface et à l’explication finales.

## 4. Priorisation

La priorité est construite à partir de plusieurs signaux disponibles, dans le
respect de leur provenance et de leur état de confiance. Elle peut tenir
compte du contexte urbain, de la proximité du trajet, des événements, de
l’historique disponible et du coût de déplacement.

Les déchets diffus et les mégots ne sont pas obligés de produire la même
priorité. Le planner peut exploiter le risque correspondant au contexte
demandé, tout en conservant les deux risques dans l’évidence prédite lorsque
la couche les fournit.

Une forte priorité ne suffit pas à imposer un arrêt : elle est évaluée avec le
budget, la sécurité, l’origine, le nombre maximal d’arrêts et les possibilités
de routage.

Les prédictions restent des risques ou des pressions estimées. Elles ne
remplacent jamais l’historique terrain et ne sont pas présentées comme une
mesure réelle de pollution.

L’additionalité du nettoiement municipal pourra enrichir cette priorisation
lorsqu’un contrat documenté sera disponible. Dans cette version, elle reste
une extension explicitement séparée et ne doit pas être déduite d’une simple
difficulté géométrique d’accès.

## 5. Contraintes du planner

Le planner applique les contraintes suivantes :

- le budget de déplacement demandé ;
- `maxStops`, qui borne le nombre d’arrêts proposés ;
- les règles d’éligibilité et de sécurité ;
- l’origine et sa précision déclarée ;
- le mode de planification, notamment le mode libre ou le mode centré sur un
  événement lorsqu’il est disponible ;
- les contraintes du réseau et les informations effectivement fournies par
  le routage ;
- les états de disponibilité, de complétude et de dégradation des sources.

Ces contraintes peuvent empêcher la sélection d’une zone pourtant prioritaire.
Le résultat doit alors conserver la décision et la raison de l’exclusion dans
la trace lorsque le contrat le permet.

Le planner reste fail-closed sur les éléments qu’il ne peut pas établir de
manière fiable : une source indisponible est signalée comme indisponible, une
géométrie estimée est identifiée comme estimation et un candidat non sûr n’est
pas promu par défaut.

## 6. Construction du trajet

La construction sépare quatre responsabilités :

1. la sélection et la priorisation des candidats admissibles ;
2. l’ordre des arrêts selon la priorité, le déplacement incrémental et les
   critères déterministes de départage ;
3. le calcul de la géométrie et des mesures fournies par le routage réseau ;
4. l’application d’un fallback lorsque la géométrie réseau n’est pas
   disponible ou lorsqu’un préfixe compatible avec le budget doit être retenu.

Un résultat `network` est attribué au fournisseur de routage pour les choix de
tracé et les mesures qu’il fournit. Un résultat `fallback` ou `estimated` est
présenté comme tel ; il ne doit pas être confondu avec une mesure réseau.

La séparation s’applique aussi aux distances utilisées pour admettre une zone
prédite : distance au corridor, détour estimé et résultat réseau sont des
informations différentes et sont conservés dans leurs champs respectifs.

À entrées identiques et à données snapshotées identiques, l’ordre de sélection
est déterministe. Le frontend affiche le résultat et sa trace ; il ne recalcule
pas la logique du planner.

## 7. Explicabilité

La trace d’itinéraire doit permettre de relier la proposition à ses données et
à ses décisions. Elle documente notamment :

- la version du moteur et le mode de planification ;
- l’origine, les paramètres demandés et les candidats considérés ;
- les arrêts retenus et leur ordre ;
- les évaluations, le coût de déplacement et le budget consommé ou restant ;
- les exclusions et les candidats incompatibles avec les contraintes ;
- les risques déchets et mégots, leurs composantes, leur confiance, leur
  provenance et leurs éventuels gaps ;
- la distance au corridor, le détour et la contribution à l’admission d’une
  zone prédite ;
- le fournisseur de routage, le mode `network` ou `fallback`, les estimations,
  les avertissements et les approximations.

Les libellés d’interface doivent respecter les statuts suivants :

- `observed` ou **observé** : preuve terrain disponible ;
- `predicted` ou **prédit** : risque ou pression estimée par le modèle ;
- **décision du planner** : sélection, ordre ou exclusion sous contraintes ;
- **résultat du fournisseur de routage** : géométrie et mesures réseau
  retournées ;
- **estimation/fallback** : résultat dégradé explicitement identifié.

La surface `Comprendre cet itinéraire` restitue cette trace. Elle ne fabrique
pas un texte justificatif séparé des calculs réels et ne convertit pas un score
de risque en probabilité de trouver des déchets sans calibration statistique
appropriée.

## 8. Dégradations et données manquantes

Les règles de lecture sont les suivantes :

- `null` n’est pas zéro ;
- l’absence d’une source n’est pas l’absence de pollution ;
- une source partielle produit un état partiel, pas une certitude complète ;
- une origine approximative, une distance estimée et un trajet de fallback
  doivent être identifiables ;
- une prédiction ne devient jamais une observation ;
- l’absence de couche prédictive ne doit pas empêcher le planner observé de
  fonctionner ;
- une zone prédite obsolète, partielle ou indisponible doit dégrader
  explicitement l’état de la recommandation selon le contrat courant.

Un fallback permet de continuer avec une information moins précise lorsque le
contrat le prévoit. Il n’autorise pas à inventer une source, une preuve terrain
ou une couverture réseau.

## 9. Évolutions prévues

Les sujets suivants disposent d’un emplacement architectural réservé. Ils ne
sont pas détaillés dans cette première version et aucun calcul futur ne doit
être présenté comme déjà disponible :

- modèle de risque séparé pour les déchets diffus et les mégots ;
- signal et traitement des événements ;
- couverture du nettoiement municipal et additionalité bénévole ;
- morphologie urbaine et typologie des surfaces ;
- météo et conditions contextuelles ;
- durée d’intervention et estimation du temps de nettoyage ;
- groupes, équipes et génération de plusieurs itinéraires.

Chaque évolution devra conserver la séparation entre observation, prédiction,
décision du planner et résultat du routage. Toute modification de contrat ou
de sémantique publique devra être documentée et versionnée avant d’être
exposée comme une capacité disponible.

## Références de navigation

- [Créer un itinéraire](/sections/route)
- [Méthodologie de la carte d’actions](/docs/product/methodologie-carte-actions.md)
- [Retour à la section de méthodologie](/methodologie#methodologie-itineraire)
