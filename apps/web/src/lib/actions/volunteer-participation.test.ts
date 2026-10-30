import { describe, expect, it } from "vitest";
import {
  deriveAdultCountFromTotal,
  deriveVolunteerParticipationFromTotal,
  EFFECTIVE_VOLUNTEER_UNITS_FORMULA_VERSION,
  getVolunteerActionCompositionValidationMessage,
  getVolunteerParticipationDisclosureDetail,
  normalizeActionVolunteerParticipationFromTotal,
  normalizeVolunteerParticipation,
  resolvePersistedVolunteerParticipation,
  resolveEffectiveVolunteerUnits,
  resolveParticipantsCount,
} from "./volunteer-participation";

describe("volunteer participation contract", () => {
  it.each([
    { total: 12, children: 0, retired: 0, adult: 12, units: 12 },
    { total: 12, children: 1, retired: 0, adult: 11, units: 11.5 },
    { total: 12, children: 2, retired: 2, adult: 8, units: 10 },
    { total: 1, children: 1, retired: 0, adult: 0, units: 0.5 },
  ])("derives adults and units from the declared total", ({ total, children, retired, adult, units }) => {
    const input = deriveVolunteerParticipationFromTotal({
      volunteersCount: total,
      childrenCount: children,
      retiredCount: retired,
    });
    const result = normalizeVolunteerParticipation(input);

    expect(deriveAdultCountFromTotal({
      volunteersCount: total,
      childrenCount: children,
      retiredCount: retired,
    })).toBe(adult);
    expect(result).toMatchObject({
      childrenCount: children,
      adultCount: adult,
      retiredCount: retired,
      participantsCount: total,
      effectiveVolunteerUnits: units,
    });
  });

  it("does not hide an impossible composition behind an adjusted value", () => {
    expect(deriveAdultCountFromTotal({
      volunteersCount: 12,
      childrenCount: 13,
      retiredCount: 0,
    })).toBe(-1);
    expect(getVolunteerActionCompositionValidationMessage({
      volunteersCount: 12,
      childrenCount: 13,
      retiredCount: 0,
    })).toBe("Le nombre d’enfants et de retraités ne peut pas dépasser le total des participants.");
  });

  it("keeps the composition unavailable until all action inputs exist", () => {
    expect(deriveAdultCountFromTotal({
      volunteersCount: null,
      childrenCount: 0,
      retiredCount: 0,
    })).toBeNull();
    expect(getVolunteerActionCompositionValidationMessage({
      volunteersCount: 12,
      childrenCount: null,
      retiredCount: 0,
    })).toBe("Renseignez les nombres entiers d’enfants et de retraités présents.");
  });

  it.each([
    { volunteersCount: 12, childrenCount: -1, retiredCount: 0 },
    { volunteersCount: 12, childrenCount: 1.5, retiredCount: 0 },
    { volunteersCount: null, childrenCount: 0, retiredCount: 0 },
  ])("rejects an invalid action composition", (input) => {
    expect(getVolunteerActionCompositionValidationMessage(input)).not.toBeNull();
  });

  it("recalculates adults at the server boundary instead of trusting a stale field", () => {
    expect(normalizeActionVolunteerParticipationFromTotal({
      volunteersCount: 12,
      volunteerParticipation: {
        childrenCount: 1,
        adultCount: 999,
        retiredCount: 0,
      },
    })).toMatchObject({
      childrenCount: 1,
      adultCount: 11,
      retiredCount: 0,
      participantsCount: 12,
      effectiveVolunteerUnits: 11.5,
    });
  });

  it.each([
    {
      input: { childrenCount: "", adultCount: "", retiredCount: "" },
      detail: "facultatif",
    },
    {
      input: { childrenCount: "2", adultCount: "4", retiredCount: "2" },
      detail: "8 répartis",
    },
    {
      input: { childrenCount: "", adultCount: "4", retiredCount: "2" },
      detail: "à compléter",
    },
  ])("derives the disclosure detail from category sources", ({ input, detail }) => {
    expect(getVolunteerParticipationDisclosureDetail(input)).toBe(detail);
  });

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

  it("prefers a complete coherent typed composition over historical metadata", () => {
    expect(resolvePersistedVolunteerParticipation({
      childrenCount: 18,
      adultCount: 8,
      retiredCount: 0,
      volunteersCount: 26,
      legacyParticipation: {
        childrenCount: 20,
        adultCount: 6,
        retiredCount: 0,
        participantsCount: 26,
        effectiveVolunteerUnits: 16,
        effectiveVolunteerUnitsFormulaVersion: EFFECTIVE_VOLUNTEER_UNITS_FORMULA_VERSION,
      },
    })).toMatchObject({
      childrenCount: 18,
      adultCount: 8,
      retiredCount: 0,
      participantsCount: 26,
    });
  });

  it("uses coherent historical metadata only when typed columns are absent", () => {
    expect(resolvePersistedVolunteerParticipation({
      childrenCount: null,
      adultCount: null,
      retiredCount: null,
      volunteersCount: 4,
      legacyParticipation: {
        childrenCount: 3,
        adultCount: 1,
        retiredCount: 0,
        participantsCount: 4,
        effectiveVolunteerUnits: 2.5,
        effectiveVolunteerUnitsFormulaVersion: EFFECTIVE_VOLUNTEER_UNITS_FORMULA_VERSION,
      },
    })).toMatchObject({ childrenCount: 3, adultCount: 1, retiredCount: 0 });
  });

  it.each([
    { childrenCount: 18, adultCount: null, retiredCount: 0 },
    { childrenCount: 18, adultCount: 9, retiredCount: 0 },
  ])("does not hide invalid typed columns behind historical metadata", (typed) => {
    expect(resolvePersistedVolunteerParticipation({
      ...typed,
      volunteersCount: 26,
      legacyParticipation: {
        childrenCount: 20,
        adultCount: 6,
        retiredCount: 0,
        participantsCount: 26,
        effectiveVolunteerUnits: 16,
        effectiveVolunteerUnitsFormulaVersion: EFFECTIVE_VOLUNTEER_UNITS_FORMULA_VERSION,
      },
    })).toBeNull();
  });
});
