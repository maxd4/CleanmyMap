# Radar de modularisation et dette structurelle

<!-- RADAR:GENERATED:BEGIN -->
## A. En-tête snapshot

`RADAR_REF=bd7be6d0b3b54a168a81424163de5eae75d0828d`<br>
`RADAR_GENERATED_AT=2026-09-25T19:18:10.950Z`<br>
`RADAR_STATUS=CURRENT_AT_GENERATION`

Commandes réellement utilisées :

`node scripts/reports/generate-modularity-radar.mjs --ref=HEAD`

Le snapshot lit l'arbre Git exact de bd7be6d0b3b54a168a81424163de5eae75d0828d. Le statut
CURRENT_AT_GENERATION décrit l'instant de génération ; un document commité
peut donc rester un snapshot reproductible de cette ref sans prétendre suivre
automatiquement un HEAD ultérieur.

## B. Résumé exécutif

| Mesure factuelle | Valeur |
| --- | ---: |
| Fichiers mesurés | 2496 |
| REVIEW architectural (runtime + data/config) | 64 |
| HARD contrôlé | 0 |
| Tests volumineux | 0 |
| Generated informatifs | 0 |
| PROACTIVE_SPLIT établi | 7 |
| DEFERRED_SPLIT établi | 0 |
| COHESIVE_SINGLE_FILE établi | 2 |
| ALREADY_MODULARIZED établi | 1 |
| Candidats avec plusieurs signaux structurels attribués | 25 |

La taille déclenche une revue, jamais un split mécanique. Les décisions
humaines et les corrélations sont séparées du ratchet quality:top-heavy.

## C. Politique

La politique par KIND est canonique dans
top-heavy-policy.mjs (../../scripts/checks/top-heavy-policy.mjs) et est
consommée par le même moteur que quality:top-heavy. Le générateur ne
redéfinit aucun seuil.

| KIND | REVIEW | HARD | Lecture radar |
| --- | --- | --- | --- |
| runtime | >500 lignes ou >40 KiB | >1000 lignes ou >50 KiB | architecture |
| test | >1000 lignes ou >50 KiB | >1500 lignes ou >80 KiB | lisibilité/cohésion des scénarios |
| data/config | >800 lignes ou >50 KiB | >1500 lignes ou >80 KiB | architecture |
| generated | informatif | informatif | provenance générée + régénérabilité obligatoires |

Un fichier generated n'est exclu que si sa provenance et sa régénérabilité
sont démontrées. Un test volumineux reste un signal de lisibilité et de
cohésion de scénarios, jamais un monolithe runtime par défaut.

## D. Priorités architecturales

| PATH | DECISION | PRIORITY | SIGNALS | BLOCKER / NEXT_TRIGGER |
| --- | --- | --- | --- | --- |
| `apps/web/src/components/sections/rubriques/partners-network-section.tsx` | PROACTIVE_SPLIT | LATER | size: PRESENT | frontière UI/données ; prochain lot de la rubrique |
| `apps/web/src/components/chat/chat-shell.tsx` | PROACTIVE_SPLIT | AFTER_ACTIVE_CHANGES | size: PRESENT; complexity: PRESENT | stabiliser Messagerie ; prochain changement fonctionnel du shell |
| `apps/web/src/components/sections/rubriques/elus-section.tsx` | PROACTIVE_SPLIT | LATER | size: PRESENT | frontière fetch/présentation ; reprise au prochain lot pilotage |
| `apps/web/src/lib/geo/greater-paris-select.tsx` | PROACTIVE_SPLIT | LATER | size: PRESENT; complexity: PRESENT | séparer sélection et suggestions ; reprise au prochain changement géographique |
| `apps/web/src/components/sections/rubriques/feedback-section-dashboard.tsx` | PROACTIVE_SPLIT | LATER | size: PRESENT | séparer shell/formulaire/tracking ; reprise au prochain changement feedback |
| `apps/web/src/app/learn/ressources/learn-ressources-client.data.ts` | COHESIVE_SINGLE_FILE | NONE | size: PRESENT | données et types du catalogue ; aucun déclencheur de split mécanique |
| `apps/web/src/components/sections/rubriques/methodologie-page-client.tsx` | COHESIVE_SINGLE_FILE | NONE | size: PRESENT | contrat de compatibilité des contenus ; nouveau sous-flux indépendant |
| `apps/web/src/components/sections/rubriques/free-plan-services-methodology-visual.impact.tsx` | ALREADY_MODULARIZED | NONE | size: PRESENT | conserver la façade ; nouvelle responsabilité métier dans le fichier |
| `apps/web/src/components/actions/action-declaration/form/use-action-declaration-form.ts` | PROACTIVE_SPLIT | AFTER_ACTIVE_CHANGES | size: PRESENT; complexity: PRESENT | stabiliser le parcours déclaration ; prochain changement du draft ou de la géométrie |
| `apps/web/src/components/reports/web-document/sections.tsx` | PROACTIVE_SPLIT | LATER | size: PRESENT; complexity: PRESENT | frontière naturelle par sections de rapport ; prochain ajout de section |

