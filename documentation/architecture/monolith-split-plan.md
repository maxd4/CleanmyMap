# Radar de modularisation et dette structurelle

<!-- RADAR:GENERATED:BEGIN -->
## A. En-tête snapshot

`RADAR_REF=2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e`<br>
`RADAR_GENERATED_AT=2026-09-25T20:20:50.810Z`<br>
`RADAR_STATUS=CURRENT_AT_GENERATION`

Commandes réellement utilisées :

`node scripts/reports/generate-modularity-radar.mjs --ref=HEAD`

Le snapshot lit l'arbre Git exact de 2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e. Le statut
CURRENT_AT_GENERATION décrit l'instant de génération ; un document commité
peut donc rester un snapshot reproductible de cette ref sans prétendre suivre
automatiquement un HEAD ultérieur.

## B. Résumé exécutif

| Mesure factuelle | Valeur |
| --- | ---: |
| Fichiers mesurés | 2493 |
| REVIEW architectural (runtime + data/config) | 64 |
| HARD contrôlé | 0 |
| Tests volumineux | 0 |
| Generated informatifs | 0 |
| PROACTIVE_SPLIT établi | 7 |
| DEFERRED_SPLIT établi | 0 |
| COHESIVE_SINGLE_FILE établi | 2 |
| ALREADY_MODULARIZED établi | 1 |
| Candidats avec plusieurs signaux structurels attribués | 0 |

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

| PATH | DECISION | SIZE_SIGNAL | PRIORITY | SIGNALS | BLOCKER / NEXT_TRIGGER |
| --- | --- | --- | --- | --- | --- |
| `apps/web/src/components/sections/rubriques/partners-network-section.tsx` | PROACTIVE_SPLIT | PRESENT — REVIEW | LATER | signaux complémentaires non mesurés | aucun blocker technique identifié ; prochain lot fonctionnel de la rubrique |
| `apps/web/src/components/chat/chat-shell.tsx` | PROACTIVE_SPLIT | PRESENT — REVIEW | AFTER_ACTIVE_CHANGES | signaux complémentaires non mesurés | changements fonctionnels actifs de Messagerie ; prochain changement du shell ou stabilisation du chantier Messagerie |
| `apps/web/src/components/sections/rubriques/elus-section.tsx` | PROACTIVE_SPLIT | PRESENT — REVIEW | LATER | signaux complémentaires non mesurés | clarifier le contrat overview partagé ; prochain changement de pilotage ou du CTA d'accès |
| `apps/web/src/lib/geo/greater-paris-select.tsx` | PROACTIVE_SPLIT | PRESENT — REVIEW | LATER | signaux complémentaires non mesurés | préserver les façades et identités exportées ; évolution du contrat géographique ou du provider d'adresses |
| `apps/web/src/components/sections/rubriques/feedback-section-dashboard.tsx` | PROACTIVE_SPLIT | PRESENT — REVIEW | LATER | signaux complémentaires non mesurés | aucun blocker, mais conserver les états de soumission ; prochain changement du parcours feedback |
| `apps/web/src/app/learn/ressources/learn-ressources-client.data.ts` | COHESIVE_SINGLE_FILE | NONE | NONE | signaux complémentaires non mesurés | aucun ; ajout d'une famille de données indépendante ou changement du contrat de catalogue |
| `apps/web/src/components/sections/rubriques/methodologie-page-client.tsx` | COHESIVE_SINGLE_FILE | PRESENT — REVIEW | NONE | signaux complémentaires non mesurés | préserver les deux exports publics ; ajout d'une nouvelle famille de méthodologie ou rupture du contrat legacy |
| `apps/web/src/components/sections/rubriques/free-plan-services-methodology-visual.impact.tsx` | ALREADY_MODULARIZED | PRESENT — REVIEW | NONE | signaux complémentaires non mesurés | aucun ; nouvelle responsabilité métier ajoutée à la façade |
| `apps/web/src/components/actions/action-declaration/form/use-action-declaration-form.ts` | PROACTIVE_SPLIT | PRESENT — REVIEW | AFTER_ACTIVE_CHANGES | signaux complémentaires non mesurés | changements actifs du parcours déclaration ; prochain changement du draft, de la géométrie ou du payload |
| `apps/web/src/components/reports/web-document/sections.tsx` | PROACTIVE_SPLIT | PRESENT — REVIEW | LATER | signaux complémentaires non mesurés | préserver l'ordre et les contrats de `ReportModel` ; ajout d'une nouvelle section ou évolution de plusieurs familles de métriques |

