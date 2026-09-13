import { describe, expect, it } from "vitest";
import {
  computePollutionScoresRelativeToReferences,
  type PollutionScoreReference,
} from "./pollution-score";

const references: PollutionScoreReference = {
  wastePerVolunteer: 20,
  buttsPerVolunteer: 400,
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
      actionType: "action",
      status: "approved",
      actionPhase: "post_action_complete",
      ...input,
    },
    reference,
  );
}

describe("pollution score V2", () => {
  it("normalizes each component per volunteer under the authorized contract", () => {
    const scores = score({ wasteKg: 20, cigaretteButts: 400 });

    expect(scores).toEqual({
      wasteScore: 50,
      buttsScore: 50,
      severityScore: 50,
    });
  });

  it("keeps the highest exploitable component as the historical score", () => {
    expect(score({ wasteKg: 20, cigaretteButts: 160 })).toMatchObject({
      wasteScore: 50,
      buttsScore: 20,
      severityScore: 50,
    });
  });

  it("clamps the component above its reference at 100", () => {
    expect(score({ wasteKg: 80, cigaretteButts: 800 })).toMatchObject({
      wasteScore: 100,
      buttsScore: 100,
      severityScore: 100,
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
      wasteScore: 100,
      buttsScore: null,
      severityScore: 100,
    });
  });

  it.each([
    { volunteersCount: 0 },
    { durationMinutes: 0 },
    { volunteersCount: null },
    { durationMinutes: null },
  ])("returns an unavailable score for invalid eligibility input %#", (input) => {
    expect(score({ wasteKg: 40, cigaretteButts: 800, ...input })).toEqual({
      wasteScore: null,
      buttsScore: null,
      severityScore: null,
    });
  });

  it.each([
    { actionType: "spot" as const },
    { status: "pending" },
    { actionPhase: "pre_action" },
  ])("requires the canonical completed field-action predicate %#", (input) => {
    expect(score({ wasteKg: 20, ...input })).toEqual({
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
        wastePerVolunteer: null,
        buttsPerVolunteer: null,
      }),
    ).toEqual({
      wasteScore: null,
      buttsScore: null,
      severityScore: null,
    });
  });
});
