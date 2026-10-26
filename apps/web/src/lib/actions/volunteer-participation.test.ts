import { describe, expect, it } from "vitest";
import {
  EFFECTIVE_VOLUNTEER_UNITS_FORMULA_VERSION,
  normalizeVolunteerParticipation,
  resolveEffectiveVolunteerUnits,
  resolveParticipantsCount,
} from "./volunteer-participation";

describe("volunteer participation contract", () => {
  it("keeps children in the physical participantsCount for statistics", () => {
    const result = normalizeVolunteerParticipation({
      childrenCount: 2,
      adultCount: 4,
      retiredCount: 2,
    });

    expect(result.participantsCount).toBe(8);
  });

  it("derives operational units separately from the physical participant count", () => {
    const result = normalizeVolunteerParticipation({
      childrenCount: 2,
      adultCount: 4,
      retiredCount: 2,
    });

    expect(result.effectiveVolunteerUnits).toBe(6);
    expect(result.effectiveVolunteerUnitsFormulaVersion).toBe(
      EFFECTIVE_VOLUNTEER_UNITS_FORMULA_VERSION,
    );
  });

  it("keeps explicit zero categories as measured values", () => {
    const result = normalizeVolunteerParticipation({
      childrenCount: 0,
      adultCount: 2,
      retiredCount: 0,
    });

    expect(result.participantsCount).toBe(2);
    expect(result.effectiveVolunteerUnits).toBe(2);
  });

  it("does not invent missing category sources", () => {
    const result = normalizeVolunteerParticipation({ adultCount: 5 });

    expect(result.participantsCount).toBeNull();
    expect(result.effectiveVolunteerUnits).toBeNull();
    expect(
      resolveParticipantsCount({
        volunteerParticipation: result,
        legacyVolunteersCount: 5,
      }),
    ).toBe(5);
  });

  it("preserves legacy participants without inferring adult status", () => {
    const result = normalizeVolunteerParticipation(null);

    expect(result.childrenCount).toBeNull();
    expect(result.adultCount).toBeNull();
    expect(result.retiredCount).toBeNull();
    expect(result.effectiveVolunteerUnits).toBeNull();
    expect(resolveParticipantsCount({ legacyVolunteersCount: 7 })).toBe(7);
  });

  it("recalculates derived fields from category sources instead of trusting payload totals", () => {
    const participation = {
      childrenCount: 2,
      adultCount: 4,
      retiredCount: 2,
      participantsCount: 999,
      effectiveVolunteerUnits: 999,
      effectiveVolunteerUnitsFormulaVersion: "forged-version",
    };

    expect(resolveParticipantsCount({
      volunteerParticipation: participation,
      legacyVolunteersCount: 1,
    })).toBe(8);
    expect(resolveEffectiveVolunteerUnits(participation)).toBe(6);
  });

  it.each([
    { childrenCount: -1, adultCount: 1, retiredCount: 0 },
    { childrenCount: Number.NaN, adultCount: 1, retiredCount: 0 },
    { childrenCount: Number.POSITIVE_INFINITY, adultCount: 1, retiredCount: 0 },
  ])("keeps malformed category sources unavailable instead of imputing them", (input) => {
    const result = normalizeVolunteerParticipation(input);

    expect(result.participantsCount).toBeNull();
    expect(result.effectiveVolunteerUnits).toBeNull();
    expect(result.effectiveVolunteerUnitsFormulaVersion).toBeNull();
  });

  it("truncates fractional category observations only after validating them", () => {
    const result = normalizeVolunteerParticipation({
      childrenCount: 1.9,
      adultCount: 2.9,
      retiredCount: 0,
    });

    expect(result).toMatchObject({
      childrenCount: 1,
      adultCount: 2,
      retiredCount: 0,
      participantsCount: 3,
      effectiveVolunteerUnits: 2.5,
      effectiveVolunteerUnitsFormulaVersion: EFFECTIVE_VOLUNTEER_UNITS_FORMULA_VERSION,
    });
  });
});
