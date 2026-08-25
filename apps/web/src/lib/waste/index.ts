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
