# Radar de modularisation et dette structurelle

<!-- RADAR:GENERATED:BEGIN -->
## A. En-tête snapshot

`RADAR_REF=7d06ac3e31838befd599fc2415023f32492877e4`<br>
`RADAR_GENERATED_AT=2026-10-31T04:25:08.922Z`<br>
`RADAR_STATUS=CURRENT_AT_GENERATION`

Commandes réellement utilisées :

`node scripts/reports/generate-modularity-radar.mjs --ref=HEAD`

Le snapshot lit l'arbre Git exact de 7d06ac3e31838befd599fc2415023f32492877e4. Le statut
CURRENT_AT_GENERATION décrit l'instant de génération ; un document commité
peut donc rester un snapshot reproductible de cette ref sans prétendre suivre
automatiquement un HEAD ultérieur.

## B. Résumé exécutif

| Mesure factuelle | Valeur |
| --- | ---: |
| Fichiers mesurés | 4160 |
| Surveillance préventive informative (runtime/tests) | 274 |
| REVIEW architectural (runtime + data/config) | 17 |
| HARD contrôlé | 0 |
| Tests volumineux | 0 |
| Generated informatifs | 0 |
| PROACTIVE_SPLIT établi | 0 |
| DEFERRED_SPLIT établi | 2 |
| COHESIVE_SINGLE_FILE établi | 14 |
| ALREADY_MODULARIZED établi | 49 |
| Candidats avec plusieurs signaux structurels attribués | 13 |

La taille déclenche une revue, jamais un split mécanique. Les décisions
humaines et les corrélations sont séparées du ratchet quality:top-heavy.

## C. Politique

La politique par KIND est canonique dans
top-heavy-policy.mjs (../../scripts/checks/top-heavy-policy.mjs) et est
consommée par le même moteur que quality:top-heavy. Le générateur ne
redéfinit aucun seuil.

| KIND | REVIEW | HARD | PRÉVENTIVE | Lecture radar |
| --- | --- | --- | --- | --- |
| runtime | >500 lignes ou >40 KiB | >1000 lignes ou >50 KiB | >=300 lignes (informatif) | architecture |
| test | >1000 lignes ou >50 KiB | >1500 lignes ou >80 KiB | >=600 lignes (informatif) | lisibilité/cohésion des scénarios |
| data/config | >800 lignes ou >50 KiB | >1500 lignes ou >80 KiB | qualitatif, selon la cohésion | architecture |
| generated | informatif | informatif | informatif | provenance générée + régénérabilité obligatoires |

Un fichier generated n'est exclu que si sa provenance et sa régénérabilité
sont démontrées. Un test volumineux reste un signal de lisibilité et de
cohésion de scénarios, jamais un monolithe runtime par défaut. La colonne
préventive est strictement informative : elle ne crée ni REVIEW/HARD, ni
baseline, ni décision de split ; data/config reste lu selon la cohésion réelle
du catalogue, sans seuil numérique automatique.

## D. Priorités architecturales

