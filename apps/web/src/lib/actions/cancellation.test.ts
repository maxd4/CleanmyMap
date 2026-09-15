import { beforeEach, describe, expect, it, vi } from "vitest";

const loadActionByIdMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionByIdMock }));

import {
  cancelFutureAction,
} from "./cancellation";
import { isFutureActionCancellationEligible } from "./temporal";

const future = new Date("2098-12-01T10:00:00.000Z");
const baseAction = {
  id: "action-1",
  action_date: "2098-12-02",
  event_start_time: "10:00",
  action_phase: "pre_action" as const,
  published_at: "2098-11-01T10:00:00.000Z",
  moderation_visibility: "visible" as const,
};

describe("action cancellation contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["pending", "approved"] as const)(
    "accepts a published future %s pre-action",
    (status) => {
      expect(
        isFutureActionCancellationEligible({ ...baseAction, status }, future),
      ).toBe(true);
    },
  );

  it.each([
    { status: "rejected" as const, label: "rejected" },
    { status: "pending" as const, label: "past" },
  ])("rejects $label actions", ({ status, label }) => {
    expect(
      isFutureActionCancellationEligible(
        {
          ...baseAction,
          status,
          ...(label === "past" ? { action_date: "2020-01-01" } : {}),
        },
        future,
      ),
    ).toBe(false);
  });

  it("stores the previous status and cancellation fields without deleting references", async () => {
    loadActionByIdMock.mockResolvedValue({ ...baseAction, status: "approved" });
    const chain = {
      update: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      in: vi.fn(() => chain),
      not: vi.fn(() => chain),
      select: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => ({
        data: {
          id: "action-1",
          status: "cancelled",
          cancelled_at: "2098-11-20T10:00:00.000Z",
          cancelled_by_clerk_id: "admin-1",
          cancellation_reason: "weather",
          cancelled_from_status: "approved",
        },
        error: null,
      })),
    };
    const supabase = { from: vi.fn(() => chain) };

    const result = await cancelFutureAction(supabase as never, {
      actionId: "action-1",
      actorUserId: "admin-1",
      reason: "weather",
      now: new Date("2098-11-20T10:00:00.000Z"),
    });

    expect(result).toMatchObject({
      id: "action-1",
      status: "cancelled",
      previousStatus: "approved",
      cancellationReason: "weather",
    });
    expect(chain.update).toHaveBeenCalledWith({
      status: "cancelled",
      cancelled_at: "2098-11-20T10:00:00.000Z",
      cancelled_by_clerk_id: "admin-1",
      cancellation_reason: "weather",
      cancelled_from_status: "approved",
    });
    expect(supabase.from).not.toHaveBeenCalledWith("action_participants");
    expect(supabase.from).not.toHaveBeenCalledWith("app_messages");
  });

  it("is idempotent for an already cancelled tombstone", async () => {
    loadActionByIdMock.mockResolvedValue({
      ...baseAction,
      status: "cancelled",
      cancelled_at: "2098-11-20T10:00:00.000Z",
      cancelled_by_clerk_id: "admin-1",
      cancellation_reason: "moved",
      cancelled_from_status: "pending",
    });
    const supabase = { from: vi.fn() };

    await expect(
      cancelFutureAction(supabase as never, {
        actionId: "action-1",
        actorUserId: "admin-2",
      }),
    ).resolves.toMatchObject({ alreadyCancelled: true, previousStatus: "pending" });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
