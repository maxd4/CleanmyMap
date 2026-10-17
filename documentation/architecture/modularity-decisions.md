# Registre canonique des décisions de modularisation

Ce registre est la source humaine canonique. Le radar `monolith-split-plan.md` est généré séparément à partir des mesures du dépôt et de ce registre. Les décisions acquises sont conservées même après modularisation afin de préserver les invariants, contrats et déclencheurs de revue.

<!-- RADAR:HUMAN_DECISIONS:BEGIN -->
| PATH | ARCHITECTURE_DECISION | PRIORITY | DEPENDENCY_OR_BLOCKER | NEXT_TRIGGER |
| --- | --- | --- | --- | --- |
| `apps/web/src/components/sections/rubriques/partners-network-section.tsx` | ALREADY_MODULARIZED | NONE | préserver le contrat de section | nouvelle responsabilité autonome réintroduite dans la façade |
| `apps/web/src/components/chat/chat-shell.tsx` | ALREADY_MODULARIZED | NONE | aucun ; les frontières client restent séparées et les effets existants sont préservés | nouvelle responsabilité autonome réintroduite dans la façade ou couplage anormal entre owners |
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
| `apps/web/src/lib/actions/pollution/corridor-history.ts` | COHESIVE_SINGLE_FILE | NONE | préserver les constantes géographiques, `CorridorPolyline`/`CorridorHistory` et l'ordre matching → historique → score ; ne pas créer une source de vérité commune parallèle | nouveau mode de corridor ou sous-modèle historique indépendant |
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
| `apps/web/src/components/actions/action-declaration/before/use-before-action-workflow.ts` | DEFERRED_SPLIT | AFTER_ACTIVE_CHANGES | préserver les modifications utilisateur, le premier identifiant persistant et la publication toujours explicite | cycles de vie hydration/champs/persistance-publication indépendants avec contrats de reprise démontrés |

### Décisions établies — grille détaillée

