import type { ActionDataContract } from "@/lib/actions/contract-model";

export type WasteCategory = "megots" | "plastique" | "verre" | "metal" | "mixte";

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
  const categories: Record<WasteCategory, { kg: number; entries: number }> = {
    megots: { kg: 0, entries: 0 },
    plastique: { kg: 0, entries: 0 },
    verre: { kg: 0, entries: 0 },
    metal: { kg: 0, entries: 0 },
    mixte: { kg: 0, entries: 0 },
  };

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

    add("megots", breakdown.megotsKg);
    add("plastique", breakdown.plastiqueKg);
    add("verre", breakdown.verreKg);
    add("metal", breakdown.metalKg);
    add("mixte", breakdown.mixteKg);

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
  const lines = (
    Object.entries(categories) as Array<
      [WasteCategory, { kg: number; entries: number }]
    >
  ).map(([category, entry]) => ({
    category,
    kg: Number(entry.kg.toFixed(2)),
    sharePercent: totalKg > 0 ? Number(((entry.kg / totalKg) * 100).toFixed(1)) : 0,
    entries: entry.entries,
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

