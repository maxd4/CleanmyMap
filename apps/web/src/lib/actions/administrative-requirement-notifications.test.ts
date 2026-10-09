import { describe, expect, it, vi } from "vitest";
import { emitAdministrativeRequirementNotifications } from "./administrative-requirement-notifications";

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