#### `apps/web/src/components/sections/rubriques/partners-network-section.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | catalogue partenaires, recherche locale, rendu de la rubrique |
| PUBLIC_CONTRACTS | props `fr`, contrat de section et contact public |
| SIDE_EFFECTS | lecture de la configuration de contact |
| MAIN_CONSUMERS | registre des rubriques et rendu de page |
| TEST_BOUNDARY | composants de rubrique et helpers de recherche |
| COUPLING | données de partenaires + présentation + interaction |
| NATURAL_EXTRACTION_BOUNDARY | directory/query, filtres, résultats, aside éditorial et shell |
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | le shell conserve le contrat public tandis que l'interaction de recherche, les résultats et l'aside éditorial ont des owners explicites |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver le contrat de section |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans la façade |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | contexte/données, navigation, sélection/vue et thread/composer ont des owners explicites ; la façade conserve l'API publique et orchestre le layout |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | aucun ; les frontières client restent séparées et les effets existants sont préservés |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans la façade ou couplage anormal entre owners |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | le hook/loader overview, la navigation, les panels et les états sont déjà des owners explicites composés par une façade cohésive |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | conserver l'orchestration overview/navigation/panels |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans la façade |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | les suggestions, contrôles, shell et transformations territoriales ont déjà des owners explicites ; la façade publique reste stable |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver les façades et owners suggestions/controls/shell |
| NEXT_TRIGGER | nouveau contrat géographique autonome |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | le contrôleur porte le cycle de vie réseau/soumission et les sous-vues portent formulaire, suivi, guidance et états sans déplacer le contrat public |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver le contrôleur, les états de soumission et les sous-vues |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans la façade |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | la validation et les primitives de stockage sont désormais des owners cohésifs ; la façade conserve les séquences d'autorisation, de claim, de vérification et de nettoyage sans déplacer intacte une orchestration |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver la vérification du contenu, l'ownership, les états d'upload et la suppression sans fuite de chemin privé |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans la façade |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | les contrats, la normalisation, la persistance et les métriques ont des owners séparés ; la façade conserve les mutations publiques et l'ordre des effets sans seconde source de vérité |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver les filtres owner, les curseurs, l'échec fermé des RPC et l'absence de nettoyage de captures hors contrat |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans la façade |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | les responsabilités de rendu autonomes sont extraites en sous-composants ; la façade garde l'état partagé, les callbacks et l'ordre de soumission pour conserver le parcours UI |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver les textes, le honeypot, les validations, le comportement Clerk et la révocation des prévisualisations |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans la façade |

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
| ARCHITECTURE_DECISION | COHESIVE_SINGLE_FILE |
| RATIONALE | fichier data/config cohésif ; la taille reste un signal de lisibilité, pas une raison de disperser le catalogue |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | aucun |
| NEXT_TRIGGER | ajout d'une famille de données indépendante ou changement du contrat de catalogue |

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
| ARCHITECTURE_DECISION | COHESIVE_SINGLE_FILE |
| RATIONALE | cohésion de page et façades historiques justifient le fichier unique tant qu'aucun nouveau sous-flux n'est ajouté |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver les deux exports publics |
| NEXT_TRIGGER | ajout d'une nouvelle famille de méthodologie ou rupture du contrat legacy |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | la taille résiduelle ne correspond plus à un monolithe architectural ; ne pas refactorer mécaniquement |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | aucun |
| NEXT_TRIGGER | nouvelle responsabilité métier ajoutée à la façade |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | l'orchestration est désormais cohésive et les responsabilités autonomes ont des owners dédiés ; ne pas recréer de hooks artificiels |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver l'API publique du hook et les contrats draft, géométrie, validation, payload et submit |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans la façade ou couplage anormal entre owners |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | façade HTTP courte ; Markdown appartient à route-markdown.ts, viewer HTML/CSS à route-viewer.ts et lecture/adaptation documentaire à route-document.ts ; GET, registre public, anti-path-traversal, MIME/cache/noindex et orchestration HTTP restent dans route.ts |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver résolution anti-path-traversal, MIME, headers et contrat SEO |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans la façade ou croissance substantielle d'un des owners extraits |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | façade de composition des schémas create/update ; géométrie/route, mesures déchets, identité/organisateur, formalités et préparation sont distribuées vers leurs owners spécialisés |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver l'owner unique des schémas create/update et l'ordre des validations |
| NEXT_TRIGGER | nouvelle responsabilité indépendante réintroduite dans la façade ou couplage anormal entre sous-modules |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | façade publique minimale ; responsabilités contenu, primitives et sérialisation distribuées vers des owners spécialisés |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver octets PDF, format des lignes et PdfReportPayload |
| NEXT_TRIGGER | nouvelle responsabilité substantielle réintroduite dans la façade ou couplage anormal entre sous-modules |

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
| ARCHITECTURE_DECISION | DEFERRED_SPLIT |
| RATIONALE | le module reste l'owner CURRENT de la résolution d'état d'un lieu : `observed` et `projected_today` partagent les mêmes buckets, identités, historiques et sélection des observations ; aucune évolution indépendante n'est démontrée dans ce lot |
| PRIORITY | LATER |
| DEPENDENCY_OR_BLOCKER | préserver le bucket de lieu et la distinction observation/projection ; ne pas créer une source de vérité commune ni séparer les étapes privées sans contrat indépendant |
| NEXT_TRIGGER | évolution indépendante des modèles observed/projected_today ou du modèle de repollution |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | matching, dérivation historique, calibration et projection ont des contrats autonomes ; la façade conserve les imports historiques et la détermination des owners |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver matching spatial, complétude, confiance et projections |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans la façade |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | pool, audits, géométrie et sélection ont des frontières fonctionnelles démontrées ; la façade conserve les imports historiques et les mocks existants |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver budgets planner, audits et contrats API route |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans la façade |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | les contrôles, la dérivation pure du view-model et le rendu des résultats ont des responsabilités autonomes ; RouteSection conserve l'orchestration, l'Auth state et le handoff planner |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver les textes, états async, origine carte, deep-links et CTA planner |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans RouteSection ou couplage anormal entre owners |

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
| ARCHITECTURE_DECISION | EXTRACTED_PURE_CONTRACT |
| RATIONALE | `report-pdf-data.ts` porte les fonctions pures et peut être consommé par le serveur sans importer un module client ; le fichier `.tsx` conserve les états et helpers UI |
| PRIORITY | CURRENT |
| DEPENDENCY_OR_BLOCKER | préserver l'usage du renderer PDF commun et la compatibilité des snapshots historiques |
| NEXT_TRIGGER | évolution indépendante des modules ou du contrat PDF |

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
| ARCHITECTURE_DECISION | COHESIVE_SINGLE_FILE |
| RATIONALE | la taille vient principalement des contenus localisés et des branches de décision d'un moteur unique ; un split par bloc de texte réduirait la lisibilité |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | conserver réponses FR/EN et projection canonique Waste alignées |
| NEXT_TRIGGER | famille de règles indépendante ou catalogue de contenu autonome démontré |

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
| ARCHITECTURE_DECISION | COHESIVE_SINGLE_FILE |
| RATIONALE | les helpers servent un même contrat de trace explicable ; un seul owner du contrat RouteRecommendationTrace doit être conservé |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | un seul owner du contrat RouteRecommendationTrace et de sa construction |
| NEXT_TRIGGER | nouveau sous-contrat de trace consommé indépendamment du builder principal |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | le client/validateur activity, les panneaux d'activité et de crédibilité, les visuels et la façade de composition ont des owners explicites |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver fallback, contrat activity, accessibilité et façades exportées |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans la façade |

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
| ARCHITECTURE_DECISION | COHESIVE_SINGLE_FILE |
| RATIONALE | il s'agit d'un owner canonique unique de configuration UI, sans mélange d'effets ou de contrats indépendants |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | owner canonique unique BackdropToneKey -> tokens CSS |
| NEXT_TRIGGER | second système de thème ou familles de tokens réellement indépendantes |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | les owners calculs purs, pagination Supabase et historique sont séparés avec des contrats explicites ; la façade conserve uniquement la compatibilité publique |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver pagination exhaustive, snapshots et classification canonique |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans la façade |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | query/filter, sélection/details, review participation, export et composition UI ont des owners dédiés ; la façade orchestre les contrats |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver AuthZ admin, review participation et états asynchrones |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans la façade ou couplage anormal entre owners |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | façade publique minimale ; préparation/hydratation, résolution géométrie/route, mesures, identité/organisateur et assemblage final sont isolés sans dupliquer FormState, smart assist ou valeurs dérivées |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver FormState, géométrie finale, smart assist et payload create |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans la façade ou divergence entre owners |

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
| ARCHITECTURE_DECISION | COHESIVE_SINGLE_FILE |
| RATIONALE | pipeline unique de partitionnement et métriques ; une extraction par helper augmenterait le couplage |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | pipeline unique de partitionnement et métriques |
| NEXT_TRIGGER | nouvelle stratégie de partition autonome ou nouveau contrat planner |

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
| ARCHITECTURE_DECISION | COHESIVE_SINGLE_FILE |
| RATIONALE | moteur unique de critères et rapport d'audit ; le découpage des patterns disperserait le contrat |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | moteur unique de critères et rapport d'audit |
| NEXT_TRIGGER | nouveau domaine de qualité indépendant |

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
| ARCHITECTURE_DECISION | COHESIVE_SINGLE_FILE |
| RATIONALE | owner unique de l'estimation infrastructure ; les calculs restent internes au même modèle |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | owner unique de l'estimation infrastructure ; calculs internes au même modèle |
| NEXT_TRIGGER | nouvelle famille de service réellement autonome ou API publique indépendante |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | les responsabilités autonomes de normalisation, validation du formulaire et rendu/styles/marqueurs ont été extraites ; ce fichier reste l'owner du view-model cartographique et de l'ancrage infrastructure |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver les conventions de coordonnées, la provenance géométrique, les contrats render/presentation et l'absence de logique de normalisation/validation dupliquée |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans le view-model ou dégradation démontrée des frontières entre domaine, validation, rendu et view-model |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | les trois sections exportées disposent désormais de owners naturels ; la façade ne conserve que le contrat d'import historique |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver la façade d'exports, BaseSectionProps, validation, focus et updateField |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans la façade ou couplage anormal entre owners |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | la façade reste l'owner du DTO public tandis que les étapes de composition sont des builders internes purs et testables ; aucun contrat API n'est déplacé |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver DTO, planner proof/snapshot, calibration et la façade `buildRouteRecommendationResponse` |
| NEXT_TRIGGER | nouveau mode de réponse ou sous-contrat consommé indépendamment |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | lecture/recherche, review et mutation admin ont des owners dédiés ; la façade conserve les exports de compatibilité |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver AuthZ, ownership, idempotence, audit et ordre des mutations |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans la façade ou divergence de contrat |

