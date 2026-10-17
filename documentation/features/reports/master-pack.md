# Master Pack : référence de chapitres

> **Statut : `CURRENT`, avec périmètre strictement limité.** Ce document inventorie les chapitres déclarés dans les constantes du Master Pack. Il ne décrit pas automatiquement la composition du PDF actuellement généré par l'interface `/reports`.

## Source et consommateurs

- Métadonnées des chapitres : `apps/web/src/lib/reports/master-pack/constants.ts` (`MASTER_PACK_CHAPTERS`).
- Modèle de calcul : `apps/web/src/lib/reports/report-model/`.
- Constructeur HTML utilisant cette liste : `apps/web/src/lib/pdf-export/generate-pdf-html.ts`, avec la table des matières dans `generate-pdf-html.toc.ts`.
- Flux exposé par `/reports` : `apps/web/src/components/reports/reports-web-document.tsx`, `reports-web-document.shared.tsx`, puis le pipeline de rendu `apps/web/src/lib/pdf-export/browser-report.ts` / `official-report-html.ts` et le moteur PDF `simple-pdf`. Sa composition effective est régie par `ModuleState` et `buildPdfData()`.

L'existence de `generatePdfHtml()` ne prouve pas qu'il est utilisé par le flux de génération `/reports`. Une équivalence des sorties de ces deux parcours exigerait des tests exécutés sur leurs consommateurs et leurs rendus. Ne pas déplacer ni fusionner des moteurs sur la seule base de cette fiche.

## Chapitres déclarés dans `MASTER_PACK_CHAPTERS`

| Identifiant | Titre déclaré |
| --- | --- |
| `sommaire` | Table des Matières |
| `executif` | Synthèse Institutionnelle |
| `pilotage` | Focus Décideurs |
| `terrain` | Focus Opérationnel |
| `contexte` | Analyse d'Impact Environnemental |
| `communaute` | Engagement Citoyen |
| `gouvernance` | Méthodologie & Transparence |
| `annexes` | Annexes & Exploitation |

Ces intitulés sont des **déclarations de structure**. Ils ne garantissent ni la présence de toutes ces parties dans chaque export, ni l'exactitude des données qu'elles recevraient.

## Contrat distinct de `/reports`

La [fiche CURRENT de `/reports`](../../pages_site/routes/03-cartographie-impact/reports/reports-README.md) décrit les chapitres cœur et les modules facultatifs réellement prévus par l'interface actuelle. Les niveaux de détail `concis`, `default` et `exhaustif` sont livrés avec des compositions distinctes et leur sélecteur est exposé par la configuration Reports. Les futurs habillages `Impact` et `Scientifique` restent orthogonaux à ces niveaux et appartiennent à la [spécification PLAN dédiée](./report-pdf-themes-and-reuse.md), pas à ce Master Pack.

Pour le PDF produit par `/reports`, `buildPdfData()` ordonne les chapitres lorsque les données et les modules les rendent pertinents : synthèse exécutive, résultats terrain, périmètre/identification, impacts et proxys qualifiés, cartographie et contexte lorsqu'ils sont activés, qualité/couverture, méthode et limites, puis données communautaires ou annexes disponibles. Les recommandations génériques ne sont pas un chapitre de ce flux. Les calendriers et annexes vides sont omis ; les modules désactivés restent absents. Les noms de participants du leaderboard ne sont pas exportés dans le document partageable.

Le renderer réellement appelé est `buildOfficialReportHtml()` via `browser-report.ts`. Il produit le HTML imprimable avec un sommaire ancré et les chapitres de `PdfReportPayload`; `simple-pdf` en porte les types et le contrat historique. `generate-pdf-html.ts` reste le constructeur HTML de la famille Master Pack, utile pour ce contrat distinct, mais sa présence ne fait pas de lui le renderer courant de `/reports`.

Les contenus chiffrés proviennent du code métier et de ses tests, non de cette table de titres. Pour modifier le PDF exposé, identifier d'abord le chemin de génération réellement appelé, puis ses consommateurs, les tests de composition, l'historique et les règles de données.

## Reproductibilité

Le snapshot JSON historisé est la source de données de la relecture et du réexport existants ; les nouvelles générations portent un snapshot v2 avec les versions de template et renderer réellement utilisées, sans stocker le PDF binaire. Le contrat garantit la reproductibilité sémantique des données et libellés du snapshot, pas les mêmes octets lorsque le renderer ou l'environnement évolue. Les templates alternatifs, générations dérivées et l'identité binaire restent planifiés dans les [propositions futures](../../pages_site/routes/03-cartographie-impact/reports/reports-liste-propositions-a-traiter.md).

## Contexte historique

Le [document conceptuel ancien](../../sessions/history/master-pack-concept-historical.md) reste utile pour comprendre les intentions initiales, sans devenir un contrat CURRENT des KPI, scores ou chapitres rendus.
