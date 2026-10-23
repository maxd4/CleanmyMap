/**
 * Public façade for the unified action source.
 *
 * The implementation is split by responsibility under `unified-source/` so
 * existing imports do not need to change.
 */
export type {
  UnifiedSourceHealth,
} from "./unified-source/contracts";
export {
  normalizeExternalActionImport,
} from "./unified-source/contracts";
export { toCanonicalSpotContract } from "./unified-source/contracts";
export type { TrashSpotterSpotRow } from "./unified-source/types";
export {
  parseEntityTypesParam,
  fetchUnifiedActionContracts,
} from "./unified-source/index";
