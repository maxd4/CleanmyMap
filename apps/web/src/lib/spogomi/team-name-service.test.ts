import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { renameSpogomiTeam } from "./team-name-service";

describe("renameSpogomiTeam", () => {
  it("sends the canonical name to the server-owned RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { public_name: "Les Écureuils" }, error: null });
    const result = await renameSpogomiTeam({
      supabase: { rpc } as unknown as SupabaseClient,
      eventId: "event-1",
      teamId: "team-1",
      expectedPublicName: "Équipe 3",
      publicName: "  Les   Écureuils  ",
      actorClerkId: "user-1",
    });
    expect(result).toEqual({ public_name: "Les Écureuils" });
    expect(rpc).toHaveBeenCalledWith("spogomi_rename_team_public_name", expect.objectContaining({
      p_event_id: "event-1",
      p_team_id: "team-1",
      p_public_name: "Les Écureuils",
      p_expected_public_name: "Équipe 3",
      p_actor_clerk_id: "user-1",
    }));
  });

  it("fails before persistence for invalid names", async () => {
    const rpc = vi.fn();
    await expect(renameSpogomiTeam({
      supabase: { rpc } as unknown as SupabaseClient,
      eventId: "event-1",
      teamId: "team-1",
      expectedPublicName: "Équipe 3",
      publicName: "\n",
      actorClerkId: "user-1",
    })).rejects.toThrow(/Validation/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps stale writes to a retryable conflict", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "40001", message: "stale" } });
    await expect(renameSpogomiTeam({
      supabase: { rpc } as unknown as SupabaseClient,
      eventId: "event-1",
      teamId: "team-1",
      expectedPublicName: "Équipe 3",
      publicName: "Les Écureuils",
      actorClerkId: "user-1",
    })).rejects.toThrow(/changé entre-temps/);
  });
});
