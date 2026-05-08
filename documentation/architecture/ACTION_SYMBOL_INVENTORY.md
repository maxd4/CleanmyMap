# Inventaire des symboles d'action

Statuts utilisés:
- `utilisé`: présent et consommé par le code produit ou les scripts.
- `dupliqué`: encore recopié à plusieurs endroits.
- `script-local`: volontairement conservé dans un seul script.
- `orphelin`: non consommé.

## Résumé

- `utilisé`: tous les symboles listés ci-dessous.
- `dupliqué`: aucun après mutualisation du noyau géométrique.
- `script-local`: les helpers d’import sheet restent dans `build-admin-import-from-sheet.mjs`.
- `orphelin`: aucun dans ce périmètre.

## Détail

| Symbole | Statut | Localisation |
| --- | --- | --- |
| `findMatchingGeometry` | utilisé | `apps/web/src/lib/geo/geometry-reference.ts`, consommé par `apps/web/src/lib/actions/route-geometry.ts` et `apps/web/src/lib/actions/geometry-resolution.ts` |
| `ActionSubmissionMode` | utilisé | `apps/web/src/lib/actions/types.ts`, réexporté/consommé dans les contrats d’action |
| `ActionWasteBreakdown` | utilisé | `apps/web/src/lib/actions/types.ts`, contrats d’action et reporting |
| `ActionPhotoAsset` | utilisé | `apps/web/src/lib/actions/types.ts`, parcours de déclaration et vision |
| `ActionVisionEstimate` | utilisé | `apps/web/src/lib/actions/types.ts`, parcours de déclaration et assistance vision |
| `findZoneWithNeighbors` | utilisé | `apps/web/src/lib/geo/paris-neighborhood.ts` |
| `getBorderZones` | utilisé | `apps/web/src/lib/geo/paris-neighborhood.ts` |
| `ALL_DEPARTMENTS` | utilisé | `apps/web/src/lib/geo/greater-paris.ts` |
| `Map` | utilisé | icône lucide consommée dans plusieurs vues actions / accueil / annuaire |
| `AlertTriangle` | utilisé | icône lucide consommée dans les vues d’alerte et de validation |
| `BarChart3` | utilisé | icône lucide consommée dans les pages statistiques et reporting |
| `GEOMETRY_CONFIDENCE` | utilisé | source unique dans `apps/web/src/lib/actions/geometry-core.ts` |
| `buildEllipsePolygon` | utilisé | source unique dans `apps/web/src/lib/actions/geometry-core.ts` |
| `buildSyntheticRoute` | utilisé | source unique dans `apps/web/src/lib/actions/geometry-core.ts` |
| `hasPreciseLocationLabel` | utilisé | source unique dans `apps/web/src/lib/actions/geometry-core.ts` |
| `hasCoordinates` | utilisé | source unique dans `apps/web/src/lib/actions/geometry-core.ts` |
| `TrashBinGauge` | utilisé | `apps/web/src/components/actions/action-declaration/ui/harvest-gauges.tsx`, branché dans la section déchets |
| `serializeActionMeta` | script-local | `apps/web/scripts/build-admin-import-from-sheet.mjs` |
| `buildRouteNotes` | script-local | `apps/web/scripts/build-admin-import-from-sheet.mjs` |
| `splitEnterpriseAssociation` | script-local | `apps/web/scripts/build-admin-import-from-sheet.mjs` |

## Notes

- Les helpers géométriques ont été centralisés dans `apps/web/src/lib/actions/geometry-core.ts`.
- Les copies géométriques restantes ont été supprimées des scripts d’import et de backfill.
- Les helpers `serializeActionMeta`, `buildRouteNotes` et `splitEnterpriseAssociation` restent dans le script d’import car ils n’ont qu’un seul consommateur.
