# Plan de Modularisation : useCommunitySection

**Fichier Cible** : `apps/web/src/components/sections/rubriques/community/use-community-section.ts`
**Taille Actuelle** : ~483 lignes, 13 KB
**Objectif** : Diviser ce hook surchargé en plusieurs petits hooks responsables de domaines distincts (événements SWR, formulaires, mutations d'actions).

Validez chaque phase avec `npm run typecheck` et `npm run lint`.

---

## Phase 1 : Extraction du hook de données de flux (Feed/Highlights)

**Instructions pour l'agent** :
```markdown
1. Crée `apps/web/src/components/sections/rubriques/community/use-community-highlights.ts`.
2. Extraire la logique SWR de `actionsData` (`fetchActions`), les états associés (`actionsLoading`, `highlightsLoadError`), la fonction `reloadHighlights`, et le calcul mémorisé `highlights` (le `useMemo` groupant par jour).
3. Ce hook retournera `{ actionsLoading, highlightsLoadError, reloadHighlights, highlights }`.
```

## Phase 2 : Extraction du hook de données des événements

**Instructions pour l'agent** :
```markdown
1. Crée `apps/web/src/components/sections/rubriques/community/use-community-events.ts`.
2. Extraire la logique SWR de `eventsData` (`fetchCommunityEvents`), et les calculs dérivés : `allEvents`, `upcomingEvents`, `pastEvents`, `myEvents`, `reminders`, `staffingPlan`, `postEventLoop`, etc.
3. Ce hook retournera toutes ces données en lecture seule.
```

## Phase 3 : Extraction des actions/mutations

**Instructions pour l'agent** :
```markdown
1. Crée `apps/web/src/components/sections/rubriques/community/use-community-actions.ts`.
2. Déplaces-y la logique de gestion des formulaires (state `createForm`, `opsDraftByEventId`) et les fonctions de mutation lourdes : `onCreateEvent`, `onRsvp`, `onSaveEventOps`, `copyReminderMessage`.
3. Ce hook gèrera également ses propres états de chargement (`isCreatingEvent`, `isUpdatingEventOpsId`, `rsvpLoadingEventId`) et d'erreur (`communitySuccessMessage`, `communityError`).
```

## Phase 4 : Orchestration

**Instructions pour l'agent** :
```markdown
1. Refactore `use-community-section.ts` pour qu'il devienne simplement l'agrégateur de ces 3 nouveaux hooks.
2. `useCommunitySection` appellera `useCommunityHighlights()`, `useCommunityEvents()`, et `useCommunityActions()`, fusionnera leurs retours avec le state `activeTab`, et retournera le modèle global attendu.
```

## Résultat Attendu
Une séparation stricte entre : la donnée (SWR events & highlights), le state d'UI (onglets) et les mutations (API POST/PUT), rendant la section communautaire testable.
