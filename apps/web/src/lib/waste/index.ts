export {
  WASTE_CATEGORY_DEFINITIONS,
  WASTE_CATEGORY_SLUGS,
  getWasteCategory,
  isWasteCategorySlug,
} from "./catalog";
export {
  LEGACY_WASTE_CATEGORY_TO_SLUG,
  getCanonicalWasteQuantities,
} from "./legacy";
export type { LegacyWasteCategory } from "./legacy";
export type {
  WasteCategorySlug,
} from "./types";
export {
  ACTION_WASTE_MASS_RESOLUTION_KG,
  compareWasteBreakdownToTotal,
} from "./measurement";
export type {
  ActionWasteMeasurementMethod,
} from "./measurement";
export {
  appendWasteCategoriesToNotes,
  buildWasteFieldGuidance,
  formatWasteGuidanceLines,
  normalizeWasteCategorySlugs,
  parseWasteCategoriesFromNotes,
  stripWasteCategoryMarkersFromNotes,
} from "./field-guidance";
export {
  findWasteCategorySlug,
  getWastePedagogicalProjection,
} from "./pedagogy";
export type {
  WastePedagogicalProjection,
} from "./pedagogy";
