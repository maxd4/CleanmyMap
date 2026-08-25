import { describe, expect, it } from "vitest";
import {
  LEGACY_WASTE_CATEGORY_TO_SLUG,
  WASTE_CATEGORY_DEFINITIONS,
  WASTE_CATEGORY_SLUGS,
  getCanonicalWasteQuantities,
  getWasteCategory,
  isWasteCategorySlug,
} from "@/lib/waste";
import { findWasteCategorySlug, getWastePedagogicalProjection } from "@/lib/waste";

const REQUIRED_SLUGS = [
  "cigarette_butt",
  "nicotine_pouch",
  "plastic",
  "glass",
  "broken_glass",
  "metal",
  "mixed_residual",
  "bulky_furniture",
  "wood",
  "electrical_equipment",
  "battery",
  "medicine",
  "sharps",
  "other",
] as const;

describe("global waste category contract", () => {
  it("contains every required category with the complete bilingual safety contract", () => {
    expect([...WASTE_CATEGORY_SLUGS]).toEqual(expect.arrayContaining([...REQUIRED_SLUGS]));

    for (const slug of REQUIRED_SLUGS) {
      const definition = getWasteCategory(slug);
      expect(definition.slug).toBe(slug);
      expect(definition.labels.fr.length).toBeGreaterThan(0);
      expect(definition.labels.en.length).toBeGreaterThan(0);
      expect(definition.examples.length).toBeGreaterThan(0);
      expect(definition.examples.every((example) => example.fr && example.en)).toBe(true);
      expect(definition.hazardLevel).toBeTruthy();
      expect(definition.pickupPolicy).toBeTruthy();
      expect(definition.disposalRoute).toBeTruthy();
      expect(definition.ppe.length).toBeGreaterThan(0);
      expect(definition.fieldInstructions.length).toBeGreaterThan(0);
      expect(definition.prohibitions.length).toBeGreaterThan(0);
      expect(definition.pedagogicalTags.length).toBeGreaterThan(0);
    }
  });

  it("keeps hazardous handling explicit", () => {
    expect(getWasteCategory("broken_glass").hazardLevel).toBe("high");
    expect(getWasteCategory("battery").hazardLevel).toBe("high");
    expect(getWasteCategory("sharps").pickupPolicy).toBe("no_pickup");
    expect(getWasteCategory("sharps").disposalRoute).toBe("sharps_collection");
  });

  it("keeps pedagogical aliases attached to the canonical category contract", () => {
    expect(findWasteCategorySlug("snus usagé")).toBe("nicotine_pouch");
    expect(findWasteCategorySlug("verre cassé")).toBe("broken_glass");
    expect(findWasteCategorySlug("petit électroménager")).toBe("electrical_equipment");
    expect(getWastePedagogicalProjection("sharps", "fr")).toMatchObject({
      pickupPolicy: "no_pickup",
      pickupLabel: "Ne pas ramasser : sécuriser et signaler",
      disposalRoute: "sharps_collection",
    });
  });

  it("reserves medicine for unused medicine or packaging that still contains medicine", () => {
    const medicine = getWasteCategory("medicine");
    const examples = medicine.examples.map((example) => `${example.fr} ${example.en}`).join(" ");
    const guidance = medicine.fieldInstructions.map((item) => item.fr).join(" ");

    expect(medicine.labels.fr).toMatch(/non utilisé|contenant encore/i);
    expect(examples).toMatch(/non utilisé|contenant encore/i);
    expect(examples).not.toMatch(/emballage vide|empty packaging/i);
    expect(guidance).toMatch(/pharmacie.*Cyclamed/i);
    expect(guidance).toMatch(/totalement vide.*tri.*matière/i);
  });

  it("keeps found syringes and needles separate from generic blades and sharps", () => {
    const sharps = getWasteCategory("sharps");
    const sharpsExamples = sharps.examples.map((example) => `${example.fr} ${example.en}`).join(" ");
    const otherExamples = getWasteCategory("other").examples.map((example) => `${example.fr} ${example.en}`).join(" ");
    const instructions = sharps.fieldInstructions.map((item) => item.fr).join(" ");

    expect(sharpsExamples).toMatch(/seringue|aiguille/i);
    expect(sharpsExamples).not.toMatch(/lame|cutter|objet coupant|blade|sharp object/i);
    expect(otherExamples).toMatch(/lame|cutter|objet coupant/i);
    expect(sharps.pickupPolicy).toBe("no_pickup");
    expect(instructions).toMatch(/ne pas ramasser.*signaler.*service local.*habilité/i);
  });

  it("maps historical action and recycling slugs without changing their payload values", () => {
    expect(LEGACY_WASTE_CATEGORY_TO_SLUG).toMatchObject({
      megots: "cigarette_butt",
      plastique: "plastic",
      verre: "glass",
      metal: "metal",
      mixte: "mixed_residual",
      encombrant: "bulky_furniture",
    });

    expect(getCanonicalWasteQuantities({ megotsKg: 0.4, verreKg: 2, mixteKg: 0 })).toEqual([
      { slug: "cigarette_butt", kg: 0.4 },
      { slug: "glass", kg: 2 },
    ]);
  });

  it("does not treat signalement provenance as a waste category", () => {
    expect(isWasteCategorySlug("trash_spotter_spots")).toBe(false);
    expect(WASTE_CATEGORY_DEFINITIONS).not.toHaveProperty("trash_spotter_spots");
  });
});
