# Registre canonique des décisions de modularisation

Ce registre est la source humaine canonique. Le radar `monolith-split-plan.md` est généré séparément à partir des mesures du dépôt et de ce registre. Les décisions acquises sont conservées même après modularisation afin de préserver les invariants, contrats et déclencheurs de revue.

Les quatre champs décisionnels (`ARCHITECTURE_DECISION`, `PRIORITY`, `DEPENDENCY_OR_BLOCKER`, `NEXT_TRIGGER`) sont portés **uniquement** par le tableau récapitulatif ; chaque fiche détaillée conserve les huit champs complémentaires. Cette représentation ne modifie aucune décision.

Le classement décisionnel informatif du `quality-index` peut afficher ces
décisions comme preuve de prudence, mais ne les remplace ni ne les réécrit.
Une fiche `COHESIVE_SINGLE_FILE` ou `DEFERRED_SPLIT` conserve son owner et son
`NEXT_TRIGGER` : le triage peut recommander `REVIEW_FIRST`, jamais une scission
automatique fondée sur la taille, la complexité ou une ressemblance textuelle.

<!-- RADAR:HUMAN_DECISIONS:BEGIN -->
| PATH | ARCHITECTURE_DECISION | PRIORITY | DEPENDENCY_OR_BLOCKER | NEXT_TRIGGER |
| --- | --- | --- | --- | --- |
| `apps/web/src/lib/partners/onboarding-requests-store.ts` | ALREADY_MODULARIZED | NONE | préserver les normalisations fail-closed, l'idempotence et les chemins Supabase/fichier | nouveau contrat de persistance ou de normalisation consommé indépendamment |
| `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts` | ALREADY_MODULARIZED | NONE | préserver la persistance, les fallbacks et les contrats de snapshots hebdomadaires | nouveau contrat de projection mensuelle ou de stockage indépendant |
| `apps/web/src/lib/actions/map/map-http.ts` | ALREADY_MODULARIZED | NONE | préserver le fast path HTTP, le fallback Supabase, les scopes et les contrats géométriques | nouvelle source cartographique ou projection autonome |
| `apps/web/src/lib/learning/quiz/quiz-bank-admin.ts` | ALREADY_MODULARIZED | NONE | préserver les contrats de filtrage et la façade publique du snapshot d'administration | nouveau consommateur indépendant du rapport d'audit ou du catalogue |
| `apps/web/src/components/admin/admin-dashboard-ui.tsx` | ALREADY_MODULARIZED | NONE | préserver les exports UI, les tokens visuels et les contrats des cartes admin | nouvelle famille de panneau autonome ou état propre réintroduit dans la façade |
| `apps/web/src/components/sections/rubriques/partners-network-directory.tsx` | ALREADY_MODULARIZED | NONE | préserver le contrat de l'annuaire, les filtres et les résultats | nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/components/chat/chat-shell.tsx` | ALREADY_MODULARIZED | NONE | aucun ; les frontières client restent séparées et les effets existants sont préservés | nouvelle responsabilité autonome réintroduite dans la façade ou couplage anormal entre owners |
| `apps/web/src/components/chat/ui/chat-message-item.tsx` | ALREADY_MODULARIZED | NONE | préserver le rendu des messages, les votes, les pièces jointes sûres et les références d’action | nouveau type de message ou cycle de rendu autonome consommé hors de la façade |
| `apps/web/src/components/sections/rubriques/community/action-needs-panel.tsx` | COHESIVE_SINGLE_FILE | AFTER_ACTIVE_CHANGES | préserver les mutations de besoins, le scope des actions publiques et les formulaires manager | nouveau contrat de formulaire ou de persistance consommé indépendamment |
| `apps/web/src/components/sections/rubriques/elus-section.tsx` | ALREADY_MODULARIZED | NONE | conserver l'orchestration overview/navigation/panels | nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/components/account/greater-paris-select.tsx` | ALREADY_MODULARIZED | NONE | préserver les façades et owners suggestions/controls/shell | nouveau contrat géographique autonome |
| `apps/web/src/components/sections/rubriques/feedback-section-dashboard.tsx` | ALREADY_MODULARIZED | NONE | préserver le contrôleur, les états de soumission et les sous-vues | nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/lib/community/bug-report-screenshot.ts` | ALREADY_MODULARIZED | NONE | préserver la vérification du contenu, l'ownership, les états d'upload et la suppression sans fuite de chemin privé | nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/lib/community/bug-reports-store.ts` | ALREADY_MODULARIZED | NONE | préserver les filtres owner, les curseurs, l'échec fermé des RPC et l'absence de nettoyage de captures hors contrat | nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/components/sections/rubriques/feedback/questionnaire-card.tsx` | ALREADY_MODULARIZED | NONE | préserver les textes, le honeypot, les validations, le comportement Clerk et la révocation des prévisualisations | nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/app/learn/ressources/learn-ressources-client.data.ts` | COHESIVE_SINGLE_FILE | NONE | aucun | ajout d'une famille de données indépendante ou changement du contrat de catalogue |
| `apps/web/src/components/sections/rubriques/methodologie-page-client.tsx` | COHESIVE_SINGLE_FILE | NONE | préserver les deux exports publics | ajout d'une nouvelle famille de méthodologie ou rupture du contrat legacy |
| `apps/web/src/components/sections/rubriques/free-plan-services-methodology-visual.impact.tsx` | ALREADY_MODULARIZED | NONE | aucun | nouvelle responsabilité métier ajoutée à la façade |
| `apps/web/src/components/actions/action-declaration/hooks/use-action-declaration-form.ts` | ALREADY_MODULARIZED | NONE | préserver l'API publique du hook et les contrats draft, géométrie, validation, payload et submit | nouvelle responsabilité autonome réintroduite dans la façade ou couplage anormal entre owners |
| `apps/web/src/app/docs/[...segments]/route.ts` | ALREADY_MODULARIZED | NONE | préserver résolution anti-path-traversal, MIME, headers et contrat SEO | nouvelle responsabilité autonome réintroduite dans la façade ou croissance substantielle d'un des owners extraits |
| `apps/web/src/lib/validation/action.ts` | ALREADY_MODULARIZED | NONE | préserver l'owner unique des schémas create/update et l'ordre des validations | nouvelle responsabilité indépendante réintroduite dans la façade ou couplage anormal entre sous-modules |
| `apps/web/src/lib/pdf-export/simple-pdf.ts` | ALREADY_MODULARIZED | NONE | préserver octets PDF, format des lignes et PdfReportPayload | nouvelle responsabilité substantielle réintroduite dans la façade ou couplage anormal entre sous-modules |
| `apps/web/src/lib/actions/pollution/current-place-state.ts` | DEFERRED_SPLIT | LATER | préserver le bucket de lieu et la distinction observation/projection ; ne pas créer une source de vérité commune ni séparer les étapes privées sans contrat indépendant | évolution indépendante des modèles observed/projected_today ou du modèle de repollution |
| `apps/web/src/lib/actions/pollution/local-repollution-calibration.ts` | ALREADY_MODULARIZED | NONE | préserver matching spatial, complétude, confiance et projections | nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/lib/route/route-predicted-targets.ts` | ALREADY_MODULARIZED | NONE | préserver budgets planner, audits et contrats API route | nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/components/sections/rubriques/route/route-section.tsx` | ALREADY_MODULARIZED | NONE | préserver les textes, états async, origine carte, deep-links et CTA planner | nouvelle responsabilité autonome réintroduite dans RouteSection ou couplage anormal entre owners |
| `apps/web/src/components/reports/web-document/reports-web-document.shared.tsx` | EXTRACTED_PURE_CONTRACT | CURRENT | préserver l'usage du renderer PDF commun et la compatibilité des snapshots historiques | évolution indépendante des modules ou du contrat PDF |
| `apps/web/src/app/(app)/reports/page.tsx` | ALREADY_MODULARIZED | NONE | préserver la frontière App Router serveur, les contrôles AuthN/AuthZ et les contrats de reprise/génération | nouvelle responsabilité serveur autonome réintroduite dans la page ou déplacement d'un contrôle d'accès vers le client |
| `apps/web/src/lib/pdf-export/report-pdf-theme.ts` | ALREADY_MODULARIZED | NONE | préserver `buildOfficialReportCss`, l'ordre exact des familles CSS et les sorties PDF existantes | nouvelle famille de règles CSS indépendante ou logique de tokens réintroduite dans la façade |
| `apps/web/src/components/sections/rubriques/recycling-question-assistant/assistant-utils.ts` | COHESIVE_SINGLE_FILE | NONE | conserver réponses FR/EN et projection canonique Waste alignées | famille de règles indépendante ou catalogue de contenu autonome démontré |
| `apps/web/src/lib/route/route-trace.ts` | COHESIVE_SINGLE_FILE | NONE | un seul owner du contrat RouteRecommendationTrace et de sa construction | nouveau sous-contrat de trace consommé indépendamment du builder principal |
| `apps/web/src/components/accueil/accueil-community-credibility.tsx` | ALREADY_MODULARIZED | NONE | préserver fallback, contrat activity, accessibilité et façades exportées | nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/lib/ui/button-theme.ts` | COHESIVE_SINGLE_FILE | NONE | owner canonique unique BackdropToneKey -> tokens CSS | second système de thème ou familles de tokens réellement indépendantes |
| `apps/web/src/lib/supabase/storage-usage.ts` | ALREADY_MODULARIZED | NONE | préserver pagination exhaustive, snapshots et classification canonique | nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/components/actions/actions-history-list.tsx` | ALREADY_MODULARIZED | NONE | préserver AuthZ admin, review participation et états asynchrones | nouvelle responsabilité autonome réintroduite dans la façade ou couplage anormal entre owners |
| `apps/web/src/components/actions/action-declaration/payload.ts` | ALREADY_MODULARIZED | NONE | préserver FormState, géométrie finale, smart assist et payload create | nouvelle responsabilité autonome réintroduite dans la façade ou divergence entre owners |
| `apps/web/src/lib/route/route-group-partition.ts` | COHESIVE_SINGLE_FILE | NONE | pipeline unique de partitionnement et métriques | nouvelle stratégie de partition autonome ou nouveau contrat planner |
| `apps/web/src/lib/learning/quiz/quiz-quality-audit.ts` | COHESIVE_SINGLE_FILE | NONE | moteur unique de critères et rapport d'audit | nouveau domaine de qualité indépendant |
| `apps/web/src/lib/environmental-impact-estimator/services/infrastructure.ts` | COHESIVE_SINGLE_FILE | NONE | owner unique de l'estimation infrastructure ; calculs internes au même modèle | nouvelle famille de service réellement autonome ou API publique indépendante |
| `apps/web/src/components/actions/map/layers/actions-map-geometry.utils.ts` | ALREADY_MODULARIZED | NONE | préserver les conventions de coordonnées, la provenance géométrique, les contrats render/presentation et l'absence de logique de normalisation/validation dupliquée | nouvelle responsabilité autonome réintroduite dans le view-model ou dégradation démontrée des frontières entre domaine, validation, rendu et view-model |
| `apps/web/src/components/actions/action-declaration/before/sections.tsx` | ALREADY_MODULARIZED | NONE | préserver la façade d'exports, BaseSectionProps, validation, focus et updateField | nouvelle responsabilité autonome réintroduite dans la façade ou couplage anormal entre owners |
| `apps/web/src/app/api/route/recommend/route.response.ts` | ALREADY_MODULARIZED | NONE | préserver DTO, planner proof/snapshot, calibration et la façade `buildRouteRecommendationResponse` | nouveau mode de réponse ou sous-contrat consommé indépendamment |
| `apps/web/src/lib/actions/participation/group-participation-review.ts` | ALREADY_MODULARIZED | NONE | préserver AuthZ, ownership, idempotence, audit et ordre des mutations | nouvelle responsabilité autonome réintroduite dans la façade ou divergence de contrat |
| `apps/web/src/lib/actions/pollution/corridor-history.ts` | EXTRACTED_PURE_CONTRACT | CURRENT | préserver les constantes géographiques, `CorridorPolyline`/`CorridorHistory`, les unités et l'ordre matching → historique → score ; ne pas créer de second owner du domaine Pollution | nouveau mode de corridor, sous-modèle historique indépendant ou consommateur géométrique autonome |
| `apps/web/src/lib/actions/http.ts` | ALREADY_MODULARIZED | NONE | préserver URL, méthode, payload et erreurs de chaque famille endpoint | nouvelle famille de contrat réintroduite dans la façade ou divergence URL/méthode/payload |
| `apps/web/src/lib/geo/municipal-cleaning-serviceability.ts` | COHESIVE_SINGLE_FILE | NONE | owner unique du modèle de preuve/confiance/serviceabilité | nouveau type de preuve autonome ou changement indépendant de matérialisation |
| `apps/web/src/app/api/chat/route.post.ts` | ALREADY_MODULARIZED | NONE | aucun ; la frontière serveur reste séparée du client et les contrats POST sont préservés | nouvelle responsabilité autonome réintroduite dans la route ou opacification d'une décision AuthN/AuthZ |
| `apps/web/src/lib/impact/impact-terrain-2026.ts` | COHESIVE_SINGLE_FILE | NONE | owner canonique de la méthodologie scientifique versionnée | nouvelle version méthodologique ou famille de calculs réellement indépendante |
| `apps/web/src/components/chat/discussion-guidance.ts` | COHESIVE_SINGLE_FILE | NONE | catalogue bilingue unique topics/canaux/guidance | source de contenu externe ou catalogues par canal réellement autonomes |
| `apps/web/src/lib/actions/exports/export-form-media.ts` | ALREADY_MODULARIZED | NONE | préserver IDs presets/bundles, textes, noms de fichiers, dimensions/formats et API publique | nouvelle responsabilité substantielle réintroduite dans la façade ou couplage anormal entre sous-modules |
| `apps/web/src/app/api/reports/elus-dossier/route.ts` | ALREADY_MODULARIZED | NONE | préserver AuthN/AuthZ, scope, cache, storage, headers et formats | nouvelle responsabilité métier/stockage ajoutée directement au handler |
| `apps/web/src/components/sections/rubriques/weather-section.conditions.tsx` | COHESIVE_SINGLE_FILE | NONE | un seul ConditionsPanel et état météo fortement partagé ; éviter prop drilling | nouvelle famille de conditions avec état/cycle de vie autonome |
| `apps/web/src/lib/pdf-export/official-report-html.ts` | ALREADY_MODULARIZED | NONE | préserver échappement HTML, Markdown, tableaux, callouts et PdfReportPayload | nouvelle responsabilité indépendante ajoutée au compositeur |
| `apps/web/src/lib/auth/sync.ts` | ALREADY_MODULARIZED | NONE | préserver scope utilisateur, service-role server-only, idempotence et ordre d'upsert | nouvelle responsabilité autonome réintroduite dans la façade ou opacification AuthN/AuthZ |
| `apps/web/src/components/actions/action-creation-shell.tsx` | DEFERRED_SPLIT | AFTER_ACTIVE_CHANGES | préserver l'isolation par `actionId`, les transitions d'état et l'URL reprenable | frontière indépendante et testée entre navigation/sections, état workflow et orchestration de persistance |
| `apps/web/src/components/actions/action-declaration/before/use-before-action-workflow.ts` | EXTRACTED_PURE_CONTRACT | CURRENT | préserver les modifications utilisateur, le premier identifiant persistant et la publication toujours explicite | nouvelle responsabilité autonome réintroduite dans le workflow ou couplage qui compromet la reprise et la publication explicite |
| `apps/web/src/lib/spogomi/preparation-service.ts` | COHESIVE_SINGLE_FILE | NONE | préserver les contrats d'import de roster et de composition, les verrous de reprise et les RPC transactionnelles | nouveau consommateur indépendant d'import ou de composition, ou persistance d'un des deux workflows déplacée vers un owner dédié |
| `apps/web/src/lib/reports/report-generation-history-store.ts` | COHESIVE_SINGLE_FILE | NONE | préserver la cohérence snapshot/métadonnées, l'ownership Clerk et les résolutions direct/derived | nouveau contrat de lecture ou de persistance indépendant, ou divergence entre historique et snapshot |
| `apps/web/src/app/api/api-boundary.test.ts` | ALREADY_MODULARIZED | NONE | conserver les assertions d'inventaire, d'assemblage et de contrat d'autorisation sans importer une suite de tests | nouvelle famille de contrat d'inventaire ou nouvelle dépendance de parcours HTTP indépendante |
| `apps/web/src/app/api/api-boundary-analysis.ts` | ALREADY_MODULARIZED | NONE | conserver les primitives d'inventaire et d'extraction des méthodes comme owner partagé, sans absorber l'analyse d'évidence | nouvelle analyse de parcours ou de méthodes qui ne relève plus de l'inventaire partagé |
| `apps/web/src/app/api/api-boundary-evidence-analysis.ts` | ALREADY_MODULARIZED | NONE | conserver l'owner neutre de résolution des imports, analyse AST, délégations et preuves d'invocation | nouvelle famille de preuve ou dépendance aux déclarations Vitest dans l'analyseur |
| `apps/web/src/app/api/reports/generations/route.test.ts` | ALREADY_MODULARIZED | NONE | préserver l'ordre AuthN → quota → source → persistance et les assertions d'incertitude | nouveau flux de rapport indépendant ou fixture qui porte un contrat métier autonome |
| `apps/web/src/app/api/reports/generations/route.test.helpers.ts` | ALREADY_MODULARIZED | NONE | préserver les mocks de frontières et les defaults par méthode | nouveau owner de mock ou nouvelle frontière de route indépendante |
| `apps/web/src/app/api/reports/generations/route.get.test.ts` | ALREADY_MODULARIZED | NONE | préserver l'ownership, les filtres et l'absence d'accès quota en lecture | nouvelle famille de lecture historique indépendante |
| `apps/web/src/app/api/reports/generations/route.persistence.test.ts` | ALREADY_MODULARIZED | NONE | préserver la reprise d'insertion, l'audit et la conservation du quota | nouveau contrat de persistance non partagé avec POST |
| `apps/web/src/app/api/actions/[actionId]/group-join/route.post.test.ts` | ALREADY_MODULARIZED | NONE | préserver la modération admin et les mutations ordinaires de participation | nouveau flux POST indépendant des décisions de modération |
| `apps/web/src/app/api/actions/[actionId]/group-join/route.post-action-claims.test.ts` | ALREADY_MODULARIZED | NONE | préserver l'ownership, l'idempotence et la séparation des revendications post-action | nouveau type de revendication ou changement de frontière d'autorisation |
| `apps/web/src/lib/auth/api-authorization-contract.actions.ts` | ALREADY_MODULARIZED | NONE | conserver une seule façade d'assemblage et les clés sans collision | nouveau domaine d'autorisation indépendant consommé hors de la façade actions |
| `apps/web/src/lib/spogomi/results-projection.ts` | ALREADY_MODULARIZED | NONE | préserver la façade projection/export et la validation publique fail-closed | nouveau contrat de projection ou parser public consommé indépendamment |
| `apps/web/src/lib/actions/signalement/signalement-media.ts` | ALREADY_MODULARIZED | NONE | préserver AuthZ, validation média, états d'upload et contrats de stockage | nouveau workflow média indépendant ou divergence entre validation et persistance |
| `apps/web/src/lib/route/route-operational.ts` | COHESIVE_SINGLE_FILE | NONE | préserver la provenance planner/manual, les zones, les boucles et la compatibilité des routes historiques | nouveau contrat public de normalisation/validation ou consommateur indépendant de projection |
| `apps/web/src/lib/actions/action-buddy.ts` | COHESIVE_SINGLE_FILE | NONE | préserver l'AuthZ d'action, l'idempotence, les transitions de demande/proposition et la résolution de contact | nouveau backend de buddy, contrat de lecture indépendant ou persistance séparée des mutations |
| `apps/web/src/components/actions/action-drawing-map.tsx` | ALREADY_MODULARIZED | NONE | préserver la frontière client Leaflet, la provenance manual/routed, l'undo et l'accessibilité des contrôles | nouvelle responsabilité autonome de cycle de vie Leaflet ou de rendu hors de la façade |
| `apps/web/src/lib/actions/volunteer-participation-research.ts` | COHESIVE_SINGLE_FILE | NONE | conserver le caractère RESEARCH / NON NORMATIF, les modèles A/B/C et la formule CURRENT séparée | nouveau modèle expérimental, source de référence ou contrat de simulation indépendant |
| `apps/web/src/lib/actions/formalities-workflow.ts` | COHESIVE_SINGLE_FILE | NONE | préserver le fingerprint canonique, l'invalidation par dépendance et le blocage de publication | nouvelle famille de formalités, persistance ou qualification consommée indépendamment |