#### `apps/web/src/lib/actions/pollution/corridor-history.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | projection géographique, matching de polylignes, groupement d'actions par corridor, historique et synthèse de scores |
| PUBLIC_CONTRACTS | types `Corridor*`, `matchCorridorPolylines`, `groupActionsByCorridor`, `findCorridorHistoryForAction`, `summarizeCorridorHistory` |
| SIDE_EFFECTS | aucun effet externe ; calculs purs |
| MAIN_CONSUMERS | couches map, modèles de popup corridor/action et historique pollution |
| TEST_BOUNDARY | `corridor-history.test.ts`, tests map layers et popups |
| COUPLING | helpers géométriques et agrégation fortement cohésifs autour du concept corridor |
| NATURAL_EXTRACTION_BOUNDARY | aucune extraction obligatoire ; projection et matching forment le cœur du même domaine |
| ARCHITECTURE_DECISION | COHESIVE_SINGLE_FILE |
| RATIONALE | le pipeline projection géographique, sampling, matching, groupement, historique et synthèse de scores reste un contrat corridor unique ; aucun sous-modèle historique ou mode de corridor indépendant n'est démontré dans ce lot |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver les constantes géographiques, `CorridorPolyline`/`CorridorHistory` et l'ordre matching → historique → score ; ne pas créer une source de vérité commune parallèle |
| NEXT_TRIGGER | nouveau mode de corridor ou sous-modèle historique indépendant |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | collection, éditeur et formalités sont des familles HTTP séparées ; la façade conserve les exports publics |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver URL, méthode, payload et erreurs de chaque famille endpoint |
| NEXT_TRIGGER | nouvelle famille de contrat réintroduite dans la façade ou divergence URL/méthode/payload |

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
| ARCHITECTURE_DECISION | COHESIVE_SINGLE_FILE |
| RATIONALE | owner unique du modèle de preuve/confiance/serviceabilité |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | owner unique du modèle de preuve/confiance/serviceabilité |
| NEXT_TRIGGER | nouveau type de preuve autonome ou changement indépendant de matérialisation |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | validation, contexte/destination, persistance/notifications et mapping sont des owners dédiés ; AuthN/AuthZ, rate limit et l'ordre observable restent explicites dans la route |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | aucun ; la frontière serveur reste séparée du client et les contrats POST sont préservés |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans la route ou opacification d'une décision AuthN/AuthZ |

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
| ARCHITECTURE_DECISION | COHESIVE_SINGLE_FILE |
| RATIONALE | owner canonique de la méthodologie scientifique versionnée |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | owner canonique de la méthodologie scientifique versionnée |
| NEXT_TRIGGER | nouvelle version méthodologique ou famille de calculs réellement indépendante |

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
| ARCHITECTURE_DECISION | COHESIVE_SINGLE_FILE |
| RATIONALE | catalogue bilingue unique topics/canaux/guidance ; le découpage disperserait un contrat statique cohésif |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | catalogue bilingue unique topics/canaux/guidance |
| NEXT_TRIGGER | source de contenu externe ou catalogues par canal réellement autonomes |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | façade publique minimale ; responsabilités presets/contrats, narrative, SVG pur et effets navigateur distribuées vers des owners spécialisés |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver IDs presets/bundles, textes, noms de fichiers, dimensions/formats et API publique |
| NEXT_TRIGGER | nouvelle responsabilité substantielle réintroduite dans la façade ou couplage anormal entre sous-modules |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | route réduite à l'orchestration explicite AuthN → parsing → service/cache → réponse ; scope, agrégation, cache et mapping de réponse ont leurs owners |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver AuthN/AuthZ, scope, cache, storage, headers et formats |
| NEXT_TRIGGER | nouvelle responsabilité métier/stockage ajoutée directement au handler |

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
| ARCHITECTURE_DECISION | COHESIVE_SINGLE_FILE |
| RATIONALE | un seul ConditionsPanel porte un état météo fortement partagé ; le découpage immédiat produirait du prop drilling |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | un seul ConditionsPanel et état météo fortement partagé ; éviter prop drilling |
| NEXT_TRIGGER | nouvelle famille de conditions avec état/cycle de vie autonome |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | parsing Markdown et sections/rendu isolés ; fichier restant = compositeur HTML cohérent |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver échappement HTML, Markdown, tableaux, callouts et PdfReportPayload |
| NEXT_TRIGGER | nouvelle responsabilité indépendante ajoutée au compositeur |

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
| ARCHITECTURE_DECISION | ALREADY_MODULARIZED |
| RATIONALE | metadata/territoire, label, handle et adaptateur de persistance ont des owners séparés ; la façade conserve l'ordre de synchronisation et les décisions server-only auditable |
| PRIORITY | NONE |
| DEPENDENCY_OR_BLOCKER | préserver scope utilisateur, service-role server-only, idempotence et ordre d'upsert |
| NEXT_TRIGGER | nouvelle responsabilité autonome réintroduite dans la façade ou opacification AuthN/AuthZ |

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
| ARCHITECTURE_DECISION | DEFERRED_SPLIT |
| RATIONALE | le signal de taille est renforcé par une fonction de façade au-dessus des plafonds de complexité ; les changements récents d'identité, de reprise et de navigation doivent d'abord être stabilisés pour éviter une seconde source d'état |
| PRIORITY | AFTER_ACTIVE_CHANGES |
| DEPENDENCY_OR_BLOCKER | préserver l'isolation par `actionId`, les transitions d'état et l'URL reprenable |
| NEXT_TRIGGER | frontière indépendante et testée entre navigation/sections, état workflow et orchestration de persistance |

