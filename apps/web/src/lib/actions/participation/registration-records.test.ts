import { describe, expect, it, vi } from "vitest";
import { loadActionRegistrationProjectionForAction } from "./registration-records";

describe("loadActionRegistrationProjectionForAction", () => {
  it("reads all registration sources and preserves their status metadata", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        { user_id: " user-group ", registration_status: "confirmed", registration_source: "group_form", registration_cancellation_reason: null },
        { user_id: "user-invite", registration_status: "pending", registration_source: "invite_link", registration_cancellation_reason: null },
        { user_id: "user-cancelled", registration_status: "cancelled", registration_source: "manual_add", registration_cancellation_reason: "organizer_withdrawn" },
        { user_id: null, registration_status: "pending", registration_source: "group_form", registration_cancellation_reason: null },
      ],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const supabase = { from: vi.fn().mockReturnValue({ select }) };

    await expect(loadActionRegistrationProjectionForAction(supabase as never, "action-1")).resolves.toEqual([
      { userId: "user-group", status: "confirmed", source: "group_form", cancellationReason: null },
      { userId: "user-invite", status: "pending", source: "invite_link", cancellationReason: null },
      { userId: "user-cancelled", status: "cancelled", source: "manual_add", cancellationReason: "organizer_withdrawn" },
    ]);
    expect(supabase.from).toHaveBeenCalledWith("action_registrations");
    expect(select).toHaveBeenCalledWith("user_id, registration_status, registration_source, registration_cancellation_reason");
    expect(eq).toHaveBeenCalledWith("action_id", "action-1");
    expect(order).toHaveBeenCalledWith("registered_at", { ascending: true });
  });

  it("propagates registration read errors instead of presenting an empty roster", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: "read denied" } }),
          }),
        }),
      }),
    };

    await expect(loadActionRegistrationProjectionForAction(supabase as never, "action-1")).rejects.toThrow("read denied");
  });
});
