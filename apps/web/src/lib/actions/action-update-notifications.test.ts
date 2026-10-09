import { describe, expect, it, vi } from "vitest";
import { emitActionUpdateNotifications } from "./action-update-notifications";

describe("action update notification delivery", () => {
  it("retries the same idempotent event after a transient RPC failure", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ error: new Error("temporary") })
      .mockResolvedValueOnce({ error: null });

    await expect(emitActionUpdateNotifications({
      supabase: { rpc } as never,
      actionId: "action-1",
      actorUserId: "organizer-1",
      changeKinds: ["schedule"],
      eventKey: "action_update:action-1:revision-1:schedule",
    })).resolves.toBe(true);

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenLastCalledWith("emit_action_update_notifications", {
      p_action_id: "action-1",
      p_actor_id: "organizer-1",
      p_change_kinds: ["schedule"],
      p_event_key: "action_update:action-1:revision-1:schedule",
    });
  });

  it("does not call the database for an empty classification", async () => {
    const rpc = vi.fn();
    await expect(emitActionUpdateNotifications({
      supabase: { rpc } as never,
      actionId: "action-1",
      actorUserId: "organizer-1",
      changeKinds: [],
      eventKey: "unused",
    })).resolves.toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});
