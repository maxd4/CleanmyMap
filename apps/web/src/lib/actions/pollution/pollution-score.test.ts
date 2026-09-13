import { describe, expect, it } from "vitest";
import {
  computePollutionScoresRelativeToReferences,
  type PollutionScoreReference,
} from "./pollution-score";

const references: PollutionScoreReference = {
  wastePerVolunteerHour: 20,
  buttsPerVolunteerHour: 400,
  wasteSourceCount: 3,
  buttsSourceCount: 3,
};

function score(
  input: Partial<Parameters<typeof computePollutionScoresRelativeToReferences>[0]>,
  reference: PollutionScoreReference | null = references,
) {
  return computePollutionScoresRelativeToReferences(
    {
      wasteKg: null,
      cigaretteButts: null,
      volunteersCount: 2,
      durationMinutes: 120,
      ...input,
    },
    reference,
  );
}

describe("pollution score V2", () => {
  it("computes volunteer-hours before normalizing each component", () => {
    const scores = score({ wasteKg: 40, cigaretteButts: 800 });

    expect(scores).toEqual({
      wasteScore: 50,
      buttsScore: 50,
      severityScore: 50,
    });
  });

  it("averages the exploitable components instead of taking the maximum", () => {
    expect(score({ wasteKg: 64, cigaretteButts: 640 })).toMatchObject({
      wasteScore: 80,
      buttsScore: 40,
      severityScore: 60,
    });
    expect(
      score({ wasteKg: 32, cigaretteButts: 160 }),
    ).toMatchObject({ severityScore: 25 });
  });

  it("clamps each component at 100 before averaging", () => {
    expect(score({ wasteKg: 80, cigaretteButts: 800 })).toMatchObject({
      wasteScore: 100,
      buttsScore: 50,
      severityScore: 75,
    });
    expect(score({ wasteKg: 200, cigaretteButts: 2_000 })).toMatchObject({
      wasteScore: 100,
      buttsScore: 100,
      severityScore: 100,
    });
  });

  it("keeps a measured zero exploitable and distinguishes missing metrics", () => {
    expect(score({ wasteKg: 0, cigaretteButts: undefined })).toEqual({
      wasteScore: 0,
      buttsScore: null,
      severityScore: 0,
    });
    expect(score({ wasteKg: undefined, cigaretteButts: undefined })).toEqual({
      wasteScore: null,
      buttsScore: null,
      severityScore: null,
    });
    expect(score({ wasteKg: 40, cigaretteButts: undefined })).toMatchObject({
      wasteScore: 50,
      buttsScore: null,
      severityScore: 50,
    });
  });

  it.each([
    { volunteersCount: 0 },
    { durationMinutes: 0 },
    { volunteersCount: null },
    { durationMinutes: null },
  ])("returns an unavailable score for invalid work-hours input %#", (input) => {
    expect(score({ wasteKg: 40, cigaretteButts: 800, ...input })).toEqual({
      wasteScore: null,
      buttsScore: null,
      severityScore: null,
    });
  });

  it("returns an unavailable score without a valid V2 reference", () => {
    expect(score({ wasteKg: 40, cigaretteButts: 800 }, null)).toEqual({
      wasteScore: null,
      buttsScore: null,
      severityScore: null,
    });
    expect(
      score({ wasteKg: 40, cigaretteButts: 800 }, {
        ...references,
        wastePerVolunteerHour: null,
        buttsPerVolunteerHour: null,
      }),
    ).toEqual({
      wasteScore: null,
      buttsScore: null,
      severityScore: null,
    });
  });
});
