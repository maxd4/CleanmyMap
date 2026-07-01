import { describe, expect, it } from "vitest";
import { getVolunteerActionValidationIssues } from "./submission-validation";

describe("getVolunteerActionValidationIssues", () => {
  it("rejects action submissions with zero volunteers", () => {
    const issues = getVolunteerActionValidationIssues({
      recordType: "action",
      wasteKg: 2,
      cigaretteButts: 0,
      volunteersCount: 0,
    });

    expect(issues).toEqual([
      {
        field: "volunteersCount",
        message: "Renseignez au moins 1 bénévole.",
      },
    ]);
  });

  it("rejects action submissions with no waste and no cigarette butts", () => {
    const issues = getVolunteerActionValidationIssues({
      recordType: "action",
      wasteKg: 0,
      cigaretteButts: 0,
      volunteersCount: 1,
    });

    expect(issues).toEqual([
      {
        field: "wasteKg",
        message: "Renseignez au moins des déchets ou des mégots non nuls.",
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
