import {
  getWasteCategory,
  isWasteCategorySlug,
  WASTE_CATEGORY_DEFINITIONS,
  WASTE_CATEGORY_SLUGS,
} from "./catalog";
import type { WasteCategoryDefinition, WasteCategorySlug, WasteFamily, WastePickupPolicy } from "./types";

const WASTE_CATEGORIES_MARKER = /\[cmm-waste:([^\]]*)\]/gi;

export const WASTE_FAMILY_ORDER: readonly WasteFamily[] = [
  "nicotine",
  "packaging",
  "glass",
  "metal",
  "residual",
  "bulky",
  "wood",
  "electrical",
  "hazardous",
  "unknown",
];

export const WASTE_FAMILY_LABELS: Readonly<Record<WasteFamily, string>> = {
  nicotine: "Nicotine",
  packaging: "Emballages",
  glass: "Verre",
  metal: "Métaux",
  residual: "Résiduel",
  bulky: "Encombrants",
  wood: "Bois",
  electrical: "Équipements électriques",
  hazardous: "Déchets à risque",
  unknown: "À identifier",
};

export const WASTE_HAZARD_LABELS = {
  low: "Vigilance standard",
  caution: "Vigilance renforcée",
  high: "Risque élevé",
  critical: "Risque critique",
  unknown: "Risque à identifier",
} as const;

export const WASTE_PICKUP_LABELS: Readonly<Record<WastePickupPolicy, string>> = {
  basic_ppe_ok: "Collecte possible avec EPI de base",
  basic_ppe_with_care: "Collecte possible avec précaution et EPI",
  trained_only: "Ramassage uniquement avec équipement adapté et consigne/formations appropriées",
  no_pickup: "Ne pas ramasser / signaler",
};

export const WASTE_DISPOSAL_LABELS = {
  cigarette_waste: "Filière dédiée mégots",
  municipal_recycling: "Filière locale de tri",
  glass_container: "Borne ou filière verre locale",
  residual_waste: "Déchets résiduels, selon la consigne locale",
  bulky_collection: "Enlèvement des encombrants",
  wood_collection: "Filière bois locale",
  e_waste_collection: "Filière équipements électriques",
  battery_dropoff: "Point de collecte piles/batteries",
  pharmacy_takeback: "Médicament non utilisé : pharmacie / Cyclamed ; emballage vide : tri local selon le matériau",
  sharps_collection: "Ne pas ramasser ; signaler au service local ou habilité approprié",
  local_authority_route: "Consigne de la collectivité à vérifier",
} as const;

export type WasteFieldGuidance = {
  definitions: WasteCategoryDefinition[];
  toPrepare: string[];
  toAvoid: string[];
  toReport: string[];
  ppe: string[];
  disposalRoutes: string[];
  hasReportOnlyCategory: boolean;
};

export function normalizeWasteCategorySlugs(
  slugs: readonly string[] | null | undefined,
): WasteCategorySlug[] {
  return [...new Set((slugs ?? []).filter((slug): slug is WasteCategorySlug => slug in WASTE_CATEGORY_DEFINITIONS))];
}

export function getWasteCategorySearchText(slug: WasteCategorySlug): string {
  const category = getWasteCategory(slug);
  return [
    category.labels.fr,
    category.labels.en,
    ...category.examples.flatMap((example) => [example.fr, example.en]),
    ...(category.aliases ?? []).flatMap((alias) => [alias.fr, alias.en]),
    ...category.pedagogicalTags,
  ]
    .join(" ")
    .toLocaleLowerCase("fr-FR");
}

export function buildWasteFieldGuidance(
  slugs: readonly WasteCategorySlug[] | null | undefined,
): WasteFieldGuidance {
  const normalized = normalizeWasteCategorySlugs(slugs);
  const definitions = normalized.map(getWasteCategory);
  const unique = (values: string[]) => [...new Set(values)];

  return {
    definitions,
    toPrepare: unique(definitions.flatMap((category) => category.ppe.map((item) => item.fr))),
    toAvoid: unique(definitions.flatMap((category) => category.prohibitions.map((item) => item.fr))),
    toReport: unique(
      definitions
        .filter((category) => category.pickupPolicy === "no_pickup" || category.hazardLevel === "high" || category.hazardLevel === "critical")
        .flatMap((category) => category.fieldInstructions.map((item) => item.fr)),
    ),
    ppe: unique(definitions.flatMap((category) => category.ppe.map((item) => item.fr))),
    disposalRoutes: unique(definitions.map((category) => WASTE_DISPOSAL_LABELS[category.disposalRoute])),
    hasReportOnlyCategory: definitions.some((category) => category.pickupPolicy === "no_pickup"),
  };
}

export function appendWasteCategoriesToNotes(
  notes: string | undefined,
  slugs: readonly WasteCategorySlug[] | null | undefined,
): string | undefined {
  const normalized = normalizeWasteCategorySlugs(slugs);
  const base = notes?.trim() ?? "";
  if (normalized.length === 0) return base || undefined;
  const marker = `[cmm-waste:${normalized.join(",")}]`;
  return base ? `${base}\n${marker}` : marker;
}

/**
 * Lit le marqueur transitoire des catégories Waste UX sans exposer les notes
 * comme contrat de persistance. Les tokens inconnus sont volontairement
 * ignorés afin de rester rétrocompatible avec les notes historiques tout en
 * garantissant que seuls les WasteCategorySlug canoniques sortent du parseur.
 */
export function parseWasteCategoriesFromNotes(
  notes: string | null | undefined,
): WasteCategorySlug[] {
  if (!notes) {
    return [];
  }

  const parsed: WasteCategorySlug[] = [];
  for (const match of notes.matchAll(WASTE_CATEGORIES_MARKER)) {
    for (const token of (match[1] ?? "").split(",")) {
      const normalized = token.trim().toLowerCase();
      if (isWasteCategorySlug(normalized) && !parsed.includes(normalized)) {
        parsed.push(normalized);
      }
    }
  }

  return parsed;
}

export function stripWasteCategoryMarkersFromNotes(
  notes: string | null | undefined,
): string | undefined {
  const cleaned = (notes ?? "")
    .replace(WASTE_CATEGORIES_MARKER, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();

  return cleaned || undefined;
}

export function formatWasteGuidanceLines(
  slugs: readonly WasteCategorySlug[] | null | undefined,
): { toPrepare: string; toAvoid: string; toReport: string } {
  const guidance = buildWasteFieldGuidance(slugs);
  return {
    toPrepare: guidance.toPrepare.map((item) => `- ${item}`).join("\n"),
    toAvoid: guidance.toAvoid.map((item) => `- ${item}`).join("\n"),
    toReport: guidance.toReport.map((item) => `- ${item}`).join("\n"),
  };
}

export { WASTE_CATEGORY_DEFINITIONS, WASTE_CATEGORY_SLUGS };
