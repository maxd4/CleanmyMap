import { describe, expect, it, vi } from "vitest";
import {
  emitAdministrativeRequirementNotifications,
  emitAdministrativeRequirementNotificationsIfNeeded,
} from "./administrative-requirement-notifications";

describe("administrative requirement notification delivery", () => {
  it("calls the canonical RPC after the caller has persisted the action", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 1, error: null });

    await expect(
      emitAdministrativeRequirementNotifications({
        supabase: { rpc } as never,
        actionId: "action-1",
      }),
    ).resolves.toBe(true);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "emit_action_administrative_requirement_notifications",
      { p_action_id: "action-1" },
    );
  });

  it("retries a transient delivery failure without failing the action mutation", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "temporary database failure" },
    });

    await expect(
      emitAdministrativeRequirementNotifications({
        supabase: { rpc } as never,
        actionId: "action-1",
      }),
    ).resolves.toBe(false);

    expect(rpc).toHaveBeenCalledTimes(2);
  });
});

describe("emitAdministrativeRequirementNotificationsIfNeeded", () => {
  const makeSupabase = () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    return { rpc, supabase: { rpc } as never };
  };

  it.each([
    { label: "undefined", published_at: undefined },
    { label: "null", published_at: null },
  ])("does not notify an unpublished action when published_at is $label", async ({ published_at }) => {
    const { rpc, supabase } = makeSupabase();
    await emitAdministrativeRequirementNotificationsIfNeeded({
      supabase,
      actionId: "action-1",
      current: { published_at },
      updateData: {},
      actionWriteSucceeded: true,
    });

    expect(rpc).not.toHaveBeenCalled();
  });

  it("notifies an action with an existing publication date", async () => {
    const { rpc, supabase } = makeSupabase();
    await emitAdministrativeRequirementNotificationsIfNeeded({
      supabase,
      actionId: "action-1",
      current: { published_at: "2026-10-09T10:00:00.000Z" },
      updateData: {},
      actionWriteSucceeded: true,
    });

    expect(rpc).toHaveBeenCalledWith(
      "emit_action_administrative_requirement_notifications",
      { p_action_id: "action-1" },
    );
  });

  it("notifies when the successful write publishes the action", async () => {
    const { rpc, supabase } = makeSupabase();
    await emitAdministrativeRequirementNotificationsIfNeeded({
      supabase,
      actionId: "action-1",
      current: { published_at: undefined },
      updateData: { published_at: "2026-10-09T10:00:00.000Z" },
      actionWriteSucceeded: true,
    });

    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("does not notify after an unsuccessful write", async () => {
    const { rpc, supabase } = makeSupabase();
    await emitAdministrativeRequirementNotificationsIfNeeded({
      supabase,
      actionId: "action-1",
      current: { published_at: "2026-10-09T10:00:00.000Z" },
      updateData: {},
      actionWriteSucceeded: false,
    });

    expect(rpc).not.toHaveBeenCalled();
  });
});