## E. Décisions établies

<!-- RADAR:HUMAN_DECISIONS:BEGIN -->
| PATH | DECISION | PRIORITY | SIGNALS | BLOCKER / NEXT_TRIGGER |
| --- | --- | --- | --- | --- |
| `apps/web/src/components/sections/rubriques/partners-network-section.tsx` | PROACTIVE_SPLIT | LATER | size: PRESENT | frontière UI/données ; prochain lot de la rubrique |
| `apps/web/src/components/chat/chat-shell.tsx` | PROACTIVE_SPLIT | AFTER_ACTIVE_CHANGES | size: PRESENT; complexity: PRESENT | stabiliser Messagerie ; prochain changement fonctionnel du shell |
| `apps/web/src/components/sections/rubriques/elus-section.tsx` | PROACTIVE_SPLIT | LATER | size: PRESENT | frontière fetch/présentation ; reprise au prochain lot pilotage |
| `apps/web/src/lib/geo/greater-paris-select.tsx` | PROACTIVE_SPLIT | LATER | size: PRESENT; complexity: PRESENT | séparer sélection et suggestions ; reprise au prochain changement géographique |
| `apps/web/src/components/sections/rubriques/feedback-section-dashboard.tsx` | PROACTIVE_SPLIT | LATER | size: PRESENT | séparer shell/formulaire/tracking ; reprise au prochain changement feedback |
| `apps/web/src/app/learn/ressources/learn-ressources-client.data.ts` | COHESIVE_SINGLE_FILE | NONE | size: PRESENT | données et types du catalogue ; aucun déclencheur de split mécanique |
| `apps/web/src/components/sections/rubriques/methodologie-page-client.tsx` | COHESIVE_SINGLE_FILE | NONE | size: PRESENT | contrat de compatibilité des contenus ; nouveau sous-flux indépendant |
| `apps/web/src/components/sections/rubriques/free-plan-services-methodology-visual.impact.tsx` | ALREADY_MODULARIZED | NONE | size: PRESENT | conserver la façade ; nouvelle responsabilité métier dans le fichier |
| `apps/web/src/components/actions/action-declaration/form/use-action-declaration-form.ts` | PROACTIVE_SPLIT | AFTER_ACTIVE_CHANGES | size: PRESENT; complexity: PRESENT | stabiliser le parcours déclaration ; prochain changement du draft ou de la géométrie |
| `apps/web/src/components/reports/web-document/sections.tsx` | PROACTIVE_SPLIT | LATER | size: PRESENT; complexity: PRESENT | frontière naturelle par sections de rapport ; prochain ajout de section |

### Décisions établies — grille détaillée

Les décisions humaines ci-dessous utilisent la grille complète. Les signaux
non mesurés ne sont pas des absences de problème.

#### `apps/web/src/components/sections/rubriques/partners-network-section.tsx`

