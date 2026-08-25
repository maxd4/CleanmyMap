import type { ActionDataContract } from "@/lib/actions/contract-model";
import {
  LEGACY_RECYCLING_CATEGORY_ORDER,
  canonicalWasteSlugFromLegacy,
  getCanonicalWasteQuantities,
} from "@/lib/waste";
import type { LegacyWasteCategory } from "@/lib/waste";

/**
 * Public output values are kept for API/UI compatibility. Their meaning is
 * provided by the global waste registry through the legacy adapter.
 */
export type WasteCategory = LegacyWasteCategory;

export type RecyclingBreakdownLine = {
  category: WasteCategory;
  kg: number;
  sharePercent: number;
  entries: number;
};

export type RecyclingTriQuality = {
  elevee: number;
  moyenne: number;
  faible: number;
};

export type RecyclingBreakdownSnapshot = {
  totalKg: number;
  lines: RecyclingBreakdownLine[];
  triQuality: RecyclingTriQuality;
};

export function buildRecyclingBreakdown(
  contracts: ActionDataContract[],
): RecyclingBreakdownSnapshot {
  const categories = Object.fromEntries(
    LEGACY_RECYCLING_CATEGORY_ORDER.map((category) => [category, { kg: 0, entries: 0 }]),
  ) as Record<WasteCategory, { kg: number; entries: number }>;

  let triQualityHigh = 0;
  let triQualityMedium = 0;
  let triQualityLow = 0;

  for (const contract of contracts) {
    const breakdown = contract.metadata.wasteBreakdown;
    if (!breakdown) {
      categories.mixte.kg += Number(contract.metadata.wasteKg || 0);
      categories.mixte.entries += 1;
      continue;
    }

    const add = (category: WasteCategory, value: number | undefined) => {
      const kg = Number(value ?? 0);
      if (kg <= 0) {
        return;
      }
      categories[category].kg += kg;
      categories[category].entries += 1;
    };

    for (const quantity of getCanonicalWasteQuantities(breakdown)) {
      const category = LEGACY_RECYCLING_CATEGORY_ORDER.find(
        (legacyCategory) => canonicalWasteSlugFromLegacy(legacyCategory) === quantity.slug,
      );
      if (category) {
        add(category, quantity.kg);
      }
    }

    if (breakdown.triQuality === "elevee") {
      triQualityHigh += 1;
    } else if (breakdown.triQuality === "moyenne") {
      triQualityMedium += 1;
    } else if (breakdown.triQuality === "faible") {
      triQualityLow += 1;
    }
  }

  const totalKg = Object.values(categories).reduce(
    (acc, entry) => acc + entry.kg,
    0,
  );
  const lines = LEGACY_RECYCLING_CATEGORY_ORDER.map((category) => ({
    category,
    kg: Number(categories[category].kg.toFixed(2)),
    sharePercent: totalKg > 0 ? Number(((categories[category].kg / totalKg) * 100).toFixed(1)) : 0,
    entries: categories[category].entries,
  }));

  return {
    totalKg: Number(totalKg.toFixed(2)),
    lines,
    triQuality: {
      elevee: triQualityHigh,
      moyenne: triQualityMedium,
      faible: triQualityLow,
    },
  };
}