#### `apps/web/src/components/actions/action-declaration/before/use-before-action-workflow.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | hydratation d'action/draft/handoff, mises à jour de champs, persistance avant publication et publication explicite |
| PUBLIC_CONTRACTS | hooks `useBeforeActionHydration`, `useBeforeActionFieldUpdates`, `useBeforeActionSubmission`, `useBeforeActionPublication` et helpers de reprise |
| SIDE_EFFECTS | lectures/écritures d'action, draft local, handoff planner, tracking et publication serveur explicite |
| MAIN_CONSUMERS | formulaire avant déclaration et shell de création d'action |
| TEST_BOUNDARY | `use-before-action-workflow.test.ts`, tests du formulaire avant déclaration et tests de reprise/hydratation |
| COUPLING | hydratation, édition locale, persistance et publication partagent l'identité de mutation et le contrat de reprise |
| NATURAL_EXTRACTION_BOUNDARY | lifecycle d'hydratation, mises à jour de champs et persistance/publication, sans dupliquer la source de vérité du formulaire |
| ARCHITECTURE_DECISION | DEFERRED_SPLIT |
| RATIONALE | le fichier atteint le plafond REVIEW après l'extraction déjà réalisée de la préparation ; un découpage immédiat risquerait de séparer les garanties de saisie concurrente, d'identité et de publication avant stabilisation du parcours |
| PRIORITY | AFTER_ACTIVE_CHANGES |
| DEPENDENCY_OR_BLOCKER | préserver les modifications utilisateur, le premier identifiant persistant et la publication toujours explicite |
| NEXT_TRIGGER | cycles de vie hydration/champs/persistance-publication indépendants avec contrats de reprise démontrés |
<!-- RADAR:HUMAN_DECISIONS:END -->