| Champ | Valeur |
| --- | --- |
| REF | même `RADAR_REF` que l'en-tête |
| LINES / BYTES / KIND | 511 / 22275 / runtime |
| RESPONSIBILITIES | catalogue partenaires, recherche locale, rendu de la rubrique |
| PUBLIC_CONTRACTS | props `fr`, contrat de section et contact public |
| SIDE_EFFECTS | lecture de la configuration de contact |
| MAIN_CONSUMERS | registre des rubriques et rendu de page |
| TEST_BOUNDARY | composants de rubrique et helpers de recherche |
| COUPLING | données de partenaires + présentation + interaction |
| NATURAL_EXTRACTION_BOUNDARY | données/recherche d'un côté, carte et CTA de l'autre |
| SIGNALS | size PRESENT ; complexity/cycle/dead-code/duplication/testability NOT_MEASURED |
| RATIONALE | la frontière données/interactions est déjà lisible ; le découpage peut être progressif sans changer le contrat de section |
| DEPENDENCY_OR_BLOCKER | aucun blocker technique identifié |
| NEXT_TRIGGER | prochain lot fonctionnel de la rubrique |

#### `apps/web/src/components/chat/chat-shell.tsx`

| Champ | Valeur |
| --- | --- |
| REF | même `RADAR_REF` que l'en-tête |
| LINES / BYTES / KIND | 881 / 29058 / runtime |
| RESPONSIBILITIES | contexte public/privé, sélection de canal, recherche, thread, composer, profil |
| PUBLIC_CONTRACTS | `ChatShellProps`, navigation mobile et contrats des hooks chat |
| SIDE_EFFECTS | synchronisation URL, mutations de message/profil et rafraîchissement inbox |
| MAIN_CONSUMERS | surfaces de messagerie et partage d'action |
| TEST_BOUNDARY | hooks chat, actions de message, rendu des modes |
| COUPLING | élevé entre mode, canal actif, destinataire et affichage mobile |
| NATURAL_EXTRACTION_BOUNDARY | contrôleur de contexte, sélection/navigation, thread/composer |
| SIGNALS | size PRESENT ; complexity PRESENT (snapshot complexity) ; autres NOT_MEASURED |
| RATIONALE | plusieurs contrats indépendants cohabitent, mais la Messagerie active doit stabiliser ses flux avant extraction |
| DEPENDENCY_OR_BLOCKER | changements fonctionnels actifs de Messagerie |
| NEXT_TRIGGER | prochain changement du shell ou stabilisation du chantier Messagerie |

#### `apps/web/src/components/sections/rubriques/elus-section.tsx`

| Champ | Valeur |
| --- | --- |
| REF | même `RADAR_REF` que l'en-tête |
| LINES / BYTES / KIND | 513 / 28325 / runtime |
| RESPONSIBILITIES | chargement du pilotage, états d'erreur, promotion et rendu |
| PUBLIC_CONTRACTS | export de section et contrat de réponse overview |
| SIDE_EFFECTS | requête HTTP `no-store` vers l'overview |
| MAIN_CONSUMERS | rubrique élus et surfaces de pilotage |
| TEST_BOUNDARY | fetch/error states et composants d'accès |
| COUPLING | provider de données, AuthZ d'affichage et présentation |
| NATURAL_EXTRACTION_BOUNDARY | hook/loader overview puis présentation et CTA |
| SIGNALS | size PRESENT ; autres NOT_MEASURED |
| RATIONALE | le flux réseau et les décisions d'affichage ont une frontière testable naturelle |
| DEPENDENCY_OR_BLOCKER | clarifier le contrat overview partagé |
| NEXT_TRIGGER | prochain changement de pilotage ou du CTA d'accès |

#### `apps/web/src/lib/geo/greater-paris-select.tsx`

| Champ | Valeur |
| --- | --- |
| REF | même `RADAR_REF` que l'en-tête |
| LINES / BYTES / KIND | 768 / 27711 / runtime |
| RESPONSIBILITIES | normalisation territoriale, suggestions, sélection, rendu du contrôle |
| PUBLIC_CONTRACTS | `TerritoryLocationSelection`, `GreaterParisSelect` et façades exportées |
| SIDE_EFFECTS | consultation du provider d'adresses pour les suggestions |
| MAIN_CONSUMERS | formulaires de localisation et parcours d'action |
| TEST_BOUNDARY | parsing/normalisation pure séparée de l'interaction |
| COUPLING | types géographiques, recherche d'adresse et UX de sélection |
| NATURAL_EXTRACTION_BOUNDARY | adaptateurs de suggestion et composant de contrôle |
| SIGNALS | size PRESENT ; complexity PRESENT (snapshot complexity) ; autres NOT_MEASURED |
| RATIONALE | la façade publique peut rester stable pendant l'extraction des transformations pures et du hook de suggestions |
| DEPENDENCY_OR_BLOCKER | préserver les façades et identités exportées |
| NEXT_TRIGGER | évolution du contrat géographique ou du provider d'adresses |