## E. Décisions établies

<!-- RADAR:HUMAN_DECISIONS:BEGIN -->
| PATH | ARCHITECTURE_DECISION | PRIORITY | DEPENDENCY_OR_BLOCKER | NEXT_TRIGGER |
| --- | --- | --- | --- | --- |
| `apps/web/src/components/sections/rubriques/partners-network-section.tsx` | PROACTIVE_SPLIT | LATER | aucun blocker technique identifié | prochain lot fonctionnel de la rubrique |
| `apps/web/src/components/chat/chat-shell.tsx` | PROACTIVE_SPLIT | AFTER_ACTIVE_CHANGES | changements fonctionnels actifs de Messagerie | prochain changement du shell ou stabilisation du chantier Messagerie |
| `apps/web/src/components/sections/rubriques/elus-section.tsx` | PROACTIVE_SPLIT | LATER | clarifier le contrat overview partagé | prochain changement de pilotage ou du CTA d'accès |
| `apps/web/src/lib/geo/greater-paris-select.tsx` | PROACTIVE_SPLIT | LATER | préserver les façades et identités exportées | évolution du contrat géographique ou du provider d'adresses |
| `apps/web/src/components/sections/rubriques/feedback-section-dashboard.tsx` | PROACTIVE_SPLIT | LATER | aucun blocker, mais conserver les états de soumission | prochain changement du parcours feedback |
| `apps/web/src/app/learn/ressources/learn-ressources-client.data.ts` | COHESIVE_SINGLE_FILE | NONE | aucun | ajout d'une famille de données indépendante ou changement du contrat de catalogue |
| `apps/web/src/components/sections/rubriques/methodologie-page-client.tsx` | COHESIVE_SINGLE_FILE | NONE | préserver les deux exports publics | ajout d'une nouvelle famille de méthodologie ou rupture du contrat legacy |
| `apps/web/src/components/sections/rubriques/free-plan-services-methodology-visual.impact.tsx` | ALREADY_MODULARIZED | NONE | aucun | nouvelle responsabilité métier ajoutée à la façade |
| `apps/web/src/components/actions/action-declaration/form/use-action-declaration-form.ts` | PROACTIVE_SPLIT | AFTER_ACTIVE_CHANGES | changements actifs du parcours déclaration | prochain changement du draft, de la géométrie ou du payload |
| `apps/web/src/components/reports/web-document/sections.tsx` | PROACTIVE_SPLIT | LATER | préserver l'ordre et les contrats de `ReportModel` | ajout d'une nouvelle section ou évolution de plusieurs familles de métriques |

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
| NATURAL_EXTRACTION_BOUNDARY | données/recherche d'un côté, carte et CTA de l'autre |
| ARCHITECTURE_DECISION | PROACTIVE_SPLIT |
| RATIONALE | la frontière données/interactions est déjà lisible ; le découpage peut être progressif sans changer le contrat de section |
| PRIORITY | LATER |
| DEPENDENCY_OR_BLOCKER | aucun blocker technique identifié |
| NEXT_TRIGGER | prochain lot fonctionnel de la rubrique |

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
| ARCHITECTURE_DECISION | PROACTIVE_SPLIT |
| RATIONALE | plusieurs contrats indépendants cohabitent, mais la Messagerie active doit stabiliser ses flux avant extraction |
| PRIORITY | AFTER_ACTIVE_CHANGES |
| DEPENDENCY_OR_BLOCKER | changements fonctionnels actifs de Messagerie |
| NEXT_TRIGGER | prochain changement du shell ou stabilisation du chantier Messagerie |

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
| ARCHITECTURE_DECISION | PROACTIVE_SPLIT |
| RATIONALE | le flux réseau et les décisions d'affichage ont une frontière testable naturelle |
| PRIORITY | LATER |
| DEPENDENCY_OR_BLOCKER | clarifier le contrat overview partagé |
| NEXT_TRIGGER | prochain changement de pilotage ou du CTA d'accès |

