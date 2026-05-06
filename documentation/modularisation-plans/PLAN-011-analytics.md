# Plan de Modularisation : Analytics (Rapport Web)

**Fichier Cible** : `apps/web/src/components/reports/web-document/analytics.ts`
**Taille Actuelle** : ~558 lignes, 18 KB
**Objectif** : Séparer les fonctions de formatage, de mathématiques, et les constructeurs complexes pour ne garder que l'orchestrateur `computeReportModel`.

Validez chaque phase avec `npm run typecheck` et `npm run lint`.

---

## Phase 1 : Extraction des utilitaires de base

**Instructions pour l'agent** :
```markdown
1. Crée le dossier `apps/web/src/components/reports/web-document/analytics/`.
2. Crée `formatters.ts` et déplaces-y `toFrNumber`, `toFrInt`, `toFrDate`.
3. Crée `math.ts` et déplaces-y `average`, `median`, `distanceKm`, `scoreAction`.
4. Crée `helpers.ts` et déplaces-y `normalizeListType`, `getWeatherAdvice`.
```

## Phase 2 : Extraction des constructeurs complexes

**Instructions pour l'agent** :
```markdown
1. Crée `apps/web/src/components/reports/web-document/analytics/builders.ts`.
2. Déplaces-y les fonctions lourdes : `buildRouteSteps`, `buildMonthRows`, `buildCalendarRows`, `buildExecutiveNarrative`.
3. Assure-toi d'importer les types nécessaires (`MonthRow`, `RouteStep`, `ReportModel`, `ExecutiveNarrative`) depuis le fichier de types.
```

## Phase 3 : Nettoyage et Orchestration

**Instructions pour l'agent** :
```markdown
1. Renomme `apps/web/src/components/reports/web-document/analytics.ts` en `index.ts` et déplace-le dans le dossier `analytics/`.
2. Dans `index.ts`, importe les utilitaires et constructeurs extraits.
3. Le fichier `index.ts` ne doit plus contenir que la fonction `computeReportModel` et les exports des sous-modules pour le reste de l'application.
4. Ajuste les chemins d'importation dans les composants qui utilisaient l'ancien `analytics.ts`.
```

## Phase 4 : Améliorations Kaizen

**Instructions pour l'agent** :
```markdown
1. Vérifie si `computeReportModel` (qui fait presque 300 lignes) peut elle-même être scindée en appelant des sous-fonctions dédiées (ex: `computeQualityMetrics`, `computeModerationStats`) à l'intérieur de `index.ts`, pour améliorer la lisibilité. Implémente cette sous-division si cela ne demande pas de passer 50 paramètres à chaque fonction.
```

## Résultat Attendu
Une bibliothèque analytique propre, où les règles de conversion de dates, les calculs géométriques et la composition de la "narrative" exécutive sont testables indépendamment du gros orchestrateur principal.
