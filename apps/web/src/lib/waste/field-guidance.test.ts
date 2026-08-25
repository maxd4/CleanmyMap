import { describe, expect, it } from "vitest";
import {
  appendWasteCategoriesToNotes,
  buildWasteFieldGuidance,
  formatWasteGuidanceLines,
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
      "Service autorisé pour objets piquants/coupants",
      "Point de collecte piles/batteries",
      "Retour en pharmacie ou filière autorisée",
    ]));
  });

  it("keeps manual notes and adds derived preparation guidance", () => {
    const lines = formatWasteGuidanceLines(["broken_glass"]);
    expect(lines.toPrepare).toContain("Gants anti-coupure");
    expect(lines.toReport).toContain("Balisser");
    const notes = appendWasteCategoriesToNotes("Note organisateur", ["sharps", "other"]);
    expect(notes).toContain("Note organisateur");
    expect(notes).toContain("[cmm-waste:sharps,other]");
  });
});
