import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { buildProjection } = vi.hoisted(() => ({ buildProjection: vi.fn((source: unknown) => source) }));

vi.mock("./results-projection", async () => {
  const actual = await vi.importActual<typeof import("./results-projection")>("./results-projection");
  return { ...actual, buildSpogomiResultsProjection: buildProjection };
});

import { loadSpogomiResultsProjection } from "./results-projection-service";

function fakeSupabase() {
  const rows: Record<string, unknown> = {
    spogomi_events: {
      id: "event-1", action_id: "action-1", name: "SPOGOMI", location_label: "Paris", mode: "casual", state: "certified",
      starts_at: "2026-10-12T09:00:00Z", ends_at: null, regulation_version: "rules-v1", regulation_status: "complete",
      regulation_source_reference: "reglement:test", regulation_config: { tiebreakers: ["mass_grams"] }, team_size_config: { minMembers: 1, maxMembers: 5 },
      public_visibility: "published", public_results_visibility: "hidden", updated_at: "2026-10-12T10:00:00Z",
    },
    actions: { status: "approved", published_at: "2026-10-12T10:00:00Z", moderation_visibility: "visible" },
    spogomi_category_rules: [{
      id: "category-1", event_id: "event-1", regulation_version: "rules-v1", code: "waste", label: "Déchets", measurement_kind: "mass", unit: "kg",
      coefficient: 1, coefficient_status: "confirmed", environmental_category_slug: "plastic", display_order: 1, is_complete: true, updated_at: "2026-10-12T10:00:00Z",
    }],
    spogomi_teams: [{ id: "team-1", team_number: 1, public_name: "Équipe 1", composition_state: "verified", certified_submission_id: null, updated_at: "2026-10-12T10:01:00Z" }],
    spogomi_result_submissions: [],
    spogomi_result_items: [],
    spogomi_participants: [],
    spogomi_official_rankings: [],
    spogomi_action_consolidations: null,
  };

  return {
    from: vi.fn((table: string) => {
      const query: Record<string, unknown> = {};
      query.select = vi.fn(() => query);
      query.eq = vi.fn(() => query);
      query.order = vi.fn(() => query);
      query.range = vi.fn(() => query);
      query.maybeSingle = vi.fn(async () => ({ data: rows[table] ?? null, error: null }));
      query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows[table] ?? [], error: null }).then(resolve);
      return query;
    }),
  };
}

describe("SPOGOMI results projection loader", () => {
  it("passes the selected team version and eligibility fields into the source", async () => {
    buildProjection.mockClear();
    await loadSpogomiResultsProjection({ supabase: fakeSupabase() as never, eventId: "event-1" });

    const source = buildProjection.mock.calls[0]?.[0] as { teams: Array<Record<string, unknown>> };
    expect(source.teams[0]).toMatchObject({
      id: "team-1",
      composition_state: "verified",
      certified_submission_id: null,
      updated_at: "2026-10-12T10:01:00Z",
    });
  });
});
