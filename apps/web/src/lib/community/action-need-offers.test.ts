import { describe, expect, it, vi } from "vitest";
import {
  ACTION_NEED_OFFER_MESSAGE_MAX_LENGTH,
  ACTION_NEED_OFFER_SELECT_FIELDS,
  getActionNeedOfferErrorCode,
  listActionNeedOffers,
  transitionActionNeedOffer,
  toActionNeedOfferItem,
} from "./action-need-offers";

const row = {
  id: "11111111-1111-4111-8111-111111111111",
  need_id: "22222222-2222-4222-8222-222222222222",
  offered_by_clerk_id: "helper-1",
  message: "Je peux apporter le matériel.",
  status: "pending" as const,
  created_at: "2026-10-30T10:00:00.000Z",
  updated_at: "2026-10-30T10:00:00.000Z",
};

function offersQuery(data: unknown[]) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    then: vi.fn((resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data, error: null }).then(resolve, reject)),
  };
  return chain;
}

describe("action need offers contract", () => {
  it("keeps the private offer projection separate from public needs", () => {
    expect(ACTION_NEED_OFFER_MESSAGE_MAX_LENGTH).toBe(300);
    expect(ACTION_NEED_OFFER_SELECT_FIELDS).toContain("offered_by_clerk_id");
    expect(toActionNeedOfferItem(row)).not.toHaveProperty("offeredByClerkId");
    expect(toActionNeedOfferItem(row, true).offeredByClerkId).toBe("helper-1");
  });

  it("scopes a non-manager list to the authenticated offer author", async () => {
    const query = offersQuery([row]);
    await expect(listActionNeedOffers({ from: vi.fn(() => query) } as never, row.need_id, "helper-1", false)).resolves.toEqual([row]);
    expect(query.eq).toHaveBeenCalledWith("offered_by_clerk_id", "helper-1");
  });

  it("leaves the manager projection unfiltered by offer author", async () => {
    const query = offersQuery([row]);
    await listActionNeedOffers({ from: vi.fn(() => query) } as never, row.need_id, "manager-1", true);
    expect(query.eq).toHaveBeenCalledWith("need_id", row.need_id);
    expect(query.eq).not.toHaveBeenCalledWith("offered_by_clerk_id", "manager-1");
  });

  it("preserves provider error codes for route conflict mapping", () => {
    expect(getActionNeedOfferErrorCode({ code: "23505" })).toBe("23505");
    expect(getActionNeedOfferErrorCode(new Error("conflict"))).toBeNull();
  });

  it("passes the expected need identity to the transition RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { status: "accepted", offer: { ...row, status: "accepted" }, notificationId: null },
      error: null,
    });

    await transitionActionNeedOffer(
      { rpc } as never,
      row.need_id,
      row.id,
      "manager-1",
      "accept",
    );

    expect(rpc).toHaveBeenCalledWith("transition_action_need_offer", {
      p_need_id: row.need_id,
      p_offer_id: row.id,
      p_actor_clerk_id: "manager-1",
      p_operation: "accept",
    });
  });
});