### Décisions établies — grille détaillée

#### `apps/web/src/lib/spogomi/preparation-service.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | import de roster (aperçu, réservation idempotente, claim de lease et confirmation) et composition d'équipes (aperçu déterministe, validation de proposition et confirmation RPC) |
| PUBLIC_CONTRACTS | `previewRosterImportChanges`, `confirmRosterImport`, `previewSpogomiTeams`, `confirmSpogomiTeams`, `autoComposeTeams`, `hashRosterPreview`, types `EventRow` et `SpogomiTeamCompositionPreview` |
| SIDE_EFFECTS | persistance Supabase des imports/participants, lecture des participants/équipes et RPC de confirmation de composition ; les leases et révisions protègent la reprise et la concurrence |
| MAIN_CONSUMERS | routes API Spogomi d'import, d'auto-composition et de confirmation ; services organisateur/résultat ; workspace de préparation et tests d'import/composition |
| TEST_BOUNDARY | `preparation-service.import.test.ts`, `preparation-service.update.test.ts`, contrats de routes Spogomi et tests de persistance associés |
| COUPLING | les deux workflows partagent `EventRow`, la sélection de division, les contrôles d'éligibilité et les invariants de préparation ; leurs écritures restent séparées par `spogomi_roster_imports`/participants et `spogomi_confirm_team_composition*` |
| NATURAL_EXTRACTION_BOUNDARY | import roster d'un côté ; lecture/formation/confirmation de composition de l'autre ; extraction ultérieure seulement si un consommateur ou contrat de persistance devient indépendant |
| RATIONALE | le fichier est une façade de préparation Spogomi cohésive qui compose deux parcours avec des garanties communes d'événement, division, idempotence et révision. Les helpers de création, accès événement, GPX et mutation de composition sont déjà leurs owners. Une extraction immédiate du seul volume créerait une seconde façade sans réduire le couplage partagé ; la décision CURRENT est donc de conserver ce owner et de déclencher une extraction sur un contrat indépendant démontré |

#### `apps/web/src/lib/reports/report-generation-history-store.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | lecture paginée de l'historique et snapshot owner-scoped ; validation de cohérence ; persistance directe et dérivée ; résolution explicite `not_persisted`/`persisted`/`uncertain` |
| PUBLIC_CONTRACTS | `listReportGenerationHistory`, `listReportGenerationHistoryPage`, `getReportGenerationSnapshotById`, `persistReportGeneration`, `persistDerivedReportGeneration`, résolutions de persistance et `ReportGenerationSnapshotRecord` |
| SIDE_EFFECTS | accès Supabase admin borné par `created_by_clerk_id`, insertion des snapshots et projection facultative des statuts de publication ; aucune écriture hors de la table d'historique et des contrats de publication appelés |
| MAIN_CONSUMERS | routes `/api/reports/generations`, reprise historique, publication/partage/PDF, loaders de la page Reports et exports scientifiques/CSV |
| TEST_BOUNDARY | `report-generation-history-store.test.ts`, tests de routes generations, reprise historique, publication et exports scientifiques |
| COUPLING | métadonnées et snapshot doivent rester cohérents avec le payload versionné ; les chemins direct et derived partagent la même lecture owner-scoped et les mêmes invariants de génération |
| NATURAL_EXTRACTION_BOUNDARY | lecture/pagination, validation snapshot et persistance sont des seams techniques identifiables, mais pas des contrats publics indépendants aujourd'hui ; toute extraction doit conserver l'identité de génération et le contrôle owner |
| RATIONALE | le store est l'owner canonique de l'historique : séparer artificiellement lecture, validation et persistance risquerait de dupliquer `ReportGenerationSnapshotRecord`, les sélecteurs et les contrôles de cohérence. La décision CURRENT justifie le REVIEW tant que les consommateurs utilisent le même contrat et les mêmes frontières de persistance ; un nouveau backend ou contrat de lecture indépendant déclenchera une extraction ciblée |

#### `apps/web/src/components/sections/rubriques/partners-network-directory.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | catalogue partenaires, recherche locale, rendu de la rubrique |
| PUBLIC_CONTRACTS | props `fr`, contrat de section et contact public |
| SIDE_EFFECTS | lecture de la configuration de contact |
| MAIN_CONSUMERS | registre des rubriques et rendu de page |
| TEST_BOUNDARY | composants de rubrique et helpers de recherche |
| COUPLING | données de partenaires + présentation + interaction |
| NATURAL_EXTRACTION_BOUNDARY | directory/query, filtres, résultats, aside éditorial et shell |
| RATIONALE | le shell conserve le contrat public tandis que l'interaction de recherche, les résultats et l'aside éditorial ont des owners explicites |

#### `apps/web/src/components/chat/chat-shell.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | contexte public/privé, sélection de canal, recherche, thread, composer, profil |
| PUBLIC_CONTRACTS | `ChatShellProps`, navigation mobile et contrats des hooks chat |
| SIDE_EFFECTS | synchronisation URL, mutations de message/profil et rafraîchissement inbox |
| MAIN_CONSUMERS | surfaces de messagerie et partage d'action |
| TEST_BOUNDARY | hooks chat, actions de message, rendu des modes |
| COUPLING | élevé entre mode, canal actif, destinataire et affichage mobile |
| NATURAL_EXTRACTION_BOUNDARY | contrôleur de contexte, sélection/navigation, thread/composer |
| RATIONALE | contexte/données, navigation, sélection/vue et thread/composer ont des owners explicites ; la façade conserve l'API publique et orchestre le layout |

#### `apps/web/src/components/sections/rubriques/elus-section.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | chargement du pilotage, états d'erreur, promotion et rendu |
| PUBLIC_CONTRACTS | export de section et contrat de réponse overview |
| SIDE_EFFECTS | requête HTTP `no-store` vers l'overview |
| MAIN_CONSUMERS | rubrique élus et surfaces de pilotage |
| TEST_BOUNDARY | fetch/error states et composants d'accès |
| COUPLING | provider de données, AuthZ d'affichage et présentation |
| NATURAL_EXTRACTION_BOUNDARY | hook/loader overview puis présentation et CTA |
| RATIONALE | le hook/loader overview, la navigation, les panels et les états sont déjà des owners explicites composés par une façade cohésive |

#### `apps/web/src/components/account/greater-paris-select.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | suggestions, état de sélection et rendu du contrôle Account |
| PUBLIC_CONTRACTS | `TerritoryLocationSelection`, `GreaterParisSelect` et façades exportées |
| SIDE_EFFECTS | consultation du provider d'adresses pour les suggestions |
| MAIN_CONSUMERS | formulaires de localisation Account |
| TEST_BOUNDARY | composant Account et module pur `lib/geo/greater-paris-location.ts` |
| COUPLING | types géographiques, recherche d'adresse et UX de sélection |
| NATURAL_EXTRACTION_BOUNDARY | normalisations territoriales dans `lib/geo/greater-paris-location.ts` ; interaction dans ce composant |
| RATIONALE | les suggestions, contrôles, shell et transformations territoriales ont déjà des owners explicites ; la façade publique reste stable |

