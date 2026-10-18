# Master Pack : référence de chapitres

> **Statut : `CURRENT`, avec périmètre strictement limité.** Ce document inventorie les chapitres déclarés dans les constantes du Master Pack. Il ne décrit pas automatiquement la composition du PDF actuellement généré par l'interface `/reports`.

## Source et consommateurs

- Métadonnées des chapitres : `apps/web/src/lib/reports/master-pack/constants.ts` (`MASTER_PACK_CHAPTERS`).
- Modèle de calcul : `apps/web/src/lib/reports/report-model/`.
- Constructeur HTML utilisant cette liste : `apps/web/src/lib/pdf-export/generate-pdf-html.ts`, avec la table des matières dans `generate-pdf-html.toc.ts`.
- Flux exposé par `/reports` : `apps/web/src/components/reports/reports-web-document.tsx`, `reports-web-document.shared.tsx`, puis le pipeline de rendu `official-report-html.ts` partagé par la consultation HTML et l'endpoint Chromium `apps/web/src/app/api/reports/generations/[id]/pdf/route.ts`. Sa composition effective est régie par `ModuleState` et `buildPdfData()` ; `simple-pdf` conserve les types et consommateurs historiques, mais n'est pas le renderer du PDF téléchargé.

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

La [fiche CURRENT de `/reports`](../../pages_site/routes/03-cartographie-impact/reports/reports-README.md) décrit les chapitres cœur et les modules facultatifs réellement prévus par l'interface actuelle. Les niveaux de détail `concis`, `default` et `exhaustif` sont livrés avec des compositions distinctes et leur sélecteur est exposé par la configuration Reports. Les habillages `Impact` et `Scientifique` sont désormais livrés comme présentation orthogonale, avec leur owner dans `report-pdf-theme.ts` et sans modifier ce contrat de chapitres.

Pour le PDF produit par `/reports`, `buildPdfData()` ordonne les chapitres lorsque les données et les modules les rendent pertinents : synthèse exécutive, résultats terrain, périmètre/identification, impacts et proxys qualifiés, cartographie et contexte lorsqu'ils sont activés, qualité/couverture, méthode et limites, puis données communautaires ou annexes disponibles. Les recommandations génériques ne sont pas un chapitre de ce flux. Les calendriers et annexes vides sont omis ; les modules désactivés restent absents. Les noms de participants du leaderboard ne sont pas exportés dans le document partageable.

Le renderer de composition réellement appelé est `buildOfficialReportHtml()`. Il produit le HTML officiel avec un sommaire ancré et les chapitres de `PdfReportPayload`; le navigateur le consulte ou l'imprime, tandis que `report-pdf-renderer.ts` le remet à Chromium pour le PDF A4 téléchargé. `simple-pdf` en porte les types et le contrat historique. `generate-pdf-html.ts` reste le constructeur HTML de la famille Master Pack, utile pour ce contrat distinct, mais sa présence ne fait pas de lui le renderer courant de `/reports`.

Les contenus chiffrés proviennent du code métier et de ses tests, non de cette table de titres. Pour modifier le PDF exposé, identifier d'abord le chemin de génération réellement appelé, puis ses consommateurs, les tests de composition, l'historique et les règles de données.

## Reproductibilité

Le snapshot JSON historisé est la source de données de la relecture, du
réexport et d'une éventuelle nouvelle version. Les nouvelles générations
portent un snapshot v2 avec `generationId`, `sourceGenerationId` (`null` pour
une génération directe), `templateVersion`, `rendererVersion`,
`filtersVersion`, la provenance canonique et les versions réellement produites
par les owners méthodologiques (`proxyVersion` et `qualityRulesVersion`). Les
facteurs ne sont pas recopiés en dur dans le contrat de persistance : leur
version et leurs sources restent celles de `impact-proxy-config.ts` et de la
méthodologie construite par le runtime.

`public.report_generations` conserve le snapshot et ses métadonnées ; le PDF
binaire est un artefact séparé du bucket privé `reports`, indexé par
`report_generation_pdf_artifacts`. Les lignes historiques sans version, v1 et les anciens v2 incomplets
restent lisibles en compatibilité ; ils ne sont pas silencieusement mis à
niveau et ne peuvent être dérivés que si leur contrat est complet et compatible
avec le template et le renderer courants. Le renderer courant est identifié par
`reports-template-v1` et `official-report-html-v1`. Une version historique
incompatible est refusée explicitement : aucune identité binaire ne peut être
promise sans conserver le renderer correspondant.

« Voir », « Télécharger PDF » et « Imprimer » relisent le snapshot sans nouvelle ligne
ni quota ; le téléchargement réutilise l'artefact PDF après son premier rendu.
« Créer une nouvelle version » consomme le quota existant et crée un
nouvel enregistrement immuable dont `sourceGenerationId` pointe vers la
génération source ; les données, unités, valeurs inconnues et la provenance du
snapshot source sont conservées sans recalcul métier silencieux. La réservation
du quota, la persistance et l'audit de succès sont traités séparément : le
quota n'est libéré qu'après confirmation de l'absence de ligne. Un résultat de
persistance incertain conserve le quota et interdit une relance aveugle ; une
insertion confirmée dont l'audit échoue conserve également le quota, expose
l'état enregistré et signale l'anomalie sans créer une seconde ligne.

## Exploitabilité scientifique du snapshot

Depuis l'historique, la référence bibliographique, le JSON et le CSV sont
produits depuis la ligne `public.report_generations` owner-scoped, sans relire
les actions ni recalculer les KPI. Le JSON porte le schéma versionné
`reports-scientific-export-v1`, le snapshot source, les indicateurs et tables
effectivement rendus, les unités connues, les versions réellement présentes et
les limites. Le CSV est une projection longue des cellules de ces mêmes
indicateurs et tables, avec identifiant stable, origine, unité, valeur et
statut ; une cellule absente reste vide avec `NA`, jamais zéro. Les statuts
`OBSERVED`, `DERIVED`, `DECLARED`, `ASSUMPTION`, `PROXY` et `NA` ne sont
exportés que lorsqu'ils sont connus du snapshot ou de la projection canonique ;
les statuts non historisés restent explicitement inconnus. Les indicateurs
utilisent les champs `label`, `value` et `detail` du snapshot, avec des
identifiants déterministes de projection ; leurs valeurs textuelles ne
suffisent pas à inventer un statut de provenance. Les snapshots legacy restent
lisibles, mais leurs versions et leur filiation manquantes sont signalées.

Les routes `GET /api/reports/generations/[id]/json` et `/csv` réutilisent le
contrôle owner-scoped de l'historique. Elles ne publient ni objets Storage,
ni nouvelles sources privées, ni promesse de conformité PDF/UA ou PDF/A.

## Contexte historique

Le [document conceptuel ancien](../../sessions/history/master-pack-concept-historical.md) reste utile pour comprendre les intentions initiales, sans devenir un contrat CURRENT des KPI, scores ou chapitres rendus.
