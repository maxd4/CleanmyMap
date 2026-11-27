import { describe, expect, it, vi } from "vitest";
import type { ActionRow } from "./progression-types";

const mocks = vi.hoisted(() => ({
  loadCanonicalActionOrganizerIdsForAction: vi.fn(),
}));

vi.mock("@/lib/actions/participation/organizers", () => ({
  loadCanonicalActionOrganizerIdsForAction: mocks.loadCanonicalActionOrganizerIdsForAction,
}));

import { buildActionFacts } from "./gamification-action-facts";

function action(id: string, actionDate: string, overrides: Partial<ActionRow> = {}): ActionRow {
  return {
    id,
    created_at: `${actionDate}T10:00:00.000Z`,
    created_by_clerk_id: "user-1",
    actor_name: "Testeur",
    action_date: actionDate,
    location_label: "Parc de test",
    latitude: 48.85,
    longitude: 2.35,
    waste_kg: null,
    cigarette_butts: 0,
    volunteers_count: 1,
    duration_minutes: 30,
    status: "approved",
    notes: "Action vérifiée",
    action_phase: "post_action_complete",
    published_at: `${actionDate}T09:00:00.000Z`,
    ...overrides,
  };
}

function supabaseWithoutParticipants() {
  return {
    from(table: string) {
      if (table !== "action_participants") throw new Error(`Unexpected table ${table}`);
      const chain = {
        select() { return chain; },
        in() { return chain; },
        eq() { return chain; },
        order() { return chain; },
        range() { return Promise.resolve({ data: [], error: null, count: 0 }); },
      };
      return chain;
    },
  };
}

describe("canonical action source facts", () => {
  it("selects one-shot proof from the earliest action regardless of import order", async () => {
    mocks.loadCanonicalActionOrganizerIdsForAction.mockResolvedValue(["user-1"]);
    const later = action("action-later", "2026-10-02");
    const earlier = action("action-earlier", "2026-10-01");

    const forward = await buildActionFacts(
      supabaseWithoutParticipants() as never,
      "user-1",
      [later, earlier],
      new Set([later.id, earlier.id]),
    );
    const reversed = await buildActionFacts(
      supabaseWithoutParticipants() as never,
      "user-1",
      [earlier, later],
      new Set([later.id, earlier.id]),
    );

    const oneShot = (facts: typeof forward.facts) => facts
      .filter((fact) => fact.mechanicId === "premiere_trace_utile" || fact.mechanicId === "boucle_bouclee")
      .map((fact) => ({ mechanicId: fact.mechanicId, sourceId: fact.sourceId, occurredOn: fact.occurredOn }));
    expect(oneShot(forward.facts)).toEqual(oneShot(reversed.facts));
    expect(oneShot(forward.facts)).toEqual([
      { mechanicId: "premiere_trace_utile", sourceId: "action-earlier", occurredOn: "2026-10-01" },
      { mechanicId: "boucle_bouclee", sourceId: "action-milestone:boucle_bouclee", occurredOn: "2026-10-01" },
    ]);
  });

  it("does not create validation or milestone facts for an unverified action", async () => {
    mocks.loadCanonicalActionOrganizerIdsForAction.mockResolvedValue(["user-1"]);
    const pending = action("action-pending", "2026-10-01", { status: "pending" });
    const result = await buildActionFacts(
      supabaseWithoutParticipants() as never,
      "user-1",
      [pending],
      new Set(),
    );

    expect(result.facts).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ eventType: "action_declare_validation" }),
      expect.objectContaining({ eventType: "action_loop_completed" }),
    ]));
  });

  it("keeps ownership fail-closed and deduplicates participant evidence", async () => {
    mocks.loadCanonicalActionOrganizerIdsForAction.mockImplementation(async (_supabase: unknown, actionId: string) => {
      return actionId === "action-owned" ? ["user-1"] : [];
    });
    const participantQuery = {
      select: vi.fn(),
      in: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
    };
    participantQuery.select.mockReturnValue(participantQuery);
    participantQuery.in.mockReturnValue(participantQuery);
    participantQuery.eq.mockReturnValue(participantQuery);
    participantQuery.order.mockReturnValue(participantQuery);
    participantQuery.range.mockResolvedValue({
      data: [
        { id: "p-1", action_id: "action-owned", user_id: "user-2" },
        { id: "p-2", action_id: "action-owned", user_id: "user-2" },
        { id: "p-3", action_id: null, user_id: "ignored" },
      ],
      error: null,
      count: 3,
    });
    const supabase = { from: vi.fn(() => participantQuery) };
    const owned = action("action-owned", "2026-10-01");
    const unowned = action("action-unowned", "2026-10-02");

    const result = await buildActionFacts(
      supabase as never,
      "user-1",
      [owned, unowned],
      new Set([owned.id, unowned.id]),
    );
    expect(result.validatedActions.map((row) => row.id)).toEqual(["action-owned", "action-unowned"]);
    expect(result.facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ mechanicId: "organisation", sourceId: "action-owned" }),
      expect.objectContaining({ mechanicId: "premiere_trace_utile", sourceId: "action-owned" }),
    ]));
    expect(result.facts).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceId: "action-unowned" }),
    ]));
  });

  it("rejects missing organizer and participant evidence instead of returning partial facts", async () => {
    const row = action("action-1", "2026-10-01");
    mocks.loadCanonicalActionOrganizerIdsForAction.mockRejectedValueOnce(new Error("organizer unavailable"));
    await expect(buildActionFacts(supabaseWithoutParticipants() as never, "user-1", [row], new Set([row.id])))
      .rejects.toThrow("organizer unavailable");
    mocks.loadCanonicalActionOrganizerIdsForAction.mockResolvedValue(["user-1"]);
    const chain = {
      select: () => chain,
      in: () => chain,
      eq: () => chain,
      order: () => chain,
      range: () => Promise.resolve({ data: null, error: { message: "participants unavailable" }, count: null }),
    };
    await expect(buildActionFacts({ from: () => chain } as never, "user-1", [row], new Set([row.id])))
      .rejects.toThrow("participants unavailable");
  });

  it("returns a zero-source result for an empty action inventory", async () => {
    mocks.loadCanonicalActionOrganizerIdsForAction.mockResolvedValue([]);
    const result = await buildActionFacts(supabaseWithoutParticipants() as never, "user-1", [], new Set());
    expect(result).toMatchObject({ facts: [], validatedActions: [], regularityCount: 0 });
    expect(result.balance.awards).toEqual([]);
  });
});