#### `apps/web/src/lib/geo/greater-paris-select.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | normalisation territoriale, suggestions, sélection, rendu du contrôle |
| PUBLIC_CONTRACTS | `TerritoryLocationSelection`, `GreaterParisSelect` et façades exportées |
| SIDE_EFFECTS | consultation du provider d'adresses pour les suggestions |
| MAIN_CONSUMERS | formulaires de localisation et parcours d'action |
| TEST_BOUNDARY | parsing/normalisation pure séparée de l'interaction |
| COUPLING | types géographiques, recherche d'adresse et UX de sélection |
| NATURAL_EXTRACTION_BOUNDARY | adaptateurs de suggestion et composant de contrôle |
| ARCHITECTURE_DECISION | PROACTIVE_SPLIT |
| RATIONALE | la façade publique peut rester stable pendant l'extraction des transformations pures et du hook de suggestions |
| PRIORITY | LATER |
| DEPENDENCY_OR_BLOCKER | préserver les façades et identités exportées |
| NEXT_TRIGGER | évolution du contrat géographique ou du provider d'adresses |

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
| ARCHITECTURE_DECISION | PROACTIVE_SPLIT |
| RATIONALE | les responsabilités sont nommées et peuvent être testées séparément sans déplacer le contrat public |
| PRIORITY | LATER |
| DEPENDENCY_OR_BLOCKER | aucun blocker, mais conserver les états de soumission |
| NEXT_TRIGGER | prochain changement du parcours feedback |

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

#### `apps/web/src/components/actions/action-declaration/form/use-action-declaration-form.ts`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | draft, tracking, géométrie, validation, payload et smart assist |
| PUBLIC_CONTRACTS | API du hook consommée par le formulaire de déclaration |
| SIDE_EFFECTS | synchronisation de draft et événements de parcours |
| MAIN_CONSUMERS | `action-declaration-form.tsx` et étapes de déclaration |
| TEST_BOUNDARY | validation pure, résolution de géométrie et orchestration du hook |
| COUPLING | élevé entre état du formulaire, carte, route preview et payload serveur |
| NATURAL_EXTRACTION_BOUNDARY | draft/lifecycle, géométrie/validation, payload/submit |
| ARCHITECTURE_DECISION | PROACTIVE_SPLIT |
| RATIONALE | plusieurs responsabilités indépendantes et testables sont visibles ; la frontière existe, mais le parcours actif doit d'abord stabiliser ses contrats |
| PRIORITY | AFTER_ACTIVE_CHANGES |
| DEPENDENCY_OR_BLOCKER | changements actifs du parcours déclaration |
| NEXT_TRIGGER | prochain changement du draft, de la géométrie ou du payload |

#### `apps/web/src/components/reports/web-document/sections.tsx`

