import { describe, expect, it } from "vitest";
import {
  computeSpogomiTeamRefereeReadiness,
  deriveSpogomiTeamRefereeStatus,
  formatSpogomiTeamMobilizedSummary,
  teamRefereeStatusLabel,
} from "./team-referees";

describe("SPOGOMI team referee domain rules", () => {
  it("derives all four status states deterministically", () => {
    expect(
      deriveSpogomiTeamRefereeStatus({
        hasActiveAssignment: false,
        isParticipantInEvent: false,
        hasActiveReviewerRole: false,
        applicationStatus: null,
        applicationRegulationVersion: null,
        eventRegulationVersion: "reg-v1",
        hasQuizProof: false,
        hasPracticalConfirmation: false,
      }),
    ).toEqual({ status: "to_assign", conflictReason: null });

    expect(
      deriveSpogomiTeamRefereeStatus({
        hasActiveAssignment: true,
        isParticipantInEvent: false,
        hasActiveReviewerRole: true,
        applicationStatus: "habilitated",
        applicationRegulationVersion: "reg-v1",
        eventRegulationVersion: "reg-v1",
        hasQuizProof: true,
        hasPracticalConfirmation: true,
      }),
    ).toEqual({ status: "assigned", conflictReason: null });

    expect(
      deriveSpogomiTeamRefereeStatus({
        hasActiveAssignment: true,
        isParticipantInEvent: false,
        hasActiveReviewerRole: true,
        applicationStatus: "theory_qualified",
        applicationRegulationVersion: "reg-v2",
        eventRegulationVersion: "reg-v2",
        hasQuizProof: true,
        hasPracticalConfirmation: false,
      }).status,
    ).toBe("pending_validation");

    expect(
      deriveSpogomiTeamRefereeStatus({
        hasActiveAssignment: true,
        isParticipantInEvent: true,
        hasActiveReviewerRole: true,
        applicationStatus: "habilitated",
        applicationRegulationVersion: "reg-v1",
        eventRegulationVersion: "reg-v1",
        hasQuizProof: true,
        hasPracticalConfirmation: true,
      }).status,
    ).toBe("unavailable");

    expect(
      deriveSpogomiTeamRefereeStatus({
        hasActiveAssignment: true,
        isParticipantInEvent: false,
        hasActiveReviewerRole: false,
        applicationStatus: "habilitated",
        applicationRegulationVersion: "reg-v1",
        eventRegulationVersion: "reg-v1",
        hasQuizProof: true,
        hasPracticalConfirmation: true,
      }).status,
    ).toBe("unavailable");
  });

  it("maps French labels for all four statuses", () => {
    expect(teamRefereeStatusLabel("to_assign")).toBe("À affecter");
    expect(teamRefereeStatusLabel("pending_validation")).toBe("En attente de validation");
    expect(teamRefereeStatusLabel("assigned")).toBe("Affecté");
    expect(teamRefereeStatusLabel("unavailable")).toBe("Indisponible");
  });

  it("computes readiness and detects duplicate referee conflicts", () => {
    const ready = computeSpogomiTeamRefereeReadiness({
      teams: [{ id: "t1" }, { id: "t2" }],
      assignments: [
        { teamId: "t1", divisionId: "d1", status: "assigned", refereeClerkId: "u1", refereeDisplayName: "Alice", assignedAt: "2026-11-24T10:00:00Z", conflictReason: null },
        { teamId: "t2", divisionId: "d1", status: "assigned", refereeClerkId: "u2", refereeDisplayName: "Bob", assignedAt: "2026-11-24T10:00:00Z", conflictReason: null },
      ],
    });
    expect(ready.ready).toBe(true);
    expect(ready.conflicts).toEqual([]);

    const conflict = computeSpogomiTeamRefereeReadiness({
      teams: [{ id: "t1" }, { id: "t2" }],
      assignments: [
        { teamId: "t1", divisionId: "d1", status: "assigned", refereeClerkId: "u1", refereeDisplayName: "Alice", assignedAt: "2026-11-24T10:00:00Z", conflictReason: null },
        { teamId: "t2", divisionId: "d1", status: "assigned", refereeClerkId: "u1", refereeDisplayName: "Alice", assignedAt: "2026-11-24T10:00:00Z", conflictReason: null },
      ],
    });
    expect(conflict.ready).toBe(false);
    expect(conflict.conflicts).toHaveLength(1);
    expect(conflict.conflicts[0]?.teamIds).toEqual(["t1", "t2"]);

    const empty = computeSpogomiTeamRefereeReadiness({ teams: [], assignments: [] });
    expect(empty.ready).toBe(false);
  });

  it("distinguishes World Cup 3+1=4 mobilized headcount from Casual", () => {
    expect(formatSpogomiTeamMobilizedSummary("world_cup", 3)).toBe(
      "3 compétiteurs + 1 arbitre référent (4 personnes mobilisées)",
    );
    expect(formatSpogomiTeamMobilizedSummary("world_cup", 2)).toBe(
      "2 compétiteur(s) / 3 requis + 1 arbitre référent",
    );
    expect(formatSpogomiTeamMobilizedSummary("casual", 4)).toBe(
      "4 compétiteur(s) + 1 arbitre référent",
    );
  });
});
