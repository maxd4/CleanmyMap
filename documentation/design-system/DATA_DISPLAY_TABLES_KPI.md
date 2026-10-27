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

### Hiérarchie et sincérité des indicateurs

- Une carte KPI expose d'abord le **libellé précis**, la **valeur réellement disponible** et son **unité**. La période, le périmètre géographique, la source et les limites sont visibles lorsque leur omission rendrait le chiffre trompeur.
- Ne pas employer de microtexte illisible, d'opacité faible, d'abréviation incompréhensible ou de seule icône pour une donnée indispensable.
- Comparer des valeurs seulement lorsque leurs unités, périodes et périmètres sont compatibles. Une tendance non vérifiée n'est ni un pourcentage d'évolution ni un badge de réussite.
- Distinguer explicitement **zéro, inconnu, non observé, estimation, projection, indisponible et privé** en suivant les contrats scientifiques et de données du domaine ; aucun placeholder ne devient silencieusement une donnée.
- Les valeurs numériques alignées utilisent `tabular-nums` si la comparaison visuelle en bénéficie. Le titre, l'unité et la valeur doivent rester lisibles après reflow sans être tronqués de façon silencieuse.
- Une carte standard conserve les dimensions de `StatCard` et `CmmCard`, non un padding/radius supplémentaire propre au Dashboard, Pilotage ou Reports.
- La couleur d'accent représente une identité ou une catégorie documentée ; elle ne crée pas seule un niveau, une gravité ou une signification scientifique.

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

### Lisibilité et actions sur les tables

- Les libellés de colonnes sont brefs mais compréhensibles ; les unités ambiguës sont visibles dans l'en-tête ou la cellule selon le contexte.
- Le tri réellement disponible possède un état compréhensible visuellement et programmatiquement ; une simple flèche décorative ne doit pas prétendre déclencher un tri.
- Une table large peut défiler horizontalement **dans `cmm-data-table-wrap`**, mais ne doit pas élargir la page entière. Tester la navigation clavier et le focus des actions contenues dans ses cellules.
- L'ordre DOM, l'ordre de lecture et les relations entre intitulés et valeurs doivent rester exploitables pour les technologies d'assistance.
- Lorsque la comparaison de nombreuses colonnes n'est plus utilisable sur smartphone, adapter la présentation dans le consommateur seulement si une alternative équivalente est réellement plus compréhensible et ne duplique pas le calcul métier.
- La pagination, les filtres et l'export affichent des états de chargement, vide et erreur honnêtes ; ne pas remplacer un résultat inaccessible par une table fictive.

### Pagination des listes longues

Les listes longues utilisent le contrat de leur source canonique. Pour les
événements communautaires, `GET /api/community/events` renvoie une fenêtre
bornée avec `hasMore` et `nextCursor`. Le curseur keyset versionné encode la
phase (`upcoming` ou `past`), la date de l'événement, `created_at` et `id` ;
ces trois derniers champs forment le tri déterministe et son tie-breaker. Une
page suivante est ajoutée par identifiant, avec déduplication, sans remplacer
le périmètre public par un dataset client supposé complet. Un événement
adressé explicitement par `eventId` reste une lecture ciblée hors fenêtre et
ne reçoit pas de curseur.

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

Les surfaces PDF/HTML/email spécialisées sont des contrats de Print / Export.
La page imprimable est portée par
`apps/web/src/app/(app)/prints/report/page.tsx`; les exports interactifs et PDF
du rapport sont portés par `apps/web/src/components/reports/reports-web-document.tsx`,
ses modules `web-document/*` et les owners `apps/web/src/lib/pdf-export/*`.
Il n'existe plus de composant `ReportPage` ni de composant `ReportTable` dans le
runtime ; `cmm-table-wrap` reste l'owner de géométrie HTML/PDF générée et ne doit
jamais être confondu avec `cmm-data-table-wrap`.

## État de migration

Les owners runtime suivis par le garde-fou canonique sont :

- `apps/web/src/components/admin/role-management-panel-view.tsx` pour la
  table d'administration effectivement rendue ;
- `apps/web/src/components/dashboard/system-status-panel.tsx` ;
- `apps/web/src/components/actions/actions-map-table.tsx`.

Cette liste désigne les surfaces à contrôler, pas une preuve de conformité :
`npm run check:data-display` reste l'autorité de migration et doit être
exécuté sur le candidat concerné. Tant que ce contrôle signale une table
runtime hors contrat, la dette ne doit pas être déclarée résolue. Print/Export
reste un contrat spécialisé séparé, avec son exclusion dédiée dans
`check:data-display`, et ne doit pas être assimilé aux tables runtime.

## Vérification et références

Tester tableaux et KPI avec valeurs longues, unités explicites, zéros, absence de données, états de chargement, format numérique et reflow mobile. Vérifier que `check:data-display` et les tests concernés sont **réellement exécutés** ; ce guard ne prouve pas seul la compréhension des unités et de la provenance.

Les liens ci-dessous sont des repères de présentation, d'accessibilité ou de
structure ; ils ne remplacent ni les contrats runtime CleanMyMap ni une preuve
de conformité exécutée.

- USWDS, typographie de données : https://designsystem.digital.gov/components/typography/
- GOV.UK, listes de synthèse : https://design-system.service.gov.uk/components/summary-list/
- W3C, ARIA tableaux : https://www.w3.org/WAI/ARIA/apg/patterns/table/
