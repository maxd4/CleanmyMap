import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { updateSpogomiEvent } from "./preparation-service";

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-1",
    action_id: "action-1",
    created_by_clerk_id: "organizer-1",
    name: "SPOGOMI synthétique",
    location_label: "Cachan",
    mode: "casual" as const,
    state: "registration_open",
    starts_at: "2026-10-20T09:00:00.000Z",
    ends_at: null,
    team_size_config: { casual: { minMembers: 2, maxMembers: 4 } },
    creation_state: "ready",
    event_slug: "spogomi-synthetic",
    public_visibility: "private" as const,
    public_results_visibility: "hidden" as const,
    composition_revision: 9,
    ...overrides,
  } as Parameters<typeof updateSpogomiEvent>[0]["event"];
}

describe("SPOGOMI event metadata updates", () => {
  it("preserves distinct Casual bounds when updating unrelated metadata", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: event({ name: "Nouveau nom" }), error: null });
    const supabase = { rpc } as unknown as Parameters<typeof updateSpogomiEvent>[0]["supabase"];

    await updateSpogomiEvent({
      supabase,
      event: event(),
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
    const rpc = vi.fn().mockResolvedValue({ data: event({ team_size_config: { casual: { minMembers: 3, maxMembers: 3 } } }), error: null });
    const supabase = { rpc } as unknown as Parameters<typeof updateSpogomiEvent>[0]["supabase"];

    await updateSpogomiEvent({
      supabase,
      event: event(),
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
      event: event({ state: "composition_locked" }),
      actorClerkId: "organizer-1",
      input: { mode: "world_cup" },
    })).rejects.toThrow(/immutable after composition lock/i);
  });
});
