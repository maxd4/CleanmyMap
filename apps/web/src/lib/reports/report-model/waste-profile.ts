type WasteProfileKey =
  | "megotsKg"
  | "plastiqueKg"
  | "verreKg"
  | "metalKg"
  | "mixteKg";

type WasteProfileCategory = {
  key: WasteProfileKey;
  label: string;
  kg: number;
  actions: number;
};

export type WasteProfile = {
  categories: WasteProfileCategory[];
  coveragePercent: number;
  dominantLabel: string;
  dominantKg: number;
};

type WasteBreakdown = Partial<Record<WasteProfileKey, unknown>>;

const WASTE_PROFILE_DEFINITIONS: ReadonlyArray<readonly [WasteProfileKey, string]> = [
  ["megotsKg", "Mégots"],
  ["plastiqueKg", "Plastique"],
  ["verreKg", "Verre"],
  ["metalKg", "Métal"],
  ["mixteKg", "Déchets mixtes"],
];

export function buildWasteProfile<T>(
  items: readonly T[],
  readBreakdown: (item: T) => WasteBreakdown | null | undefined,
): WasteProfile {
  const totals = Object.fromEntries(
    WASTE_PROFILE_DEFINITIONS.map(([key, label]) => [
      key,
      { key, label, kg: 0, actions: 0 },
    ]),
  ) as Record<WasteProfileKey, WasteProfileCategory>;
  let coveredActions = 0;

  for (const item of items) {
    const breakdown = readBreakdown(item);
    if (!breakdown) continue;
    coveredActions += 1;
    for (const [key] of WASTE_PROFILE_DEFINITIONS) {
      const value = Number(breakdown[key] ?? 0);
      if (value > 0) {
        totals[key].kg += value;
        totals[key].actions += 1;
      }
    }
  }

  const categories = Object.values(totals)
    .filter((category) => category.kg > 0)
    .sort((left, right) => right.kg - left.kg || right.actions - left.actions);
  const dominant = categories[0] ?? null;

  return {
    categories,
    coveragePercent: items.length > 0 ? (coveredActions / items.length) * 100 : 0,
    dominantLabel: dominant?.label ?? "Déchets non typés",
    dominantKg: dominant?.kg ?? 0,
  };
}