#### `apps/web/src/components/sections/rubriques/feedback-section-dashboard.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | mode dashboard, formulaire, préremplissage, tracker et soumission |
| PUBLIC_CONTRACTS | props de section et contrat de feedback |
| SIDE_EFFECTS | soumission de feedback et mesure du temps de formulaire |
| MAIN_CONSUMERS | dashboard et flux de support |
| TEST_BOUNDARY | tracker, validation du message et mutation de feedback |
| COUPLING | état local, préremplissage métier et feedback asynchrone |
| NATURAL_EXTRACTION_BOUNDARY | formulaire contrôlé, tracker et shell de mode |
| RATIONALE | le contrôleur porte le cycle de vie réseau/soumission et les sous-vues portent formulaire, suivi, guidance et états sans déplacer le contrat public |

#### `apps/web/src/lib/community/bug-report-screenshot.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | façade des opérations de capture, validation du contrat image, cycle upload/finalisation et nettoyage des objets |
| PUBLIC_CONTRACTS | exports de validation, erreur typée, intention d'upload, lecture, suppression, finalisation et nettoyage |
| SIDE_EFFECTS | requêtes Supabase, objets Storage privés, contrôle owner/admin et nettoyage conditionnel des métadonnées |
| MAIN_CONSUMERS | routes API de capture, suppression des signalements et tests de sécurité Storage |
| TEST_BOUNDARY | `bug-report-screenshot.test.ts`, routes API de capture et contrats de stockage |
| COUPLING | séquences d'état pending/ready/failed, vérification MIME/taille et autorisation owner/admin |
| NATURAL_EXTRACTION_BOUNDARY | validation/paths purs, primitives Storage/row mapping et façade d'orchestration lifecycle |
| RATIONALE | la validation et les primitives de stockage sont désormais des owners cohésifs ; la façade conserve les séquences d'autorisation, de claim, de vérification et de nettoyage sans déplacer intacte une orchestration |

#### `apps/web/src/lib/community/bug-reports-store.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | façade des mutations/lectures feedback, qualification et suivi transactionnels, historique personnel et métriques |
| PUBLIC_CONTRACTS | types feedback, curseurs d'historique, CRUD, qualification, suivi et métriques consommés par API/admin/UI |
| SIDE_EFFECTS | persistance locale de compatibilité, Supabase, RPC transactionnelles et suppression des captures liées |
| MAIN_CONSUMERS | routes feedback et admin, creator inbox, historique personnel et tests de persistance |
| TEST_BOUNDARY | `bug-reports-store.test.ts`, routes feedback/admin et loader creator inbox |
| COUPLING | mapping snake_case/camelCase, pagination owner-scoped, transitions de statut et RPC de décision |
| NATURAL_EXTRACTION_BOUNDARY | contrats/pagination, normalisation/mapping, adaptateur de persistance, métriques et façade des workflows |
| RATIONALE | les contrats, la normalisation, la persistance et les métriques ont des owners séparés ; la façade conserve les mutations publiques et l'ordre des effets sans seconde source de vérité |

#### `apps/web/src/components/sections/rubriques/feedback/questionnaire-card.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | contrôleur du questionnaire, état de soumission, similarité personnelle, dictée et composition des sous-vues |
| PUBLIC_CONTRACTS | props `QuestionnaireCard`, questionnaire/config, redirection Clerk et parcours de feedback |
| SIDE_EFFECTS | Clerk, chargement de l'historique personnel, soumission feedback, URLs de prévisualisation et upload optionnel |
| MAIN_CONSUMERS | section Feedback et discussion, tests du questionnaire et navigation de section |
| TEST_BOUNDARY | `questionnaire-card.test.tsx`, tests navigation, soumission et sécurité capture |
| COUPLING | état contrôlé du formulaire, reconnaissance vocale, suggestion de doublon, capture facultative et états success/error |
| NATURAL_EXTRACTION_BOUNDARY | champs/voix, notice de reconnaissance, contrôle capture et état de soumission, composés par la façade |
| RATIONALE | les responsabilités de rendu autonomes sont extraites en sous-composants ; la façade garde l'état partagé, les callbacks et l'ordre de soumission pour conserver le parcours UI |

#### `apps/web/src/app/learn/ressources/learn-ressources-client.data.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | types et jeux de données localisés du catalogue de ressources |
| PUBLIC_CONTRACTS | constantes importées par le client Learn Ressources |
| SIDE_EFFECTS | aucun |
| MAIN_CONSUMERS | page et composants Learn Ressources |
| TEST_BOUNDARY | tests de données/localisation au niveau du catalogue |
| COUPLING | cohésion forte autour du même catalogue |
| NATURAL_EXTRACTION_BOUNDARY | aucune frontière démontrée ; des sous-fichiers ajouteraient du couplage |
| RATIONALE | fichier data/config cohésif ; la taille reste un signal de lisibilité, pas une raison de disperser le catalogue |

#### `apps/web/src/components/sections/rubriques/methodologie-page-client.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | cartes méthodologiques, rendu de page et façade legacy |
| PUBLIC_CONTRACTS | exports `ActionMapMethodologySection` et `LegacyMethodologieContent` |
| SIDE_EFFECTS | aucun effet externe identifié |
| MAIN_CONSUMERS | routes/pages méthodologie et compatibilité historique |
| TEST_BOUNDARY | rendu de page et contrat de compatibilité |
| COUPLING | données méthodologiques et présentation volontairement liées |
| NATURAL_EXTRACTION_BOUNDARY | pas de frontière indépendante démontrée actuellement |
| RATIONALE | cohésion de page et façades historiques justifient le fichier unique tant qu'aucun nouveau sous-flux n'est ajouté |

#### `apps/web/src/components/sections/rubriques/free-plan-services-methodology-visual.impact.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | façade visuelle de l'impact des services free plan |
| PUBLIC_CONTRACTS | props d'impact et contrat de rendu |
| SIDE_EFFECTS | aucun |
| MAIN_CONSUMERS | page méthodologie et visualisation d'impact |
| TEST_BOUNDARY | sous-composants/formatters d'impact existants |
| COUPLING | contrat visuel déjà réparti autour de la façade |
| NATURAL_EXTRACTION_BOUNDARY | extraction déjà matérialisée par les modules consommés |
| RATIONALE | la taille résiduelle ne correspond plus à un monolithe architectural ; ne pas refactorer mécaniquement |

#### `apps/web/src/components/actions/action-declaration/hooks/use-action-declaration-form.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | façade d'orchestration du draft/lifecycle, géométrie-validation, média et submit |
| PUBLIC_CONTRACTS | API du hook consommée par le formulaire de déclaration |
| SIDE_EFFECTS | synchronisation de draft et événements de parcours |
| MAIN_CONSUMERS | `action-declaration-form.tsx` et étapes de déclaration |
| TEST_BOUNDARY | validation pure, résolution de géométrie et orchestration du hook |
| COUPLING | élevé entre état du formulaire, carte, route preview et payload serveur |
| NATURAL_EXTRACTION_BOUNDARY | owners séparés pour lifecycle/draft, géométrie, média, updates et execution ; la façade conserve l'API publique |
| RATIONALE | l'orchestration est désormais cohésive et les responsabilités autonomes ont des owners dédiés ; ne pas recréer de hooks artificiels |

#### `apps/web/src/app/docs/[...segments]/route.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | résolution sûre des chemins documentaires, lecture Markdown/images/texte, rendu Markdown vers HTML, viewer HTML/CSS et réponse HTTP |
| PUBLIC_CONTRACTS | `GET`, `runtime=nodejs`, registre public de documentation et headers MIME/cache/noindex |
| SIDE_EFFECTS | lectures filesystem via `readFile`; aucune mutation réseau ou base de données |
| MAIN_CONSUMERS | route HTTP publique, tests `route.test.ts`, registre documentaire et `route-seo` |
| TEST_BOUNDARY | `route.test.ts`, tests du registre documentaire et routes documentation consommatrices |
| COUPLING | couplage interne entre parsing Markdown, rendu HTML et transport de fichiers ; couplage externe limité au registre et SEO |
| NATURAL_EXTRACTION_BOUNDARY | moteur Markdown, viewer HTML/CSS, adaptateur lecture/réponse fichier |
| RATIONALE | façade HTTP courte ; Markdown appartient à route-markdown.ts, viewer HTML/CSS à route-viewer.ts et lecture/adaptation documentaire à route-document.ts ; GET, registre public, anti-path-traversal, MIME/cache/noindex et orchestration HTTP restent dans route.ts |

#### `apps/web/src/lib/validation/action.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | schémas Zod d’action, géométrie, route, déchets, mesures, participants, organisateurs, formalités et contrats create/update |
| PUBLIC_CONTRACTS | `manualDrawingSchema`, `commonActionCigaretteButtSchemaFields`, `createActionSchema`, `updateActionSchema` et types de payloads associés |
| SIDE_EFFECTS | aucun effet externe ; validation et normalisation pures |
| MAIN_CONSUMERS | routes actions, modération, `action-update-audit`, payload de déclaration, composants chat et tests de contrats |
| TEST_BOUNDARY | `action.test.ts`, tests routes actions, formalités, calibration et modération |
| COUPLING | couplage très fort avec les contrats action, route, déchets, géométrie et formalités |
| NATURAL_EXTRACTION_BOUNDARY | schémas géométrie/route, mesures déchets, identité/organisateur, formalités et composition create/update |
| RATIONALE | façade de composition des schémas create/update ; géométrie/route, mesures déchets, identité/organisateur, formalités et préparation sont distribuées vers leurs owners spécialisés |

#### `apps/web/src/lib/pdf-export/simple-pdf.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | contrats de rapport PDF, nommage, lignes textuelles, échappement PDF, primitives graphiques, parsing de blocs donut et génération PDF |
| PUBLIC_CONTRACTS | `PdfReportChapter`, `PdfReportData`, `PdfReportPayload`, `buildPdfReportFilename`, `hasPdfReportData`, `buildPdfReportLines`, `buildSimplePdf` |
| SIDE_EFFECTS | aucun effet externe ; génération binaire pure |
| MAIN_CONSUMERS | export navigateur, rapports web, générations API, persistance des rapports et `official-report-html` |
| TEST_BOUNDARY | `simple-pdf.test.ts`, tests de génération de rapports et exports consommateurs |
| COUPLING | le payload de rapport est partagé ; la sérialisation de contenu et le moteur PDF sont techniquement séparables |
| NATURAL_EXTRACTION_BOUNDARY | constructeur de lignes de rapport, primitives PDF/graphiques et sérialisation binaire |
| RATIONALE | façade publique minimale ; responsabilités contenu, primitives et sérialisation distribuées vers des owners spécialisés |

#### `apps/web/src/lib/actions/pollution/current-place-state.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | regroupement des observations par lieu, sélection de l'état observé, projection actuelle, provenance et vues de présentation |
| PUBLIC_CONTRACTS | types `CurrentPlaceState*`, `resolveCurrentPlaceStates`, `resolveCurrentPlaceStateViews`, `resolveCurrentPlaceStateForRecord` |
| SIDE_EFFECTS | aucun effet externe ; calcul déterministe à partir des contrats d'action et historiques locaux |
| MAIN_CONSUMERS | carte, feed, tableau, popups, filtres et couches géométriques |
| TEST_BOUNDARY | `current-place-state.test.ts`, tests carte/feed/popups et projections pollution |
| COUPLING | couplage fort avec `local-repollution-calibration`, contrats action, historique et projections pollution |
| NATURAL_EXTRACTION_BOUNDARY | construction des buckets, état observé, projection `projected_today` et adaptation des vues |
| RATIONALE | le module reste l'owner CURRENT de la résolution d'état d'un lieu : `observed` et `projected_today` partagent les mêmes buckets, identités, historiques et sélection des observations ; aucune évolution indépendante n'est démontrée dans ce lot |

#### `apps/web/src/lib/actions/pollution/local-repollution-calibration.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | façade de compatibilité ; owners séparés pour matching local, dérivation historique, calibration et projection |
| PUBLIC_CONTRACTS | façade `local-repollution-calibration.ts` ; contrats de matching, historique, calibration et projection conservés |
| SIDE_EFFECTS | aucun effet externe ; calculs purs |
| MAIN_CONSUMERS | `current-place-state`, projections pollution et tests de calibration |
| TEST_BOUNDARY | `local-repollution-calibration.test.ts`, `current-place-state.test.ts` et tests pollution |
| COUPLING | la façade coordonne des owners purs sans dupliquer les règles de fusion, complétude ou confiance |
| NATURAL_EXTRACTION_BOUNDARY | `local-repollution-matching`, `local-repollution-history`, `local-repollution-calibration-core` et `local-repollution-projection` |
| RATIONALE | matching, dérivation historique, calibration et projection ont des contrats autonomes ; la façade conserve les imports historiques et la détermination des owners |

