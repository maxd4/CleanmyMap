---
title: "CleanMyMap x World Cleanup Day France"
subtitle: "Proposition de pilote régional"
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

## Ce que CleanMyMap propose

CleanMyMap est un site open-source pensé pour donner une lecture simple et exploitable des cleanwalks locales. L'outil relie la déclaration d'action, le tracé GPS réel, la cartographie, les rapports d'impact et les espaces d'échange.

- Suivre précisément les parcours réalisés.
- Faire remonter les zones réellement couvertes.
- Produire un rapport PDF clair après action.
- Structurer un pilote local réutilisable.

L'objectif n'est pas de remplacer votre organisation, mais d'ajouter une couche de lecture, de preuve et de coordination plus fine.

## Schéma de complémentarité

::: {.callout-note}
<p align="center"><strong>World Cleanup Day France</strong><br>
Échelle nationale · réseau · événement fédérateur · historique d'actions<br>
↓<br>
<strong>CleanMyMap</strong><br>
Pilote Île-de-France · tracé GPS · carte locale · rapports d'impact<br>
↓<br>
Données plus précises pour les cleanwalks régulières</p>
:::

## Ce que cela change pour World Cleanup Day France

| Besoin côté World Cleanup Day France | Ce que CleanMyMap apporte | Effet concret |
|---|---|---|
| Mieux suivre les cleanwalks locales | tracé GPS réel des actions | visualiser les parcours au lieu d'avoir seulement une déclaration textuelle |
| Clarifier la saisie terrain | formulaire enrichi pour l'action | capter poids, mégots, zones, photos et contexte sans alourdir le terrain |
| Lire l'activité d'un territoire | carte des actions et filtres | repérer les zones nettoyées, les doublons et les secteurs peu couverts |
| Partager un bilan utile | rapport PDF automatique | transmettre un document lisible à l'équipe, aux élus ou aux partenaires |
| Tester un usage régional | pilote Île-de-France | valider la méthode sur un périmètre concret avant toute extension |
| Mieux coordonner les acteurs | espaces d'échange et pilotage | faciliter la remontée d'information entre terrain, associations et coordination |

::: {.callout-note}
Lecture rapide: `tracé GPS` -> `formulaire enrichi` -> `carte des actions` -> `rapport PDF` -> `pilote Île-de-France`
:::

## Pilote Île-de-France

CleanMyMap peut servir de pilote régional en Île-de-France afin de tester une couche de suivi plus fine : tracé réel des actions, formulaire enrichi, coordination locale et rapports d'impact automatisés. Si l'expérimentation est utile, certains champs ou formats de données pourraient ensuite être harmonisés avec les besoins de World Cleanup Day France.

::: {.callout-note}
La logique est volontairement progressive: commencer localement, valider l'usage, puis seulement envisager une harmonisation plus large.
:::

## RGPD et données

La collaboration peut commencer sans partage de données sensibles : seules les informations utiles au suivi des actions peuvent être testées, par exemple la date, la ville, le type d'action, les volumes estimés, les photos publiques ou le tracé validé. Les données personnelles, contacts et informations internes peuvent rester séparés.

## Les logiques métier

Le cœur du projet tient en quelques logiques simples.

- Déclarer une action en quelques minutes, sans alourdir le terrain.
- Vérifier qu'une action correspond bien à une zone réellement parcourue.
- Comparer les opérations par association, ville, période ou type d'action.
- Valoriser les initiatives avec des rapports plus lisibles pour les élus et partenaires.
- Garder une séparation claire entre terrain, coordination et pilotage.

::: {.callout-tip}
Pour le partenariat, l'intérêt principal est la combinaison entre visibilité locale et lecture consolidée.
:::

## Le socle technique

| Brique | Rôle |
|---|---|
| `Supabase` | socle de données pour les profils, les actions et les règles `RLS` |
| `Quarto` | moteur de rendu du PDF à partir du Markdown |
| `GitHub` | dépôt source, historique des changements et collaboration technique |

Ce socle reste simple à comprendre pour une équipe technique: une source de données claire, un rendu documentaire reproductible, et un historique de code auditable. Le projet peut donc évoluer sans perdre la traçabilité des choix.

## Suite possible

Proposition de première étape : tester CleanMyMap sur quelques actions en Île-de-France, comparer les champs du formulaire avec ceux de World Cleanup Day France, puis identifier les données qui pourraient être harmonisées ou exportées.

Si cette première étape est utile, je peux ensuite préparer un échange technique avec votre équipe autour de `Supabase`, des `RLS` et des flux de données.

Maxence Deroome
CleanMyMap
cleanmymap.fr
