# Méthodologie de création d’itinéraire

## Statut

Cette première version documente l’architecture pédagogique du planner. Elle
ne publie pas les formules, pondérations ou coefficients du moteur.

## Chaîne de décision

1. **Données d’entrée** — origine, temps ou budget disponible, préférences,
   événement éventuel et données terrain ou contextuelles disponibles.
2. **Candidats** — zones et signalements éligibles, avec distinction entre
   observations `observed` et zones `predicted`. Les candidats incompatibles
   avec l’éligibilité ou la sécurité sont exclus.
3. **Priorisation** — plusieurs signaux peuvent faire évoluer la priorité.
   Les déchets et les mégots peuvent produire des priorités différentes ; une
   prédiction ne devient jamais une observation.
4. **Contraintes du planner** — budget, nombre maximal d’arrêts, sécurité,
   origine, mode libre ou autour d’un événement et contraintes du réseau. Une
   contrainte peut empêcher de sélectionner une zone pourtant prioritaire.
5. **Itinéraire final et explicabilité** — ordre des arrêts, résultat du
   fournisseur de routage, éventuel `estimation/fallback` et trace lisible
   dans `Comprendre cet itinéraire`.

## Terminologie

- `observed` : signalement terrain réellement disponible ;
- `predicted` : zone de risque ou de pression estimée ;
- décision du planner : sélection opérée sous les contraintes courantes ;
- résultat du fournisseur de routage : trajet réseau effectivement retourné ;
- estimation/fallback : résultat dégradé explicitement signalé.

À entrées identiques, la proposition est déterministe. Le frontend affiche la
trace fournie par le planner et ne recalcule pas le moteur.

Les scores prédits restent des scores de risque ou de pression : ils ne sont
pas une mesure réelle de pollution.

## Évolutions prévues

Une version ultérieure pourra documenter les règles détaillées de calcul,
l’auditabilité des décisions, les états de confiance et les cas limites sans
modifier la séparation entre observations, prédictions, décision du planner et
résultat de routage.
