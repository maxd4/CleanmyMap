import { describe, expect, it } from "vitest";

import { buildQuickSignalementPayload } from "./quick-signalement";

describe("buildQuickSignalementPayload", () => {
  it("keeps Waste categories in the canonical spot contract", () => {
    const payload = buildQuickSignalementPayload({
      recordType: "spot",
      categories: ["plastic", "broken_glass"],
      location: { lat: 48.8566, lng: 2.3522 },
      actionDate: "2026-08-25",
    });

    expect(payload.recordType).toBe("spot");
    expect(payload.associationName).toBe("Action spontanée");
    expect(payload.preparationData).toEqual({
      expectedWasteCategories: ["plastic", "broken_glass"],
    });
    expect(payload.notes).toContain("[cmm-waste:plastic,broken_glass]");
    expect(payload.latitude).toBe(48.8566);
    expect(payload.longitude).toBe(2.3522);
    expect(payload).not.toHaveProperty("photos");
  });

  it("never carries Waste categories into a clean_place contract", () => {
    const payload = buildQuickSignalementPayload({
      recordType: "clean_place",
      categories: ["plastic"],
      location: { lat: 48.8566, lng: 2.3522 },
      actionDate: "2026-08-25",
    });

    expect(payload.recordType).toBe("clean_place");
    expect(payload.preparationData).toBeNull();
    expect(payload.notes).not.toContain("cmm-waste");
    expect(payload.notes).not.toContain("plastic");
    expect(payload).not.toHaveProperty("observedPollutionScore");
    expect(payload).not.toHaveProperty("photos");
  });
});
