# Où agir

## Fiche canonique

- **Route** : `/sections/route`
- **Fichier source** : `apps/web/src/app/(app)/sections/route/page.tsx`
- **Type fonctionnel** : page protégée du bloc Agir
- **Objectif** : proposer un itinéraire de nettoyage priorisé et contraint à
  partir des données disponibles.
- **Action principale** : cliquer explicitement sur `Calculer la recommandation`.

La page propose une décision du planner. Elle ne mesure pas directement la
pollution et ne lance aucune recommandation automatiquement au chargement.

## Fonctionnement au niveau utilisateur

Le mode **Itinéraire libre** part de l'origine choisie et compose un parcours
selon les candidats disponibles. Le mode **Itinéraire autour d'un événement**
peut utiliser un événement comme contexte ou ancre lorsque ce contrat est
disponible. Dans les deux cas, le budget de déplacement et `maxStops` restent
des contraintes dures : une zone prioritaire peut donc être exclue si elle est
hors budget, non éligible ou incompatible avec la sécurité.

L'origine peut venir :

- du navigateur (`browser`) après une action explicite ;
- d'un point choisi sur la carte (`map`) ;
- d'une zone enregistrée représentée par un centre approximatif
  (`approximate_saved_area`) lorsque l'origine précise n'est pas disponible.

Lorsque le contrat le permet, l'utilisateur peut orienter la priorité vers les
déchets, les mégots ou l'ensemble des signaux. Ces choix ne transforment pas
une estimation en observation.

## Statuts et limites

Les signalements terrain validés sont des données **observées**. Les zones de
risque issues de la pression géospatiale sont **prédites** : elles portent leur
source, leur millésime, leur version de modèle et leur niveau de confiance.
Une zone prédite n'est jamais affichée comme un signalement observé.

Le trajet peut être fourni par un routage réseau (`network`) ou par une
géométrie de repli (`fallback`) explicitement estimée. Les données partielles,
une source indisponible, une origine approximative ou un résultat estimé sont
présentés comme des états dégradés ; `null` ne signifie pas zéro.

La pression géospatiale est un contexte de priorisation. Elle ne constitue pas
une mesure en temps réel de fréquentation ou de pollution.

La surface `Comprendre cet itinéraire` expose la trace disponible : origine,
arrêts retenus, budget, exclusions, statut observé/prédit, sources, routage et
éventuels fallbacks. Le frontend affiche cette décision et ne recalcule pas le
moteur.

## Références

- [Présentation détaillée](./ou-agir-presentation-detaillee.md)
- [Méthodologie de création d'itinéraire](../../../../architecture/methodologie-creation-itineraire.md)
- [Créer un itinéraire](/sections/route)
- [Propositions à traiter](./ou-agir-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./ou-agir-objectifs-non-pertinents.md)
