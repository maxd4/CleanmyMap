# Plan de decoupage monolithes (Top 3)

Date: 2026-04-17  
Portee: `apps/web/src`  
Objectif: reduire les 3 plus gros fichiers en modules testables, sans regression fonctionnelle.

## Fichiers cibles (ordre de traitement)
1. `apps/web/src/components/reports/admin-workflow/use-admin-workflow.ts` (~531 lignes)
2. `apps/web/src/components/sections/rubriques/community-section.tsx` (~1059 lignes)
3. `apps/web/src/components/reports/reports-web-document.tsx` (~1631 lignes)

## Contraintes
- Conserver les APIs publiques actuelles (props, hook signatures, exports).
- Une PR par monolithe.
- Ajouter des tests de logique, pas seulement du rendu.
- Cible: < 350 lignes par fichier; alerte au-dela de 500 lignes.

---

## Lot 1 - `use-admin-workflow.ts`

### Decoupage propose
- `admin-workflow/helpers.ts`
  - `buildExportQuery`
  - `parseAdminApiError`
  - `parseJsonSafely`
- `admin-workflow/download.ts`
  - `downloadFromUrl`
  - `triggerBrowserDownload`
- `admin-workflow/use-admin-workflow-state.ts`
  - tous les `useState` + fonctions reset
- `admin-workflow/use-admin-workflow-actions.ts`
  - `onDownloadCsv`, `onDownloadJson`, `onImportDryRun`, `onImportPastActions`, `onModerateEntity`
- `admin-workflow/use-admin-workflow.ts`
  - orchestration finale seulement

### Tests cibles
- `helpers.test.ts` (etendre cas limites)
- `use-admin-workflow-actions.test.ts` (dry-run invalide, confirmation manquante, mapping erreurs moderation)

### Done criteria
- `use-admin-workflow.ts` <= 300 lignes
- fonctions pures couvertes par tests unitaires

---

## Lot 2 - `community-section.tsx`

### Decoupage propose
- `community/utils.ts`
  - `formatFrDate`, `parseOptionalInt`, `formatPct`
- `community/ics.ts`
  - `toIcsTimestamp`, `buildDateAtHour`, `buildIcsHref`
- `community/use-community-data.ts`
  - SWR events/actions + normalisation
- `community/use-community-kpis.ts`
  - highlights, upcoming/past/mine, conversion/reminders/staffing maps
- `community/components/*`
  - `community-header.tsx`
  - `community-tabs.tsx`
  - `community-event-card.tsx`
  - `community-kpis-panel.tsx`
  - `community-create-event-form.tsx`
- `community-section.tsx`
  - conteneur leger

### Tests cibles
- `ics.test.ts` (timestamp et URL ICS)
- `use-community-kpis.test.ts` (tri, highlights, mapping par event id)

### Done criteria
- `community-section.tsx` <= 250 lignes
- logique KPI/filtres sortie dans hooks testes

---

## Lot 3 - `reports-web-document.tsx`

### Decoupage propose
- `reports/web-document/types.ts`
- `reports/web-document/constants.ts`
  - chapitres, glossaire
- `reports/web-document/formatters.ts`
  - `toFrNumber`, `toFrInt`, `toFrDate`
- `reports/web-document/analytics.ts`
  - `average`, `median`, `scoreAction`, `distanceKm`
  - `buildRouteSteps`, `buildMonthRows`, `buildCalendarRows`
- `reports/web-document/use-report-web-data.ts`
  - tous les appels SWR
- `reports/web-document/use-report-web-model.ts`
  - composition du modele final pour la vue
- `reports/web-document/components/*`
  - `metric-card.tsx`, `insight-box.tsx`, `report-table.tsx`, charts
- `reports-web-document.tsx`
  - shell d'assemblage

### Tests cibles
- `analytics.test.ts`
- `formatters.test.ts`
- `use-report-web-model.test.ts` (fallback si source absente)

### Done criteria
- `reports-web-document.tsx` <= 300 lignes
- `analytics.ts` couvert par tests unitaires

---

## Sequence d'execution recommandee
1. Lot 1 (risque faible, gain testabilite immediat)
2. Lot 2 (UI + logique mixte)
3. Lot 3 (plus gros chantier, possible en 2 sous-PR)

## Check-list par lot
- [ ] Extraire d'abord la logique pure
- [ ] Garder API externe inchangee
- [ ] Ajouter tests avant suppression de code legacy
- [ ] Passer `npm -C apps/web run lint`
- [ ] Passer tests cibles
- [ ] Verifier `npm run quality:top-heavy`

## Commandes type (a executer a chaque lot)
```bash
npm -C apps/web run lint
npm -C apps/web run test -- <tests-cibles>
npm run quality:top-heavy
```
