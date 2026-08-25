import { describe, expect, it } from "vitest";
import {
  appendWasteCategoriesToNotes,
  buildWasteFieldGuidance,
  formatWasteGuidanceLines,
  parseWasteCategoriesFromNotes,
  stripWasteCategoryMarkersFromNotes,
} from "@/lib/waste";

describe("canonical waste field guidance", () => {
  it("keeps nicotine pouch distinct from cigarette butt", () => {
    const cigarette = buildWasteFieldGuidance(["cigarette_butt"]);
    const pouch = buildWasteFieldGuidance(["nicotine_pouch"]);

    expect(cigarette.definitions[0]?.labels.fr).toContain("cigarette");
    expect(pouch.definitions[0]?.labels.fr).toContain("nicotine");
    expect(cigarette.definitions[0]?.disposalRoute).not.toBe(pouch.definitions[0]?.disposalRoute);
  });

  it("exposes the required safety behavior for hazardous and report-only categories", () => {
    const guidance = buildWasteFieldGuidance([
      "sharps",
      "broken_glass",
      "battery",
      "medicine",
      "cigarette_butt",
      "nicotine_pouch",
    ]);

    expect(guidance.hasReportOnlyCategory).toBe(true);
    expect(guidance.toPrepare.join(" ")).toMatch(/gants|container|adaptés/i);
    expect(guidance.toAvoid.join(" ")).toMatch(/mains nues|sac souple|mélanger/i);
    expect(guidance.toReport.join(" ")).toMatch(/signaler|service|contenant/i);
    expect(guidance.disposalRoutes).toEqual(expect.arrayContaining([
      "Ne pas ramasser ; signaler au service local ou habilité approprié",
      "Point de collecte piles/batteries",
      "Médicament non utilisé : pharmacie / Cyclamed ; emballage vide : tri local selon le matériau",
    ]));
  });

  it("derives bounded medicine and sharps reporting guidance", () => {
    const guidance = buildWasteFieldGuidance(["medicine", "sharps"]);

    expect(guidance.toReport.join(" ")).toMatch(/pharmacie.*Cyclamed/i);
    expect(guidance.toReport.join(" ")).toMatch(/ne pas ramasser.*service local.*habilité/i);
    expect(guidance.toAvoid.join(" ")).toMatch(/totalement vide.*pharmacie/i);
    expect(guidance.toAvoid.join(" ")).toMatch(/lame.*objet coupant générique/i);
  });

  it("keeps manual notes and adds derived preparation guidance", () => {
    const lines = formatWasteGuidanceLines(["broken_glass"]);
    expect(lines.toPrepare).toContain("Gants anti-coupure");
    expect(lines.toReport).toContain("Balisser");
    const notes = appendWasteCategoriesToNotes("Note organisateur", ["sharps", "other"]);
    expect(notes).toContain("Note organisateur");
    expect(notes).toContain("[cmm-waste:sharps,other]");
    expect(parseWasteCategoriesFromNotes(notes)).toEqual(["sharps", "other"]);
    expect(stripWasteCategoryMarkersFromNotes(notes)).toBe("Note organisateur");
  });

  it("ignores invalid slugs while reading historical notes", () => {
    expect(
      parseWasteCategoriesFromNotes(
        "Ancienne note\n[cmm-waste:cigarette_butt,legacy, UNKNOWN,broken_glass]\n[cmm-waste:cigarette_butt]",
      ),
    ).toEqual(["cigarette_butt", "broken_glass"]);
    expect(parseWasteCategoriesFromNotes("Note sans marqueur")).toEqual([]);
  });
});