#### `apps/web/src/lib/route/route-predicted-targets.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | façade de compatibilité ; owners séparés pour pool de candidats, audits de budget, géométrie corridor et sélection |
| PUBLIC_CONTRACTS | façade `route-predicted-targets.ts`, contrats `RoutePrediction*`, builders de pool, audits et `buildPredictedRouteCandidates` |
| SIDE_EFFECTS | aucun effet externe ; calculs et audits purs |
| MAIN_CONSUMERS | planning API, harness de tests planning, calibration et trace de route |
| TEST_BOUNDARY | `route-predicted-targets.test.ts`, `route-predicted-targets.preference.test.ts`, tests `route.response` et planning |
| COUPLING | la façade coordonne les contrats planning sans dupliquer les règles de budget ou de géométrie |
| NATURAL_EXTRACTION_BOUNDARY | `route-predicted-targets-pool`, `route-predicted-targets-budget`, `route-predicted-targets-geometry`, `route-predicted-targets-candidate` et `route-predicted-targets-selection` |
| RATIONALE | pool, audits, géométrie et sélection ont des frontières fonctionnelles démontrées ; la façade conserve les imports historiques et les mocks existants |

#### `apps/web/src/components/sections/rubriques/route/route-section.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | composition UI de la rubrique route, affichage des états, résultats, explications et CTA vers le planner |
| PUBLIC_CONTRACTS | `RouteSection`, `buildPlannerActionHref`, props et états de rubrique |
| SIDE_EFFECTS | rendu React et navigation via href ; pas de persistance locale directe |
| MAIN_CONSUMERS | `route/index.tsx`, `action-creation-shell.tsx`, tests de rubrique et map |
| TEST_BOUNDARY | `route-section.test.tsx`, `route-section.map.test.tsx`, tests d'entrypoints et action creation shell |
| COUPLING | couplage UI avec les modèles route, météo, carte, actions et responsive |
| NATURAL_EXTRACTION_BOUNDARY | contrôles origine/déclenchement, dérivations d'état et rendu des résultats (résumé, groupes, carte, liste, export) |
| RATIONALE | les contrôles, la dérivation pure du view-model et le rendu des résultats ont des responsabilités autonomes ; RouteSection conserve l'orchestration, l'Auth state et le handoff planner |

#### `apps/web/src/components/reports/web-document/reports-web-document.shared.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | types de rapport, modules, périodes, labels, parsing de scope, titres, états d'export et construction des données PDF |
| PUBLIC_CONTRACTS | types `Report*`, définitions de modules, constantes par défaut, labels, parse/build de scope et `buildPdfData` |
| SIDE_EFFECTS | aucun effet externe ; fonctions de modèle et de présentation pures |
| MAIN_CONSUMERS | `reports-web-document.tsx`, préparation du rapport, historique de génération et export PDF |
| TEST_BOUNDARY | `reports-web-document.shared.test.ts`, tests de rendu et d'historique de génération |
| COUPLING | contrat partagé par plusieurs écrans et la persistance ; risque de cycle si les types sont déplacés sans séparation |
| NATURAL_EXTRACTION_BOUNDARY | contrat/types, labels/périodes et construction payload PDF |
| RATIONALE | `report-pdf-data.ts` porte les fonctions pures et peut être consommé par le serveur sans importer un module client ; le fichier `.tsx` conserve les états et helpers UI |

#### `apps/web/src/app/(app)/reports/page.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | façade App Router serveur, résolution des paramètres d'onglet et délégation vers les flux bibliothèque, analyse, génération et fichiers |
| PUBLIC_CONTRACTS | export par défaut `ReportsPage`, métadonnées de `/reports` et paramètres de navigation compatibles |
| SIDE_EFFECTS | lecture serveur de session, rôle, identité, complétion de compte et données de rapport via les loaders existants |
| MAIN_CONSUMERS | route Next.js `/reports` et `page.test.ts` |
| TEST_BOUNDARY | `page.test.ts`, tests des loaders/orchestrateurs et tests génération/reprise/export des rapports |
| COUPLING | paramètres URL, session Clerk côté serveur, AuthZ, complétion de compte, locale et composition des onglets |
| NATURAL_EXTRACTION_BOUNDARY | page shell ; orchestration serveur dans `page-orchestration.tsx` ; chargement dans `page-loaders.ts` et `page-generation-context.ts` ; contenu dans `page-content.tsx` |
| RATIONALE | la page est une façade App Router mince ; chargement, génération, reprise, droits et présentation ont des owners distincts, tandis que les contrôles AuthN/AuthZ restent exécutés côté serveur |

#### `apps/web/src/lib/pdf-export/report-pdf-theme.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | façade d'assemblage du CSS officiel de rapport à partir des tokens et familles de règles spécialisées |
| PUBLIC_CONTRACTS | `buildOfficialReportCss` comme façade unique de génération CSS officielle et contrats de thème consommés par les exports |
| SIDE_EFFECTS | aucun effet externe ; génération CSS pure |
| MAIN_CONSUMERS | `official-report-html-*`, `browser-report`, templates HTML et prototype de thème |
| TEST_BOUNDARY | `report-pdf-theme.test.ts`, snapshot CSS, tests browser-report et rendu PDF réel |
| COUPLING | tokens de thème, ordre d'assemblage CSS, familles page/hero/contenu/print et compatibilité des snapshots |
| NATURAL_EXTRACTION_BOUNDARY | tokens dans `report-pdf-theme.tokens.ts` ; règles hero, contenu, page et print dans leurs modules spécialisés ; façade d'assemblage dans ce fichier |
| RATIONALE | les tokens et familles CSS ont des owners cohésifs ; la façade conserve uniquement l'ordre et le contrat public, ce qui permet de préserver les sorties PDF sans dupliquer la génération |

#### `apps/web/src/components/sections/rubriques/recycling-question-assistant/assistant-utils.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | règles lexicales de tri, réponses localisées, recommandations de filière, signalement d'espace public et réponse par défaut |
| PUBLIC_CONTRACTS | `buildAnswer` et modèle de réponse consommé par l'assistant |
| SIDE_EFFECTS | aucun effet externe ; moteur déterministe pur |
| MAIN_CONSUMERS | composant `recycling-question-assistant.tsx` et tests assistant |
| TEST_BOUNDARY | `assistant-utils.test.ts`, tests de rendu du composant assistant |
| COUPLING | faible couplage externe ; forte cohésion interne autour du moteur de décision |
| NATURAL_EXTRACTION_BOUNDARY | aucune frontière obligatoire ; les tables lexicales et la logique restent un même contrat de réponse |
| RATIONALE | la taille vient principalement des contenus localisés et des branches de décision d'un moteur unique ; un split par bloc de texte réduirait la lisibilité |

#### `apps/web/src/lib/route/route-trace.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | construction de la trace de recommandation, segments, arrêts, exclusions, approximations, warnings et réconciliation finale |
| PUBLIC_CONTRACTS | types `RouteTrace*`, `BuildRouteRecommendationTraceInput`, `buildRouteRecommendationTrace` |
| SIDE_EFFECTS | aucun effet externe ; assembleur pur de preuve planning |
| MAIN_CONSUMERS | réponse API route, composants d'explication et contrats route response |
| TEST_BOUNDARY | `route-trace.test.ts`, tests planning, route response et composants d'explication |
| COUPLING | couplage fort avec les résultats planner, géométrie, météo, événements et contrats d'interface |
| NATURAL_EXTRACTION_BOUNDARY | segments, sélection/exclusion, contexte événementiel et réconciliation finale |
| RATIONALE | les helpers servent un même contrat de trace explicable ; un seul owner du contrat RouteRecommendationTrace doit être conservé |

#### `apps/web/src/components/accueil/accueil-community-credibility.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | fetch d'activité homepage, validation de réponse, cartes de crédibilité, placeholder, animations et rendu de section |
| PUBLIC_CONTRACTS | `HOMEPAGE_ACTIVITY_UNAVAILABLE_MESSAGE`, `fetchHomepageActivity`, `HomeCommunityCredibility` |
| SIDE_EFFECTS | fetch `/api/homepage/activity`, SWR, animation GSAP et navigation |
| MAIN_CONSUMERS | page d'accueil et index accueil |
| TEST_BOUNDARY | `accueil-community-credibility.test.tsx`, tests endpoint homepage/activity et rendu accueil |
| COUPLING | mélange fetch/validation et composition UI ; dépend de CmmButton, SWR et cartes de preuve |
| NATURAL_EXTRACTION_BOUNDARY | client d'activité, cartes d'activité, placeholder/états et section principale |
| RATIONALE | le client/validateur activity, les panneaux d'activité et de crédibilité, les visuels et la façade de composition ont des owners explicites |

#### `apps/web/src/lib/ui/button-theme.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | définition canonique des tokens de thème par tonalité et projection CSS |
| PUBLIC_CONTRACTS | `getButtonThemeCssVariables`, type interne de tonalité via `BackdropToneKey` |
| SIDE_EFFECTS | aucun effet externe ; projection CSS pure |
| MAIN_CONSUMERS | `vibrant-background.tsx` et primitives UI appelant le thème |
| TEST_BOUNDARY | `button-theme.test.ts`, tests de consommateurs UI |
| COUPLING | faible ; la majorité de la taille provient des données de tokens statiques |
| NATURAL_EXTRACTION_BOUNDARY | aucune frontière fonctionnelle nécessaire ; un fichier owner unique est cohérent |
| RATIONALE | il s'agit d'un owner canonique unique de configuration UI, sans mélange d'effets ou de contrats indépendants |

#### `apps/web/src/lib/supabase/storage-usage.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | contrats de stockage, formatage, classification d'objets, agrégation, pagination Supabase, snapshots, historique et comparaisons |
| PUBLIC_CONTRACTS | types `StorageUsage*`, formatters, snapshot builders, fetch paginé et historique |
| SIDE_EFFECTS | lecture Supabase Storage via query builder ; aucune mutation |
| MAIN_CONSUMERS | service storage, quota, dashboard admin, contribution métier et rapports mensuels |
| TEST_BOUNDARY | `storage-usage.test.ts`, `storage-usage-cron.test.ts`, tests quota/dashboard/rapports |
| COUPLING | couplage significatif entre calculs purs, classification métier et adaptateur de pagination |
| NATURAL_EXTRACTION_BOUNDARY | classification/agrégation pure, adaptateur de lecture paginée et snapshots/comparaisons/historique |
| RATIONALE | les owners calculs purs, pagination Supabase et historique sont séparés avec des contrats explicites ; la façade conserve uniquement la compatibilité publique |

#### `apps/web/src/components/actions/actions-history-list.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | chargement SWR, filtres/recherche, qualité d'action, audit admin, demandes de participation, sélection, export PDF et rendu de l'historique |
| PUBLIC_CONTRACTS | composant `ActionsHistoryList`, interaction avec `fetchActions`, audit et modération de participation |
| SIDE_EFFECTS | fetch HTTP, SWR, appels de review group join et téléchargement/export via composants enfants |
| MAIN_CONSUMERS | surface historique des actions, composants details/table, services actions et participation |
| TEST_BOUNDARY | `actions-history-list.helpers.test.ts`, `actions-history-list.import.test.ts`, tests details et contrats API actions |
| COUPLING | mélange de plusieurs workflows utilisateur et admin, avec état local conséquent |
| NATURAL_EXTRACTION_BOUNDARY | hook/query/filter model, sélection/details, participation review, export PDF et composition de rendu |
| RATIONALE | query/filter, sélection/details, review participation, export et composition UI ont des owners dédiés ; la façade orchestre les contrats |

#### `apps/web/src/components/actions/action-declaration/payload.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | état initial, préparation, géométrie finale, route, mesures déchets, participants, organisme, guidance et construction du payload create |
| PUBLIC_CONTRACTS | helpers de parsing/normalisation, `createInitialFormState`, préparation/hydratation, validation de dessin, `buildCreateActionPayload`, `prepareCreateActionPayload` |
| SIDE_EFFECTS | `prepareCreateActionPayload` peut appeler les dépendances d'assistance ; le reste est principalement pur |
| MAIN_CONSUMERS | formulaire de déclaration, hooks de soumission/hydratation, étapes de revue et géométrie |
| TEST_BOUNDARY | `payload.test.ts`, tests de déclaration, géométrie, validation action et soumission |
| COUPLING | couplage très fort avec `FormState`, contrats action, géométrie, route et mesures |
| NATURAL_EXTRACTION_BOUNDARY | état/préparation, résolution route/géométrie, mesures, identité/organisateur, assemblage payload et smart assist |
| RATIONALE | façade publique minimale ; préparation/hydratation, résolution géométrie/route, mesures, identité/organisateur et assemblage final sont isolés sans dupliquer FormState, smart assist ou valeurs dérivées |

#### `apps/web/src/lib/route/route-group-partition.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | validation d'entrée, équilibrage des volontaires, évaluation de candidats, affectation et métriques de partitionnement |
| PUBLIC_CONTRACTS | constantes `MAX_ROUTE_*`, types de partition et fonctions `balancedVolunteerCounts`, `validateRouteGroupInput`, `partitionRouteCandidates` |
| SIDE_EFFECTS | aucun effet externe ; algorithme pur |
| MAIN_CONSUMERS | planning route, tests route group et contrats planner |
| TEST_BOUNDARY | `route-group-partition.test.ts`, tests planning et route recommendation |
| COUPLING | helpers internes fortement cohésifs autour d'un seul algorithme ; dépendance aux contrats planner |
| NATURAL_EXTRACTION_BOUNDARY | aucune extraction obligatoire ; les audits et métriques peuvent rester dans l'algorithme owner |
| RATIONALE | pipeline unique de partitionnement et métriques ; une extraction par helper augmenterait le couplage |

#### `apps/web/src/lib/learning/quiz/quiz-quality-audit.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | règles de qualité des questions, source metadata, réflexion, difficulté, distracteurs, critères et formatage du rapport |
| PUBLIC_CONTRACTS | `QuizQualityFinding`, `QuizQualityReport`, `auditQuizQuestion`, `auditQuizBank`, `formatQuizQualityReport` |
| SIDE_EFFECTS | aucun effet externe ; audit pur |
| MAIN_CONSUMERS | pipeline learning/quiz, tests de qualité et outils d'audit |
| TEST_BOUNDARY | `quiz-quality-audit.test.ts`, tests de banque et metadata quiz |
| COUPLING | configuration de règles et calculs forment un seul moteur de qualité |
| NATURAL_EXTRACTION_BOUNDARY | aucune frontière nécessaire ; les patterns sont les données du même audit |
| RATIONALE | moteur unique de critères et rapport d'audit ; le découpage des patterns disperserait le contrat |

