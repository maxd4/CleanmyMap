import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { loadSpogomiRegistrationReadiness, openSpogomiRegistration, updateSpogomiRegistrationPolicy } from "./registration-readiness-service";

const readiness = {
  eventId: "event-1",
  ready: true,
  policy: { minorsApplicable: false },
  editionItems: [],
  divisions: [],
};

const event = { id: "event-1", composition_revision: 4 } as never;

describe("registration readiness server service", () => {
  it("loads the canonical RPC projection and forwards the revision for opening", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: readiness, error: null })
      .mockResolvedValueOnce({ data: event, error: null });
    const supabase = { rpc } as never;
    await expect(loadSpogomiRegistrationReadiness({ supabase, eventId: "event-1" })).resolves.toEqual(readiness);
    await expect(openSpogomiRegistration({ supabase, event, actorClerkId: "organizer-1" })).resolves.toEqual(event);
    expect(rpc).toHaveBeenLastCalledWith("spogomi_open_registration", { p_event_id: "event-1", p_expected_revision: 4, p_actor_clerk_id: "organizer-1" });
  });

  it("rejects invalid policy input before any RPC mutation", async () => {
    const rpc = vi.fn();
    const supabase = { rpc } as never;
    await expect(updateSpogomiRegistrationPolicy({ supabase, event, actorClerkId: "organizer-1", patch: { capacity: 0 } })).rejects.toThrow("capacité");
    expect(rpc).not.toHaveBeenCalled();
  });
});