#### `apps/web/src/components/sections/rubriques/feedback-section-dashboard.tsx`

| Champ | Valeur |
| --- | --- |
| REF | même `RADAR_REF` que l'en-tête |
| LINES / BYTES / KIND | 631 / 27107 / runtime |
| RESPONSIBILITIES | mode dashboard, formulaire, préremplissage, tracker et soumission |
| PUBLIC_CONTRACTS | props de section et contrat de feedback |
| SIDE_EFFECTS | soumission de feedback et mesure du temps de formulaire |
| MAIN_CONSUMERS | dashboard et flux de support |
| TEST_BOUNDARY | tracker, validation du message et mutation de feedback |
| COUPLING | état local, préremplissage métier et feedback asynchrone |
| NATURAL_EXTRACTION_BOUNDARY | formulaire contrôlé, tracker et shell de mode |
| SIGNALS | size PRESENT ; autres NOT_MEASURED |
| RATIONALE | les responsabilités sont nommées et peuvent être testées séparément sans déplacer le contrat public |
| DEPENDENCY_OR_BLOCKER | aucun blocker, mais conserver les états de soumission |
| NEXT_TRIGGER | prochain changement du parcours feedback |

#### `apps/web/src/app/learn/ressources/learn-ressources-client.data.ts`

| Champ | Valeur |
| --- | --- |
| REF | même `RADAR_REF` que l'en-tête |
| LINES / BYTES / KIND | 677 / 27122 / data/config |
| RESPONSIBILITIES | types et jeux de données localisés du catalogue de ressources |
| PUBLIC_CONTRACTS | constantes importées par le client Learn Ressources |
| SIDE_EFFECTS | aucun |
| MAIN_CONSUMERS | page et composants Learn Ressources |
| TEST_BOUNDARY | tests de données/localisation au niveau du catalogue |
| COUPLING | cohésion forte autour du même catalogue |
| NATURAL_EXTRACTION_BOUNDARY | aucune frontière démontrée ; des sous-fichiers ajouteraient du couplage |
| SIGNALS | size PRESENT ; autres NOT_APPLICABLE ou NOT_MEASURED |
| RATIONALE | fichier data/config cohésif ; la taille reste un signal de lisibilité, pas une raison de disperser le catalogue |
| DEPENDENCY_OR_BLOCKER | aucun |
| NEXT_TRIGGER | ajout d'une famille de données indépendante ou changement du contrat de catalogue |

#### `apps/web/src/components/sections/rubriques/methodologie-page-client.tsx`

| Champ | Valeur |
| --- | --- |
| REF | même `RADAR_REF` que l'en-tête |
| LINES / BYTES / KIND | 685 / 29441 / runtime |
| RESPONSIBILITIES | cartes méthodologiques, rendu de page et façade legacy |
| PUBLIC_CONTRACTS | exports `ActionMapMethodologySection` et `LegacyMethodologieContent` |
| SIDE_EFFECTS | aucun effet externe identifié |
| MAIN_CONSUMERS | routes/pages méthodologie et compatibilité historique |
| TEST_BOUNDARY | rendu de page et contrat de compatibilité |
| COUPLING | données méthodologiques et présentation volontairement liées |
| NATURAL_EXTRACTION_BOUNDARY | pas de frontière indépendante démontrée actuellement |
| SIGNALS | size PRESENT ; autres NOT_MEASURED |
| RATIONALE | cohésion de page et façades historiques justifient le fichier unique tant qu'aucun nouveau sous-flux n'est ajouté |
| DEPENDENCY_OR_BLOCKER | préserver les deux exports publics |
| NEXT_TRIGGER | ajout d'une nouvelle famille de méthodologie ou rupture du contrat legacy |

#### `apps/web/src/components/sections/rubriques/free-plan-services-methodology-visual.impact.tsx`

