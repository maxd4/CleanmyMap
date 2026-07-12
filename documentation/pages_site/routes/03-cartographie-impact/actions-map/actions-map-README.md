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

## Logique de score

Deux scores indépendants sur `100` :

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

## Lecture rapide

```txt
bleu    = 0 déchets et 0 mégots
vert    = score global < 30
jaune   = score global 30–79
violet  = score global >= 80
```

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
- [Propositions à traiter](./actions-map-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./actions-map-objectifs-non-pertinents.md)
