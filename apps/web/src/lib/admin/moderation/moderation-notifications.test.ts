import { describe, expect, it, vi } from "vitest";
import {
  notifyActionValidation,
  notifySignalementValidation,
} from "./moderation-notifications";

function createSupabaseHarness() {
  const actionLookup = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { location_label: "Quai de Seine" },
        error: null,
      }),
    }),
  });
  const spotLookup = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { label: "Parc municipal" },
        error: null,
      }),
    }),
  });
  const notificationInsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table: string) => {
    if (table === "actions") {
      return { select: actionLookup };
    }
    if (table === "trash_spotter_spots") {
      return { select: spotLookup };
    }
    if (table === "app_notifications") {
      return { insert: notificationInsert };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return { from, notificationInsert };
}

describe("moderation notifications", () => {
  it("creates the canonical action validation notification", async () => {
    const supabase = createSupabaseHarness();

    await notifyActionValidation(supabase as never, {
      actionId: "action-1",
      userId: "user-1",
    });

    expect(supabase.notificationInsert).toHaveBeenCalledWith({
      user_id: "user-1",
      type: "validation",
      title: "Action Validée !",
      content: "Votre action à Quai de Seine a été approuvée. Merci pour votre impact !",
      payload: { entityType: "action", id: "action-1" },
    });
  });

  it("creates the canonical signalement validation notification", async () => {
    const supabase = createSupabaseHarness();

    await notifySignalementValidation(supabase as never, {
      spotId: "spot-1",
      userId: "user-1",
    });

    expect(supabase.notificationInsert).toHaveBeenCalledWith({
      user_id: "user-1",
      type: "validation",
      title: "Signalement Validé !",
      content: "Votre signalement à Parc municipal a été validé.",
      payload: { entityType: "spot", id: "spot-1" },
    });
  });

  it("does not create a notification without a canonical creator", async () => {
    const supabase = createSupabaseHarness();

    await notifyActionValidation(supabase as never, {
      actionId: "action-1",
      userId: null,
    });

    expect(supabase.notificationInsert).not.toHaveBeenCalled();
  });
});
