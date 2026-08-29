---
title: "CleanMyMap x Megothon Paris"
subtitle: "Proposition de partenariat visuelle"
author: "Maxence Deroome"
date: "Mai 2026"
lang: fr
format:
  pdf:
    documentclass: article
    classoption: [oneside]
    top-level-division: section
    pdf-engine: lualatex

    papersize: a4
    fontsize: 10pt
    linestretch: 1.08

    toc: false
    number-sections: false

    geometry:
      - top=16mm
      - bottom=16mm
      - left=16mm
      - right=16mm
      - headheight=12pt
      - headsep=4mm
      - footskip=8mm
      - includeheadfoot
      - heightrounded

    colorlinks: true
    link-citations: true
    linkcolor: blue
    urlcolor: blue
    citecolor: blue
---

# CleanMyMap x Megothon Paris

::: {.callout-note}
Ce document va à l'essentiel. Il est centré sur ce que le Megothon peut tester concrètement dans CleanMyMap autour du mégot, du parcours et de l'impact.
:::

## Ce que CleanMyMap propose

CleanMyMap est un outil open-source pour transformer un ramassage de terrain en donnée lisible. Dans le cas du Megothon, l'enjeu est simple: suivre les mégots, visualiser les zones denses, et produire un bilan clair après l'événement.

- Déclarer l'action sans perdre le terrain.
- Suivre les mégots et leur poids.
- Lire les points chauds sur carte.
- Consolider un rapport d'impact partageable.

::: {.callout-tip}
Pour un événement centré sur les mégots, la valeur n'est pas seulement de collecter, mais de montrer où, combien et avec quel effet visible.
:::

## Ce que vous pouvez parcourir

| Bloc du site | Ce que l'on y voit | Utilité pour le Megothon |
|---|---|---|
| `Agir` | déclaration d'action, saisie terrain, GPS | enregistrer les parcours réels du week-end |
| `Carte des actions` | points, traces, zones denses, filtres | repérer les hotspots mégots |
| `Rapports d'impact` | bilans, indicateurs, exports | résumer l'événement pour la mairie ou les partenaires |
| `Apprendre` | méthode, repères, calculs | expliquer simplement les chiffres |
| `Pilotage` | synthèse, comparaison, suivi | lire l'effet global du Megothon |
| `Échanges` | annuaire, relais, liens locaux | valoriser les acteurs mobilisés |

::: {.callout-note}
Parcours conseillé: `Agir` -> `Carte des actions` -> `Rapports d'impact` -> `Pilotage`
:::

## Les logiques métier

Le Megothon se prête bien à une lecture orientée mégot.

- Compter les mégots, pas seulement les sacs.
- Relier chaque ramassage à une zone précise.
- Faire ressortir les rues, abords et axes les plus chargés.
- Produire un bilan lisible pour le terrain et pour l'institutionnel.
- Préparer un export réutilisable après l'événement.

::: {.callout-tip}
Le plus utile est souvent le plus simple: une donnée de terrain propre, géolocalisée et réexploitable.
:::

## Le socle technique

| Brique | Rôle |
|---|---|
| `Supabase` | base de vérité pour les données, les profils, les actions et les règles `RLS` |
| `Quarto` | moteur de rendu du PDF à partir du Markdown |
| `GitHub` | dépôt source, historique et collaboration technique |

Ce socle reste léger, auditable et compréhensible pour un développeur. Il permet de tester l'événement sans enfermer les données dans un format propriétaire.

## Ce que je propose

- un test en conditions réelles pendant le Megothon Paris ;
- un rapport PDF post-événement centré sur les mégots et les zones couvertes ;
- un export réutilisable pour vos archives ou vos partenaires ;
- un échange technique court si votre développeur veut vérifier le socle.

Maxence Deroome
CleanMyMap
cleanmymap.fr
