import { describe, expect, it } from "vitest";
import { deriveSpogomiClosureSummary, effectiveSpogomiTeamClosureDecision } from "./closure";

describe("SPOGOMI closure decisions", () => {
  it.each([
    ["present_measured", true, "eligible", true],
    ["absent", false, "excluded", false],
    ["forfeit", false, "excluded", false],
    ["excluded", false, "excluded", true],
    ["disqualified", false, "eligible", true],
    ["result_missing", false, "unknown", true],
    ["contested", false, "unknown", true],
  ] as const)("keeps sport and environmental eligibility explicit for %s", (status, sportEligible, environmentalEligibility, certifiedSubmission) => {
    const decision = effectiveSpogomiTeamClosureDecision({
      teamId: `team-${status}`, divisionId: "casual", certifiedSubmission,
      decision: { teamId: `team-${status}`, divisionId: "casual", status, sportEligible, environmentalEligibility, decisionVersion: 2, reason: "Décision synthétique." },
    });
    expect(decision).toMatchObject({ status, sportEligible, environmentalEligibility, decisionVersion: 2 });
  });

  it("keeps absence and forfeit outside both rankings and environmental totals", () => {
    const decision = effectiveSpogomiTeamClosureDecision({
      teamId: "team-forfeit",
      divisionId: "casual",
      certifiedSubmission: false,
      decision: { teamId: "team-forfeit", divisionId: "casual", status: "forfeit", sportEligible: false, environmentalEligibility: "excluded", decisionVersion: 1, reason: "Forfait confirmé par l’organisateur." },
    });
    expect(decision).toMatchObject({ status: "forfeit", sportEligible: false, environmentalEligibility: "excluded" });
  });

  it("keeps a disqualified but measured team eligible for the environmental balance", () => {
    const summary = deriveSpogomiClosureSummary({
      eventState: "judging",
      publicResultsVisibility: "provisional",
      actionStatus: "draft",
      actionPublishedAt: null,
      environmentalConsolidated: false,
      pendingIndividualRequests: 0,
      divisions: [{
        id: "world",
        type: "world_cup",
        regulationComplete: true,
        officialRankingCount: 0,
        teams: [{ teamId: "team-1", divisionId: "world", certifiedSubmission: true, decision: { teamId: "team-1", divisionId: "world", status: "disqualified", sportEligible: false, environmentalEligibility: "eligible", decisionVersion: 1, reason: "Décision arbitrale." } }],
      }],
    });
    expect(summary.divisions[0]).toMatchObject({ sportEligibleTeams: 0, certifiedTeams: 1 });
    expect(summary.blockers).not.toContain("world:official_ranking_missing");
    expect(summary.rankings).toBe("certified");
    expect(summary.environmental).toBe("pending");
  });

  it("does not block the environmental phase on a missing sports ranking", () => {
    const summary = deriveSpogomiClosureSummary({
      eventState: "certified",
      publicResultsVisibility: "hidden",
      actionStatus: "approved",
      actionPublishedAt: null,
      environmentalConsolidated: false,
      pendingIndividualRequests: 0,
      divisions: [{
        id: "casual",
        type: "casual",
        regulationComplete: true,
        officialRankingCount: 0,
        teams: [{ teamId: "team-1", divisionId: "casual", certifiedSubmission: true }],
      }],
    });
    expect(summary.blockers).toContain("casual:official_ranking_missing");
    expect(summary.environmental).toBe("pending");
  });

  it("does not infer action publication from sport certification", () => {
    const summary = deriveSpogomiClosureSummary({
      eventState: "certified",
      publicResultsVisibility: "certified",
      actionStatus: "approved",
      actionPublishedAt: null,
      environmentalConsolidated: true,
      pendingIndividualRequests: 2,
      divisions: [{ id: "casual", type: "casual", regulationComplete: true, officialRankingCount: 2, teams: [{ teamId: "team-1", divisionId: "casual", certifiedSubmission: true }] }],
    });
    expect(summary).toMatchObject({ rankings: "published", environmental: "consolidated", action: "approved", individualRequests: "pending" });
  });

  it("blocks a result missing or contested team until the decision is resolved", () => {
    const summary = deriveSpogomiClosureSummary({
      eventState: "judging",
      publicResultsVisibility: "hidden",
      actionStatus: null,
      actionPublishedAt: null,
      environmentalConsolidated: false,
      pendingIndividualRequests: 0,
      divisions: [{
        id: "casual",
        type: "casual",
        regulationComplete: true,
        officialRankingCount: 0,
        teams: [
          { teamId: "missing", divisionId: "casual", certifiedSubmission: false },
          { teamId: "contested", divisionId: "casual", certifiedSubmission: true, decision: { teamId: "contested", divisionId: "casual", status: "contested", sportEligible: false, environmentalEligibility: "unknown", decisionVersion: 1, reason: "Résultat contesté." } },
        ],
      }],
    });
    expect(summary.arbitration).toBe("ongoing");
    expect(summary.environmental).toBe("blocked");
    expect(summary.blockers).toEqual(expect.arrayContaining(["casual:certification_remaining", "casual:contested_result"]));
  });
});