| Champ | Valeur |
| --- | --- |
| REF | même `RADAR_REF` que l'en-tête |
| LINES / BYTES / KIND | 695 / 34077 / runtime |
| RESPONSIBILITIES | façade visuelle de l'impact des services free plan |
| PUBLIC_CONTRACTS | props d'impact et contrat de rendu |
| SIDE_EFFECTS | aucun |
| MAIN_CONSUMERS | page méthodologie et visualisation d'impact |
| TEST_BOUNDARY | sous-composants/formatters d'impact existants |
| COUPLING | contrat visuel déjà réparti autour de la façade |
| NATURAL_EXTRACTION_BOUNDARY | extraction déjà matérialisée par les modules consommés |
| SIGNALS | size PRESENT ; autres NOT_MEASURED |
| RATIONALE | la taille résiduelle ne correspond plus à un monolithe architectural ; ne pas refactorer mécaniquement |
| DEPENDENCY_OR_BLOCKER | aucun |
| NEXT_TRIGGER | nouvelle responsabilité métier ajoutée à la façade |

#### `apps/web/src/components/actions/action-declaration/form/use-action-declaration-form.ts`

| Champ | Valeur |
| --- | --- |
| REF | même `RADAR_REF` que l'en-tête |
| LINES / BYTES / KIND | 846 / 30491 / runtime |
| RESPONSIBILITIES | draft, tracking, géométrie, validation, payload et smart assist |
| PUBLIC_CONTRACTS | API du hook consommée par le formulaire de déclaration |
| SIDE_EFFECTS | synchronisation de draft et événements de parcours |
| MAIN_CONSUMERS | `action-declaration-form.tsx` et étapes de déclaration |
| TEST_BOUNDARY | validation pure, résolution de géométrie et orchestration du hook |
| COUPLING | élevé entre état du formulaire, carte, route preview et payload serveur |
| NATURAL_EXTRACTION_BOUNDARY | draft/lifecycle, géométrie/validation, payload/submit |
| SIGNALS | size PRESENT ; complexity PRESENT (snapshot complexity) ; autres NOT_MEASURED |
| RATIONALE | plusieurs responsabilités indépendantes et testables sont visibles ; la frontière existe, mais le parcours actif doit d'abord stabiliser ses contrats |
| DEPENDENCY_OR_BLOCKER | changements actifs du parcours déclaration |
| NEXT_TRIGGER | prochain changement du draft, de la géométrie ou du payload |

#### `apps/web/src/components/reports/web-document/sections.tsx`

| Champ | Valeur |
| --- | --- |
| REF | même `RADAR_REF` que l'en-tête |
| LINES / BYTES / KIND | 674 / 26318 / runtime |
| RESPONSIBILITIES | orchestration des sections, métriques, profils, tableaux et états de rapport |
| PUBLIC_CONTRACTS | props `ReportsWebSectionsProps` et contrat `ReportModel` |
| SIDE_EFFECTS | aucun effet de données ; rendu dépendant du modèle chargé |
| MAIN_CONSUMERS | document web de rapports |
| TEST_BOUNDARY | sections de rapport, formatters et états loading/error |
| COUPLING | modèle de rapport, constantes de sections et primitives UI |
| NATURAL_EXTRACTION_BOUNDARY | une unité de rendu par famille de sections ou de métriques |
| SIGNALS | size PRESENT ; complexity PRESENT (snapshot complexity) ; autres NOT_MEASURED |
| RATIONALE | les sections sont une frontière de rendu naturelle ; l'extraction peut réduire le couplage sans créer de couche générique |
| DEPENDENCY_OR_BLOCKER | préserver l'ordre et les contrats de `ReportModel` |
| NEXT_TRIGGER | ajout d'une nouvelle section ou évolution de plusieurs familles de métriques |
<!-- RADAR:HUMAN_DECISIONS:END -->

## F. Radar brut à auditer

Les tableaux suivants sont mesurés automatiquement. Une ligne sans décision
humaine reste REVIEW_REQUIRED, qui est un état d'audit et non une consigne
de découpage.

### Radar architectural — top 25

