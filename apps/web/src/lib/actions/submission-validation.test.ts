import { describe, expect, it } from "vitest";
import { getVolunteerActionValidationIssues } from "./submission-validation";

describe("getVolunteerActionValidationIssues", () => {
  it("preserves an explicitly declared zero participant total", () => {
    const issues = getVolunteerActionValidationIssues({
      recordType: "action",
      wasteKg: 2,
      cigaretteButts: 0,
      volunteersCount: 0,
    });

    expect(issues).toEqual([]);
  });

  it("accepts an explicitly observed zero", () => {
    const issues = getVolunteerActionValidationIssues({
      recordType: "action",
      wasteKg: 0,
      cigaretteButts: 0,
      volunteersCount: 1,
    });

    expect(issues).toEqual([]);
  });

  it("accepts a total without a category split", () => {
    const issues = getVolunteerActionValidationIssues({
      recordType: "action",
      submissionMode: "complete",
      wasteKg: 1,
      cigaretteButts: 0,
      volunteersCount: 8,
      volunteerParticipation: {
        childrenCount: null,
        adultCount: null,
        retiredCount: null,
      },
    });

    expect(issues).toEqual([]);
  });

  it("rejects a category split whose sum differs from the explicit total", () => {
    const issues = getVolunteerActionValidationIssues({
      recordType: "action",
      submissionMode: "complete",
      wasteKg: 1,
      cigaretteButts: 0,
      volunteersCount: 8,
      volunteerParticipation: {
        childrenCount: 2,
        adultCount: 4,
        retiredCount: 1,
      },
    });

    expect(issues).toEqual([
      {
        field: "volunteerParticipation",
        message: "La somme de la répartition (7) doit correspondre au nombre total de participants (8).",
      },
    ]);
  });

  it("accepts a canonical raw cigarette-butt measurement without a legacy alias", () => {
    const issues = getVolunteerActionValidationIssues({
      recordType: "action",
      submissionMode: "complete",
      wasteKg: null,
      cigaretteButts: null,
      cigaretteButtsMeasurements: {
        cigaretteButtsCount: 0,
        cigaretteButtsMassKg: null,
        cigaretteButtsVolumeLiters: null,
        cigaretteButtsCondition: "propre",
      },
      volunteersCount: 1,
    });

    expect(issues).toEqual([]);
  });

  it("rejects an action when both measurements are unknown", () => {
    const issues = getVolunteerActionValidationIssues({
      recordType: "action",
      wasteKg: null,
      cigaretteButts: null,
      volunteersCount: 1,
    });

    expect(issues).toEqual([
      {
        field: "wasteKg",
        message: "Renseignez au moins une mesure de déchets ou de mégots ; 0 reste une mesure valide.",
      },
    ]);
  });

  it("ignores non-action submissions", () => {
    const issues = getVolunteerActionValidationIssues({
      recordType: "clean_place",
      wasteKg: 0,
      cigaretteButts: 0,
      volunteersCount: 0,
    });

    expect(issues).toEqual([]);
  });

  it("ignores quick pre-action submissions", () => {
    const issues = getVolunteerActionValidationIssues({
      recordType: "action",
      submissionMode: "quick",
      wasteKg: 0,
      cigaretteButts: 0,
      volunteersCount: 0,
    });

    expect(issues).toEqual([]);
  });

  it("accepts megots coming from the waste breakdown", () => {
    const issues = getVolunteerActionValidationIssues({
      recordType: "action",
      submissionMode: "complete",
      wasteKg: 0,
      cigaretteButts: 0,
      volunteersCount: 1,
      wasteBreakdown: {
        megotsKg: 1.2,
      },
    });

    expect(issues).toEqual([]);
  });
});
