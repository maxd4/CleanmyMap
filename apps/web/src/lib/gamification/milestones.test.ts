import { describe, expect, it } from "vitest";
import { buildCurrentMilestones } from "./milestones";

describe("CURRENT milestones", () => {
  it("unlocks the two first-action milestones from one complete action without double XP", () => {
    const milestones = buildCurrentMilestones({ completeActionsCount: 1 });
    const firstTrace = milestones.find((milestone) => milestone.id === "premiere_trace_utile");
    const foundingTrace = milestones.find((milestone) => milestone.id === "trace_fondatrice");
    const referral = milestones.find((milestone) => milestone.id === "parrainage_utile");

    expect(firstTrace).toMatchObject({ unlocked: true, xpAwarded: 1, recordedXp: 0 });
    expect(foundingTrace).toMatchObject({ unlocked: true, xpAwarded: 0, recordedXp: 0 });
    expect(referral).toMatchObject({ unlocked: false, xpAwarded: 2 });
    expect(
      [firstTrace, foundingTrace]
        .filter((milestone) => milestone?.factKey === "first_complete_action")
        .reduce((total, milestone) => total + (milestone?.xpAwarded ?? 0), 0),
    ).toBe(1);
  });

  it("keeps referral useful as one idempotent milestone with its recorded proof", () => {
    const milestones = buildCurrentMilestones({
      completeActionsCount: 0,
      events: [
        {
          event_type: "community_referral_invite",
          status_phase: "validated",
          source_id: "referral-contribution:invitee-1",
          xp_awarded: 2,
        },
        {
          event_type: "community_referral_invite",
          status_phase: "validated",
          source_id: "referral-contribution:invitee-1",
          xp_awarded: 2,
        },
      ],
    });

    expect(milestones).toHaveLength(3);
    expect(milestones.find((milestone) => milestone.id === "parrainage_utile")).toMatchObject({
      unlocked: true,
      recordedXp: 2,
      proofSourceId: "referral-contribution:invitee-1",
    });
  });

  it("does not turn infinite or historical milestone events into CURRENT milestones", () => {
    const milestones = buildCurrentMilestones({
      completeActionsCount: 0,
      events: [
        {
          event_type: "sensitive_zone_milestone",
          status_phase: "validated",
          source_id: "zone-1",
          xp_awarded: 1,
        },
        {
          event_type: "new_place_milestone",
          status_phase: "validated",
          source_id: "place-1",
          xp_awarded: 1,
        },
      ],
    });

    expect(milestones.every((milestone) => !milestone.unlocked)).toBe(true);
  });
});
