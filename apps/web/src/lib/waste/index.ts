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
