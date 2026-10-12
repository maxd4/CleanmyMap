import { describe, expect, it } from "vitest";

import {
  isRegulationReadyForCertification,
  validateParticipantState,
  validateResultItem,
  validateSubmissionCertification,
  validateTeamComposition,
} from "./validation";
import type { SpogomiRegulation } from "./types";

const incompleteRegulation: SpogomiRegulation = {
  version: "edition-a",
  sourceReference: null,
  status: "incomplete",
  teamSize: { casual: { minMembers: null, maxMembers: null } },
  categories: [
    {
      code: "waste",
      label: "Déchets",
      measurementKind: "mass",
      unit: "g",
      coefficient: null,
      coefficientStatus: "unknown",
      environmentalCategorySlug: "other_waste",
      isComplete: false,
    },
  ],
};

describe("SPOGOMI domain invariants", () => {
  it("requires exactly three members for world cup teams", () => {
    expect(
      validateTeamComposition("world_cup", 2, incompleteRegulation.teamSize),
    ).toEqual({ ok: false, reason: "world_cup_requires_exactly_three_members" });
    expect(validateTeamComposition("world_cup", 3, incompleteRegulation.teamSize)).toEqual({
      ok: true,
    });
  });

  it("uses only the configured bounds for casual teams", () => {
    const teamSize = { casual: { minMembers: 2, maxMembers: 5 } };
    expect(validateTeamComposition("casual", 1, teamSize).ok).toBe(false);
    expect(validateTeamComposition("casual", 4, teamSize).ok).toBe(true);
    expect(validateTeamComposition("casual", 6, teamSize).ok).toBe(false);
  });

  it("keeps registration, presence and account linkage distinct", () => {
    expect(
      validateParticipantState({
        registrationStatus: "registered",
        attendanceStatus: "unknown",
        accountLinkStatus: "unlinked",
        clerkId: null,
      }),
    ).toEqual({ ok: true });
    expect(
      validateParticipantState({
        registrationStatus: "registered",
        attendanceStatus: "present",
        accountLinkStatus: "pending",
        clerkId: "user_123",
      }),
    ).toEqual({ ok: false, reason: "unverified_account_link_cannot_have_clerk_id" });
  });

  it("does not treat null, mass, count or points as interchangeable", () => {
    expect(
      validateResultItem(
        { measurementKind: "count", unit: "count", quantity: 1.5, provenance: "observed" },
        { measurementKind: "count", unit: "count" },
      ),
    ).toEqual({ ok: false, reason: "count_must_be_an_integer" });
    expect(
      validateResultItem(
        { measurementKind: "mass", unit: "g", quantity: 12, provenance: "observed" },
        { measurementKind: "count", unit: "count" },
      ),
    ).toEqual({ ok: false, reason: "measurement_kind_must_match_category" });
  });

  it("blocks certification while the regulation is incomplete", () => {
    expect(isRegulationReadyForCertification(incompleteRegulation)).toBe(false);
    expect(
      validateSubmissionCertification({
        status: "certified",
        regulation: incompleteRegulation,
        certifiedByClerkId: "user_referee",
        certifiedAt: "2026-10-12T10:00:00.000Z",
      }),
    ).toEqual({ ok: false, reason: "incomplete_regulation_blocks_certification" });
    expect(
      validateSubmissionCertification({
        status: "submitted",
        regulation: incompleteRegulation,
        certifiedByClerkId: null,
        certifiedAt: null,
      }),
    ).toEqual({ ok: true });
    expect(
      validateSubmissionCertification({
        status: "certified",
        previousStatus: "rejected",
        regulation: incompleteRegulation,
        certifiedByClerkId: "user_referee",
        certifiedAt: "2026-10-12T10:00:00.000Z",
      }),
    ).toEqual({ ok: false, reason: "non_certifiable_previous_status" });
  });
});
