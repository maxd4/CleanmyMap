# Carte des actions

## Fiche canonique

- **Route** : `/actions/map`
- **Accès runtime** : `public-visible`
- **Famille** : Cartographie & Impact
- **Palette runtime** : sky
- **Source principale** : `apps/web/src/app/(app)/actions/map/page.tsx`

La route n'est pas protégée par le proxy et figure dans le sitemap public.

## Sources fonctionnelles

```txt
apps/web/src/app/(app)/actions/map/page.tsx
apps/web/src/components/actions/map-feed/actions-map-feed.tsx
apps/web/src/components/actions/actions-map-table.tsx
apps/web/src/components/actions/map/use-actions-map-filters.ts
apps/web/src/components/actions/map/action-pollution-score-references-context.tsx
apps/web/src/lib/actions/revisit-priority.ts
```

## Objectif utilisateur

Explorer les actions et hotspots, filtrer la vue, sélectionner une action et lire les principaux indicateurs terrain.

## Structure actuelle

- header Cartographie & Impact ;
- CTA Déclarer ;
- CTA Méthodologie ;
- carte immersive ;
- filtres ;
- sélection d'action ;
- KPI ;
- tour de contrôle ;
- journal / insights ;
- tableau de données ;
- export de la vue.

## Séparation des calques

La carte ne doit pas confondre mémoire des interventions et pollution actuellement actionnable :

| Calque | Sens métier |
|---|---|
| Actions | interventions documentées, pollution constatée avant l'action et pollution projetée |
| Trash Spotter | pollution actuellement signalée et encore actionnable |

Une action ancienne ne devient jamais automatiquement un nouveau spot Trash Spotter.

## Logique de score constaté

Le score historique reste calculé par le contrat de score existant :

```txt
score déchets = kg / bénévole
score mégots = mégots / bénévole
score global = max(score déchets, score mégots)
```

Référence :

```txt
plus forte valeur par bénévole parmi les actions approuvées
```

Formules :

```txt
score déchets =
clamp((kg / bénévole / référence déchets) × 100, 0, 100)

score mégots =
clamp((mégots / bénévole / référence mégots) × 100, 0, 100)
```

Règles :

- pas de mélange entre déchets et mégots ;
- pas de pondération ;
- même référence partagée entre carte, popup et tableau ;
- popup chargé à la demande ;
- pas de fetch score séparé par popup.

Ce score est une pollution constatée avant l'action, pas une pollution actuelle. Il ne doit pas être réécrit par le temps écoulé.

## Projection de re-pollution

La couleur d'une action repose sur une projection non linéaire, calculée dans :

```txt
apps/web/src/lib/actions/revisit-priority.ts
```

Le score historique `S` et le nombre de jours `t` restent séparés :

```txt
T80(S) = 28 + 152 × (1 - S / 100)²
P(t) = S_post + (S - S_post) × (1 - exp(-ln(5) × t / T80(S)))
```

Le modèle utilise `S_post = 0` lorsque aucune mesure post-nettoyage explicite n'est disponible. Cette valeur est une hypothèse de modèle, pas une mesure terrain. Le champ optionnel `postActionPollutionScore` prend priorité lorsqu'une mesure réelle est fournie.

Ordres de grandeur du `T80` : `S=20 → 125 j`, `S=50 → 66 j`, `S=80 → 34 j`, `S=100 → 28 j`.

Une calibration locale pourra remplacer le `T80` générique via l'option de calibration prévue par l'API de projection.

## Lecture rapide des couleurs

```txt
bleu    = pollution projetée faible
orange  = pollution projetée moyenne
rouge   = pollution projetée forte
violet  = pollution projetée critique
noir    = pollution projetée extrême
vert    = lieu explicitement propre uniquement
```

La progression entre les repères de couleur est continue. Les seuils exacts sont centralisés dans `ACTION_POLLUTION_COLOR_THRESHOLDS` ; le vert n'est jamais un niveau de faible pollution pour une action.

## Lecture des tooltips et popups

Une action doit distinguer explicitement :

```txt
Pollution constatée avant l'action : S %
Pollution projetée : P %
Temps depuis la dernière action : t jours
Estimation modélisée, pas une mesure en temps réel
```

Les valeurs `S` et `P` restent calculées sur l'échelle interne `0–100`. Leur
format d'affichage est défini par la règle commune
[`ui-score-formatting.md`](../../../../development/ui-score-formatting.md).

Les résultats collectés restent présentés comme des résultats de l'action, et non comme une pollution résiduelle mesurée.

## Géométrie et interactions

La couleur ne porte pas la fiabilité géométrique :

- trait plein : parcours déclaré ou connu ;
- trait pointillé : parcours indicatif ou reconstruit ;
- polygone rempli à bord plein : zone réelle ou indicative ;
- point : localisation seule ;
- épaisseur : sélection et lisibilité, jamais score.

Les polylines disposent d'une zone de clic/touch invisible élargie. L'action « Voir tout le tracé » cadre explicitement la géométrie sans recentrage automatique à chaque sélection.

Infrastructure :

```txt
bac       = besoin collecte
cendrier  = besoin mégots
combiné   = deux besoins
seuil     = 75
```

## Performance

La page demande une vigilance particulière :

- carte plein écran ;
- jusqu'à 300 éléments chargés dans le flux courant ;
- composants cartographiques et carrousel chargés dynamiquement ;
- références de score partagées ;
- éviter les fetchs supplémentaires à l'ouverture d'un détail.

## États à couvrir

```txt
loading
empty
error
filtres sans résultat
action sélectionnée
action désélectionnée
```

Un état `access refused` n'est pas un état normal de cette route publique.

## Fichiers associés

- [Présentation détaillée](./actions-map-presentation-detaillee.md)
- [Méthodologie produit de la projection](../../../../product/methodologie-carte-actions.md)
- [Propositions à traiter](./actions-map-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./actions-map-objectifs-non-pertinents.md)
