import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  ActionCreationPersistenceError,
  persistActionWithRelations,
} from "./store-create";

const organizer = {
  userId: "organizer-1",
  displayName: "Organisateur",
  handle: "organisateur",
  isPrimary: true,
  sourceToken: null,
};

function createSupabase(rpcResult: unknown) {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  const from = vi.fn();
  return { rpc, from, client: { rpc, from } as unknown as SupabaseClient };
}

describe("action creation idempotency", () => {
  it("delegates the action and required relations to one atomic server operation", async () => {
    const harness = createSupabase({
      data: [{ action_id: "action-created-once", replayed: false }],
      error: null,
    });

    const result = await persistActionWithRelations(harness.client, {
      userId: "clerk-user-1",
      baseInsert: {
        created_by_clerk_id: "clerk-user-1",
        action_date: "2026-10-20",
        location_label: "Parc test",
        status: "pending",
        action_phase: "pre_action",
      },
      organizers: [organizer],
      manualParticipants: [],
      clientRequestId: "action-create-retry-key-1",
    });

    expect(result).toEqual({ id: "action-created-once" });
    expect(harness.from).not.toHaveBeenCalled();
    expect(harness.rpc).toHaveBeenCalledWith(
      "create_action_with_relations",
      expect.objectContaining({
        p_creator_id: "clerk-user-1",
        p_client_request_id: "action-create-retry-key-1",
        p_organizer_required: true,
        p_organizers: [expect.objectContaining({ organizer_clerk_id: "organizer-1" })],
        p_registrations: expect.arrayContaining([
          expect.objectContaining({ user_id: "organizer-1", registration_status: "confirmed" }),
          expect.objectContaining({ user_id: "clerk-user-1", registration_status: "pending" }),
        ]),
      }),
    );
  });

  it("accepts a completed replay only from the atomic operation", async () => {
    const harness = createSupabase({
      data: [{ action_id: "action-created-once", replayed: true }],
      error: null,
    });

    await expect(persistActionWithRelations(harness.client, {
      userId: "clerk-user-1",
      baseInsert: { created_by_clerk_id: "clerk-user-1", action_date: "2026-10-20", location_label: "Parc test" },
      organizers: [organizer],
      manualParticipants: [],
      clientRequestId: "action-create-retry-key-1",
    })).resolves.toEqual({ id: "action-created-once", replayed: true });
  });

  it("does not resolve concurrent callers before the atomic boundary resolves", async () => {
    let releaseFirst!: (value: unknown) => void;
    let releaseSecond!: (value: unknown) => void;
    const rpc = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { releaseFirst = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { releaseSecond = resolve; }));
    const harness = { rpc, from: vi.fn(), client: { rpc } as unknown as SupabaseClient };
    const params = {
      userId: "clerk-user-1",
      baseInsert: { created_by_clerk_id: "clerk-user-1", action_date: "2026-10-20", location_label: "Parc test" },
      organizers: [organizer],
      manualParticipants: [],
      clientRequestId: "action-create-retry-key-1",
    };
    let firstSettled = false;
    let secondSettled = false;
    const first = persistActionWithRelations(harness.client, params).then((result) => {
      firstSettled = true;
      return result;
    });
    const second = persistActionWithRelations(harness.client, params).then((result) => {
      secondSettled = true;
      return result;
    });
    await Promise.resolve();
    expect(firstSettled).toBe(false);
    expect(secondSettled).toBe(false);

    releaseFirst({ data: [{ action_id: "action-created-once", replayed: false }], error: null });
    await expect(first).resolves.toEqual({ id: "action-created-once" });
    expect(secondSettled).toBe(false);
    releaseSecond({ data: [{ action_id: "action-created-once", replayed: true }], error: null });
    await expect(second).resolves.toEqual({ id: "action-created-once", replayed: true });
  });

  it("fails explicitly when the atomic migration is absent without a fallback insert", async () => {
    const harness = createSupabase({
      data: null,
      error: { code: "PGRST202", message: "Could not find the function public.create_action_with_relations" },
    });

    await expect(persistActionWithRelations(harness.client, {
      userId: "clerk-user-1",
      baseInsert: { created_by_clerk_id: "clerk-user-1", action_date: "2026-10-20", location_label: "Parc test" },
      organizers: [organizer],
      manualParticipants: [],
      clientRequestId: "action-create-retry-key-1",
    })).rejects.toBeInstanceOf(ActionCreationPersistenceError);
    expect(harness.from).not.toHaveBeenCalled();
  });

  it("keeps the idempotency scope bound to the authenticated creator", async () => {
    const harness = createSupabase({
      data: [{ action_id: "action-created", replayed: false }],
      error: null,
    });
    const common = {
      baseInsert: { action_date: "2026-10-20", location_label: "Parc test" },
      organizers: [organizer],
      manualParticipants: [],
      clientRequestId: "action-create-retry-key-1",
    };

    await persistActionWithRelations(harness.client, { ...common, userId: "creator-a" });
    await persistActionWithRelations(harness.client, { ...common, userId: "creator-b" });

    expect(harness.rpc).toHaveBeenNthCalledWith(
      1,
      "create_action_with_relations",
      expect.objectContaining({ p_creator_id: "creator-a" }),
    );
    expect(harness.rpc).toHaveBeenNthCalledWith(
      2,
      "create_action_with_relations",
      expect.objectContaining({ p_creator_id: "creator-b" }),
    );
  });

  it("does not compensate by deleting rows when the atomic operation fails", async () => {
    const harness = createSupabase({
      data: null,
      error: { code: "40001", message: "action_creation_registrations_incomplete" },
    });

    await expect(persistActionWithRelations(harness.client, {
      userId: "clerk-user-1",
      baseInsert: { created_by_clerk_id: "clerk-user-1", action_date: "2026-10-20", location_label: "Parc test" },
      organizers: [organizer],
      manualParticipants: [],
      clientRequestId: "action-create-retry-key-1",
    })).rejects.toMatchObject({ code: "40001" });
    expect(harness.from).not.toHaveBeenCalled();
  });
});
