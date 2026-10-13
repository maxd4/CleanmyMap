import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { updateSpogomiEvent } from "./preparation-service";
import { spogomiPreparationEvent } from "./preparation-test-fixtures";

describe("SPOGOMI event metadata updates", () => {
  it("preserves distinct Casual bounds when updating unrelated metadata", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: spogomiPreparationEvent({ name: "Nouveau nom" }), error: null });
    const supabase = { rpc } as unknown as Parameters<typeof updateSpogomiEvent>[0]["supabase"];

    await updateSpogomiEvent({
      supabase,
      event: spogomiPreparationEvent({ composition_revision: 9 }),
      actorClerkId: "organizer-1",
      input: { name: "Nouveau nom" },
    });

    expect(rpc).toHaveBeenCalledWith("spogomi_update_event_metadata", expect.objectContaining({
      p_actor_clerk_id: "organizer-1",
      p_expected_revision: 9,
      p_mode: "casual",
      p_team_size_config: { casual: { minMembers: 2, maxMembers: 4 } },
    }));
  });

  it("sends an explicit size change to the guarded server procedure", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: spogomiPreparationEvent({ composition_revision: 9, team_size_config: { casual: { minMembers: 3, maxMembers: 3 } } }), error: null });
    const supabase = { rpc } as unknown as Parameters<typeof updateSpogomiEvent>[0]["supabase"];

    await updateSpogomiEvent({
      supabase,
      event: spogomiPreparationEvent({ composition_revision: 9 }),
      actorClerkId: "organizer-1",
      input: { casualTeamSize: 3 },
    });

    expect(rpc).toHaveBeenCalledWith("spogomi_update_event_metadata", expect.objectContaining({
      p_team_size_config: { casual: { minMembers: 3, maxMembers: 3 } },
    }));
  });

  it("does not hide the server refusal for a locked-rule update", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23514", message: "SPOGOMI mode and team-size rules are immutable after composition lock" },
    });
    const supabase = { rpc } as unknown as Parameters<typeof updateSpogomiEvent>[0]["supabase"];

    await expect(updateSpogomiEvent({
      supabase,
      event: spogomiPreparationEvent({ state: "composition_locked", composition_revision: 9 }),
      actorClerkId: "organizer-1",
      input: { mode: "world_cup" },
    })).rejects.toThrow(/immutable after composition lock/i);
  });
});
