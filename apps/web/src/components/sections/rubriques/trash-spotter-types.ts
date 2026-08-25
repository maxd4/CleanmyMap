export type SpotType = "clean_place" | "spot";
export type SpotFormStatus = "idle" | "pending" | "success" | "error";
import { normalizeWasteCategorySlugs } from "@/lib/waste";
import type { WasteCategorySlug } from "@/lib/waste";

export interface SpotFormState {
  type: SpotType;
  label: string;
  latitude: string;
  longitude: string;
  notes: string;
  wasteCategories: WasteCategorySlug[];
  status: SpotFormStatus;
  message: string | null;
}

export function resolveTrashSpotterWasteCategories(
  type: SpotType,
  categories: readonly string[] | null | undefined,
): WasteCategorySlug[] {
  return type === "spot" ? normalizeWasteCategorySlugs(categories) : [];
}
