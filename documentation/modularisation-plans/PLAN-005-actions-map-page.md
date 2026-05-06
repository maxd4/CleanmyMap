# Plan de Modularisation : Actions Map Page

**Fichier Cible** : `apps/web/src/app/(app)/actions/map/page.tsx`
**Taille Actuelle** : ~506 lignes, 24 KB
**Objectif** : Transformer ce monolithe en un orchestrateur léger en extrayant la logique métier (calculs de KPI) et les gros blocs UI (KPI Ribbon, Control Tower).

Validez chaque phase avec `npm run typecheck` et `npm run lint`.

---

## Phase 1 : Extraction de la logique de calcul des KPIs

**Instructions pour l'agent** :
```markdown
1. Crée le fichier `apps/web/src/app/(app)/actions/map/_hooks/use-map-kpi-stats.ts`.
2. Déplaces-y le `useMemo` qui calcule la variable `stats` (celui qui calcule `totalKg`, `totalButts`, `volunteers`, `citizenHours`, `geocoverage`).
3. Cette hook doit prendre `filteredMapItems` en paramètre et retourner l'objet `stats`.
4. Importe et utilise ce hook dans `page.tsx`.
```

## Phase 2 : Extraction du composant KPI Ribbon

**Instructions pour l'agent** :
```markdown
1. Crée le fichier `apps/web/src/app/(app)/actions/map/_components/map-kpi-ribbon.tsx`.
2. Extrait la variable JSX `kpiRibbon` dans ce nouveau composant.
3. Ce composant recevra les `stats` en props.
4. Assure-toi de reprendre les tokens visuels (couleurs douces, mode mixte) et de supprimer les éventuelles mentions `dark:` qui contredisent le mode mixte global si tu en trouves dans cette portion.
5. Remplace la variable `kpiRibbon` par l'appel à `<MapKpiRibbon stats={stats} />` dans le fichier `page.tsx`.
```

## Phase 3 : Extraction du Control Tower

**Instructions pour l'agent** :
```markdown
1. Crée le fichier `apps/web/src/app/(app)/actions/map/_components/map-control-tower.tsx`.
2. Extrait la variable JSX `controlTower` dans ce composant.
3. Le composant doit accepter en props : `filters`, `initialDays`, les handlers (`onDaysChange`, etc.), `visibleCount`, `loadedCount`, et `filteredMapItems`.
4. Remplace la variable `controlTower` dans `page.tsx` par l'appel à ce nouveau composant.
```

## Phase 4 : Extraction de la Supervision Technique

**Instructions pour l'agent** :
```markdown
1. Crée le fichier `apps/web/src/app/(app)/actions/map/_components/map-supervision.tsx`.
2. Extrait la section finale "Supervision Technique" (qui contient "Carte d'entrainement" et l'export PDF) dans ce composant.
3. Remplace la section dans `page.tsx` par `<MapSupervision />`.
```

## Phase 5 : Améliorations Kaizen (Performance & Résilience)

**Instructions pour l'agent (Améliorations directes)** :
```markdown
1. **Rendu SSR / Client** : `page.tsx` contient un grand nombre de states clients. Si la page principale pouvait être un composant serveur appelant un composant `<MapPageClient />`, cela améliorerait les Web Vitals. Transforme `page.tsx` pour qu'il soit un simple Server Component (si possible) et déplace tout l'état actuel dans `apps/web/src/app/(app)/actions/map/_components/map-page-client.tsx`.
2. **Couleurs Mode Mixte** : Le JSX de la page contient des tokens comme `dark:bg-emerald-950/20`. Purge manuellement ces directives `dark:` car le projet a adopté une ligne directrice "Mode Mixte" stricte (un style glassmorphic universel).
3. **Mémorisation (Memoization)** : Assure-toi que les gestionnaires d'événements (`handleDaysChange`, `handleStatusChange`, etc.) passés aux composants enfants sont enveloppés dans des `useCallback` pour éviter les re-rendus inutiles du `ActionsMapFilterControls`.
```

## Résultat Attendu
`page.tsx` ne contient plus que l'assemblage (orchestration) des différentes sous-sections. Le fichier fait moins de 150 lignes et les responsabilités sont proprement isolées.
