import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildSpogomiConsolidationPreview,
  publishSpogomiConsolidation,
} from "./consolidation-service";

type Row = Record<string, unknown>;

function supabaseFor(overrides: Record<string, unknown> = {}, rpcResult: { data?: unknown; error?: Row | null } = {}) {
  const tables: Record<string, unknown> = {
    spogomi_events: [{ id: "event-1", action_id: "action-1", name: "Edition", location_label: "Paris", starts_at: "2026-10-12T09:00:00Z", ends_at: null, state: "certified", environmental_mapping_version: "v1", updated_at: "event-updated" }],
    actions: [{ updated_at: "action-updated", organizer_id: null, organizer_name: null, organizer_type: null }],
    spogomi_category_rules: [{ id: "category-plastic", division_id: "casual", code: "plastic", label: "Plastique", measurement_kind: "mass", unit: "g", environmental_category_slug: "plastic", updated_at: "category-updated" }],
    spogomi_environment_category_mappings: [],
    spogomi_teams: [{ id: "team-1", division_id: "casual", team_number: 1, public_name: "Equipe 1", certified_submission_id: "submission-1", updated_at: "team-updated" }],
    spogomi_result_submissions: [{ id: "submission-1", division_id: "casual", team_id: "team-1", status: "certified", updated_at: "submission-updated" }],
    spogomi_result_items: [{ id: "item-1", division_id: "casual", submission_id: "submission-1", category_rule_id: "category-plastic", quantity: null, mass_grams: 1000, object_count: null, provenance: "photo-1", measurement_method: "balance", source_reference: "field-1", updated_at: "item-updated" }],
    spogomi_participants: [{ id: "participant-1", division_id: "casual", team_id: "team-1", attendance_status: "present", registration_status: "registered", updated_at: "participant-updated" }],
    spogomi_event_routes: [{ id: "route-1", source: "official_reference", file_name: "route.gpx", point_count: 2, reference_distance_km: 1.2, inferred_topology: "loop", geometry_geojson: { type: "LineString", coordinates: [[2.3, 48.8], [2.4, 48.9], [2.3, 48.8]] }, updated_at: "route-updated" }],
    spogomi_action_consolidations: [],
    ...overrides,
  };
  const from = vi.fn((table: string) => {
    const query: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order", "range", "update", "insert"]) query[method] = vi.fn(() => query);
    const data = tables[table] ?? [];
    query.maybeSingle = vi.fn(async () => ({ data: Array.isArray(data) ? data[0] ?? null : data, error: null }));
    query.single = vi.fn(async () => ({ data: Array.isArray(data) ? data[0] ?? null : data, error: null }));
    query.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve({ data, error: null, count: Array.isArray(data) ? data.length : null }).then(resolve, reject);
    return query;
  });
  const rpc = vi.fn(async () => rpcResult);
  return { supabase: { from, rpc } as never, rpc };
}

describe("SPOGOMI consolidation service", () => {
  it("builds a deterministic preview from certified measurements, attendance and official route", async () => {
    const fixture = supabaseFor();
    const preview = await buildSpogomiConsolidationPreview({ supabase: fixture.supabase, eventId: "event-1" });
    expect(preview.event).toMatchObject({ id: "event-1", action_id: "action-1" });
    expect(preview.projection).toMatchObject({
      readyForPublication: true,
      teamsIncluded: 1,
      participantsPresent: 1,
      totalWasteMassGrams: 1000,
      officialRoute: expect.objectContaining({ fileName: "route.gpx", inferredTopology: "loop" }),
      sourceSubmissionIds: ["submission-1"],
    });
    expect(preview.projection.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(preview.projection.consolidation.sourceHash).toBe(preview.projection.sourceHash);
  });

  it("excludes incomplete certified sources and rejects invalid official route data without inventing totals", async () => {
    const fixture = supabaseFor({
      spogomi_teams: [{ id: "team-1", division_id: "casual", team_number: 1, public_name: "Equipe 1", certified_submission_id: null, updated_at: "team-updated" }],
      spogomi_event_routes: [{ id: "route-1", source: "observed", file_name: "bad.gpx", point_count: 1, reference_distance_km: 0, inferred_topology: "loop", geometry_geojson: { type: "Point", coordinates: [2.3, 48.8] }, updated_at: "route-updated" }],
    });
    const preview = await buildSpogomiConsolidationPreview({ supabase: fixture.supabase, eventId: "event-1" });
    expect(preview.projection).toMatchObject({ readyForPublication: false, teamsIncluded: 0, totalWasteMassGrams: null, officialRoute: null });
    expect(preview.projection.excludedMeasures).toEqual([expect.objectContaining({ reason: "team_not_certified" })]);
  });

  it("publishes only the exact preview hash and forwards the canonical projection to the RPC", async () => {
    const fixture = supabaseFor({}, { data: { status: "published" }, error: null });
    const preview = await buildSpogomiConsolidationPreview({ supabase: fixture.supabase, eventId: "event-1" });
    await expect(publishSpogomiConsolidation({ supabase: fixture.supabase, eventId: "event-1", publishedByClerkId: "organizer", expectedSourceHash: "wrong" })).rejects.toThrow("bilan a changé");
    await expect(publishSpogomiConsolidation({ supabase: fixture.supabase, eventId: "event-1", publishedByClerkId: "organizer", expectedSourceHash: preview.projection.sourceHash })).resolves.toEqual({ status: "published" });
    expect(fixture.rpc).toHaveBeenCalledWith("consolidate_spogomi_event_to_action", expect.objectContaining({
      p_event_id: "event-1", p_source_hash: preview.projection.sourceHash, p_published_by_clerk_id: "organizer",
      p_projection: expect.objectContaining({ totalWasteMassGrams: 1000 }),
    }));
  });

  it("refuses publication when a source changes after preview and performs no privileged mutation", async () => {
    const before = supabaseFor();
    const preview = await buildSpogomiConsolidationPreview({ supabase: before.supabase, eventId: "event-1" });
    const after = supabaseFor({
      spogomi_result_items: [{ id: "item-1", division_id: "casual", submission_id: "submission-1", category_rule_id: "category-plastic", quantity: null, mass_grams: 1250, object_count: null, provenance: "photo-2", measurement_method: "balance", source_reference: "field-2", updated_at: "item-updated-2" }],
    });
    await expect(publishSpogomiConsolidation({ supabase: after.supabase, eventId: "event-1", publishedByClerkId: "organizer", expectedSourceHash: preview.projection.sourceHash })).rejects.toThrow("bilan a changé");
    expect(after.rpc).not.toHaveBeenCalled();
  });

  it.each([
    [{ code: "40001", message: "stale projection" }, /Conflict: stale projection/],
    [{ code: "23514", message: "projection invalid" }, /Conflict: projection invalid/],
    [{ code: "42501", message: "forbidden" }, /forbidden/],
  ])("maps publication RPC failures without claiming persistence", async (error, expected) => {
    const fixture = supabaseFor({}, { error });
    const preview = await buildSpogomiConsolidationPreview({ supabase: fixture.supabase, eventId: "event-1" });
    await expect(publishSpogomiConsolidation({ supabase: fixture.supabase, eventId: "event-1", publishedByClerkId: "organizer", expectedSourceHash: preview.projection.sourceHash })).rejects.toThrow(expected);
  });
});
