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

  it("recognizes a missing atomic RPC from its message when the provider omits the code", async () => {
    const harness = createSupabase({
      data: null,
      error: { message: "function public.create_action_with_relations does not exist" },
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

  it("sends a nullable retry identity when the caller did not provide one", async () => {
    const harness = createSupabase({
      data: [{ action_id: "action-without-key", replayed: false }],
      error: null,
    });
    await expect(persistActionWithRelations(harness.client, {
      userId: "creator-1",
      baseInsert: { action_date: "2026-10-20", location_label: "Parc test" },
      organizers: [],
      manualParticipants: [],
    })).resolves.toEqual({ id: "action-without-key" });

    expect(harness.rpc).toHaveBeenCalledWith(
      "create_action_with_relations",
      expect.objectContaining({
        p_client_request_id: null,
        p_client_request_fingerprint: null,
        p_organizer_required: true,
      }),
    );
  });

  it("keeps the caller's base insert immutable while adding the persistence key", async () => {
    const harness = createSupabase({ data: [{ action_id: "action-1" }], error: null });
    const baseInsert = { action_date: "2026-10-20", location_label: "Parc test" };
    await persistActionWithRelations(harness.client, {
      userId: "creator-1",
      baseInsert,
      organizers: [],
      manualParticipants: [],
      clientRequestId: "retry-key-123456",
    });

    expect(baseInsert).toEqual({ action_date: "2026-10-20", location_label: "Parc test" });
    expect(harness.rpc.mock.calls[0]?.[1]).toMatchObject({
      p_action: { ...baseInsert, client_request_id: "retry-key-123456" },
    });
  });

  it("marks an organizer as required even when the explicit requirement is optional", async () => {
    const harness = createSupabase({ data: [{ action_id: "action-1" }], error: null });
    await persistActionWithRelations(harness.client, {
      userId: "creator-1",
      baseInsert: { action_date: "2026-10-20" },
      organizers: [organizer],
      organizerRequirement: "optional",
      manualParticipants: [],
    });

    expect(harness.rpc).toHaveBeenCalledWith(
      "create_action_with_relations",
      expect.objectContaining({ p_organizer_required: true }),
    );
  });

  it("keeps an optional empty organizer list optional", async () => {
    const harness = createSupabase({ data: [{ action_id: "action-1" }], error: null });
    await persistActionWithRelations(harness.client, {
      userId: "creator-1",
      baseInsert: { action_date: "2026-10-20" },
      organizers: [],
      organizerRequirement: "optional",
      manualParticipants: [],
    });

    expect(harness.rpc).toHaveBeenCalledWith(
      "create_action_with_relations",
      expect.objectContaining({ p_organizer_required: false, p_organizers: [] }),
    );
  });

  it("rejects a successful RPC envelope with an invalid action reference", async () => {
    const harness = createSupabase({ data: [{ action_id: 42 }], error: null });
    await expect(persistActionWithRelations(harness.client, {
      userId: "creator-1",
      baseInsert: { action_date: "2026-10-20" },
      organizers: [],
      manualParticipants: [],
    })).rejects.toBeInstanceOf(ActionCreationPersistenceError);
  });

  it("uses the first row returned by the atomic RPC envelope", async () => {
    const harness = createSupabase({
      data: [{ action_id: "action-1" }, { action_id: "action-2" }],
      error: null,
    });
    await expect(persistActionWithRelations(harness.client, {
      userId: "creator-1",
      baseInsert: { action_date: "2026-10-20" },
      organizers: [],
      manualParticipants: [],
    })).resolves.toEqual({ id: "action-1" });
  });

  it("propagates an unrelated database error without attempting a fallback", async () => {
    const harness = createSupabase({ data: null, error: { code: "23505", message: "duplicate" } });
    await expect(persistActionWithRelations(harness.client, {
      userId: "creator-1",
      baseInsert: { action_date: "2026-10-20" },
      organizers: [],
      manualParticipants: [],
    })).rejects.toMatchObject({ code: "23505" });
    expect(harness.from).not.toHaveBeenCalled();
  });

  it("propagates an RPC transport rejection without inventing an action id", async () => {
    const rpc = vi.fn().mockRejectedValue(new Error("connection reset"));
    const harness = { rpc, from: vi.fn(), client: { rpc, from: vi.fn() } as unknown as SupabaseClient };
    await expect(persistActionWithRelations(harness.client, {
      userId: "creator-1",
      baseInsert: { action_date: "2026-10-20" },
      organizers: [],
      manualParticipants: [],
    })).rejects.toThrow("connection reset");
  });
});
