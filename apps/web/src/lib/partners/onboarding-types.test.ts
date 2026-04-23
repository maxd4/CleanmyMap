import { describe, expect, it } from "vitest";
import {
  formatAvailabilitySummary,
  formatCoverageSummary,
  normalizePartnerAvailability,
  normalizePartnerCoverage,
} from "./onboarding-types";

describe("partner onboarding types", () => {
  it("normalizes legacy coverage and availability text", () => {
    const coverage = normalizePartnerCoverage("Paris 10e, 11e, Bas Belleville");
    const availability = normalizePartnerAvailability("Du mardi au samedi");

    expect(coverage).toEqual({
      arrondissements: [10, 11],
      quartiers: [],
    });
    expect(availability).toEqual({
      slots: [],
      note: "Du mardi au samedi",
    });
    expect(formatCoverageSummary(coverage)).toBe("Paris 10e, 11e");
    expect(formatAvailabilitySummary(availability)).toBe("Du mardi au samedi");
  });

  it("formats structured availability slots", () => {
    expect(
      formatAvailabilitySummary({
        slots: [
          { day: "tue", start: "10:00", end: "18:00" },
          { day: "thu", start: "09:00", end: "12:00" },
        ],
        note: "Sur rendez-vous",
      }),
    ).toBe("Mardi 10:00-18:00 · Jeudi 09:00-12:00 · Sur rendez-vous");
  });
});
