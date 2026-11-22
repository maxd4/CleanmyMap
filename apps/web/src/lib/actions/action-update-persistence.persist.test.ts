import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { persistActionUpdate } from "./action-update-persistence";

function buildPersistenceClient(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ maybeSingle });
  const filters: Array<[string, unknown]> = [];
  const query = {
    eq: vi.fn((column: string, value: unknown) => {
      filters.push([column, value]);
      return query;
    }),
    select,
    maybeSingle,
  };
  const update = vi.fn().mockReturnValue(query);
  const from = vi.fn().mockReturnValue({ update });

  return {
    client: { from } as unknown as SupabaseClient,
    from,
    update,
    eq: query.eq,
    filters,
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
        expectedRevision: "revision-1",
        updateData: {},
      }),
    ).resolves.toEqual({ succeeded: false, revision: null });

    expect(from).not.toHaveBeenCalled();
  });

  it("returns the persisted revision after a successful update", async () => {
    const { client, from, update, filters, select } = buildPersistenceClient({
      data: { id: "action-42", updated_at: "2026-09-15T12:00:00.000Z" },
      error: null,
    });

    await expect(
      persistActionUpdate({
        supabase: client,
        actionId: "action-42",
        expectedRevision: "revision-1",
        updateData: { notes: "Finalisé" },
      }),
    ).resolves.toEqual({
      succeeded: true,
      revision: "2026-09-15T12:00:00.000Z",
    });

    expect(from).toHaveBeenCalledWith("actions");
    expect(update).toHaveBeenCalledWith({ notes: "Finalisé" });
    expect(filters).toEqual([["id", "action-42"], ["updated_at", "revision-1"]]);
    expect(select).toHaveBeenCalledWith("id, updated_at");
  });

  it("does not invent a revision when the update returns no row", async () => {
    const { client } = buildPersistenceClient({ data: null, error: null });

    await expect(
      persistActionUpdate({
        supabase: client,
        actionId: "action-42",
        expectedRevision: "revision-1",
        updateData: { notes: "Absent" },
      }),
    ).rejects.toThrow("L'action a changé pendant la modification");
  });

  it("allows only the first concurrent edit based on the same revision", async () => {
    const winner = buildPersistenceClient({ data: { id: "action-42", updated_at: "revision-2" }, error: null });
    const staleWriter = buildPersistenceClient({ data: null, error: null });
    const firstWrite = persistActionUpdate({
      supabase: winner.client,
      actionId: "action-42",
      expectedRevision: "revision-1",
      updateData: { preparation_data: { safetyInstructions: "Première édition" } },
    });
    const staleWrite = persistActionUpdate({
      supabase: staleWriter.client,
      actionId: "action-42",
      expectedRevision: "revision-1",
      updateData: { preparation_data: { safetyInstructions: "Édition obsolète" } },
    });

    await expect(firstWrite).resolves.toMatchObject({ succeeded: true, revision: "revision-2" });
    await expect(staleWrite).rejects.toThrow("L'action a changé pendant la modification");
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
        expectedRevision: "revision-1",
        updateData: { notes: "Refusé" },
      }),
    ).rejects.toThrow("Action update failed");
  });

  it("fails closed when an action revision is unavailable", async () => {
    const from = vi.fn();
    await expect(persistActionUpdate({
      supabase: { from } as unknown as SupabaseClient,
      actionId: "action-42",
      expectedRevision: null,
      updateData: { notes: "Sans révision" },
    })).rejects.toThrow("La révision de l'action est indisponible");
    expect(from).not.toHaveBeenCalled();
  });
});
