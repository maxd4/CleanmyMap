import { describe, expect, it } from "vitest";
import { buildCurrentMilestones } from "./milestones";

describe("CURRENT milestones", () => {
  it("does not infer a current milestone from a complete form counter", () => {
    const milestones = buildCurrentMilestones({ completeActionsCount: 1 });
    const firstTrace = milestones.find((milestone) => milestone.id === "premiere_trace_utile");
    const foundingTrace = milestones.find((milestone) => milestone.id === "trace_fondatrice");
    const loop = milestones.find((milestone) => milestone.id === "boucle_bouclee");
    const referral = milestones.find((milestone) => milestone.id === "parrainage_utile");

    expect(firstTrace).toMatchObject({ unlocked: false, xpAwarded: 1, recordedXp: 0 });
    expect(foundingTrace).toMatchObject({ unlocked: false, xpAwarded: 0, recordedXp: 0 });
    expect(loop).toMatchObject({ unlocked: false, xpAwarded: 1, recordedXp: 0 });
    expect(referral).toMatchObject({ unlocked: false, xpAwarded: 2 });
  });

  it("uses one validated loop event for Boucle bouclée and Trace fondatrice", () => {
    const milestones = buildCurrentMilestones({
      completeActionsCount: 0,
      events: [
        {
          event_type: "action_loop_completed",
          status_phase: "validated",
          source_id: "action-milestone:boucle_bouclee",
          xp_awarded: 1,
          metadata: { actionId: "action-1" },
        },
      ],
    });

    expect(milestones.find((milestone) => milestone.id === "boucle_bouclee")).toMatchObject({
      unlocked: true,
      recordedXp: 1,
      proofSourceId: "action-1",
    });
    expect(milestones.find((milestone) => milestone.id === "trace_fondatrice")).toMatchObject({
      unlocked: true,
      recordedXp: 0,
      proofSourceId: "action-1",
    });
  });

  it("keeps referral useful as one idempotent milestone with its recorded proof", () => {
    const milestones = buildCurrentMilestones({
      completeActionsCount: 0,
      events: [{
        event_type: "community_referral_invite",
        status_phase: "validated",
        source_id: "referral-contribution:invitee-1",
        xp_awarded: 2,
      }],
    });

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
