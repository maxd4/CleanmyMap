import type { ActionMapItem } from "@/lib/actions/types";
import { mapItemCigaretteButts, mapItemWasteKg } from "../../lib/actions/data-contract";

export type MarkerCategory = "yellow" | "violet" | "green" | "blue" | "ashtray" | "bin";

export const DEFAULT_VISIBLE_CATEGORIES: Record<MarkerCategory, boolean> = {
  yellow: true,
  violet: true,
  green: false,
  blue: false,
  ashtray: false,
  bin: false,
};

export function classifyPollutionColor(item: ActionMapItem): Exclude<MarkerCategory, "ashtray" | "bin"> {
  const wasteKg = mapItemWasteKg(item);
  const butts = mapItemCigaretteButts(item);

  if (wasteKg >= 15 || butts >= 300) {
    return "violet";
  }
  if (wasteKg >= 3 || butts >= 80) {
    return "yellow";
  }
  if (wasteKg <= 0 && butts <= 0) {
    return "blue";
  }
  return "green";
}

export function deriveMarkerCategories(item: ActionMapItem): MarkerCategory[] {
  const categories: MarkerCategory[] = [classifyPollutionColor(item)];
  const wasteKg = mapItemWasteKg(item);
  const butts = mapItemCigaretteButts(item);

  if (butts > 0) {
    categories.push("ashtray");
  }
  if (wasteKg > 0) {
    categories.push("bin");
  }

  return categories;
}

export function isVisibleWithCategoryFilter(
  item: ActionMapItem,
  visibleCategories: Record<MarkerCategory, boolean>,
): boolean {
  const categories = deriveMarkerCategories(item);
  return categories.some((category) => visibleCategories[category]);
}
