import { describe, expect, it } from "vitest";
import { getVolunteerActionValidationIssues } from "./submission-validation";

describe("getVolunteerActionValidationIssues", () => {
  it("rejects an explicitly declared zero participant total for a realized action", () => {
    const issues = getVolunteerActionValidationIssues({
      recordType: "action",
      submissionMode: "complete",
      wasteKg: 2,
      cigaretteButts: 0,
      volunteersCount: 0,
      volunteerParticipation: {
        childrenCount: 0,
        adultCount: 0,
        retiredCount: 0,
      },
    });

    expect(issues[0]).toMatchObject({
      field: "volunteerParticipation",
      message: "Renseignez un nombre total de participants entier compris entre 1 et 500.",
    });
  });

  it("accepts an explicitly observed zero", () => {
    const issues = getVolunteerActionValidationIssues({
      recordType: "action",
      wasteKg: 0,
      cigaretteButts: 0,
      volunteersCount: 1,
      volunteerParticipation: {
        childrenCount: 0,
        adultCount: 1,
        retiredCount: 0,
      },
    });

    expect(issues).toEqual([]);
  });

  it("requires children and retirees for a complete action composition", () => {
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

    expect(issues).toEqual([
      {
        field: "volunteerParticipation",
        message: "Renseignez les nombres entiers d’enfants et de retraités présents.",
      },
    ]);
  });

  it("rejects a composition whose children and retirees exceed the explicit total", () => {
    const issues = getVolunteerActionValidationIssues({
      recordType: "action",
      submissionMode: "complete",
      wasteKg: 1,
      cigaretteButts: 0,
      volunteersCount: 8,
      volunteerParticipation: {
        childrenCount: 9,
        adultCount: 0,
        retiredCount: 1,
      },
    });

    expect(issues).toEqual([
      {
        field: "volunteerParticipation",
        message: "Le nombre d’enfants et de retraités ne peut pas dépasser le total des participants.",
      },
    ]);
  });

  it("requires the adult count to match the central derivation when a forged value is provided", () => {
    const issues = getVolunteerActionValidationIssues({
      recordType: "action",
      submissionMode: "complete",
      wasteKg: 1,
      cigaretteButts: 0,
      volunteersCount: 12,
      volunteerParticipation: {
        childrenCount: 1,
        adultCount: 1,
        retiredCount: 0,
      },
    });

    expect(issues).toContainEqual({
      field: "volunteerParticipation",
      message: "Le nombre d’adultes est calculé automatiquement à partir du total, des enfants et des retraités.",
    });
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
      volunteerParticipation: {
        childrenCount: 0,
        adultCount: 1,
        retiredCount: 0,
      },
    });

    expect(issues).toEqual([]);
  });

  it("rejects an action when both measurements are unknown", () => {
    const issues = getVolunteerActionValidationIssues({
      recordType: "action",
      wasteKg: null,
      cigaretteButts: null,
      volunteersCount: 1,
      volunteerParticipation: {
        childrenCount: 0,
        adultCount: 1,
        retiredCount: 0,
      },
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
      volunteerParticipation: {
        childrenCount: 0,
        adultCount: 1,
        retiredCount: 0,
      },
      wasteBreakdown: {
        megotsKg: 1.2,
      },
    });

    expect(issues).toEqual([]);
  });
});
