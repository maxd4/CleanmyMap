# Carte des actions - Présentation détaillée

## Fiche canonique

- **Route** : `/actions/map`
- **Dossier canonique** : `actions-map`
- **Rôle** : permettre une lecture territoriale des actions réalisées, de la pollution constatée et de la pollution projetée dans le temps.
- **Périmètre** : carte Actions, calque Trash Spotter, filtres, sélection, popup/tooltip, géométrie des parcours et zones, légende et export.
- **États à documenter** : chargement, vide, erreur, filtres sans résultat, action sélectionnée, action désélectionnée, géométrie ponctuelle, parcours, zone réelle et zone indicative.
- **Composants concernés** : `apps/web/src/components/actions/map/`, `apps/web/src/components/actions/map-marker-categories.ts`, `apps/web/src/lib/actions/pollution/revisit-priority.ts`.
- **Notes d'audit** : le score historique ne doit jamais être muté. Les couleurs d'une action suivent `projectedPollutionScore`; elles ne décrivent pas une mesure en temps réel.

## Références méthodologiques

La définition détaillée du score historique, de la projection exponentielle, du fallback `S_post = 0`, de la calibration locale et des limites est dans :

`documentation/product/methodologie-carte-actions.md`

La carte distingue :

- Actions : mémoire des interventions, score constaté avant l'action et score projeté ;
- Trash Spotter : pollution actuellement signalée et actionnable.

Les libellés publics attendus dans les popup/tooltips sont :

```txt
Pollution constatée avant l'action : S %
Pollution projetée : P %
Temps depuis la dernière action : t jours
Estimation modélisée, pas une mesure en temps réel
```

`S` et `P` conservent l'échelle interne `0–100`, mais tout rendu utilisateur
utilise le format en pourcentage défini dans
[`ui-score-formatting.md`](../../../../development/ui-score-formatting.md).
