import type { ActionDataContract } from "@/lib/actions/contracts/contract-model";

export const CANONICAL_WASTE_BREAKDOWN_CATEGORIES = [
  "recyclables",
  "glass",
  "household",
  "other",
] as const;

export type WasteCategory = (typeof CANONICAL_WASTE_BREAKDOWN_CATEGORIES)[number];

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
  wasteKnownActions: number;
  wasteCoverageRate: number;
  lines: RecyclingBreakdownLine[];
  triQuality: RecyclingTriQuality;
};

export function buildRecyclingBreakdown(
  contracts: ActionDataContract[],
): RecyclingBreakdownSnapshot {
  const collectionActions = contracts.filter((contract) => contract.type === "action");
  const categories = Object.fromEntries(
    CANONICAL_WASTE_BREAKDOWN_CATEGORIES.map((category) => [category, { kg: 0, entries: 0 }]),
  ) as Record<WasteCategory, { kg: number; entries: number }>;

  let triQualityHigh = 0;
  let triQualityMedium = 0;
  let triQualityLow = 0;
  let wasteKnownActions = 0;

  for (const contract of collectionActions) {
    const breakdown = contract.metadata.wasteBreakdown;
    if (
      contract.metadata.wasteKg !== null &&
      contract.metadata.wasteKg !== undefined &&
      Number.isFinite(contract.metadata.wasteKg) &&
      contract.metadata.wasteKg >= 0
    ) {
      wasteKnownActions += 1;
    }

    if (!breakdown) {
      continue;
    }

    const add = (category: WasteCategory, value: number | null | undefined) => {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        return;
      }
      categories[category].kg += value;
      categories[category].entries += 1;
    };

    add("recyclables", breakdown.recyclablesKg);
    add("glass", breakdown.glassKg);
    add("household", breakdown.householdWasteKg);
    add("other", breakdown.otherWasteKg);

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
  const lines = CANONICAL_WASTE_BREAKDOWN_CATEGORIES.map((category) => ({
    category,
    kg: Number(categories[category].kg.toFixed(2)),
    sharePercent: totalKg > 0 ? Number(((categories[category].kg / totalKg) * 100).toFixed(1)) : 0,
    entries: categories[category].entries,
  }));

  return {
    totalKg: Number(totalKg.toFixed(2)),
    wasteKnownActions,
    wasteCoverageRate:
      collectionActions.length > 0
        ? (wasteKnownActions / collectionActions.length) * 100
        : 0,
    lines,
    triQuality: {
      elevee: triQualityHigh,
      moyenne: triQualityMedium,
      faible: triQualityLow,
    },
  };
}
