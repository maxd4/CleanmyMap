import { describe, expect, it } from "vitest";
import { parseSpogomiPublicResults } from "./results-projection-parser";

function entry(overrides: Record<string, unknown> = {}) {
  return {
    teamId: "team-1",
    divisionId: "division-1",
    teamNumber: 1,
    publicName: "Équipe test",
    rank: 1,
    status: "certified",
    eligible: true,
    reason: null,
    score: 10,
    countedButts: 2,
    presentParticipants: 2,
    numerator: 2,
    denominator: 2,
    valueUnit: "points",
    ratio: 1,
    ...overrides,
  };
}

function valid(overrides: Record<string, unknown> = {}) {
  const ranking = { status: "certified", reason: null, entries: [entry()] };
  return {
    visibility: "certified",
    regulationVersion: "rules-v1",
    regulationComplete: true,
    refreshedAt: "2026-10-27T00:00:00Z",
    sport: ranking,
    butts: { ...ranking, entries: [entry({ valueUnit: "mégots/participant" })] },
    environmental: {
      status: "available",
      totalWasteMassGrams: 100,
      cigaretteButtsMassGrams: null,
      cigaretteButtsCount: 2,
      participantsPresent: 2,
      projectionVersion: "impact-v1",
      sourceHash: "hash",
    },
    divisions: [{ id: "division-1", type: "casual", regulationVersion: "rules-v1", regulationComplete: true, sport: ranking, butts: { ...ranking, entries: [entry({ valueUnit: "mégots/participant" })] } }],
    ...overrides,
  };
}

describe("SPOGOMI public projection parser", () => {
  it("accepts the complete public contract and keeps optional fields optional", () => {
    const parsed = parseSpogomiPublicResults(valid());
    expect(parsed).toMatchObject({ visibility: "certified", divisions: [{ id: "division-1" }] });
  });

  it("rejects malformed top-level, ranking, environmental and division payloads", () => {
    const invalidTopLevel = [null, [], "text", {}, { ...valid(), visibility: "private" }, { ...valid(), regulationVersion: 4 }, { ...valid(), regulationComplete: "yes" }, { ...valid(), refreshedAt: null }];
    for (const value of invalidTopLevel) expect(parseSpogomiPublicResults(value)).toBeNull();

    for (const field of ["teamNumber", "publicName", "rank", "status", "eligible", "reason", "valueUnit"]) {
      const value = entry({ [field]: field === "rank" || field === "reason" ? {} : null });
      expect(parseSpogomiPublicResults(valid({ sport: { status: "certified", reason: null, entries: [value] } }))).toBeNull();
    }
    for (const field of ["score", "countedButts", "presentParticipants", "numerator", "denominator", "ratio"]) {
      expect(parseSpogomiPublicResults(valid({ sport: { status: "certified", reason: null, entries: [entry({ [field]: "not-number" })] } }))).toBeNull();
    }
    expect(parseSpogomiPublicResults(valid({ sport: { status: "certified", reason: null, entries: [entry({ teamId: 4 })] } }))).toBeNull();
    expect(parseSpogomiPublicResults(valid({ sport: { status: "certified", reason: null, entries: [entry({ divisionId: 4 })] } }))).toBeNull();
    expect(parseSpogomiPublicResults(valid({ sport: { status: "unknown", reason: null, entries: [] } }))).toBeNull();
    expect(parseSpogomiPublicResults(valid({ sport: { status: "certified", reason: 4, entries: [] } }))).toBeNull();
    expect(parseSpogomiPublicResults(valid({ sport: { status: "certified", reason: null, entries: [null] } }))).toBeNull();
    expect(parseSpogomiPublicResults(valid({ sport: { status: "certified", reason: null, entries: {} } }))).toBeNull();

    for (const field of ["totalWasteMassGrams", "cigaretteButtsMassGrams", "cigaretteButtsCount", "participantsPresent"]) {
      expect(parseSpogomiPublicResults(valid({ environmental: { ...valid().environmental, [field]: "bad" } }))).toBeNull();
    }
    expect(parseSpogomiPublicResults(valid({ environmental: { ...valid().environmental, status: "unknown" } }))).toBeNull();
    expect(parseSpogomiPublicResults(valid({ environmental: { ...valid().environmental, projectionVersion: 1 } }))).toBeNull();
    expect(parseSpogomiPublicResults(valid({ environmental: { ...valid().environmental, sourceHash: 1 } }))).toBeNull();
    expect(parseSpogomiPublicResults(valid({ divisions: null }))).toBeNull();
    expect(parseSpogomiPublicResults(valid({ divisions: "bad" }))).toBeNull();
    expect(parseSpogomiPublicResults(valid({ divisions: [null] }))).toBeNull();
  });

  it("supports an absent divisions property and rejects invalid division metadata", () => {
    const withoutDivisions = { ...valid(), divisions: undefined };
    expect(parseSpogomiPublicResults(withoutDivisions)).not.toBeNull();
    const baseDivision = valid().divisions[0];
    for (const field of ["id", "regulationVersion", "regulationComplete"]) {
      expect(parseSpogomiPublicResults(valid({ divisions: [{ ...baseDivision, [field]: field === "regulationComplete" ? "yes" : null }] }))).toBeNull();
    }
    expect(parseSpogomiPublicResults(valid({ divisions: [{ ...baseDivision, type: "mixed" }] }))).toBeNull();
    expect(parseSpogomiPublicResults(valid({ divisions: [{ ...baseDivision, sport: null }] }))).toBeNull();
  });
});
