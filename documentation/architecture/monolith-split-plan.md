# Radar de modularisation et dette structurelle

<!-- RADAR:GENERATED:BEGIN -->
## A. En-tête snapshot

`RADAR_REF=e04c1b288221d017175b10cbfb9bfb78984f17b0`<br>
`RADAR_GENERATED_AT=2026-10-21T00:09:58.467Z`<br>
`RADAR_STATUS=CURRENT_AT_GENERATION`

Commandes réellement utilisées :

`node scripts/reports/generate-modularity-radar.mjs --ref=HEAD`

Le snapshot lit l'arbre Git exact de e04c1b288221d017175b10cbfb9bfb78984f17b0. Le statut
CURRENT_AT_GENERATION décrit l'instant de génération ; un document commité
peut donc rester un snapshot reproductible de cette ref sans prétendre suivre
automatiquement un HEAD ultérieur.

## B. Résumé exécutif

| Mesure factuelle | Valeur |
| --- | ---: |
| Fichiers mesurés | 3696 |
| Surveillance préventive informative (runtime/tests) | 264 |
| REVIEW architectural (runtime + data/config) | 11 |
| HARD contrôlé | 0 |
| Tests volumineux | 1 |
| Generated informatifs | 0 |
| PROACTIVE_SPLIT établi | 0 |
| DEFERRED_SPLIT établi | 2 |
| COHESIVE_SINGLE_FILE établi | 12 |
| ALREADY_MODULARIZED établi | 30 |
| Candidats avec plusieurs signaux structurels attribués | 0 |

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
| `apps/web/src/components/sections/rubriques/partners-network-section.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver le contrat de section ; nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/components/chat/chat-shell.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | aucun ; les frontières client restent séparées et les effets existants sont préservés ; nouvelle responsabilité autonome réintroduite dans la façade ou couplage anormal entre owners |
| `apps/web/src/components/sections/rubriques/elus-section.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | conserver l'orchestration overview/navigation/panels ; nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/components/account/greater-paris-select.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver les façades et owners suggestions/controls/shell ; nouveau contrat géographique autonome |
| `apps/web/src/components/sections/rubriques/feedback-section-dashboard.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver le contrôleur, les états de soumission et les sous-vues ; nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/lib/community/bug-report-screenshot.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver la vérification du contenu, l'ownership, les états d'upload et la suppression sans fuite de chemin privé ; nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/lib/community/bug-reports-store.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver les filtres owner, les curseurs, l'échec fermé des RPC et l'absence de nettoyage de captures hors contrat ; nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/components/sections/rubriques/feedback/questionnaire-card.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver les textes, le honeypot, les validations, le comportement Clerk et la révocation des prévisualisations ; nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/app/learn/ressources/learn-ressources-client.data.ts` | COHESIVE_SINGLE_FILE | NONE | NONE | signaux complémentaires non mesurés | aucun ; ajout d'une famille de données indépendante ou changement du contrat de catalogue |
| `apps/web/src/components/sections/rubriques/methodologie-page-client.tsx` | COHESIVE_SINGLE_FILE | NONE | NONE | signaux complémentaires non mesurés | préserver les deux exports publics ; ajout d'une nouvelle famille de méthodologie ou rupture du contrat legacy |
| `apps/web/src/components/sections/rubriques/free-plan-services-methodology-visual.impact.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | aucun ; nouvelle responsabilité métier ajoutée à la façade |
| `apps/web/src/components/actions/action-declaration/hooks/use-action-declaration-form.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver l'API publique du hook et les contrats draft, géométrie, validation, payload et submit ; nouvelle responsabilité autonome réintroduite dans la façade ou couplage anormal entre owners |
| `apps/web/src/app/docs/[...segments]/route.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver résolution anti-path-traversal, MIME, headers et contrat SEO ; nouvelle responsabilité autonome réintroduite dans la façade ou croissance substantielle d'un des owners extraits |
| `apps/web/src/lib/validation/action.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver l'owner unique des schémas create/update et l'ordre des validations ; nouvelle responsabilité indépendante réintroduite dans la façade ou couplage anormal entre sous-modules |
| `apps/web/src/lib/pdf-export/simple-pdf.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver octets PDF, format des lignes et PdfReportPayload ; nouvelle responsabilité substantielle réintroduite dans la façade ou couplage anormal entre sous-modules |
| `apps/web/src/lib/actions/pollution/current-place-state.ts` | DEFERRED_SPLIT | PRESENT — REVIEW | LATER | signaux complémentaires non mesurés | préserver le bucket de lieu et la distinction observation/projection ; ne pas créer une source de vérité commune ni séparer les étapes privées sans contrat indépendant ; évolution indépendante des modèles observed/projected_today ou du modèle de repollution |
| `apps/web/src/lib/actions/pollution/local-repollution-calibration.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver matching spatial, complétude, confiance et projections ; nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/lib/route/route-predicted-targets.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver budgets planner, audits et contrats API route ; nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/components/sections/rubriques/route/route-section.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver les textes, états async, origine carte, deep-links et CTA planner ; nouvelle responsabilité autonome réintroduite dans RouteSection ou couplage anormal entre owners |
| `apps/web/src/components/reports/web-document/reports-web-document.shared.tsx` | EXTRACTED_PURE_CONTRACT | NONE | CURRENT | signaux complémentaires non mesurés | préserver l'usage du renderer PDF commun et la compatibilité des snapshots historiques ; évolution indépendante des modules ou du contrat PDF |
| `apps/web/src/components/sections/rubriques/recycling-question-assistant/assistant-utils.ts` | COHESIVE_SINGLE_FILE | PRESENT — REVIEW | NONE | signaux complémentaires non mesurés | conserver réponses FR/EN et projection canonique Waste alignées ; famille de règles indépendante ou catalogue de contenu autonome démontré |
| `apps/web/src/lib/route/route-trace.ts` | COHESIVE_SINGLE_FILE | PRESENT — REVIEW | NONE | signaux complémentaires non mesurés | un seul owner du contrat RouteRecommendationTrace et de sa construction ; nouveau sous-contrat de trace consommé indépendamment du builder principal |
| `apps/web/src/components/accueil/accueil-community-credibility.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver fallback, contrat activity, accessibilité et façades exportées ; nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/lib/ui/button-theme.ts` | COHESIVE_SINGLE_FILE | PRESENT — REVIEW | NONE | signaux complémentaires non mesurés | owner canonique unique BackdropToneKey -> tokens CSS ; second système de thème ou familles de tokens réellement indépendantes |
| `apps/web/src/lib/supabase/storage-usage.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver pagination exhaustive, snapshots et classification canonique ; nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/components/actions/actions-history-list.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver AuthZ admin, review participation et états asynchrones ; nouvelle responsabilité autonome réintroduite dans la façade ou couplage anormal entre owners |
| `apps/web/src/components/actions/action-declaration/payload.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver FormState, géométrie finale, smart assist et payload create ; nouvelle responsabilité autonome réintroduite dans la façade ou divergence entre owners |
| `apps/web/src/lib/route/route-group-partition.ts` | COHESIVE_SINGLE_FILE | PRESENT — REVIEW | NONE | signaux complémentaires non mesurés | pipeline unique de partitionnement et métriques ; nouvelle stratégie de partition autonome ou nouveau contrat planner |
| `apps/web/src/lib/learning/quiz/quiz-quality-audit.ts` | COHESIVE_SINGLE_FILE | PRESENT — REVIEW | NONE | signaux complémentaires non mesurés | moteur unique de critères et rapport d'audit ; nouveau domaine de qualité indépendant |
| `apps/web/src/lib/environmental-impact-estimator/services/infrastructure.ts` | COHESIVE_SINGLE_FILE | PRESENT — REVIEW | NONE | signaux complémentaires non mesurés | owner unique de l'estimation infrastructure ; calculs internes au même modèle ; nouvelle famille de service réellement autonome ou API publique indépendante |
| `apps/web/src/components/actions/map/layers/actions-map-geometry.utils.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver les conventions de coordonnées, la provenance géométrique, les contrats render/presentation et l'absence de logique de normalisation/validation dupliquée ; nouvelle responsabilité autonome réintroduite dans le view-model ou dégradation démontrée des frontières entre domaine, validation, rendu et view-model |
| `apps/web/src/components/actions/action-declaration/before/sections.tsx` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver la façade d'exports, BaseSectionProps, validation, focus et updateField ; nouvelle responsabilité autonome réintroduite dans la façade ou couplage anormal entre owners |
| `apps/web/src/app/api/route/recommend/route.response.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver DTO, planner proof/snapshot, calibration et la façade `buildRouteRecommendationResponse` ; nouveau mode de réponse ou sous-contrat consommé indépendamment |
| `apps/web/src/lib/actions/participation/group-participation-review.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver AuthZ, ownership, idempotence, audit et ordre des mutations ; nouvelle responsabilité autonome réintroduite dans la façade ou divergence de contrat |
| `apps/web/src/lib/actions/pollution/corridor-history.ts` | EXTRACTED_PURE_CONTRACT | NONE | CURRENT | signaux complémentaires non mesurés | préserver les constantes géographiques, `CorridorPolyline`/`CorridorHistory`, les unités et l'ordre matching → historique → score ; ne pas créer de second owner du domaine Pollution ; nouveau mode de corridor, sous-modèle historique indépendant ou consommateur géométrique autonome |
| `apps/web/src/lib/actions/http.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver URL, méthode, payload et erreurs de chaque famille endpoint ; nouvelle famille de contrat réintroduite dans la façade ou divergence URL/méthode/payload |
| `apps/web/src/lib/geo/municipal-cleaning-serviceability.ts` | COHESIVE_SINGLE_FILE | PRESENT — REVIEW | NONE | signaux complémentaires non mesurés | owner unique du modèle de preuve/confiance/serviceabilité ; nouveau type de preuve autonome ou changement indépendant de matérialisation |
| `apps/web/src/app/api/chat/route.post.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | aucun ; la frontière serveur reste séparée du client et les contrats POST sont préservés ; nouvelle responsabilité autonome réintroduite dans la route ou opacification d'une décision AuthN/AuthZ |
| `apps/web/src/lib/impact/impact-terrain-2026.ts` | COHESIVE_SINGLE_FILE | PRESENT — REVIEW | NONE | signaux complémentaires non mesurés | owner canonique de la méthodologie scientifique versionnée ; nouvelle version méthodologique ou famille de calculs réellement indépendante |
| `apps/web/src/components/chat/discussion-guidance.ts` | COHESIVE_SINGLE_FILE | NONE | NONE | signaux complémentaires non mesurés | catalogue bilingue unique topics/canaux/guidance ; source de contenu externe ou catalogues par canal réellement autonomes |
| `apps/web/src/lib/actions/exports/export-form-media.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver IDs presets/bundles, textes, noms de fichiers, dimensions/formats et API publique ; nouvelle responsabilité substantielle réintroduite dans la façade ou couplage anormal entre sous-modules |
| `apps/web/src/app/api/reports/elus-dossier/route.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver AuthN/AuthZ, scope, cache, storage, headers et formats ; nouvelle responsabilité métier/stockage ajoutée directement au handler |
| `apps/web/src/components/sections/rubriques/weather-section.conditions.tsx` | COHESIVE_SINGLE_FILE | NONE | NONE | signaux complémentaires non mesurés | un seul ConditionsPanel et état météo fortement partagé ; éviter prop drilling ; nouvelle famille de conditions avec état/cycle de vie autonome |
| `apps/web/src/lib/pdf-export/official-report-html.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver échappement HTML, Markdown, tableaux, callouts et PdfReportPayload ; nouvelle responsabilité indépendante ajoutée au compositeur |
| `apps/web/src/lib/auth/sync.ts` | ALREADY_MODULARIZED | NONE | NONE | signaux complémentaires non mesurés | préserver scope utilisateur, service-role server-only, idempotence et ordre d'upsert ; nouvelle responsabilité autonome réintroduite dans la façade ou opacification AuthN/AuthZ |
| `apps/web/src/components/actions/action-creation-shell.tsx` | DEFERRED_SPLIT | NONE | AFTER_ACTIVE_CHANGES | signaux complémentaires non mesurés | préserver l'isolation par `actionId`, les transitions d'état et l'URL reprenable ; frontière indépendante et testée entre navigation/sections, état workflow et orchestration de persistance |
| `apps/web/src/components/actions/action-declaration/before/use-before-action-workflow.ts` | EXTRACTED_PURE_CONTRACT | NONE | CURRENT | signaux complémentaires non mesurés | préserver les modifications utilisateur, le premier identifiant persistant et la publication toujours explicite ; nouvelle responsabilité autonome réintroduite dans le workflow ou couplage qui compromet la reprise et la publication explicite |

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
| `apps/web/src/app/api/reports/generations/route.test.ts` | test | 913 | 34.7 KiB | 87 lignes / 15.3 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/components/admin/creator-inbox/use-creator-inbox.test.tsx` | test | 826 | 26.2 KiB | 174 lignes / 23.8 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/actions/store.test.ts` | test | 821 | 23.7 KiB | 179 lignes / 26.3 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/app/api/actions/[actionId]/group-join/route.post.test.ts` | test | 809 | 27.6 KiB | 191 lignes / 22.4 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/community/bug-report-screenshot.test.ts` | test | 752 | 27.2 KiB | 248 lignes / 22.8 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/app/api/route/recommend/route.response.test.ts` | test | 746 | 24.8 KiB | 254 lignes / 25.2 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/reports/report-generation-history-store.test.ts` | test | 739 | 28.1 KiB | 261 lignes / 21.9 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/components/reports/web-document/reports-web-document-preparation.test.ts` | test | 707 | 25.6 KiB | 293 lignes / 24.4 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/components/reports/web-document/reports-web-document.shared.test.ts` | test | 703 | 25.1 KiB | 297 lignes / 24.9 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/environmental-impact-estimator/project-signals.test.ts` | test | 688 | 21.8 KiB | 312 lignes / 28.2 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/app/api/actions/[actionId]/group-join/route.test.helpers.ts` | test | 687 | 27.0 KiB | 313 lignes / 23.0 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/components/actions/map/layers/map-layers.test.ts` | test | 649 | 18.9 KiB | 351 lignes / 31.1 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/app/(app)/reports/page.test.ts` | test | 642 | 25.0 KiB | 358 lignes / 25.0 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/app/api/spogomi/routes.behavior.test.ts` | test | 640 | 36.8 KiB | 360 lignes / 13.2 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/components/actions/map/layers/actions-map-geometry.utils.test.ts` | test | 622 | 18.7 KiB | 378 lignes / 31.3 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/actions/http.test.ts` | test | 603 | 19.3 KiB | 397 lignes / 30.7 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/governance/governance-monthly-report-store.ts` | runtime | 500 | 15.9 KiB | 0 lignes / 24.1 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/reports/report-generation-history-store.ts` | runtime | 499 | 16.1 KiB | 1 lignes / 23.9 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/actions/formalities-qualification.ts` | runtime | 498 | 17.2 KiB | 2 lignes / 22.8 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/actions/map/map-http.ts` | runtime | 496 | 15.6 KiB | 4 lignes / 24.4 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/auth/api-authorization-contract.actions.ts` | runtime | 494 | 25.2 KiB | 6 lignes / 14.8 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/actions/create-submission.ts` | runtime | 494 | 15.3 KiB | 6 lignes / 24.7 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/actions/pollution/repollution-prediction-evaluation.ts` | runtime | 493 | 15.5 KiB | 7 lignes / 24.5 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/weather/planner-weather.ts` | runtime | 492 | 18.1 KiB | 8 lignes / 21.9 KiB | signaux complémentaires non mesurés | NONE_RECORDED |
| `apps/web/src/lib/actions/action-media/action-media.ts` | runtime | 490 | 15.0 KiB | 10 lignes / 25.0 KiB | signaux complémentaires non mesurés | NONE_RECORDED |

### Radar architectural — top 25

| PATH | REF | LINES | BYTES | KIND | SIZE_SIGNAL | CORRELATIONS | DECISION |
| --- | --- | ---: | ---: | --- | --- | --- | --- |
| `apps/web/src/lib/actions/pollution/current-place-state.ts` | `e04c1b288221d017175b10cbfb9bfb78984f17b0` | 647 | 19737 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | DEFERRED_SPLIT |
| `apps/web/src/components/sections/rubriques/recycling-question-assistant/assistant-utils.ts` | `e04c1b288221d017175b10cbfb9bfb78984f17b0` | 613 | 24198 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | COHESIVE_SINGLE_FILE |
| `apps/web/src/lib/route/route-trace.ts` | `e04c1b288221d017175b10cbfb9bfb78984f17b0` | 605 | 20034 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | COHESIVE_SINGLE_FILE |
| `apps/web/src/lib/ui/button-theme.ts` | `e04c1b288221d017175b10cbfb9bfb78984f17b0` | 603 | 17967 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | COHESIVE_SINGLE_FILE |
| `apps/web/src/lib/route/route-group-partition.ts` | `e04c1b288221d017175b10cbfb9bfb78984f17b0` | 596 | 22351 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | COHESIVE_SINGLE_FILE |
| `apps/web/src/lib/learning/quiz/quiz-quality-audit.ts` | `e04c1b288221d017175b10cbfb9bfb78984f17b0` | 590 | 16820 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | COHESIVE_SINGLE_FILE |
| `apps/web/src/lib/environmental-impact-estimator/services/infrastructure.ts` | `e04c1b288221d017175b10cbfb9bfb78984f17b0` | 588 | 21807 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | COHESIVE_SINGLE_FILE |
| `apps/web/src/app/(app)/reports/page.tsx` | `e04c1b288221d017175b10cbfb9bfb78984f17b0` | 582 | 21733 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |
| `apps/web/src/lib/pdf-export/report-pdf-theme.ts` | `e04c1b288221d017175b10cbfb9bfb78984f17b0` | 573 | 14505 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |
| `apps/web/src/lib/geo/municipal-cleaning-serviceability.ts` | `e04c1b288221d017175b10cbfb9bfb78984f17b0` | 537 | 20096 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | COHESIVE_SINGLE_FILE |
| `apps/web/src/lib/impact/impact-terrain-2026.ts` | `e04c1b288221d017175b10cbfb9bfb78984f17b0` | 521 | 26764 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | COHESIVE_SINGLE_FILE |

### Tests volumineux — top 25

| PATH | REF | LINES | BYTES | KIND | SIZE_SIGNAL | CORRELATIONS | DECISION |
| --- | --- | ---: | ---: | --- | --- | --- | --- |
| `apps/web/src/app/api/admin/creator-inbox/route.test.ts` | `e04c1b288221d017175b10cbfb9bfb78984f17b0` | 1048 | 34351 | test | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |

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
apps/web/src, lus depuis la ref exacte affichée en tête. Pour régénérer un
snapshot courant, utiliser --ref=HEAD ; une ref ancienne est signalée
HISTORICAL_SNAPSHOT et ne peut pas être présentée comme courante.

Les décisions humaines sont lues depuis le registre canonique lié dans la
section E. REF, LINES, BYTES, KIND, SIZE_SIGNAL et les signaux automatiques
sont toujours régénérés depuis RADAR_REF ; ils ne sont jamais copiés depuis
le registre. Les snapshots historiques antérieurs à cette séparation peuvent
encore lire leur bloc humain intégré. refactor-priorities-plan.md renvoie vers
ce document sans recopier sa liste.
<!-- RADAR:GENERATED:END -->
