import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { withdrawSpogomiParticipant } from "./participant-lifecycle";

describe("SPOGOMI participant lifecycle service", () => {
  it("uses the authenticated participant as the server-side withdrawal actor", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { participantId: "participant-1", eventId: "event-1", registrationStatus: "withdrawn", alreadyProcessed: false },
      error: null,
    });
    const result = await withdrawSpogomiParticipant({
      supabase: { rpc } as never,
      eventId: "event-1",
      participantId: "participant-1",
      clerkId: "user-1",
      reason: "Je ne peux plus participer.",
    });
    expect(result).toEqual({ participantId: "participant-1", eventId: "event-1", registrationStatus: "withdrawn", alreadyProcessed: false });
    expect(rpc).toHaveBeenCalledWith("withdraw_spogomi_participant", expect.objectContaining({
      p_event_id: "event-1",
      p_participant_id: "participant-1",
      p_actor_kind: "participant",
      p_actor_clerk_id: "user-1",
    }));
  });

  it("does not turn an authorization failure into a successful withdrawal", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "42501" } });
    await expect(withdrawSpogomiParticipant({
      supabase: { rpc } as never,
      eventId: "event-1",
      participantId: "participant-1",
      clerkId: "other-user",
    })).rejects.toMatchObject({ kind: "forbidden" });
  });
});
