export {
  WASTE_CATEGORY_DEFINITIONS,
  WASTE_CATEGORY_SLUGS,
  getWasteCategory,
  isWasteCategorySlug,
} from "./catalog";
export {
  LEGACY_RECYCLING_CATEGORY_ORDER,
  LEGACY_WASTE_CATEGORY_TO_SLUG,
  canonicalWasteSlugFromLegacy,
  getCanonicalWasteQuantities,
} from "./legacy";
export type {
  CanonicalWasteQuantity,
  LegacyWasteCategory,
} from "./legacy";
export type {
  WasteCategoryDefinition,
  WasteCategorySlug,
  WasteDisposalRoute,
  WasteFamily,
  WasteHazardLevel,
  WasteLocalizedText,
  WastePickupPolicy,
} from "./types";
export {
  ACTION_WASTE_MASS_RESOLUTION_KG,
  ACTION_WASTE_MEASUREMENT_METHODS,
  compareWasteBreakdownToTotal,
} from "./measurement";
export type {
  ActionWasteMeasurementMethod,
  CanonicalWasteBreakdown,
  WasteBreakdownComparisonOptions,
  WasteBreakdownCoherence,
} from "./measurement";
export {
  WASTE_CATEGORY_DEFINITIONS as FIELD_WASTE_CATEGORY_DEFINITIONS,
  WASTE_CATEGORY_SLUGS as FIELD_WASTE_CATEGORY_SLUGS,
  WASTE_DISPOSAL_LABELS,
  WASTE_FAMILY_LABELS,
  WASTE_FAMILY_ORDER,
  WASTE_HAZARD_LABELS,
  WASTE_PICKUP_LABELS,
  appendWasteCategoriesToNotes,
  buildWasteFieldGuidance,
  formatWasteGuidanceLines,
  getWasteCategorySearchText,
  normalizeWasteCategorySlugs,
  parseWasteCategoriesFromNotes,
  stripWasteCategoryMarkersFromNotes,
} from "./field-guidance";
export type { WasteFieldGuidance } from "./field-guidance";
export {
  findWasteCategorySlug,
  getWastePedagogicalProjection,
} from "./pedagogy";
export type {
  WastePedagogicalLocale,
  WastePedagogicalProjection,
} from "./pedagogy";