| PATH | DECISION | SIZE_SIGNAL | PRIORITY | SIGNALS | BLOCKER / NEXT_TRIGGER |
| --- | --- | --- | --- | --- | --- |
| `apps/web/src/lib/partners/onboarding-requests-store.ts` | ALREADY_MODULARIZED | NONE | NONE | complexity: 1 finding(s) actuel(s) | préserver les normalisations fail-closed, l'idempotence et les chemins Supabase/fichier ; nouveau contrat de persistance ou de normalisation consommé indépendamment |
| `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver la persistance, les fallbacks et les contrats de snapshots hebdomadaires ; nouveau contrat de projection mensuelle ou de stockage indépendant |
| `apps/web/src/lib/actions/map/map-http.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver le fast path HTTP, le fallback Supabase, les scopes et les contrats géométriques ; nouvelle source cartographique ou projection autonome |
| `apps/web/src/lib/learning/quiz/quiz-bank-admin.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver les contrats de filtrage et la façade publique du snapshot d'administration ; nouveau consommateur indépendant du rapport d'audit ou du catalogue |
| `apps/web/src/components/admin/admin-dashboard-ui.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver les exports UI, les tokens visuels et les contrats des cartes admin ; nouvelle famille de panneau autonome ou état propre réintroduit dans la façade |
| `apps/web/src/components/sections/rubriques/partners-network-directory.tsx` | ALREADY_MODULARIZED | NOT_MEASURED | NONE | signaux complémentaires non mesurés | préserver le contrat de l'annuaire, les filtres et les résultats ; nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/components/chat/chat-shell.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | aucun ; les frontières client restent séparées et les effets existants sont préservés ; nouvelle responsabilité autonome réintroduite dans la façade ou couplage anormal entre owners |
| `apps/web/src/components/sections/rubriques/elus-section.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | conserver l'orchestration overview/navigation/panels ; nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/components/account/greater-paris-select.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver les façades et owners suggestions/controls/shell ; nouveau contrat géographique autonome |
| `apps/web/src/components/sections/rubriques/feedback-section-dashboard.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver le contrôleur, les états de soumission et les sous-vues ; nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/lib/community/bug-report-screenshot.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver la vérification du contenu, l'ownership, les états d'upload et la suppression sans fuite de chemin privé ; nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/lib/community/bug-reports-store.ts` | ALREADY_MODULARIZED | PRESENT — REVIEW | NONE | dead-code: 1 finding(s) actuel(s) | préserver les filtres owner, les curseurs, l'échec fermé des RPC et l'absence de nettoyage de captures hors contrat ; nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/components/sections/rubriques/feedback/questionnaire-card.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver les textes, le honeypot, les validations, le comportement Clerk et la révocation des prévisualisations ; nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/app/learn/ressources/learn-ressources-client.data.ts` | COHESIVE_SINGLE_FILE | NONE | NONE | signaux complémentaires non mesurés | aucun ; ajout d'une famille de données indépendante ou changement du contrat de catalogue |
| `apps/web/src/components/sections/rubriques/methodologie-page-client.tsx` | COHESIVE_SINGLE_FILE | NONE | NONE | signaux complémentaires non mesurés | préserver les deux exports publics ; ajout d'une nouvelle famille de méthodologie ou rupture du contrat legacy |
| `apps/web/src/components/sections/rubriques/free-plan-services-methodology-visual.impact.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | aucun ; nouvelle responsabilité métier ajoutée à la façade |
| `apps/web/src/components/actions/action-declaration/hooks/use-action-declaration-form.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver l'API publique du hook et les contrats draft, géométrie, validation, payload et submit ; nouvelle responsabilité autonome réintroduite dans la façade ou couplage anormal entre owners |
| `apps/web/src/app/docs/[...segments]/route.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver résolution anti-path-traversal, MIME, headers et contrat SEO ; nouvelle responsabilité autonome réintroduite dans la façade ou croissance substantielle d'un des owners extraits |
| `apps/web/src/lib/validation/action.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver l'owner unique des schémas create/update et l'ordre des validations ; nouvelle responsabilité indépendante réintroduite dans la façade ou couplage anormal entre sous-modules |
| `apps/web/src/lib/pdf-export/simple-pdf.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver octets PDF, format des lignes et PdfReportPayload ; nouvelle responsabilité substantielle réintroduite dans la façade ou couplage anormal entre sous-modules |
| `apps/web/src/lib/actions/pollution/current-place-state.ts` | DEFERRED_SPLIT | NONE | LATER | signaux complémentaires non mesurés | préserver le bucket de lieu et la distinction observation/projection ; ne pas créer une source de vérité commune ni séparer les étapes privées sans contrat indépendant ; évolution indépendante des modèles observed/projected_today ou du modèle de repollution |
| `apps/web/src/lib/actions/pollution/local-repollution-calibration.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver matching spatial, complétude, confiance et projections ; nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/lib/route/route-predicted-targets.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver budgets planner, audits et contrats API route ; nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/components/sections/rubriques/route/route-section.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver les textes, états async, origine carte, deep-links et CTA planner ; nouvelle responsabilité autonome réintroduite dans RouteSection ou couplage anormal entre owners |
| `apps/web/src/components/reports/web-document/reports-web-document.shared.tsx` | EXTRACTED_PURE_CONTRACT | NONE | CURRENT | signaux complémentaires non mesurés | préserver l'usage du renderer PDF commun et la compatibilité des snapshots historiques ; évolution indépendante des modules ou du contrat PDF |
| `apps/web/src/app/(app)/reports/page.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver la frontière App Router serveur, les contrôles AuthN/AuthZ et les contrats de reprise/génération ; nouvelle responsabilité serveur autonome réintroduite dans la page ou déplacement d'un contrôle d'accès vers le client |
| `apps/web/src/lib/pdf-export/report-pdf-theme.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver `buildOfficialReportCss`, l'ordre exact des familles CSS et les sorties PDF existantes ; nouvelle famille de règles CSS indépendante ou logique de tokens réintroduite dans la façade |
| `apps/web/src/components/sections/rubriques/recycling-question-assistant/assistant-utils.ts` | COHESIVE_SINGLE_FILE | PRESENT — REVIEW | NONE | complexity: 2 finding(s) actuel(s) | conserver réponses FR/EN et projection canonique Waste alignées ; famille de règles indépendante ou catalogue de contenu autonome démontré |
| `apps/web/src/lib/route/route-trace.ts` | COHESIVE_SINGLE_FILE | PRESENT — REVIEW | NONE | complexity: 4 finding(s) actuel(s) | un seul owner du contrat RouteRecommendationTrace et de sa construction ; nouveau sous-contrat de trace consommé indépendamment du builder principal |
| `apps/web/src/components/accueil/accueil-community-credibility.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver fallback, contrat activity, accessibilité et façades exportées ; nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/lib/ui/button-theme.ts` | COHESIVE_SINGLE_FILE | PRESENT — REVIEW | NONE | signaux complémentaires non mesurés | owner canonique unique BackdropToneKey -> tokens CSS ; second système de thème ou familles de tokens réellement indépendantes |
| `apps/web/src/lib/supabase/storage-usage.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver pagination exhaustive, snapshots et classification canonique ; nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/components/actions/actions-history-list.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver AuthZ admin, review participation et états asynchrones ; nouvelle responsabilité autonome réintroduite dans la façade ou couplage anormal entre owners |
| `apps/web/src/components/actions/action-declaration/payload.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver FormState, géométrie finale, smart assist et payload create ; nouvelle responsabilité autonome réintroduite dans la façade ou divergence entre owners |
| `apps/web/src/lib/route/route-group-partition.ts` | COHESIVE_SINGLE_FILE | PRESENT — REVIEW | NONE | complexity: 4 finding(s) actuel(s) | pipeline unique de partitionnement et métriques ; nouvelle stratégie de partition autonome ou nouveau contrat planner |
| `apps/web/src/lib/learning/quiz/quiz-quality-audit.ts` | COHESIVE_SINGLE_FILE | PRESENT — REVIEW | NONE | complexity: 3 finding(s) actuel(s) | moteur unique de critères et rapport d'audit ; nouveau domaine de qualité indépendant |
| `apps/web/src/lib/environmental-impact-estimator/services/infrastructure.ts` | COHESIVE_SINGLE_FILE | PRESENT — REVIEW | NONE | complexity: 2 finding(s) actuel(s) | owner unique de l'estimation infrastructure ; calculs internes au même modèle ; nouvelle famille de service réellement autonome ou API publique indépendante |
| `apps/web/src/components/actions/map/layers/actions-map-geometry.utils.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver les conventions de coordonnées, la provenance géométrique, les contrats render/presentation et l'absence de logique de normalisation/validation dupliquée ; nouvelle responsabilité autonome réintroduite dans le view-model ou dégradation démontrée des frontières entre domaine, validation, rendu et view-model |
| `apps/web/src/components/actions/action-declaration/before/sections.tsx` | ALREADY_MODULARIZED | NOT_MEASURED | NONE | signaux complémentaires non mesurés | préserver la façade d'exports, BaseSectionProps, validation, focus et updateField ; nouvelle responsabilité autonome réintroduite dans la façade ou couplage anormal entre owners |
| `apps/web/src/app/api/route/recommend/route.response.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver DTO, planner proof/snapshot, calibration et la façade `buildRouteRecommendationResponse` ; nouveau mode de réponse ou sous-contrat consommé indépendamment |
| `apps/web/src/lib/actions/participation/group-participation-review.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver AuthZ, ownership, idempotence, audit et ordre des mutations ; nouvelle responsabilité autonome réintroduite dans la façade ou divergence de contrat |
| `apps/web/src/lib/actions/pollution/corridor-history.ts` | EXTRACTED_PURE_CONTRACT | NONE | CURRENT | signaux complémentaires non mesurés | préserver les constantes géographiques, `CorridorPolyline`/`CorridorHistory`, les unités et l'ordre matching → historique → score ; ne pas créer de second owner du domaine Pollution ; nouveau mode de corridor, sous-modèle historique indépendant ou consommateur géométrique autonome |
| `apps/web/src/lib/actions/http.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver URL, méthode, payload et erreurs de chaque famille endpoint ; nouvelle famille de contrat réintroduite dans la façade ou divergence URL/méthode/payload |
| `apps/web/src/lib/geo/municipal-cleaning-serviceability.ts` | COHESIVE_SINGLE_FILE | PRESENT — REVIEW | NONE | complexity: 2 finding(s) actuel(s) | owner unique du modèle de preuve/confiance/serviceabilité ; nouveau type de preuve autonome ou changement indépendant de matérialisation |
| `apps/web/src/app/api/chat/route.post.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | aucun ; la frontière serveur reste séparée du client et les contrats POST sont préservés ; nouvelle responsabilité autonome réintroduite dans la route ou opacification d'une décision AuthN/AuthZ |
| `apps/web/src/lib/impact/impact-terrain-2026.ts` | COHESIVE_SINGLE_FILE | PRESENT — REVIEW | NONE | complexity: 1 finding(s) actuel(s) | owner canonique de la méthodologie scientifique versionnée ; nouvelle version méthodologique ou famille de calculs réellement indépendante |
| `apps/web/src/components/chat/discussion-guidance.ts` | COHESIVE_SINGLE_FILE | NONE | NONE | signaux complémentaires non mesurés | catalogue bilingue unique topics/canaux/guidance ; source de contenu externe ou catalogues par canal réellement autonomes |
| `apps/web/src/lib/actions/exports/export-form-media.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver IDs presets/bundles, textes, noms de fichiers, dimensions/formats et API publique ; nouvelle responsabilité substantielle réintroduite dans la façade ou couplage anormal entre sous-modules |
| `apps/web/src/app/api/reports/elus-dossier/route.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver AuthN/AuthZ, scope, cache, storage, headers et formats ; nouvelle responsabilité métier/stockage ajoutée directement au handler |
| `apps/web/src/components/sections/rubriques/weather-section.conditions.tsx` | COHESIVE_SINGLE_FILE | NONE | NONE | signaux complémentaires non mesurés | un seul ConditionsPanel et état météo fortement partagé ; éviter prop drilling ; nouvelle famille de conditions avec état/cycle de vie autonome |
| `apps/web/src/lib/pdf-export/official-report-html.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver échappement HTML, Markdown, tableaux, callouts et PdfReportPayload ; nouvelle responsabilité indépendante ajoutée au compositeur |
| `apps/web/src/lib/auth/sync.ts` | ALREADY_MODULARIZED | NONE | NONE | dead-code: 1 finding(s) actuel(s) | préserver scope utilisateur, service-role server-only, idempotence et ordre d'upsert ; nouvelle responsabilité autonome réintroduite dans la façade ou opacification AuthN/AuthZ |
| `apps/web/src/components/actions/action-creation-shell.tsx` | DEFERRED_SPLIT | NONE | AFTER_ACTIVE_CHANGES | signaux complémentaires non mesurés | préserver l'isolation par `actionId`, les transitions d'état et l'URL reprenable ; frontière indépendante et testée entre navigation/sections, état workflow et orchestration de persistance |
| `apps/web/src/components/actions/action-declaration/before/use-before-action-workflow.ts` | EXTRACTED_PURE_CONTRACT | NONE | CURRENT | signaux complémentaires non mesurés | préserver les modifications utilisateur, le premier identifiant persistant et la publication toujours explicite ; nouvelle responsabilité autonome réintroduite dans le workflow ou couplage qui compromet la reprise et la publication explicite |
| `apps/web/src/lib/spogomi/preparation-service.ts` | COHESIVE_SINGLE_FILE | PRESENT — REVIEW | NONE | signaux complémentaires non mesurés | préserver les contrats d'import de roster et de composition, les verrous de reprise et les RPC transactionnelles ; nouveau consommateur indépendant d'import ou de composition, ou persistance d'un des deux workflows déplacée vers un owner dédié |
| `apps/web/src/lib/reports/report-generation-history-store.ts` | COHESIVE_SINGLE_FILE | PRESENT — REVIEW | NONE | signaux complémentaires non mesurés | préserver la cohérence snapshot/métadonnées, l'ownership Clerk et les résolutions direct/derived ; nouveau contrat de lecture ou de persistance indépendant, ou divergence entre historique et snapshot |
| `apps/web/src/app/api/api-boundary.test.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | conserver les assertions d'inventaire, d'assemblage et de contrat d'autorisation sans importer une suite de tests ; nouvelle famille de contrat d'inventaire ou nouvelle dépendance de parcours HTTP indépendante |
| `apps/web/src/app/api/api-boundary-analysis.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | conserver les primitives d'inventaire et d'extraction des méthodes comme owner partagé, sans absorber l'analyse d'évidence ; nouvelle analyse de parcours ou de méthodes qui ne relève plus de l'inventaire partagé |
| `apps/web/src/app/api/api-boundary-evidence-analysis.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | conserver l'owner neutre de résolution des imports, analyse AST, délégations et preuves d'invocation ; nouvelle famille de preuve ou dépendance aux déclarations Vitest dans l'analyseur |
| `apps/web/src/app/api/reports/generations/route.test.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver l'ordre AuthN → quota → source → persistance et les assertions d'incertitude ; nouveau flux de rapport indépendant ou fixture qui porte un contrat métier autonome |
| `apps/web/src/app/api/reports/generations/route.test.helpers.ts` | ALREADY_MODULARIZED | NOT_MEASURED | NONE | signaux complémentaires non mesurés | préserver les mocks de frontières et les defaults par méthode ; nouveau owner de mock ou nouvelle frontière de route indépendante |
| `apps/web/src/app/api/reports/generations/route.get.test.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver l'ownership, les filtres et l'absence d'accès quota en lecture ; nouvelle famille de lecture historique indépendante |
| `apps/web/src/app/api/reports/generations/route.persistence.test.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver la reprise d'insertion, l'audit et la conservation du quota ; nouveau contrat de persistance non partagé avec POST |
| `apps/web/src/app/api/actions/[actionId]/group-join/route.post.test.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver la modération admin et les mutations ordinaires de participation ; nouveau flux POST indépendant des décisions de modération |
| `apps/web/src/app/api/actions/[actionId]/group-join/route.post-action-claims.test.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver l'ownership, l'idempotence et la séparation des revendications post-action ; nouveau type de revendication ou changement de frontière d'autorisation |
| `apps/web/src/lib/auth/api-authorization-contract.actions.ts` | ALREADY_MODULARIZED | PRESENT — REVIEW | NONE | signaux complémentaires non mesurés | conserver une seule façade d'assemblage et les clés sans collision ; nouveau domaine d'autorisation indépendant consommé hors de la façade actions |
| `apps/web/src/lib/spogomi/results-projection.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver la façade projection/export et la validation publique fail-closed ; nouveau contrat de projection ou parser public consommé indépendamment |
| `apps/web/src/lib/actions/signalement/signalement-media.ts` | ALREADY_MODULARIZED | NONE | NONE | complexity: 2 finding(s) actuel(s) | préserver AuthZ, validation média, états d'upload et contrats de stockage ; nouveau workflow média indépendant ou divergence entre validation et persistance |

## E. Registre des décisions humaines

Les décisions architecturales, leurs rationales, contrats, consommateurs,
frontières d'extraction et déclencheurs sont conservés dans le registre
canonique [`modularity-decisions.md`](./modularity-decisions.md). Le radar
utilise ce registre pour ses priorités et classifications, sans recopier les
fiches détaillées.

## F. Radar brut à auditer

Les tableaux suivants sont mesurés automatiquement. Une ligne sans décision
humaine reste REVIEW_REQUIRED, qui est un état d'audit et non une consigne
de découpage.

### Surveillance préventive — top 25

Les lignes suivantes sont dans une zone de lecture située avant REVIEW pour
runtime et tests. La distance est calculée séparément pour les lignes et les
octets ; aucun agrégat numérique global n'est produit. Les signaux affichés sont uniquement
ceux effectivement attribués par les rapports quality disponibles à la ref.

| PATH | KIND | LINES | KiB | DISTANCE_REVIEW | SIGNAUX_MESURÉS | DÉCISION_EXISTANTE |
| --- | --- | ---: | ---: | --- | --- | --- |
| `apps/web/src/components/admin/creator-inbox/use-creator-inbox.test.tsx` | test | 826 | 26.4 KiB | 174 lignes / 23.6 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/actions/store.test.ts` | test | 806 | 23.3 KiB | 194 lignes / 26.7 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/environmental-impact-estimator/project-signals.test.ts` | test | 782 | 25.3 KiB | 218 lignes / 24.7 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/app/api/route/recommend/route.response.test.ts` | test | 760 | 25.4 KiB | 240 lignes / 24.6 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/__tests__/support/group-join-action-id-route.ts` | test | 749 | 29.5 KiB | 251 lignes / 20.5 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/app/api/actions/[actionId]/group-join/route.post.test.ts` | test | 724 | 25.1 KiB | 276 lignes / 24.9 KiB | signaux complémentaires non mesurés | ALREADY_MODULARIZED |
| `apps/web/src/app/api/actions/[actionId]/formalities/route.test.ts` | test | 720 | 25.1 KiB | 280 lignes / 24.9 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/app/api/actions/[actionId]/route.test.ts` | test | 704 | 23.9 KiB | 296 lignes / 26.1 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/components/reports/web-document/reports-web-document.shared.test.ts` | test | 703 | 25.1 KiB | 297 lignes / 24.9 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/components/actions/map/layers/map-layers.test.ts` | test | 699 | 20.6 KiB | 301 lignes / 29.4 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/components/reports/web-document/reports-web-document-preparation.test.ts` | test | 698 | 25.4 KiB | 302 lignes / 24.6 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/components/actions/map/layers/actions-map-geometry.utils.test.ts` | test | 698 | 21.2 KiB | 302 lignes / 28.8 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/components/sections/rubriques/community/use-community-events.test.tsx` | test | 690 | 36.8 KiB | 310 lignes / 13.2 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/reports/report-generation-history-store.test.ts` | test | 684 | 25.0 KiB | 316 lignes / 25.0 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/app/(app)/reports/page.test.ts` | test | 677 | 26.3 KiB | 323 lignes / 23.7 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/app/api/spogomi/routes.behavior.test.ts` | test | 676 | 39.3 KiB | 324 lignes / 10.7 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/mobile/tests/tracking-service-coverage.test.ts` | test | 642 | 22.2 KiB | 358 lignes / 27.8 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/public-surface-snapshots.test.ts` | test | 633 | 21.7 KiB | 367 lignes / 28.3 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/actions/action-update-persistence.test.ts` | test | 626 | 20.5 KiB | 374 lignes / 29.5 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/app/api/reports/generations/route.test.ts` | test | 620 | 23.7 KiB | 380 lignes / 26.3 KiB | signaux complémentaires non mesurés | ALREADY_MODULARIZED |
| `apps/web/src/lib/route/route-planner.test.ts` | test | 611 | 20.2 KiB | 389 lignes / 29.8 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/actions/http.test.ts` | test | 603 | 19.3 KiB | 397 lignes / 30.7 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/actions/formalities-qualification.ts` | runtime | 498 | 17.2 KiB | 2 lignes / 22.8 KiB | complexity: 2 finding(s) actuel(s) | NONE_RECORDED |
| `apps/web/src/lib/actions/pollution/repollution-prediction-evaluation.ts` | runtime | 493 | 15.5 KiB | 7 lignes / 24.5 KiB | complexity: 3 finding(s) actuel(s) | NONE_RECORDED |
| `apps/web/src/components/chat/dm-inbox.tsx` | runtime | 490 | 17.0 KiB | 10 lignes / 23.0 KiB | signaux complémentaires non mesurés | NONE_RECORDED |

### Radar architectural — top 25

| PATH | REF | LINES | BYTES | KIND | SIZE_SIGNAL | CORRELATIONS | DECISION |
| --- | --- | ---: | ---: | --- | --- | --- | --- |
| `apps/web/src/lib/route/route-operational.ts` | `7d06ac3e31838befd599fc2415023f32492877e4` | 637 | 23936 | runtime | PRESENT — REVIEW | complexity: 2 finding(s) actuel(s) | REVIEW_REQUIRED |
| `apps/web/src/components/sections/rubriques/recycling-question-assistant/assistant-utils.ts` | `7d06ac3e31838befd599fc2415023f32492877e4` | 613 | 24198 | runtime | PRESENT — REVIEW | complexity: 2 finding(s) actuel(s) | COHESIVE_SINGLE_FILE |
| `apps/web/src/lib/route/route-trace.ts` | `7d06ac3e31838befd599fc2415023f32492877e4` | 605 | 20034 | runtime | PRESENT — REVIEW | complexity: 4 finding(s) actuel(s) | COHESIVE_SINGLE_FILE |
| `apps/web/src/lib/learning/quiz/quiz-quality-audit.ts` | `7d06ac3e31838befd599fc2415023f32492877e4` | 590 | 16820 | runtime | PRESENT — REVIEW | complexity: 3 finding(s) actuel(s) | COHESIVE_SINGLE_FILE |
| `apps/web/src/lib/environmental-impact-estimator/services/infrastructure.ts` | `7d06ac3e31838befd599fc2415023f32492877e4` | 588 | 21807 | runtime | PRESENT — REVIEW | complexity: 2 finding(s) actuel(s) | COHESIVE_SINGLE_FILE |
| `apps/web/src/lib/community/bug-reports-store.ts` | `7d06ac3e31838befd599fc2415023f32492877e4` | 586 | 19875 | runtime | PRESENT — REVIEW | dead-code: 1 finding(s) actuel(s) | ALREADY_MODULARIZED |
| `apps/web/src/lib/ui/button-theme.ts` | `7d06ac3e31838befd599fc2415023f32492877e4` | 578 | 16389 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | COHESIVE_SINGLE_FILE |
| `apps/web/src/lib/auth/api-authorization-contract.actions.ts` | `historical audit snapshot` | 575 | 30399 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | ALREADY_MODULARIZED |
| `apps/web/src/lib/actions/action-buddy.ts` | `7d06ac3e31838befd599fc2415023f32492877e4` | 557 | 22051 | runtime | PRESENT — REVIEW | dead-code: 3 finding(s) actuel(s) | REVIEW_REQUIRED |
| `apps/web/src/lib/spogomi/preparation-service.ts` | `7d06ac3e31838befd599fc2415023f32492877e4` | 544 | 32376 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | COHESIVE_SINGLE_FILE |
| `apps/web/src/lib/route/route-group-partition.ts` | `7d06ac3e31838befd599fc2415023f32492877e4` | 544 | 20304 | runtime | PRESENT — REVIEW | complexity: 4 finding(s) actuel(s) | COHESIVE_SINGLE_FILE |
| `apps/web/src/lib/geo/municipal-cleaning-serviceability.ts` | `7d06ac3e31838befd599fc2415023f32492877e4` | 537 | 20096 | runtime | PRESENT — REVIEW | complexity: 2 finding(s) actuel(s) | COHESIVE_SINGLE_FILE |
| `apps/web/src/components/actions/action-drawing-map.tsx` | `7d06ac3e31838befd599fc2415023f32492877e4` | 535 | 16033 | runtime | PRESENT — REVIEW | complexity: 2 finding(s) actuel(s) | REVIEW_REQUIRED |
| `apps/web/src/lib/reports/report-generation-history-store.ts` | `7d06ac3e31838befd599fc2415023f32492877e4` | 522 | 17351 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | COHESIVE_SINGLE_FILE |
| `apps/web/src/lib/actions/volunteer-participation-research.ts` | `7d06ac3e31838befd599fc2415023f32492877e4` | 522 | 15964 | runtime | PRESENT — REVIEW | complexity: 2 finding(s) actuel(s)<br>dead-code: 5 finding(s) actuel(s) | REVIEW_REQUIRED |
| `apps/web/src/lib/impact/impact-terrain-2026.ts` | `7d06ac3e31838befd599fc2415023f32492877e4` | 517 | 26641 | runtime | PRESENT — REVIEW | complexity: 1 finding(s) actuel(s) | COHESIVE_SINGLE_FILE |
| `apps/web/src/lib/actions/formalities-workflow.ts` | `7d06ac3e31838befd599fc2415023f32492877e4` | 506 | 18191 | runtime | PRESENT — REVIEW | complexity: 1 finding(s) actuel(s)<br>dead-code: 2 finding(s) actuel(s) | REVIEW_REQUIRED |

### Tests volumineux — top 25

_Aucun fichier dans cette section._

### Generated — résumé informatif

_Aucun fichier dans cette section._

## G. Grille d'audit

Chaque candidat audité doit conserver les champs suivants, avec des valeurs
factuelles et traçables :

`PATH`, `REF`, `LINES`, `BYTES`, `KIND`, `RESPONSIBILITIES`,
`PUBLIC_CONTRACTS`, `SIDE_EFFECTS`, `MAIN_CONSUMERS`,
`TEST_BOUNDARY`, `COUPLING`, `NATURAL_EXTRACTION_BOUNDARY`,
`SIZE_SIGNAL`, `COMPLEXITY_SIGNAL`, `CYCLE_SIGNAL`,
`DEAD_CODE_SIGNAL`, `DUPLICATION_SIGNAL`, `TESTABILITY_SIGNAL`,
`ARCHITECTURE_DECISION`, `RATIONALE`, `PRIORITY`,
`DEPENDENCY_OR_BLOCKER`, `NEXT_TRIGGER`.

Les signaux acceptent uniquement NONE, PRESENT, NOT_APPLICABLE ou
NOT_MEASURED, avec un détail court. NONE signifie que l'outil concerné a
réellement été exécuté sans finding ; NOT_MEASURED signifie qu'aucune mesure
actuelle attribuable à cette ref n'est disponible. Les priorités sont NOW,
AFTER_ACTIVE_CHANGES, LATER ou NONE ; elles ne sont jamais déduites
automatiquement de la taille.

## H. Signaux complémentaires

- SIZE_SIGNAL vient de quality:top-heavy, de classifyFileKind() et
  de la baseline heavy-files ; ce contrôle reste la source de vérité de la
  taille et de ses plafonds.
- La surveillance préventive utilise uniquement les seuils indicatifs
  `>=300` lignes pour runtime et `>=600` lignes pour test, uniquement sous
  REVIEW. Elle est informative, ne modifie pas `quality:top-heavy --enforce`
  et ne crée jamais `PROACTIVE_SPLIT`. Data/config n'a pas de seuil numérique
  préventif automatique : la cohésion du catalogue doit être examinée par un
  humain.
- En génération standalone, COMPLEXITY_SIGNAL, DEAD_CODE_SIGNAL,
  DUPLICATION_SIGNAL et CYCLE_SIGNAL proviennent uniquement des cinq rapports
  quality-audits dont les manifests prouvent le même RADAR_REF, une baseline
  stable et un worktree propre. Une preuve absente, invalide ou d'une autre ref
  produit NOT_MEASURED ; aucune baseline historique n'est projetée.
- COMPLEXITY_SIGNAL utilise les mesures de fonctions actuelles et le target de
  la policy complexity, y compris lorsque le ratchet legacy autorise encore la
  valeur. Les findings KEEP_JUSTIFIED, KEEP_INTENTIONAL et NO_ACTION_NOISE
  restent visibles dans les rapports bruts mais ne sont pas des signaux
  structurels actionnables.
- L'orchestration audit:quality all construit cette corrélation après les
  cinq gates à partir de leurs résultats en mémoire, sans relancer d'outil.
- Un candidat cumule plusieurs signaux seulement lorsque plusieurs états
  PRESENT sont réellement attribués ; ce compteur n'est pas un score et ne
  remplace aucune gate.

## I. Portée / reproductibilité

La mesure porte sur les fichiers .ts et .tsx suivis sous
apps/web/src et apps/mobile, lus depuis la ref exacte affichée en tête. Elle
réutilise les mêmes roots, classifications KIND et seuils que quality:top-heavy.
Pour régénérer un snapshot courant, utiliser --ref=HEAD ; une ref ancienne est signalée
HISTORICAL_SNAPSHOT et ne peut pas être présentée comme courante.

Les décisions humaines sont lues depuis le registre canonique lié dans la
section E. REF, LINES, BYTES, KIND, SIZE_SIGNAL et les signaux automatiques
sont toujours régénérés depuis RADAR_REF ; ils ne sont jamais copiés depuis
le registre. Les snapshots historiques antérieurs à cette séparation peuvent
encore lire leur bloc humain intégré. refactor-priorities-plan.md renvoie vers
ce document sans recopier sa liste.
<!-- RADAR:GENERATED:END -->
