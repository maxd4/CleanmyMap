# Data display — KPI et tables runtime (CURRENT)

Ce document décrit le contrat courant de présentation des données dans le web
CleanMyMap. Il distingue les KPI partagés des tables runtime et ne transforme
pas la dette legacy en convention concurrente.

## KPI

`StatCard` est la primitive KPI partagée. Elle compose `CmmCard` avec
`as="article"`, conserve les tones, surfaces et modes d'affichage de la carte,
et affiche les valeurs avec des chiffres stables (`tabular-nums`).

Il n'existe volontairement pas de `CmmKpi` parallèle. Les composants métier
peuvent composer `StatCard` avec leur libellé, unité, période, source, badge,
description et footer sans recréer la surface de carte.

## Tables runtime

Les tables runtime conservent leur sémantique native : `<table>`, `<thead>`,
`<tbody>`, `<th>` et `<td>`. Les en-têtes de colonne utilisent `scope="col"`.
Un `<caption>` est ajouté lorsque le contexte environnant ne suffit pas à
identifier la table.

Il n'existe volontairement pas de composant React `CmmTable`. Le fichier
`data-display.css` porte uniquement le shell et la géométrie commune :

- `cmm-data-table-wrap` porte notamment l'overflow horizontal ;
- `cmm-data-table` porte la largeur, la densité, les en-têtes et les séparateurs ;
- `cmm-data-table__numeric` stabilise les chiffres ;
- `cmm-data-table__end` aligne les contenus en fin de ligne ;
- `cmm-data-table__nowrap` évite les retours à la ligne nécessaires ;
- `data-density="compact"` active la densité compacte.

Le tri, les colonnes, la sélection, la pagination, la hauteur maximale et les
interactions restent des responsabilités métier du consommateur.

## Composition et frontières

La présentation des données ne réimplémente pas les autres familles du design
system :

- les statuts utilisent `CmmBadge` lorsque la surface est migrée ;
- les états de chargement, vide et erreur utilisent les primitives States / Feedback ;
- les actions utilisent les composants Actions / Buttons.

La géométrie tabulaire reste stable dans les modes `exhaustif`, `minimaliste`
et `sobre`. Les variations visuelles passent par les tokens sémantiques. Les
tables n'ajoutent ni ombre, ni blur, ni animation décorative.

Les KPI héritent des comportements de surface et des modes de `CmmCard` ; ils
ne définissent pas un système visuel parallèle.

## Frontière Print / Export

`ReportTable`, les tables PDF/HTML/email et `cmm-table-wrap` sont des contrats
spécialisés de Print / Export. Ils restent hors du contrat runtime et ne
doivent jamais être confondus avec `cmm-data-table-wrap`.

## État de migration

Les consommateurs runtime canoniques actuels sont :

- `apps/web/src/components/admin/role-management-panel.tsx` ;
- `apps/web/src/components/dashboard/system-status-panel.tsx` ;
- `apps/web/src/components/actions/actions-map-table.tsx`.

La dette runtime raw-table est désormais vide : les tables runtime couvertes
par le checker utilisent le shell et la géométrie canoniques. Print/Export
reste un contrat spécialisé séparé, avec son exclusion dédiée dans
`check:data-display`, et ne doit pas être assimilé aux tables runtime.