#### `apps/web/src/lib/environmental-impact-estimator/services/infrastructure.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | estimation des services d'infrastructure, données manquantes, coûts mensuels, effets de second ordre, courbes et synthèse |
| PUBLIC_CONTRACTS | `buildInfrastructureMissingDataNotes`, `buildInfrastructureEstimate`, types d'estimation consommés par `core.ts` |
| SIDE_EFFECTS | aucun effet externe ; calculs purs |
| MAIN_CONSUMERS | service `core.ts`, estimator environmental-impact et vues de courbe |
| TEST_BOUNDARY | tests de l'estimateur infrastructure via les tests consommateurs de `services/core` et de l'estimator |
| COUPLING | couplage interne entre métriques, estimations primaires/secondaires, mode et courbe |
| NATURAL_EXTRACTION_BOUNDARY | métriques/services, second-order estimate, courbe, synthèse/mode |
| RATIONALE | owner unique de l'estimation infrastructure ; les calculs restent internes au même modèle |

#### `apps/web/src/components/actions/map/layers/actions-map-geometry.utils.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | view-model cartographique d'un item d'action, conversion des positions Leaflet, couverture observée et ancrage infrastructure |
| PUBLIC_CONTRACTS | type `ActionMapGeometryViewModel`, `resolveActionMapGeometryViewModel`, `resolveInfrastructureAnchor` |
| SIDE_EFFECTS | aucun effet externe ; transformations et view-models purs |
| MAIN_CONSUMERS | couches map, popup, sélection, marqueurs de points, couverture et infrastructure |
| TEST_BOUNDARY | `actions-map-geometry.utils.test.ts`, `map-layers.test.ts`, `action-popup-content.test.ts`, tests de sélection et consommateurs de géométrie |
| COUPLING | couplage avec `ActionMapItem`, `geometry-presentation`, `geometry-metrics` et les owners render ; le view-model consomme leurs contrats sans porter la normalisation métier ni la validation du formulaire |
| NATURAL_EXTRACTION_BOUNDARY | aucune extraction supplémentaire obligatoire ; normalisation, validation, rendu et view-model sont déjà portés par leurs owners spécialisés |
| RATIONALE | les responsabilités autonomes de normalisation, validation du formulaire et rendu/styles/marqueurs ont été extraites ; ce fichier reste l'owner du view-model cartographique et de l'ancrage infrastructure |

#### `apps/web/src/components/actions/action-declaration/before/sections.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | façade d'exports des sections React d'identité/partage, action planifiée et préparation/sécurité |
| PUBLIC_CONTRACTS | `IdentityAndSharingSection`, `PlannedActionSection`, `PreparationAndSafetySection` |
| SIDE_EFFECTS | rendu React et callbacks `updateField` ; aucune persistance directe |
| MAIN_CONSUMERS | `before/form.tsx` et workflow préalable de déclaration |
| TEST_BOUNDARY | tests du formulaire préalable, workflow before et composants de déclaration |
| COUPLING | props communes mais sections métier largement indépendantes |
| NATURAL_EXTRACTION_BOUNDARY | un owner React par section exportée et un contrat partagé pour BaseSectionProps, validation et champs communs |
| RATIONALE | les trois sections exportées disposent désormais de owners naturels ; la façade ne conserve que le contrat d'import historique |

#### `apps/web/src/app/api/route/recommend/route.response.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | façade de construction de réponse ; délégation aux builders de budgets/contexte, multi-route, preuves snapshot/trace/calibration et payloads vide/résultat |
| PUBLIC_CONTRACTS | `buildRouteRecommendationResponse`, payload de réponse API et trace associée |
| SIDE_EFFECTS | aucun effet externe ; mapping pur de réponse |
| MAIN_CONSUMERS | `route.ts`, tests `route.response.test.ts`, clients route et composants d'explication |
| TEST_BOUNDARY | `route.response.test.ts`, tests API route recommendation et route trace |
| COUPLING | couplage obligatoire avec le contrat API, `route-trace` et résultats planner |
| NATURAL_EXTRACTION_BOUNDARY | contexte/budgets opérationnels, multi-route, preuves, payload commun, cas vide et cas avec résultats |
| RATIONALE | la façade reste l'owner du DTO public tandis que les étapes de composition sont des builders internes purs et testables ; aucun contrat API n'est déplacé |

#### `apps/web/src/lib/actions/participation/group-participation-review.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | recherche de participants, chargement des reviews, validation/review, idempotence et ajout admin de participation |
| PUBLIC_CONTRACTS | `loadActionParticipationReviews`, `searchActionParticipationCandidates`, `reviewActionParticipation`, `addActionParticipationByAdmin` |
| SIDE_EFFECTS | lectures et mutations Supabase, contrôles de doublons, audit et validation admin selon les fonctions appelées |
| MAIN_CONSUMERS | routes group-join queue/review, service participation et historique admin |
| TEST_BOUNDARY | tests routes `group-join`, participation, persistence et contrats d'audit |
| COUPLING | mélange de lecture/recherche, décision de review et mutation admin ; frontière sécurité importante |
| NATURAL_EXTRACTION_BOUNDARY | read/search, décision de review, mutation admin et helpers d'idempotence/audit |
| RATIONALE | lecture/recherche, review et mutation admin ont des owners dédiés ; la façade conserve les exports de compatibilité |

#### `apps/web/src/lib/actions/pollution/corridor-history.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | matching de polylignes, groupement d'actions par corridor, historique et synthèse de scores ; orchestration du noyau géométrique extrait |
| PUBLIC_CONTRACTS | types `Corridor*`, `matchCorridorPolylines`, `groupActionsByCorridor`, `findCorridorHistoryForAction`, `summarizeCorridorHistory` |
| SIDE_EFFECTS | aucun effet externe ; calculs purs |
| MAIN_CONSUMERS | couches map, modèles de popup corridor/action et historique pollution |
| TEST_BOUNDARY | `corridor-history.test.ts`, tests map layers et popups |
| COUPLING | façade métier dépendant d'un module géométrique pur à sens unique ; aucun cycle ni duplication de seuils |
| NATURAL_EXTRACTION_BOUNDARY | `corridor-history-geometry.ts` porte projection, échantillonnage, plus proche point et couverture ; la façade conserve conversion métier, matching, groupement, historique et scores |
| RATIONALE | la lecture des consommateurs confirme que la géométrie est un noyau pur testable indépendamment des actions et de l'historique ; la façade conserve le contrat corridor public et l'ordre matching → historique → score, tandis que les seuils restent définis dans l'owner métier et sont passés explicitement à la couverture |

#### `apps/web/src/lib/actions/http.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | client HTTP actions pour create/list/read/update, formalités, préremplissage, exigences administratives et publication |
| PUBLIC_CONTRACTS | fonctions `createAction`, `fetchActions`, `fetchActionById`, `updateAction`, formalités, validation, `publishAction` et types de réponses |
| SIDE_EFFECTS | fetch HTTP et mutations API via POST/PATCH ; mapping des erreurs et réponses |
| MAIN_CONSUMERS | composants actions, déclaration, rapports, chat, gamification, participation et stores |
| TEST_BOUNDARY | `http.test.ts`, tests routes actions, déclaration, formalités et stores |
| COUPLING | un seul client partage plusieurs sous-contrats API distincts et de nombreux consommateurs |
| NATURAL_EXTRACTION_BOUNDARY | read/list, create/update, formalités/admin, publication et parsers de réponse |
| RATIONALE | collection, éditeur et formalités sont des familles HTTP séparées ; la façade conserve les exports publics |

#### `apps/web/src/lib/geo/municipal-cleaning-serviceability.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | modèle de serviceabilité municipale, niveaux d'accessibilité, preuves, confiance, zones inconnues et matérialisation |
| PUBLIC_CONTRACTS | `deriveMunicipalCleaningServiceability`, `buildMunicipalCleaningServiceabilitySnapshot`, `materializeMunicipalCleaningZones` |
| SIDE_EFFECTS | aucun effet externe ; modèle et projections purs |
| MAIN_CONSUMERS | loaders de serviceability, geo consumers et tests de couverture de zones |
| TEST_BOUNDARY | `municipal-cleaning-serviceability.test.ts`, `municipal-cleaning-serviceability-loader.test.ts` |
| COUPLING | forte cohésion autour du modèle de preuve et de confiance ; la matérialisation est une sortie du même modèle |
| NATURAL_EXTRACTION_BOUNDARY | aucune séparation nécessaire hors éventuel adaptateur de matérialisation |
| RATIONALE | owner unique du modèle de preuve/confiance/serviceabilité |

#### `apps/web/src/app/api/chat/route.post.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | parsing POST chat, AuthN/AuthZ, contexte territoire/action, orchestration du modèle, réponses, erreurs et observabilité |
| PUBLIC_CONTRACTS | `POST`, payload chat, réponses streaming/non-streaming, limites et erreurs API |
| SIDE_EFFECTS | accès aux services chat/actions, appels modèle et effets de conversation selon le flux |
| MAIN_CONSUMERS | `lib/actions/http`, composants chat, routes recherche/feedback et tests API chat |
| TEST_BOUNDARY | tests route chat, feedback-reply, topics/admin chat, recherche et contexte territoire |
| COUPLING | frontière API sensible mêlant validation, contexte métier, orchestration et réponse |
| NATURAL_EXTRACTION_BOUNDARY | parsing/validation, résolution contexte, appel modèle et mapping réponse/erreur |
| RATIONALE | validation, contexte/destination, persistance/notifications et mapping sont des owners dédiés ; AuthN/AuthZ, rate limit et l'ordre observable restent explicites dans la route |

#### `apps/web/src/lib/impact/impact-terrain-2026.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | constantes scientifiques, conversions mégots/déchets, CO2, eau, économies de nettoyage et méthodologie localisée |
| PUBLIC_CONTRACTS | constantes de conversion, calculs d'impact, types de conversions et `buildImpactTerrain2026Methodology` |
| SIDE_EFFECTS | aucun effet externe ; calculs purs et données méthodologiques |
| MAIN_CONSUMERS | résultats impact, actions, participation, KPIs publics, méthodologie et rapports |
| TEST_BOUNDARY | `impact-terrain-2026.test.ts`, `impact-terrain-2026-results.test.ts`, tests participation/KPI |
| COUPLING | tous les exports partagent la même méthodologie et les mêmes facteurs versionnés |
| NATURAL_EXTRACTION_BOUNDARY | aucune extraction obligatoire ; séparer les conversions casserait facilement la cohérence des facteurs |
| RATIONALE | owner canonique de la méthodologie scientifique versionnée |

#### `apps/web/src/components/chat/discussion-guidance.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | catalogue de topics, guidance FR/EN, libellés, descriptions et prompts de démarrage par canal |
| PUBLIC_CONTRACTS | `DiscussionGuidance`, `ChatTopicDefinition`, `getDiscussionTopics`, `getDiscussionTopic`, `getDiscussionGuidance` |
| SIDE_EFFECTS | aucun effet externe ; accès pur à une configuration statique |
| MAIN_CONSUMERS | `chat-shell.utils`, `topic-presentation`, `chat-message-item`, `chat-search-panel` |
| TEST_BOUNDARY | tests chat UI, topic presentation et consommateurs de guidance |
| COUPLING | faible couplage externe ; forte cohésion entre données localisées et sélecteurs |
| NATURAL_EXTRACTION_BOUNDARY | aucune frontière nécessaire tant que le catalogue reste le même owner |
| RATIONALE | catalogue bilingue unique topics/canaux/guidance ; le découpage disperserait un contrat statique cohésif |

#### `apps/web/src/lib/actions/exports/export-form-media.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | presets d'export, bundles, labels, narrative, SVG social, preview data URL, conversion PNG et téléchargement navigateur |
| PUBLIC_CONTRACTS | types/export targets/bundles et builders de filename, preview, share text, label et téléchargement |
| SIDE_EFFECTS | `Blob`, `URL.createObjectURL`, `Image`, `canvas` et clic de téléchargement navigateur |
| MAIN_CONSUMERS | export picker controller/model/view, bundle/history et formulaire de déclaration |
| TEST_BOUNDARY | tests des contrôleurs export, bundle/history et déclaration |
| COUPLING | mélange de formatage pur, rendu SVG et effet navigateur ; les types sont partagés par plusieurs modules |
| NATURAL_EXTRACTION_BOUNDARY | presets/contrats, narrative/labels/filename, SVG pur, conversion SVG → PNG navigateur et téléchargement Blob/browser |
| RATIONALE | façade publique minimale ; responsabilités presets/contrats, narrative, SVG pur et effets navigateur distribuées vers des owners spécialisés |

#### `apps/web/src/app/api/reports/elus-dossier/route.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | AuthN, parsing de scope/format, chargement actions, agrégations territoriales, méthodologie, Markdown/PDF, cache Supabase et réponse |
| PUBLIC_CONTRACTS | `GET`, paramètres `days/limit/format/scope`, réponses JSON/Markdown/PDF, headers et cache |
| SIDE_EFFECTS | lecture sources actions, Supabase Storage, création d'URL signée et stockage/cache de rapport |
| MAIN_CONSUMERS | route protégée de dossier élus, clients rapports et tests de route |
| TEST_BOUNDARY | `route.test.ts`, tests scope, reports HTTP, unified source, storage et AuthZ |
| COUPLING | route fortement transverse entre sécurité, données, analytics, reporting et persistance |
| NATURAL_EXTRACTION_BOUNDARY | parsing/scope, agrégation pure, construction payload, cache PDF et mapping format/réponse |
| RATIONALE | route réduite à l'orchestration explicite AuthN → parsing → service/cache → réponse ; scope, agrégation, cache et mapping de réponse ont leurs owners |

