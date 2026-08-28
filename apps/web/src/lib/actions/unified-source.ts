/**
 * Public façade for the unified action source.
 *
 * The implementation is split by responsibility under `unified-source/` so
 * existing imports do not need to change.
 */
export type {
  UnifiedActionContractsParams,
  UnifiedSourceHealth,
  TrashSpotterSpotRow,
  UnifiedActionSourceLoadResult,
  UnifiedContractOrigin,
  UnifiedContractCandidate,
} from "./unified-source/contracts";
export {
  normalizeExternalActionImport,
  mapActionStatusToSpotStatuses,
  toActionContract,
  toCanonicalSpotContract,
} from "./unified-source/contracts";
export {
  parseEntityTypesParam,
  fetchUnifiedActionContracts,
} from "./unified-source/index";
export {
  buildUnifiedActionContracts,
  filterContractsByViewport,
} from "./unified-source/merge";