| PATH | REF | LINES | BYTES | KIND | SIZE_SIGNAL | CORRELATIONS | DECISION |
| --- | --- | ---: | ---: | --- | --- | --- | --- |
| `apps/web/src/components/chat/chat-shell.tsx` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 881 | 29058 | runtime | PRESENT — REVIEW | complexity: 3 finding(s) dans complexity-baseline.json | PROACTIVE_SPLIT |
| `apps/web/src/components/actions/action-declaration/form/use-action-declaration-form.ts` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 846 | 30491 | runtime | PRESENT — REVIEW | complexity: 6 finding(s) dans complexity-baseline.json | PROACTIVE_SPLIT |
| `apps/web/src/components/actions/action-declaration/steps/ActionStepLocation.tsx` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 832 | 33146 | runtime | PRESENT — REVIEW | complexity: 3 finding(s) dans complexity-baseline.json | REVIEW_REQUIRED |
| `apps/web/src/components/actions/action-declaration/steps/ActionStepIdentity.tsx` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 794 | 35880 | runtime | PRESENT — REVIEW | complexity: 2 finding(s) dans complexity-baseline.json | REVIEW_REQUIRED |
| `apps/web/src/components/actions/map/action-popup-content-header.tsx` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 792 | 33740 | runtime | PRESENT — REVIEW | complexity: 4 finding(s) dans complexity-baseline.json | REVIEW_REQUIRED |
| `apps/web/src/lib/geo/greater-paris-select.tsx` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 768 | 27711 | runtime | PRESENT — REVIEW | complexity: 2 finding(s) dans complexity-baseline.json<br>dead-code: 3 finding(s) dans dead-code-baseline.json | PROACTIVE_SPLIT |
| `apps/web/src/lib/learning/quiz/quiz-personal-progress.ts` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 759 | 25419 | runtime | PRESENT — REVIEW | complexity: 4 finding(s) dans complexity-baseline.json<br>dead-code: 9 finding(s) dans dead-code-baseline.json | REVIEW_REQUIRED |
| `apps/web/src/components/actions/action-declaration/form/action-declaration-form.tsx` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 733 | 32321 | runtime | PRESENT — REVIEW | complexity: 2 finding(s) dans complexity-baseline.json | REVIEW_REQUIRED |
| `apps/web/src/lib/supabase/storage-business-contribution.ts` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 718 | 24975 | runtime | PRESENT — REVIEW | complexity: 4 finding(s) dans complexity-baseline.json<br>dead-code: 3 finding(s) dans dead-code-baseline.json | REVIEW_REQUIRED |
| `apps/web/src/lib/environmental-impact-estimator/project-signals.calculations.ts` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 703 | 22010 | runtime | PRESENT — REVIEW | complexity: 3 finding(s) dans complexity-baseline.json<br>dead-code: 7 finding(s) dans dead-code-baseline.json | REVIEW_REQUIRED |
| `apps/web/src/components/sections/rubriques/free-plan-services-methodology-visual.impact.tsx` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 695 | 34077 | runtime | PRESENT — REVIEW | complexity: 2 finding(s) dans complexity-baseline.json | ALREADY_MODULARIZED |
| `apps/web/src/components/sections/rubriques/methodologie-page-client.tsx` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 685 | 29441 | runtime | PRESENT — REVIEW | complexity: 2 finding(s) dans complexity-baseline.json | COHESIVE_SINGLE_FILE |
| `apps/web/src/components/environmental-impact-estimator/environmental-impact-curve-chart.tsx` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 679 | 25408 | runtime | PRESENT — REVIEW | complexity: 3 finding(s) dans complexity-baseline.json | REVIEW_REQUIRED |
| `apps/web/src/app/docs/[...segments]/route.ts` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 677 | 18727 | runtime | PRESENT — REVIEW | complexity: 3 finding(s) dans complexity-baseline.json | REVIEW_REQUIRED |
| `apps/web/src/components/reports/web-document/sections.tsx` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 674 | 26318 | runtime | PRESENT — REVIEW | complexity: 2 finding(s) dans complexity-baseline.json<br>dead-code: 1 finding(s) dans dead-code-baseline.json | PROACTIVE_SPLIT |
| `apps/web/src/lib/pdf-export/simple-pdf.ts` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 668 | 19095 | runtime | PRESENT — REVIEW | complexity: 8 finding(s) dans complexity-baseline.json | REVIEW_REQUIRED |
| `apps/web/src/lib/validation/action.ts` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 664 | 24932 | runtime | PRESENT — REVIEW | complexity: 1 finding(s) dans complexity-baseline.json<br>dead-code: 1 finding(s) dans dead-code-baseline.json | REVIEW_REQUIRED |
| `apps/web/src/lib/geo/greater-paris.ts` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 660 | 16393 | runtime | PRESENT — REVIEW | complexity: 1 finding(s) dans complexity-baseline.json<br>dead-code: 9 finding(s) dans dead-code-baseline.json | REVIEW_REQUIRED |
| `apps/web/src/lib/actions/pollution/current-place-state.ts` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 647 | 20180 | runtime | PRESENT — REVIEW | complexity: 2 finding(s) dans complexity-baseline.json<br>dead-code: 7 finding(s) dans dead-code-baseline.json | REVIEW_REQUIRED |
| `apps/web/src/lib/actions/http.ts` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 642 | 18515 | runtime | PRESENT — REVIEW | aucun finding attribué | REVIEW_REQUIRED |
| `apps/web/src/components/sections/rubriques/recycling-question-assistant/assistant-utils.ts` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 640 | 25009 | runtime | PRESENT — REVIEW | complexity: 2 finding(s) dans complexity-baseline.json<br>dead-code: 1 finding(s) dans dead-code-baseline.json | REVIEW_REQUIRED |
| `apps/web/src/lib/actions/participation/group-participation-review.ts` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 637 | 21448 | runtime | PRESENT — REVIEW | complexity: 4 finding(s) dans complexity-baseline.json | REVIEW_REQUIRED |
| `apps/web/src/lib/route/route-predicted-targets.ts` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 635 | 21960 | runtime | PRESENT — REVIEW | complexity: 2 finding(s) dans complexity-baseline.json<br>dead-code: 7 finding(s) dans dead-code-baseline.json | REVIEW_REQUIRED |
| `apps/web/src/lib/supabase/storage-usage.ts` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 635 | 18204 | runtime | PRESENT — REVIEW | dead-code: 5 finding(s) dans dead-code-baseline.json | REVIEW_REQUIRED |
| `apps/web/src/components/actions/map/actions-map-geometry.utils.ts` | `bd7be6d0b3b54a168a81424163de5eae75d0828d` | 634 | 16787 | runtime | PRESENT — REVIEW | dead-code: 3 finding(s) dans dead-code-baseline.json | REVIEW_REQUIRED |

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
NOT_MEASURED, avec un détail court. Les priorités sont NOW,
AFTER_ACTIVE_CHANGES, LATER ou NONE ; elles ne sont jamais déduites
automatiquement de la taille.

