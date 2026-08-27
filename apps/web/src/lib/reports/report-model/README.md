# Report model

Ce dossier porte le modèle de données calculé pour les rapports. Il sépare
l'API publique de l'implémentation afin de conserver une surface de dépendance
stable et explicite.

## Structure

- `index.ts` est l'API publique. Il expose `computeReportModel` et les contrats
  `ReportModel`, `ReportModelInput` et `ReportModerationAvailability`.
- `compute-report-model.ts` contient l'orchestration du modèle et ses helpers
  strictement privés, sans modifier les calculs existants.
- `types.ts` porte le contrat du modèle et les types spécialisés associés.
- `builders/`, `metrics/`, `formatters/`, `math/` et `helpers/` sont des
  modules internes ; leurs consommateurs importent directement le module
  propriétaire précis.

Les composants Reports utilisent l'API publique pour calculer un modèle et le
module propriétaire précis lorsqu'ils ont besoin d'un formatter, d'une
métrique, d'un builder ou d'un type spécialisé. Aucun nouveau barrel ne doit
être ajouté pour raccourcir ces imports.

## Direction des dépendances

```text
components/reports et lib/reports externes
            │
            ▼
report-model/index.ts ──► compute-report-model.ts
            │
            └────────────► types.ts

internals report-model ──► builders / metrics / formatters / math / helpers
```

`computeReportModel` reste importable depuis `@/lib/reports/report-model`.
Les tests internes importent directement le module qu'ils vérifient. Le check
`npm run check:report-model-boundary` empêche les imports internes vers la
façade ou vers `./index`.
