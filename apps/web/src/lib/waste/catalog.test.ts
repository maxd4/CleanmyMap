import { describe, expect, it } from "vitest";
import {
  LEGACY_WASTE_CATEGORY_TO_SLUG,
  WASTE_CATEGORY_DEFINITIONS,
  WASTE_CATEGORY_SLUGS,
  getCanonicalWasteQuantities,
  getWasteCategory,
  isWasteCategorySlug,
} from "@/lib/waste";

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