## H. Signaux complémentaires

- SIZE_SIGNAL vient de quality:top-heavy, de classifyFileKind() et
  de la baseline heavy-files ; ce contrôle reste la source de vérité de la
  taille et de ses plafonds.
- COMPLEXITY_SIGNAL consomme les entrées attribuées du snapshot de
  quality:complexity. Il ne modifie pas sa baseline et ne remplace pas le
  contrôle des fonctions.
- DEAD_CODE_SIGNAL consomme les findings de la baseline Knip lorsqu'ils
  portent un chemin de fichier. Knip reste propriétaire de la décision
  dead-code.
- cycles/GitNexus, jscpd et coverage sont NOT_MEASURED dans la génération
  normale lorsqu'une sortie actuelle attribuable au fichier n'est pas déjà
  disponible. Le radar ne lance pas ces analyses coûteuses et ne convertit
  pas leurs métriques globales en findings locaux.
- Un candidat cumule plusieurs signaux seulement lorsque plusieurs états
  PRESENT sont réellement attribués ; ce compteur n'est pas un score et ne
  remplace aucune gate.

## I. Portée / reproductibilité

La mesure porte sur les fichiers .ts et .tsx suivis sous
apps/web/src, lus depuis la ref exacte affichée en tête. Pour régénérer un
snapshot courant, utiliser --ref=HEAD ; une ref ancienne est signalée
HISTORICAL_SNAPSHOT et ne peut pas être présentée comme courante.

Le bloc entre RADAR:HUMAN_DECISIONS:BEGIN/END est préservé par les
régénérations. Les décisions humaines ne sont donc ni supprimées ni
recalculées par la taille. refactor-priorities-plan.md renvoie vers ce
document sans recopier sa liste.
<!-- RADAR:GENERATED:END -->
