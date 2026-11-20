import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { persistActionUpdate } from "./action-update-persistence";

function buildPersistenceClient(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ single });
  const eq = vi.fn().mockReturnValue({ select });
  const update = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ update });

  return {
    client: { from } as unknown as SupabaseClient,
    from,
    update,
    eq,
    select,
  };
}

describe("persistActionUpdate", () => {
  it("does not call the database for an empty update", async () => {
    const from = vi.fn();

    await expect(
      persistActionUpdate({
        supabase: { from } as unknown as SupabaseClient,
        actionId: "action-42",
        updateData: {},
      }),
    ).resolves.toEqual({ succeeded: false, revision: null });

    expect(from).not.toHaveBeenCalled();
  });

  it("returns the persisted revision after a successful update", async () => {
    const { client, from, update, eq, select } = buildPersistenceClient({
      data: { id: "action-42", updated_at: "2026-09-15T12:00:00.000Z" },
      error: null,
    });

    await expect(
      persistActionUpdate({
        supabase: client,
        actionId: "action-42",
        updateData: { notes: "Finalisé" },
      }),
    ).resolves.toEqual({
      succeeded: true,
      revision: "2026-09-15T12:00:00.000Z",
    });

    expect(from).toHaveBeenCalledWith("actions");
    expect(update).toHaveBeenCalledWith({ notes: "Finalisé" });
    expect(eq).toHaveBeenCalledWith("id", "action-42");
    expect(select).toHaveBeenCalledWith("id, updated_at");
  });

  it("does not invent a revision when the update returns no row", async () => {
    const { client } = buildPersistenceClient({ data: null, error: null });

    await expect(
      persistActionUpdate({
        supabase: client,
        actionId: "action-42",
        updateData: { notes: "Absent" },
      }),
    ).resolves.toEqual({ succeeded: false, revision: null });
  });

  it("raises a stable error when persistence fails", async () => {
    const { client } = buildPersistenceClient({
      data: null,
      error: { message: "permission denied" },
    });

    await expect(
      persistActionUpdate({
        supabase: client,
        actionId: "action-42",
        updateData: { notes: "Refusé" },
      }),
    ).rejects.toThrow("Action update failed");
  });
});
