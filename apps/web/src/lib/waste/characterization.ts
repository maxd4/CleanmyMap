import { getWasteCategory } from "./catalog";
import type { WasteCategorySlug } from "./types";

/** The nine compact rows exposed by the post-action characterization panel. */
export const ACTION_WASTE_CHARACTERIZATION_SLUGS = [
  "plastic",
  "rubber",
  "textile",
  "paper_cardboard",
  "wood",
  "metal",
  "glass",
  "ceramic",
  "sanitary_medical",
] as const satisfies readonly WasteCategorySlug[];

export type ActionWasteCharacterizationSlug =
  (typeof ACTION_WASTE_CHARACTERIZATION_SLUGS)[number];

export type ActionWasteCharacterization = Partial<
  Record<ActionWasteCharacterizationSlug, number | null>
>;

export type ActionWasteCharacterizationCategory = {
  slug: ActionWasteCharacterizationSlug;
  label: string;
  examples: string;
  icon: string;
  safetyNote?: string;
};

const PRESENTATION_LABELS: Readonly<
  Record<ActionWasteCharacterizationSlug, { label: string; examples: string; icon: string; safetyNote?: string }>
> = {
  plastic: {
    label: "Plastiques et polystyrène",
    examples: "bouteilles, bouchons, sacs, filets, cordages, emballages, fragments",
    icon: "♻",
  },
  rubber: {
    label: "Caoutchouc",
    examples: "pneus, ballons, bottes, fragments élastomères",
    icon: "◉",
  },
  textile: {
    label: "Textile",
    examples: "vêtements, chaussures, serviettes, tissus, fibres naturelles",
    icon: "▤",
  },
  paper_cardboard: {
    label: "Papier et carton",
    examples: "journaux, cartons, gobelets, emballages, briques composites",
    icon: "▧",
  },
  wood: {
    label: "Bois travaillé ou traité",
    examples: "palettes, cagettes, construction, petits objets transformés",
    icon: "▱",
  },
  metal: {
    label: "Métal",
    examples: "canettes, conserves, capsules, câbles, ferraille",
    icon: "✦",
  },
  glass: {
    label: "Verre",
    examples: "bouteilles, bocaux, tessons et verre cassé",
    icon: "◇",
    safetyNote: "Verre cassé : équipement adapté et consigne locale.",
  },
  ceramic: {
    label: "Céramique et poterie",
    examples: "vaisselle, carrelage, briques, éléments minéraux cuits",
    icon: "◆",
  },
  sanitary_medical: {
    label: "Déchets sanitaires et médicaux",
    examples: "produits d’hygiène, médicaments, objets de soins, objets piquants",
    icon: "⚕",
    safetyNote: "Seringues et aiguilles trouvées : ne pas ramasser, signaler.",
  },
};

export const ACTION_WASTE_CHARACTERIZATION_CATEGORIES: readonly ActionWasteCharacterizationCategory[] =
  ACTION_WASTE_CHARACTERIZATION_SLUGS.map((slug) => ({
    slug,
    ...PRESENTATION_LABELS[slug],
  }));

export function isActionWasteCharacterizationSlug(
  value: string,
): value is ActionWasteCharacterizationSlug {
  return (ACTION_WASTE_CHARACTERIZATION_SLUGS as readonly string[]).includes(value);
}

export function normalizeActionWasteCharacterization(
  value: unknown,
): ActionWasteCharacterization {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const candidate = value as Record<string, unknown>;
  const normalized: ActionWasteCharacterization = {};
  for (const slug of ACTION_WASTE_CHARACTERIZATION_SLUGS) {
    const raw = candidate[slug];
    if (raw === null) {
      normalized[slug] = null;
    } else if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
      normalized[slug] = raw;
    }
  }
  return normalized;
}

export function sumActionWasteCharacterizationKg(
  value: ActionWasteCharacterization | null | undefined,
): number | null {
  const known = Object.values(normalizeActionWasteCharacterization(value)).filter(
    (entry): entry is number => typeof entry === "number" && Number.isFinite(entry) && entry >= 0,
  );
  return known.length > 0 ? known.reduce((sum, entry) => sum + entry, 0) : null;
}

/** Keeps the safety catalog linked to every presentation row at runtime. */
export function getActionWasteCharacterizationCategory(
  slug: ActionWasteCharacterizationSlug,
) {
  return getWasteCategory(slug);
}