| Champ | Valeur |
| --- | --- |
| RESPONSIBILITIES | orchestration des sections, métriques, profils, tableaux et états de rapport |
| PUBLIC_CONTRACTS | props `ReportsWebSectionsProps` et contrat `ReportModel` |
| SIDE_EFFECTS | aucun effet de données ; rendu dépendant du modèle chargé |
| MAIN_CONSUMERS | document web de rapports |
| TEST_BOUNDARY | sections de rapport, formatters et états loading/error |
| COUPLING | modèle de rapport, constantes de sections et primitives UI |
| NATURAL_EXTRACTION_BOUNDARY | une unité de rendu par famille de sections ou de métriques |
| ARCHITECTURE_DECISION | PROACTIVE_SPLIT |
| RATIONALE | les sections sont une frontière de rendu naturelle ; l'extraction peut réduire le couplage sans créer de couche générique |
| PRIORITY | LATER |
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
| `apps/web/src/components/chat/chat-shell.tsx` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 881 | 29058 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | PROACTIVE_SPLIT |
| `apps/web/src/components/actions/action-declaration/form/use-action-declaration-form.ts` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 846 | 30491 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | PROACTIVE_SPLIT |
| `apps/web/src/components/actions/action-declaration/steps/ActionStepLocation.tsx` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 832 | 33146 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |
| `apps/web/src/components/actions/action-declaration/steps/ActionStepIdentity.tsx` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 794 | 35880 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |
| `apps/web/src/components/actions/map/action-popup-content-header.tsx` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 792 | 33740 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |
| `apps/web/src/lib/geo/greater-paris-select.tsx` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 768 | 27711 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | PROACTIVE_SPLIT |
| `apps/web/src/lib/learning/quiz/quiz-personal-progress.ts` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 759 | 25419 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |
| `apps/web/src/components/actions/action-declaration/form/action-declaration-form.tsx` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 733 | 32321 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |
| `apps/web/src/lib/supabase/storage-business-contribution.ts` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 718 | 24975 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |
| `apps/web/src/lib/environmental-impact-estimator/project-signals.calculations.ts` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 703 | 22010 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |
| `apps/web/src/components/sections/rubriques/free-plan-services-methodology-visual.impact.tsx` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 695 | 34077 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | ALREADY_MODULARIZED |
| `apps/web/src/components/sections/rubriques/methodologie-page-client.tsx` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 685 | 29441 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | COHESIVE_SINGLE_FILE |
| `apps/web/src/components/environmental-impact-estimator/environmental-impact-curve-chart.tsx` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 679 | 25408 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |
| `apps/web/src/app/docs/[...segments]/route.ts` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 677 | 18727 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |
| `apps/web/src/components/reports/web-document/sections.tsx` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 674 | 26318 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | PROACTIVE_SPLIT |
| `apps/web/src/lib/pdf-export/simple-pdf.ts` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 668 | 19095 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |
| `apps/web/src/lib/validation/action.ts` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 664 | 24932 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |
| `apps/web/src/lib/geo/greater-paris.ts` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 660 | 16393 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |
| `apps/web/src/lib/actions/pollution/current-place-state.ts` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 647 | 20180 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |
| `apps/web/src/lib/actions/http.ts` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 642 | 18515 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |
| `apps/web/src/components/sections/rubriques/recycling-question-assistant/assistant-utils.ts` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 640 | 25009 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |
| `apps/web/src/lib/actions/participation/group-participation-review.ts` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 637 | 21448 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |
| `apps/web/src/lib/route/route-predicted-targets.ts` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 635 | 21960 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |
| `apps/web/src/lib/supabase/storage-usage.ts` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 635 | 18204 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |
| `apps/web/src/components/actions/map/actions-map-geometry.utils.ts` | `2cfbb71b28e667e85c0da1d60fb8a85b0ad6cd3e` | 634 | 16787 | runtime | PRESENT — REVIEW | signaux complémentaires non mesurés | REVIEW_REQUIRED |

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
- COMPLEXITY_SIGNAL et DEAD_CODE_SIGNAL ne déduisent jamais un finding
  actuel d'une baseline historique. En génération normale, une entrée de
  baseline produit au plus NOT_MEASURED — baseline historique: N entrée(s) ;
  quality:complexity ou Knip reste propriétaire de la mesure actuelle.
- Une génération deep n'est pas activée par défaut : les contrôles existants
  n'exposent pas tous une mesure attribuable à une ref exacte sans rejouer leur
  environnement complet. Le radar préfère donc NOT_MEASURED à une attribution
  locale inventée.
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

Le bloc entre RADAR:HUMAN_DECISIONS:BEGIN/END conserve uniquement les
interprétations humaines et les décisions d'architecture. REF, LINES, BYTES,
KIND, SIZE_SIGNAL et les signaux automatiques sont toujours régénérés depuis
RADAR_REF ; ils ne sont jamais lus depuis ce bloc. refactor-priorities-plan.md
renvoie vers ce document sans recopier sa liste.
<!-- RADAR:GENERATED:END -->
