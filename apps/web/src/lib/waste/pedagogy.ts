import { getWasteCategory, WASTE_CATEGORY_SLUGS } from "./catalog";
import type {
  WasteCategoryDefinition,
  WasteCategorySlug,
  WasteHazardLevel,
  WastePickupPolicy,
} from "./types";

export type WastePedagogicalLocale = "fr" | "en";

export type WastePedagogicalProjection = {
  slug: WasteCategorySlug;
  family: WasteCategoryDefinition["family"];
  label: string;
  examples: string[];
  hazardLevel: WasteHazardLevel;
  hazardLabel: string;
  pickupPolicy: WastePickupPolicy;
  pickupLabel: string;
  disposalRoute: WasteCategoryDefinition["disposalRoute"];
  disposalLabel: string;
  ppe: string[];
  instructions: string[];
  prohibitions: string[];
  tags: readonly string[];
};

const HAZARD_LABELS: Record<WastePedagogicalLocale, Record<WasteHazardLevel, string>> = {
  fr: {
    low: "Vigilance standard",
    caution: "Vigilance renforcée",
    high: "Risque élevé",
    critical: "Risque critique",
    unknown: "Risque à identifier",
  },
  en: {
    low: "Standard caution",
    caution: "Increased caution",
    high: "High risk",
    critical: "Critical risk",
    unknown: "Risk to identify",
  },
};

const PICKUP_LABELS: Record<WastePedagogicalLocale, Record<WastePickupPolicy, string>> = {
  fr: {
    basic_ppe_ok: "Collecte possible avec EPI de base",
    basic_ppe_with_care: "Collecte possible avec précaution et EPI",
    trained_only: "Ramassage réservé à une équipe équipée et formée",
    no_pickup: "Ne pas ramasser : sécuriser et signaler",
  },
  en: {
    basic_ppe_ok: "Collection is possible with basic PPE",
    basic_ppe_with_care: "Collection is possible with care and PPE",
    trained_only: "Collection is reserved for an equipped and trained team",
    no_pickup: "Do not pick up: secure the area and report it",
  },
};

const DISPOSAL_LABELS: Record<WastePedagogicalLocale, Record<WasteCategoryDefinition["disposalRoute"], string>> = {
  fr: {
    cigarette_waste: "la filière dédiée aux mégots",
    municipal_recycling: "la filière locale de tri",
    glass_container: "la borne ou filière verre locale",
    residual_waste: "les déchets résiduels, selon la consigne locale",
    bulky_collection: "l'enlèvement ou la filière locale des encombrants",
    wood_collection: "la filière bois locale",
    e_waste_collection: "la filière équipements électriques",
    battery_dropoff: "un point de collecte piles/batteries",
    pharmacy_takeback: "la pharmacie / filière Cyclamed pour le contenu",
    sharps_collection: "le service local ou habilité approprié, sans ramassage bénévole",
    local_authority_route: "la consigne de la collectivité à vérifier",
  },
  en: {
    cigarette_waste: "the dedicated cigarette-butt stream",
    municipal_recycling: "the local recycling stream",
    glass_container: "the local glass container or stream",
    residual_waste: "residual waste, following local guidance",
    bulky_collection: "the local bulky-waste collection or stream",
    wood_collection: "the local wood stream",
    e_waste_collection: "the electrical-equipment stream",
    battery_dropoff: "a battery drop-off point",
    pharmacy_takeback: "a pharmacy / Cyclamed route for the contents",
    sharps_collection: "the appropriate local or authorized service, without volunteer pickup",
    local_authority_route: "the local-authority guidance to verify",
  },
};

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSearchTerms(category: WasteCategoryDefinition): string[] {
  return [
    category.labels.fr,
    category.labels.en,
    ...category.examples.flatMap((example) => [example.fr, example.en]),
    ...(category.aliases ?? []).flatMap((alias) => [alias.fr, alias.en]),
    ...category.pedagogicalTags,
  ]
    .map(normalizeSearchText)
    .filter((term) => term.length > 1);
}

export function findWasteCategorySlug(value: string): WasteCategorySlug | null {
  const normalized = normalizeSearchText(value);
  if (!normalized) return null;

  const matches = WASTE_CATEGORY_SLUGS.flatMap((slug) =>
    getSearchTerms(getWasteCategory(slug))
      .filter((term) => normalized.includes(term))
      .map((term) => ({ slug, term })),
  ).sort((left, right) => right.term.length - left.term.length || left.slug.localeCompare(right.slug));

  return matches[0]?.slug ?? null;
}

export function getWastePedagogicalProjection(
  slug: WasteCategorySlug,
  locale: WastePedagogicalLocale,
): WastePedagogicalProjection {
  const category = getWasteCategory(slug);
  return {
    slug: category.slug,
    family: category.family,
    label: category.labels[locale],
    examples: category.examples.map((example) => example[locale]),
    hazardLevel: category.hazardLevel,
    hazardLabel: HAZARD_LABELS[locale][category.hazardLevel],
    pickupPolicy: category.pickupPolicy,
    pickupLabel: PICKUP_LABELS[locale][category.pickupPolicy],
    disposalRoute: category.disposalRoute,
    disposalLabel: DISPOSAL_LABELS[locale][category.disposalRoute],
    ppe: category.ppe.map((item) => item[locale]),
    instructions: category.fieldInstructions.map((item) => item[locale]),
    prohibitions: category.prohibitions.map((item) => item[locale]),
    tags: category.pedagogicalTags,
  };
}
