# Rapports et publications (`apps/web/src/lib/reports/`)

Statut : `CURRENT` — orientation et cycle de vie des générations et publications.

## Propriétaires et points d'entrée

- **Historique et snapshots** : `report-generation-history-store.ts`, `report-generation-history-contract.ts`, `report-generation-snapshot.ts`, `report-generation-derivation.ts`.
- **Artefacts PDF & quotas** : `report-generation-pdf-artifact-store.ts`, `report-generation-pdf-share-store.ts`, `report-pdf-renderer.ts`, `report-export-quota.ts`.
- **Publication bibliothèque publique** : `report-publication-store.ts`, `report-publication-contract.ts` (`assertReportPublicationEligibility`, `projectReportPublicationPreview`), `report-publication-private-data.ts`.

## Cycle de vie vérifié

- **Génération (`report_generations`)** : créée à la demande en statut `private` (historique borné par `REPORT_GENERATION_HISTORY_LIMIT = 12`).
- **Publication (`report_generation_publications`)** : transition `private -> published` via `createReportPublication` (`upsert` sur `generation_id`, `published_at` conservé si déjà actif, `revoked_at: null`).
- **Refus d'éligibilité (`ReportPublicationProjectionError`)** : bloque les rapports `single_action`, les payloads contenant `organizationName` / `rows` / `columns` ou tout marqueur privé (`containsPrivateMarker`).
- **Révocation** : positionne `revoked_at` (exclus des requêtes publiques `.is("revoked_at", null)`).
- **Tests repères** : `report-publication-contract.test.ts`, `report-publication-store.test.ts`, `report-generation-history-store.test.ts`, `report-export-quota.test.ts`.
