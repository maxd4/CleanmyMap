export type SpotType = "clean_place" | "spot";
export type SpotFormStatus = "idle" | "pending" | "success" | "error";
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
