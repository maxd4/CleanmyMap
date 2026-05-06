# Plan de Modularisation : Sections Registry

**Fichier Cible** : `apps/web/src/lib/sections-registry.ts`
**Taille Actuelle** : ~590 lignes, 17 KB
**Objectif** : Isoler les types, la configuration statique (massive), et les helpers d'accès pour ce référentiel central de navigation.

Validez chaque phase avec `npm run typecheck` et `npm run lint`.

---

## Phase 1 : Extraction des types

**Instructions pour l'agent** :
```markdown
1. Crée le dossier `apps/web/src/lib/sections-registry/`.
2. Crée `types.ts` et déplaces-y tous les types du domaine (`LocalizedText`, `RubriqueCategory`, `RubriqueDefinition`, `Rubrique`, `SectionRubrique`, `SectionId`, etc.).
3. Tu devras peut-être retarder l'export de certains types dérivés (comme `Rubrique = (typeof RUBRIQUE_REGISTRY)[number]`) à la Phase 2 si cela crée une dépendance circulaire temporelle, ou bien les typer explicitement.
```

## Phase 2 : Extraction de la configuration

**Instructions pour l'agent** :
```markdown
1. Crée `apps/web/src/lib/sections-registry/config.ts`.
2. Déplaces-y la constante `RUBRIQUE_CATEGORIES`.
3. Déplaces-y la massive constante `RUBRIQUE_REGISTRY` (qui fait presque 450 lignes).
```

## Phase 3 : Extraction des Helpers et Reconstruction

**Instructions pour l'agent** :
```markdown
1. Crée `apps/web/src/lib/sections-registry/helpers.ts`.
2. Déplaces-y toutes les fonctions de filtrage (`hasValidRoute`, `isRubriqueVisible`, `getVisibleRubriquesByCategory`, `getVisibleRubriquesBySpace`, `normalizeSectionId`, `getSectionRubriqueById`, `isSectionRouteEnabled`, `getSectionRouteParams`, `getPendingSectionRubriques`).
3. Crée `apps/web/src/lib/sections-registry/index.ts` qui ré-exporte `types`, `config` et `helpers`.
4. Supprime l'ancien `apps/web/src/lib/sections-registry.ts` et ajuste les imports dans tout le projet pour utiliser le dossier.
```

## Phase 4 : Améliorations Kaizen

**Instructions pour l'agent** :
```markdown
1. Assure-toi que les getters (`getVisibleRubriquesByCategory`, etc.) sont optimisés. S'ils sont souvent appelés, un petit cache ou l'utilisation de `useMemo` côté appelant pourrait être documenté en commentaire JSDoc.
```

## Résultat Attendu
Le registre des sections, critique pour le routage de l'app, devient une collection de modules clairs. `config.ts` sera le seul fichier à modifier pour ajouter une nouvelle rubrique sans toucher à la logique.