#### `apps/web/src/components/sections/rubriques/weather-section.conditions.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | panneau conditions météo, checklist sécurité, équipement, fenêtres recommandées, prévisions horaires/journalières et sélection de lieu |
| PUBLIC_CONTRACTS | `ConditionsPanel`, props issues de `useWeatherData` et contrats weather |
| SIDE_EFFECTS | rendu React et interaction de sélection ; données fournies par le hook météo |
| MAIN_CONSUMERS | `weather-section.tsx`, picker météo et composants UI weather |
| TEST_BOUNDARY | tests section météo, hook météo et composants de sélection |
| COUPLING | plusieurs sous-vues partagent le même état météo et les mêmes contraintes de sécurité |
| NATURAL_EXTRACTION_BOUNDARY | checklist/équipement, sélection forecast, grille horaire et fenêtre recommandée |
| RATIONALE | un seul ConditionsPanel porte un état météo fortement partagé ; le découpage immédiat produirait du prop drilling |

#### `apps/web/src/lib/pdf-export/official-report-html.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | parsing Markdown officiel, listes/tableaux/callouts, statistiques, lignes, chapitres, hero et composition HTML avec CSS de rapport |
| PUBLIC_CONTRACTS | `renderOfficialMarkdown`, `buildOfficialReportHtml`, compatibilité `PdfReportPayload` |
| SIDE_EFFECTS | aucun effet externe ; rendu HTML pur |
| MAIN_CONSUMERS | `browser-report.ts` et export officiel, partageant `simple-pdf` |
| TEST_BOUNDARY | tests browser report, PDF officiel et contrats Markdown/rapport |
| COUPLING | parser Markdown et compositeur de rapport partagent le payload, mais sont techniquement distincts |
| NATURAL_EXTRACTION_BOUNDARY | parser Markdown, rendu primitives stats/rows/chapter et composition document |
| RATIONALE | parsing Markdown et sections/rendu isolés ; fichier restant = compositeur HTML cohérent |

#### `apps/web/src/lib/auth/sync.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | extraction metadata Clerk, compatibilité profil, nom affiché, arrondissement, handle unique, choix client Supabase et upsert profil |
| PUBLIC_CONTRACTS | `SyncClerkUserOptions`, `syncClerkUserToSupabase`, contrats profil/handle synchronisés |
| SIDE_EFFECTS | lectures et upserts Supabase, résolution avatar, logs d'erreur contrôlés et fallback service role côté serveur |
| MAIN_CONSUMERS | `authz-identity`, routes de comptes/admin et sync Clerk |
| TEST_BOUNDARY | `sync.test.ts`, tests AuthN/AuthZ, profil actif, handle et routes account/admin |
| COUPLING | mélange extraction/normalisation pure, résolution de handle, persistance et fallback privilégié ; frontière sécurité sensible |
| NATURAL_EXTRACTION_BOUNDARY | metadata/territoire, label affiché, handle unique et adaptateur client/persistance |
| RATIONALE | metadata/territoire, label, handle et adaptateur de persistance ont des owners séparés ; la façade conserve l'ordre de synchronisation et les décisions server-only auditable |

#### `apps/web/src/components/actions/action-creation-shell.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | façade de création, navigation des sections, workflow guidé, formulaires avant/après et transitions après persistance |
| PUBLIC_CONTRACTS | `ActionCreationShell`, routes de sections/espaces/étapes et callbacks de persistance |
| SIDE_EFFECTS | navigation via router, persistance d'état de workflow/sections et orchestration des transitions d'action |
| MAIN_CONSUMERS | parcours `/actions/new`, formulaires de déclaration, préparation et formalités |
| TEST_BOUNDARY | `action-creation-shell.test.tsx`, tests de préparation, reprise et navigation du parcours action |
| COUPLING | identité d'action, état de navigation, préparation, formalités et rendu des sous-parcours partagent le même contexte de création |
| NATURAL_EXTRACTION_BOUNDARY | navigation/sections, état workflow et orchestration de persistance, après stabilisation de leur identité de ressource |
| RATIONALE | le signal de taille est renforcé par une fonction de façade au-dessus des plafonds de complexité ; les changements récents d'identité, de reprise et de navigation doivent d'abord être stabilisés pour éviter une seconde source d'état |

#### `apps/web/src/components/actions/action-declaration/before/use-before-action-workflow.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | hydratation d'action/draft/handoff, mises à jour de champs, persistance avant publication et publication explicite ; les conversions action → `FormState` vivent dans `before-action-form-conversions.ts` |
| PUBLIC_CONTRACTS | hooks `useBeforeActionHydration`, `useBeforeActionFieldUpdates`, `useBeforeActionSubmission`, `useBeforeActionPublication` et helpers de reprise ; builders de formulaire consommés depuis l'owner de conversions |
| SIDE_EFFECTS | lectures/écritures d'action, draft local, handoff planner, tracking et publication serveur explicite |
| MAIN_CONSUMERS | formulaire avant déclaration et shell de création d'action |
| TEST_BOUNDARY | `use-before-action-workflow.test.ts`, `use-before-action-recovery.test.tsx`, tests du formulaire avant déclaration et tests de reprise/hydratation |
| COUPLING | le workflow conserve l'identité de mutation et le contrat de reprise ; l'owner de conversions n'a que des dépendances de modèle, préparation, topologie et draft initial |
| NATURAL_EXTRACTION_BOUNDARY | `before-action-form-conversions.ts` porte les valeurs initiales et les conversions action → `FormState` ; le workflow porte les hooks, effets et publication sans second moteur de formulaire |
| RATIONALE | les conversions étaient pures, cohésives et séparables sans déplacer les hooks ni la séquence d'effets ; l'extraction ramène le workflow à 399 lignes et conserve les preuves de reprise, de persistance et de publication explicite |

#### `apps/web/src/app/api/api-boundary.test.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | tests du contrat d'inventaire des méthodes API et de l'assemblage des contrats d'autorisation |
| PUBLIC_CONTRACTS | assertions Vitest du contrat `API_AUTHORIZATION_CONTRACT` et des collisions de clés |
| SIDE_EFFECTS | lecture du tree API et analyse TypeScript en mémoire ; aucun appel réseau ni effet métier |
| MAIN_CONSUMERS | suite `api-boundary.test.ts` et ses modules d'analyse non-test |
| TEST_BOUNDARY | inventaire exhaustif, collisions et présence des décisions d'autorisation dans cette suite ; l'invocation, les alias et les callbacks sont vérifiés par la suite d'évidence |
| COUPLING | la suite consomme des primitives neutres, sans importer `api-boundary.evidence.test.ts` ni porter son analyseur |
| NATURAL_EXTRACTION_BOUNDARY | `api-boundary-analysis.ts` porte l'inventaire et les méthodes ; `api-boundary-evidence-analysis.ts` porte la résolution et l'analyse d'évidence |
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | les deux contrats de sécurité sont isolés par suite ; toutes les primitives d'analyse sont dans des modules TypeScript neutres, ce qui garantit 10 tests d'inventaire et 10 scénarios d'évidence sans double collecte |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | conserver les assertions d'inventaire, d'assemblage et de contrat d'autorisation sans importer une suite de tests |
| NEXT_TRIGGER | nouvelle famille de contrat d'inventaire ou nouvelle dépendance de parcours HTTP indépendante |

#### `apps/web/src/app/api/reports/generations/route.test.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | tests des frontières AuthN, quota, sources typées, persistance, reprise incertaine et historique |
| PUBLIC_CONTRACTS | scénarios GET/POST de `/api/reports/generations` et fixtures de payloads validés |
| SIDE_EFFECTS | mocks contrôlés des owners de quota, sources, audit et persistance |
| MAIN_CONSUMERS | route de génération de rapports et ses consommateurs de reprise/historique |
| TEST_BOUNDARY | `route.test.ts` conserve les flux POST principaux ; `route.get.test.ts` porte la lecture historique ; `route.persistence.test.ts` porte la récupération d'insertion et d'audit ; les fixtures et mocks stables sont isolés |
| COUPLING | l'ordre observable des gardes, réservations et écritures reste testé dans la suite HTTP |
| NATURAL_EXTRACTION_BOUNDARY | defaults/mocks dans `route.test.helpers.ts` ; lecture historique dans `route.get.test.ts` ; reprise de persistance dans `route.persistence.test.ts` ; flux POST courant dans la suite principale |
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | le harness partagé évite la duplication de mocks ; les suites sont séparées par contrats HTTP observables et ramènent chaque propriétaire sous la cible structurelle sans déplacer les assertions métier |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver l'ordre AuthN → quota → source → persistance et les assertions d'incertitude |
| NEXT_TRIGGER | nouveau flux de rapport indépendant ou fixture qui porte un contrat métier autonome |

#### `apps/web/src/app/api/actions/[actionId]/group-join/route.post-action-claims.test.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | décisions accept/reject des revendications post-action, ownership, idempotence et séparation de la participation ordinaire |
| PUBLIC_CONTRACTS | POST `/api/actions/:actionId/group-join` avec `requestKind=post_action_claim` |
| SIDE_EFFECTS | mocks contrôlés des participants, audit, RPC et progression/gamification |
| MAIN_CONSUMERS | route dynamique group-join et ses propriétaires de revue post-action |
| TEST_BOUNDARY | propriétaire de revendication dans cette suite ; modération admin et mutations ordinaires conservées dans `route.post.test.ts` |
| COUPLING | partage uniquement le harness de route et les frontières canoniques ; aucun ordre d'autorisation ou effet métier n'est déplacé |
| NATURAL_EXTRACTION_BOUNDARY | les scénarios de revendication forment une famille autonome par type de requête et par effets autorisés |
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | extraction par contrat post-action cohésif ; aucune assertion n'a été supprimée et les tests restent exécutés contre la même route |

#### `apps/web/src/lib/auth/api-authorization-contract.actions.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | façade d'assemblage des contrats d'autorisation des routes actions |
| PUBLIC_CONTRACTS | `actionsAuthorizationContract` et ses clés consommées par l'assemblage et le contrôle d'évidence |
| SIDE_EFFECTS | aucun ; contrat statique |
| MAIN_CONSUMERS | assemblage `API_AUTHORIZATION_CONTRACT`, contrôle de collisions et tests de frontière API |
| TEST_BOUNDARY | contrats d'autorisation actions, invitations, médias et attestations de rôles |
| COUPLING | les fragments doivent rester compatibles avec `ApiAuthorizationContract` et sans clé dupliquée |
| NATURAL_EXTRACTION_BOUNDARY | le fragment role-attestations est indépendant ; la façade conserve l'ordre et l'unicité de l'assemblage |
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | le contrat de rôle-attestation forme une famille cohésive et sa sortie est réassemblée par l'owner canonique sans modifier les clés publiques |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | conserver une seule façade d'assemblage et les clés sans collision |
| NEXT_TRIGGER | nouveau domaine d'autorisation indépendant consommé hors de la façade actions |

#### `apps/web/src/lib/spogomi/results-projection.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | types de projection, calcul de projection publique/export et façade des projections de divisions |
| PUBLIC_CONTRACTS | `buildSpogomiResultsProjection`, `getSpogomiDivisionProjections`, `parseSpogomiPublicResults` et types publics |
| SIDE_EFFECTS | aucun ; projection pure et cache de divisions borné à la projection |
| MAIN_CONSUMERS | service de publication Spogomi, route de rankings et composant public des résultats |
| TEST_BOUNDARY | tests de projection, parser public et consumers de résultats |
| COUPLING | le parser dépend du DTO public ; le calcul conserve les règles de clôture, ranking et snapshot |
| NATURAL_EXTRACTION_BOUNDARY | parser `unknown` → DTO d'un côté ; calcul/export et façade de l'autre |
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | l'extraction du parser conserve la validation fail-closed et libère la façade de calcul sans changer le DTO ni les consommateurs |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver la façade projection/export et la validation publique fail-closed |
| NEXT_TRIGGER | nouveau contrat de projection ou parser public consommé indépendamment |

#### `apps/web/src/lib/actions/signalement/signalement-media.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | orchestration upload/finalisation/lecture des preuves, ownership et persistance Supabase |
| PUBLIC_CONTRACTS | `createSignalementMediaUploadIntent`, `finalizeSignalementMedia`, `listSignalementMedia`, validation et erreur publique |
| SIDE_EFFECTS | lectures/écritures Supabase, storage upload/finalisation et URLs signées |
| MAIN_CONSUMERS | routes API des intentions, finalisation et lecture des médias de signalement |
| TEST_BOUNDARY | validation et chemins de média dans la suite signalement ; l'erreur reste un type public partagé |
| COUPLING | validation, état d'upload, ownership et storage partagent le même contrat de preuve |
| NATURAL_EXTRACTION_BOUNDARY | type d'erreur et contrat d'état d'un côté ; orchestration de persistance et storage de l'autre |
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | l'erreur typée est isolée sans déplacer les gardes AuthZ, les transitions d'état ou les effets storage ; la façade publique reste inchangée |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver AuthZ, validation média, états d'upload et contrats de stockage |
| NEXT_TRIGGER | nouveau workflow média indépendant ou divergence entre validation et persistance |

