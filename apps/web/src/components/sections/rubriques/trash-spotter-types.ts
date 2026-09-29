export type SpotType = "clean_place" | "spot";
import { normalizeWasteCategorySlugs } from "@/lib/waste";
import type { WasteCategorySlug } from "@/lib/waste";

export function resolveTrashSpotterWasteCategories(
  type: SpotType,
  categories: readonly string[] | null | undefined,
): WasteCategorySlug[] {
  return type === "spot" ? normalizeWasteCategorySlugs(categories) : [];
}
