import type { ActionWasteBreakdown } from "@/lib/actions/types";
import type { WasteCategorySlug } from "./types";

export type LegacyWasteCategory =
  | "megots"
  | "plastique"
  | "verre"
  | "metal"
  | "mixte"
  | "encombrant";

export const LEGACY_WASTE_CATEGORY_TO_SLUG: Readonly<Record<LegacyWasteCategory, WasteCategorySlug>> = {
  megots: "cigarette_butt",
  plastique: "plastic",
  verre: "glass",
  metal: "metal",
  mixte: "mixed_residual",
  encombrant: "bulky_furniture",
};

export const LEGACY_RECYCLING_CATEGORY_ORDER = [
  "megots",
  "plastique",
  "verre",
  "metal",
  "mixte",
] as const satisfies readonly LegacyWasteCategory[];

export function canonicalWasteSlugFromLegacy(value: LegacyWasteCategory): WasteCategorySlug {
  return LEGACY_WASTE_CATEGORY_TO_SLUG[value];
}

export type CanonicalWasteQuantity = {
  slug: WasteCategorySlug;
  kg: number;
};

export function getCanonicalWasteQuantities(
  breakdown: ActionWasteBreakdown | null | undefined,
): CanonicalWasteQuantity[] {
  if (!breakdown) {
    return [];
  }

  const quantities: Array<[LegacyWasteCategory, number | undefined]> = [
    ["megots", breakdown.megotsKg],
    ["plastique", breakdown.plastiqueKg],
    ["verre", breakdown.verreKg],
    ["metal", breakdown.metalKg],
    ["mixte", breakdown.mixteKg],
  ];

  return quantities.flatMap(([legacy, value]) => {
    const kg = Number(value ?? 0);
    return kg > 0
      ? [{ slug: canonicalWasteSlugFromLegacy(legacy), kg }]
      : [];
  });
}