#### `apps/web/src/lib/partners/onboarding-requests-store.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | façade de persistance locale/Supabase, idempotence, lecture paginée et mutations de statut |
| PUBLIC_CONTRACTS | exports de persistance et types `PartnerOnboardingRequestRecord` conservés |
| SIDE_EFFECTS | lecture/écriture du store local, RPC et tables Supabase, projection annuaire |
| MAIN_CONSUMERS | onboarding partenaires, creator inbox, routes admin et tests de persistance |
| TEST_BOUNDARY | tests du store et contrats creator inbox ; les données malformées restent couvertes par l'owner de normalisation |
| COUPLING | normalisation des lignes et écriture partagent le type record mais pas les responsabilités d'exécution |
| NATURAL_EXTRACTION_BOUNDARY | conversion des entrées legacy/Supabase vers le record d'un côté ; persistence/idempotence de l'autre |
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | `onboarding-requests-normalization.ts` porte les validations de forme et la projection de colonnes ; le store reste une façade courte qui conserve les chemins Supabase/fichier et les effets dans leur ordre historique |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver les normalisations fail-closed, l'idempotence et les chemins Supabase/fichier |
| NEXT_TRIGGER | nouveau contrat de persistance ou de normalisation consommé indépendamment |

#### `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | persistance et lecture des snapshots hebdomadaires Codex, fallback local et projection Supabase |
| PUBLIC_CONTRACTS | `buildCodexUsageWeeklySnapshot`, lectures/écriture hebdomadaires et façade de compatibilité mensuelle |
| SIDE_EFFECTS | accès Supabase et store local avec fallback conditionnel |
| MAIN_CONSUMERS | estimateur d'impact, signaux projet, dashboard et tests d'usage Codex |
| TEST_BOUNDARY | tests de snapshots hebdomadaires et estimations mensuelles |
| COUPLING | persistance et projection partageaient les records mais pas les règles de fenêtrage, d'agrégation et de confiance |
| NATURAL_EXTRACTION_BOUNDARY | `codex-usage-estimation.ts` porte agrégation, équivalent mensuel et notes ; le store porte les effets de persistance |
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | l'extraction sépare le calcul pur de projection sans déplacer le contrat public ni les fallbacks de persistance |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver la persistance, les fallbacks et les contrats de snapshots hebdomadaires |
| NEXT_TRIGGER | nouveau contrat de projection mensuelle ou de stockage indépendant |

#### `apps/web/src/lib/actions/map/map-http.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | façade de requête HTTP cartographique, fallback Supabase et assemblage de réponse |
| PUBLIC_CONTRACTS | `buildMapActionsQueryString`, `fetchMapActions`, `FetchMapActionsParams` |
| SIDE_EFFECTS | fetch navigateur, RPC Supabase et lecture des références de pollution |
| MAIN_CONSUMERS | cartes d'actions, couches de rendu et consommateurs du feed public |
| TEST_BOUNDARY | tests de query string, contrats de feed et réponses cartographiques |
| COUPLING | normalisation de lignes, filtrage par scope, mapping de contrats et effets réseau étaient mêlés dans la façade |
| NATURAL_EXTRACTION_BOUNDARY | `map-http-contracts.ts` porte les types de ligne, normalisation, mapping et assemblage pur ; la façade conserve le réseau et le fallback |
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | le découpage conserve le fast path HTTP et le fallback RPC tout en isolant le contrat canonique d'un item cartographique |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver le fast path HTTP, le fallback Supabase, les scopes et les contrats géométriques |
| NEXT_TRIGGER | nouvelle source cartographique ou projection autonome |

#### `apps/web/src/lib/learning/quiz/quiz-bank-admin.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | contrats de filtre et façade du snapshot d'administration du quiz |
| PUBLIC_CONTRACTS | `QuizBankAdminFilters`, `QuizBankAdminQuestion`, `QuizBankAdminSnapshot`, `filterQuizBankAdminQuestions`, `buildQuizBankAdminSnapshot` |
| SIDE_EFFECTS | aucun effet externe ; agrégation des rapports d'audit fournis par les owners quiz |
| MAIN_CONSUMERS | écran d'administration du quiz et tests de catalogue/audit |
| TEST_BOUNDARY | tests de filtrage et de construction du snapshot ; la projection de métadonnées est testée par l'owner dédié |
| COUPLING | types de filtre et projection d'audit partageaient un fichier mais avaient des évolutions différentes |
| NATURAL_EXTRACTION_BOUNDARY | `quiz-bank-admin-snapshot.ts` porte la projection audit/source/priority ; la façade conserve types et filtrage |
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | les critères de qualité, sources, suggestions et priorités forment une projection autonome ; l'API de filtre reste stable et légère |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver les contrats de filtrage et la façade publique du snapshot d'administration |
| NEXT_TRIGGER | nouveau consommateur indépendant du rapport d'audit ou du catalogue |

#### `apps/web/src/components/admin/admin-dashboard-ui.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | primitives de navigation, actions, métriques et façade des composants du dashboard admin |
| PUBLIC_CONTRACTS | exports `AdminHeroStrip`, `AdminPillLink`, `AdminSectionHeader`, `AdminOperationalMetricGrid`, `AdminActionGrid`, `AdminInfoBanner`, `AdminProfileSwitchStrip` |
| SIDE_EFFECTS | navigation Link uniquement ; aucun accès de données ou effet admin dans ces composants de présentation |
| MAIN_CONSUMERS | pages et sections du dashboard admin |
| TEST_BOUNDARY | tests UI admin et contrats de rendu des métriques/actions |
| COUPLING | les cartes d'action/métriques et les bandeaux d'identité partageaient des tokens mais pas le même contrat de rendu |
| NATURAL_EXTRACTION_BOUNDARY | `admin-dashboard-banners.tsx` porte les bandeaux, l'icône et les tokens associés ; la façade conserve actions, métriques et navigation |
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | le split retire une famille UI autonome sans modifier les exports historiques ni dupliquer les tokens visuels |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver les exports UI, les tokens visuels et les contrats des cartes admin |
| NEXT_TRIGGER | nouvelle famille de panneau autonome ou état propre réintroduit dans la façade |

#### `apps/web/src/app/api/api-boundary-analysis.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | parcours de l'inventaire API, extraction des méthodes et résolution des chemins locaux nécessaires aux modules d'analyse |
| PUBLIC_CONTRACTS | `apiRoot`, `contractedApiFamilies`, `walk`, `extractRouteMethods`, `withoutComments`, `resolveLocalModulePath`, `LocalModuleSources` et `contractEntries` |
| SIDE_EFFECTS | lecture du tree local et analyse TypeScript en mémoire uniquement |
| MAIN_CONSUMERS | `api-boundary.test.ts`, `api-boundary.evidence.test.ts`, `api-boundary-route-analysis.ts` et `api-boundary-evidence-analysis.ts` |
| TEST_BOUNDARY | l'inventaire et les méthodes sont exercés par les deux suites ; les preuves d'invocation et de délégation restent dans leur owner dédié |
| COUPLING | primitives neutres partagées par les suites, sans déclaration Vitest et sans analyse de preuve spécifique |
| NATURAL_EXTRACTION_BOUNDARY | `api-boundary-evidence-analysis.ts` porte la résolution des imports, l'AST, les alias, les délégations et la construction des preuves |
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | l'inventaire et l'analyse d'évidence ont des owners distincts ; ce module conserve seulement les primitives de parcours réellement communes, tandis que les assertions restent dans les suites indépendantes |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | conserver les primitives d'inventaire et d'extraction des méthodes comme owner partagé, sans absorber l'analyse d'évidence |
| NEXT_TRIGGER | nouvelle analyse de parcours ou de méthodes qui ne relève plus de l'inventaire partagé |

#### `apps/web/src/app/api/api-boundary-evidence-analysis.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | résolution des imports locaux, analyse AST des références et appels, parcours des alias/délégations et construction des entrées d'évidence |
| PUBLIC_CONTRACTS | `collectLocalModuleSources`, `missingEvidence` et `buildInlineRouteEntry` pour les deux suites de sécurité API |
| SIDE_EFFECTS | lecture des sources locales et analyse TypeScript en mémoire uniquement ; aucune déclaration Vitest ni effet métier |
| MAIN_CONSUMERS | `api-boundary.test.ts` et `api-boundary.evidence.test.ts` |
| TEST_BOUNDARY | l'analyseur reste neutre ; les assertions d'inventaire et les 10 scénarios d'évidence restent dans leurs suites respectives |
| COUPLING | dépend des primitives d'inventaire de `api-boundary-analysis.ts`, sans importer de fichier `*.test.ts` |
| NATURAL_EXTRACTION_BOUNDARY | l'inventaire/méthodes restent dans `api-boundary-analysis.ts` ; les preuves d'invocation, alias, propriétés, callbacks et délégations restent ici |
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | l'extraction supprime le double enregistrement Vitest et fournit une source canonique unique pour l'analyse d'évidence sans dupliquer les assertions de sécurité |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | conserver l'owner neutre de résolution des imports, analyse AST, délégations et preuves d'invocation |
| NEXT_TRIGGER | nouvelle famille de preuve ou dépendance aux déclarations Vitest dans l'analyseur |

#### `apps/web/src/app/api/reports/generations/route.test.helpers.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | mocks des frontières AuthN, quota, sources, audit et persistance ; defaults de setup par méthode |
| PUBLIC_CONTRACTS | `reportGenerationMocks`, `setupPostReportGenerationDefaults`, `setupGetReportGenerationDefaults` |
| SIDE_EFFECTS | aucun effet externe ; mocks Vitest contrôlés |
| MAIN_CONSUMERS | suites GET, POST courant et reprise de persistance |
| TEST_BOUNDARY | le harness ne contient pas d'assertion métier ; les suites spécialisées portent les scénarios |
| COUPLING | partage explicite des mêmes mocks afin de prouver le même ordre de frontière HTTP |
| NATURAL_EXTRACTION_BOUNDARY | setup/mocks d'un côté, assertions par flux observable de l'autre |
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | harness partagé pour éviter la duplication de mocks lors du découpage des contrats GET/POST |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver les mocks de frontières et les defaults par méthode |
| NEXT_TRIGGER | nouveau owner de mock ou nouvelle frontière de route indépendante |

#### `apps/web/src/app/api/reports/generations/route.get.test.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | lecture historique owner-scoped, filtres invalides et erreur du store |
| PUBLIC_CONTRACTS | GET `/api/reports/generations` |
| SIDE_EFFECTS | mocks du store historique et de l'authentification |
| MAIN_CONSUMERS | route de génération et page historique des rapports |
| TEST_BOUNDARY | lecture seule ; les quotas et mutations restent explicitement absents |
| COUPLING | partage du harness sans dépendre des assertions POST |
| NATURAL_EXTRACTION_BOUNDARY | famille GET autonome par méthode HTTP et absence d'effets de quota |
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | séparation par contrat de lecture pour ramener le fichier principal sous la cible sans couper des scénarios |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver l'ownership, les filtres et l'absence d'accès quota en lecture |
| NEXT_TRIGGER | nouvelle famille de lecture historique indépendante |

#### `apps/web/src/app/api/reports/generations/route.persistence.test.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | reprise après réponse de persistance perdue, incertitude, audit post-écriture et quota dupliqué |
| PUBLIC_CONTRACTS | POST `/api/reports/generations` et ses réponses d'incertitude |
| SIDE_EFFECTS | mocks de persistance, réservation/libération de quota et audit |
| MAIN_CONSUMERS | route de génération et owner de reprise directe |
| TEST_BOUNDARY | erreurs de persistance et d'audit ; flux nominaux et validation restent dans la suite POST principale |
| COUPLING | même harness et même route, avec invariants de non-réinsertion et de conservation du quota |
| NATURAL_EXTRACTION_BOUNDARY | famille de récupération d'écriture autonome par contrat d'erreur |
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | extraction des scénarios de persistance sans déplacer l'ordre AuthN → quota → source → écriture |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver la reprise d'insertion, l'audit et la conservation du quota |
| NEXT_TRIGGER | nouveau contrat de persistance non partagé avec POST |

#### `apps/web/src/app/api/actions/[actionId]/group-join/route.post.test.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | modération admin et mutations ordinaires de participation group-join |
| PUBLIC_CONTRACTS | POST `/api/actions/:actionId/group-join` hors revendications post-action |
| SIDE_EFFECTS | mocks des participants, audit, progression et persistance |
| MAIN_CONSUMERS | route dynamique group-join et file de modération |
| TEST_BOUNDARY | comportements admin et ordinaires ; les revendications post-action ont leur suite dédiée |
| COUPLING | partage du harness canonique et des mêmes garde-fous d'identité |
| NATURAL_EXTRACTION_BOUNDARY | séparation par `requestKind` et ownership métier, pas par longueur de fichier |
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | la famille post-action extraite laisse la modération et la participation ordinaire dans une suite cohésive sous 800 lignes |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver la modération admin et les mutations ordinaires de participation |
| NEXT_TRIGGER | nouveau flux POST indépendant des décisions de modération |

#### `apps/web/src/lib/route/route-operational.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | construction de la copie opérationnelle issue du planner, projection du meeting point, gestion des zones/boucles, préparation du handoff d'action et normalisation des formats historiques |
| PUBLIC_CONTRACTS | `OperationalRoute`, `PublicOperationalRoute`, `createOperationalRouteFromRecommendation`, `projectMeetingPointFromGeometry`, `getOperationalRouteMeetingPoint`, `createPlannerActionPreparationData`, `updateOperationalRouteZone`, `removeOperationalRouteLoop`, `getPublicOperationalRouteSegments`, `isOperationalRoute`, `normalizeOperationalRoute` et `normalizeActionPreparationData` |
| SIDE_EFFECTS | aucun accès réseau ni persistance ; construction et normalisation de valeurs en mémoire, avec clonage des géométries pour éviter les alias de mutation |
| MAIN_CONSUMERS | planner et réponses de route, handoff vers la création d'action, refresh/versioning de route, préparation d'action, validation de contrat et suites `route-operational*.test.ts` |
| TEST_BOUNDARY | tests de contrat de route opérationnelle, budget/meeting point, refresh, handoff et tests de validation de préparation ; les appels OSRM et la persistance restent dans leurs owners respectifs |
| COUPLING | les zones, boucles, arrêts techniques et géométries partagent le même invariant de provenance planner/manual ; la normalisation legacy doit produire exactement le même modèle que la création actuelle |
| NATURAL_EXTRACTION_BOUNDARY | un validateur/adaptateur de format pourrait être isolé si sa sortie devient un contrat consommé séparément ; les opérations de projection, édition et handoff doivent rester sous le même owner pour éviter une seconde vérité géométrique |
| ARCHITECTURE_DECISION | COHESIVE_SINGLE_FILE |
| RATIONALE | le fichier dépasse le seuil REVIEW mais porte un contrat de domaine unique : transformer une recommandation en route opérationnelle et préserver sa provenance jusqu'au handoff. Les helpers de géométrie, calibration, planner et préparation sont déjà externalisés. Une extraction immédiate des type guards ou des petits adapters ne réduirait pas le couplage et risquerait de dissocier la compatibilité legacy de la normalisation canonique ; la conservation est donc justifiée jusqu'à l'apparition d'un contrat public indépendant |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver la provenance planner/manual, les zones, les boucles et la compatibilité des routes historiques |
| NEXT_TRIGGER | nouveau contrat public de normalisation/validation ou consommateur indépendant de projection |

#### `apps/web/src/lib/actions/action-buddy.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | lecture de l'état buddy, disponibilité mentor, demandes, propositions, transitions de résolution et contact owner-scoped |
| PUBLIC_CONTRACTS | `loadActionBuddyState`, `createActionBuddyRequest`, `setActionBuddyAvailability`, `removeActionBuddyAvailability`, `createActionBuddyProposal`, `cancelActionBuddyRequest`, `withdrawActionBuddyProposal`, `declineActionBuddyProposal`, `rejectActionBuddyProposal`, `acceptActionBuddyProposal` et `resolveActionBuddyContact` |
| SIDE_EFFECTS | lectures et mutations Supabase sur availability/requests/proposals, avec contrôles d'action future, inscription confirmée, ownership, conflits d'unicité et transitions atomiques |
| MAIN_CONSUMERS | routes `/api/actions/[actionId]/buddy/**`, panneau Action Buddy, contexte chat et suites de routes/panneau/migration contractuelles |
| TEST_BOUNDARY | `action-buddy.test.ts`, routes buddy et tests UI du panneau ; les contrats de migrations vérifient les tables/RPC sans devenir un owner métier parallèle |
| COUPLING | toutes les transitions réutilisent les mêmes règles temporelles, inscription confirmée, acteur courant, demande/proposition courante et erreurs fail-closed ; séparer lecture et écriture sans façade commune dupliquerait ces garde-fous |
| NATURAL_EXTRACTION_BOUNDARY | lecture d'état et mutations pourraient devenir deux modules seulement si un contrat de lecture sans transitions ou un backend de mutation indépendant est consommé ; les erreurs et préconditions doivent rester partagées par un owner explicite |
| ARCHITECTURE_DECISION | COHESIVE_SINGLE_FILE |
| RATIONALE | le fichier est un service métier unique, non un mélange de domaine et d'infrastructure : ses fonctions portent toutes le même protocole buddy et appellent les primitives de store/temporal déjà séparées. La convergence des routes vers un helper limité à la normalisation des paramètres et des en-têtes reste une frontière de transport, pas un second owner métier. Une scission par fonction ou par endpoint créerait plusieurs owners des transitions et augmenterait le risque d'autorisation divergente ; le REVIEW est donc justifié tant qu'aucun contrat indépendant n'est démontré |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver l'AuthZ d'action, l'idempotence, les transitions de demande/proposition et la résolution de contact |
| NEXT_TRIGGER | nouveau backend de buddy, contrat de lecture indépendant ou persistance séparée des mutations |

#### `apps/web/src/components/actions/action-drawing-map.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | façade client de la carte, cycle de vie Leaflet Draw, conversion Leaflet → ActionDrawing, provenance de géométrie, viewport, accessibilité et undo |
| PUBLIC_CONTRACTS | `ActionDrawingMapProps` et `ActionDrawingMap`, avec `value`/`drawing`, `onChange`/`onDrawingChange`, `drawingSource`, previews, read-only et undo |
| SIDE_EFFECTS | montage/démontage de couches et contrôles Leaflet, abonnements media query, événements draw et callbacks contrôlés vers le formulaire ; aucune route réseau n'est déclenchée depuis le navigateur |
| MAIN_CONSUMERS | sections de géométrie de déclaration d'action et tests `action-drawing-map.behavior.test.tsx`, `action-drawing-map.geometry.test.ts` et présentation |
| TEST_BOUNDARY | tests jsdom du cycle de vie Leaflet, provenance manual/routed, polygon/polyline, read-only/mobile, accessibilité et restauration undo ; la résolution géométrique et l'undo ont leurs modules/tests dédiés |
| COUPLING | la façade doit synchroniser valeur externe, couche Leaflet, undo et callbacks sans inventer de géométrie ; `action-drawing-map.geometry`, `presentation` et `undo` sont déjà des owners distincts |
| NATURAL_EXTRACTION_BOUNDARY | un controller Leaflet autonome est possible si le cycle de vie des contrôles et événements croît encore ; le rendu de carte, l'accessibilité et l'undo ne doivent pas être recouplés dans un helper monolithique |
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | le fichier est au-dessus de REVIEW mais la responsabilité publique est une façade de carte client et ses seams autonomes existent déjà : géométrie, présentation, undo et toast. Extraire seulement des lignes JSX ou déplacer le controller intact ne réduirait pas le couplage observable ; la décision conserve la façade et surveille la croissance du cycle de vie Leaflet avant un split substantiel |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver la frontière client Leaflet, la provenance manual/routed, l'undo et l'accessibilité des contrôles |
| NEXT_TRIGGER | nouvelle responsabilité autonome de cycle de vie Leaflet ou de rendu hors de la façade |

#### `apps/web/src/lib/actions/volunteer-participation-research.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | modèle expérimental de rendement cleanwalk, validation d'affectation des collecteurs, projections avec références explicites, comparaison A/B/C et sensibilité au coefficient retraités |
| PUBLIC_CONTRACTS | `simulateCleanwalkYield`, `compareCleanwalkYieldModels`, `compareRetiredWasteCoefficientSensitivity`, types de configuration/modèle/capacité/projection et marqueurs `RESEARCH / NON NORMATIF` |
| SIDE_EFFECTS | aucun effet externe ; calculs purs, sans écriture ni lecture de mesure terrain ; les helpers de composition, projection et disponibilité sont déjà externalisés |
| MAIN_CONSUMERS | uniquement les tests de recherche et les usages d'analyse explicitement non normatifs ; la formule CURRENT de participation reste dans `volunteer-participation.ts` |
| TEST_BOUNDARY | `volunteer-participation-research.test.ts` couvre modèles, compositions invalides, affectations explicites, indisponibilités, projections, comparaisons et sensibilité ; les tests de participation CURRENT restent séparés |
| COUPLING | les comparaisons et la sensibilité doivent appeler le même simulateur et conserver les mêmes coefficients, statuts et distinctions AVAILABLE/NOT_APPLICABLE/INVALID_INPUT |
| NATURAL_EXTRACTION_BOUNDARY | un nouveau modèle expérimental ou une source de référence versionnée pourrait devenir un module de modèle ; les helpers génériques actuels sont déjà dans `volunteer-participation-research-helpers.ts` |
| ARCHITECTURE_DECISION | COHESIVE_SINGLE_FILE |
| RATIONALE | le fichier dépasse REVIEW mais reste l'owner unique d'un contrat de recherche versionné. Les calculs internes partagent les coefficients, le statut non normatif et le simulateur ; scinder par modèle ou par fonction créerait des divergences silencieuses. La séparation avec la participation CURRENT est déjà explicite et testée ; aucune extraction supplémentaire n'est justifiée sans nouveau modèle ou consommateur autonome |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | conserver le caractère RESEARCH / NON NORMATIF, les modèles A/B/C et la formule CURRENT séparée |
| NEXT_TRIGGER | nouveau modèle expérimental, source de référence ou contrat de simulation indépendant |

#### `apps/web/src/lib/actions/formalities-workflow.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | schéma d'état server-managed, trace canonique des formalités, fingerprint de dépendances, construction de progression, transitions, normalisation et blocage de publication |
| PUBLIC_CONTRACTS | `buildFormalitiesWorkflowState`, `applyFormalitiesWorkflowTransition`, `normalizeActionFormalitiesWorkflow`, préservation/sanitation de préparation et `isFormalitiesPublicationBlocked`/`getBlockedRequiredFormalityIds` |
| SIDE_EFFECTS | aucun accès réseau ; création de snapshots et transitions en mémoire, avec conservation explicite du contexte server-managed pour les PATCH/create |
| MAIN_CONSUMERS | panneaux de formalités et qualification, routes `/formalities` et `/publish`, validation de formulaire, préparation/update d'action et suites `formalities-workflow`/publication |
| TEST_BOUNDARY | tests de workflow, qualification/publication, routes formalities/publish et persistance d'update ; les catalogues de formalités et la qualification restent leurs owners |
| COUPLING | trace, progress, contentVersion et fingerprint doivent évoluer ensemble pour invalider une preuve devenue obsolète et bloquer la publication sans perte d'état server-managed |
| NATURAL_EXTRACTION_BOUNDARY | un validateur de trace ou un calculateur de fingerprint pourrait être extrait si son contrat devient indépendant ; les transitions, la normalisation et la préservation de contexte doivent rester alignées sur le même schéma |
| ARCHITECTURE_DECISION | COHESIVE_SINGLE_FILE |
| RATIONALE | le REVIEW signale un workflow dense mais cohésif : toutes les fonctions construisent, vérifient ou préservent le même état canonique et ses transitions. Une séparation par type guard ou par export déplacerait la logique sans réduire le couplage de version/invalidation ; la conservation est justifiée jusqu'à l'apparition d'un consommateur ou contrat autonome |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver le fingerprint canonique, l'invalidation par dépendance et le blocage de publication |
| NEXT_TRIGGER | nouvelle famille de formalités, persistance ou qualification consommée indépendamment |

#### `apps/web/src/components/chat/ui/chat-message-item.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | façade de message Chat, identité, métadonnées, annonces, sondages et pièces jointes sûres |
| PUBLIC_CONTRACTS | `ChatMessageItem` et ses callbacks de vote/retry |
| SIDE_EFFECTS | rendu contrôlé, callbacks de vote au boundary parent ; aucune persistance directe |
| MAIN_CONSUMERS | listes Chat, messages de canal et tests comportementaux de rendu/vote |
| TEST_BOUNDARY | `chat-message-item.behavior.test.tsx` couvre identité, sécurité des pièces jointes, annonces, sondages, retry et retrait de vote |
| COUPLING | le shell fournit les états de vote et la façade conserve le même contrat de message ; les sous-rendus ne possèdent pas l'état métier |
| NATURAL_EXTRACTION_BOUNDARY | un nouveau type de message avec état autonome ou une source de contenu distincte ; les helpers de rendu actuels restent cohésifs |
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | le lot sépare le corps, l'en-tête, la présentation de surface et les règles de sécurité/formatage sans déplacer l'état de vote ni créer un second owner. Le finding de longueur a disparu ; la complexité restante est portée par la présentation conditionnelle et doit être réévaluée avant toute extraction supplémentaire |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver les URLs de pièces jointes validées, les callbacks de vote et les libellés produits |
| NEXT_TRIGGER | nouveau type de message ou cycle de rendu autonome consommé indépendamment |

#### `apps/web/src/components/sections/rubriques/community/action-needs-panel.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | lecture et mutation des besoins communautaires publics, formulaires de création/édition manager et rendu des cartes |
| PUBLIC_CONTRACTS | `ActionNeedsPanel`, création/édition/accomplissement/annulation via `needs-http` |
| SIDE_EFFECTS | lectures et mutations HTTP bornées à l'action publique, rechargement après mutation et affichage des erreurs |
| MAIN_CONSUMERS | section communautaire et suites comportementales des besoins |
| TEST_BOUNDARY | tests UI/API des besoins, avec contrats de visibilité publique et transitions manager ; les droits serveur restent dans `needs-http`/routes |
| COUPLING | le controller partage le chargement et les transitions avec les formulaires ; la carte ne possède aucun droit supplémentaire |
| NATURAL_EXTRACTION_BOUNDARY | un contrat indépendant de formulaire ou de persistance, ou une nouvelle famille de besoins ; ne pas extraire uniquement des lignes JSX |
| ARCHITECTURE_DECISION | COHESIVE_SINGLE_FILE |
| RATIONALE | le lot sépare le controller de données et les formulaires manager dans le même owner afin de conserver le scope public, le rechargement et les erreurs. Le finding de complexité restant est mesuré et non masqué ; une extraction supplémentaire attend un contrat autonome pour ne pas fabriquer une façade concurrente |
| PRIORITY | AFTER_ACTIVE_CHANGES |
| DEPENDENCY_OR_BLOCKER | préserver les droits de gestion, le filtre des besoins annulés/privés et les transitions confirmées côté serveur |
| NEXT_TRIGGER | nouveau contrat de formulaire/persistance consommé indépendamment |

<!-- RADAR:HUMAN_DECISIONS:END -->
