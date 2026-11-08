import { beforeEach, describe, expect, it, vi } from "vitest";

const eventAccessMock = vi.hoisted(() => vi.fn());
const organizerEventMock = vi.hoisted(() => vi.fn());
const teamSessionMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("../authorization", () => ({ resolveSpogomiEventAccess: eventAccessMock }));
vi.mock("../preparation/preparation-service", () => ({ loadSpogomiEventForOrganizer: organizerEventMock }));
vi.mock("../team-access", () => ({ loadSpogomiTeamSession: teamSessionMock }));

import {
  assignSpogomiCheckin,
  assignSpogomiEventAccess,
  assignSpogomiObserver,
  assignSpogomiReferee,
  loadSpogomiEventResultReviews,
  loadSpogomiTeamResultForm,
  resolveSpogomiReviewerRole,
  reviewSpogomiTeamSubmission,
  saveSpogomiTeamSubmission,
  revokeSpogomiEventAccess,
  revokeSpogomiObserver,
} from "./result-service";

function supabaseFor(tables: Record<string, unknown>, rpcResult: { data?: unknown; error?: { code?: string; message?: string } | null } = {}, options: { filterRows?: boolean } = {}) {
  const from = vi.fn((table: string) => {
    const query: Record<string, unknown> = {};
    const data = tables[table] ?? [];
    const filters: Array<[string, unknown]> = [];
    const resolvedData = () => options.filterRows && Array.isArray(data)
      ? data.filter((row) => filters.every(([column, value]) => (row as Record<string, unknown>)[column] === value))
      : data;
    query.select = vi.fn(() => query);
    query.eq = vi.fn((column: string, value: unknown) => { if (options.filterRows) filters.push([column, value]); return query; });
    for (const method of ["in", "is", "order", "range", "limit"]) query[method] = vi.fn(() => query);
    query.maybeSingle = vi.fn(async () => { const rows = resolvedData(); return { data: Array.isArray(rows) ? rows[0] ?? null : rows, error: null }; });
    query.single = vi.fn(async () => { const rows = resolvedData(); return { data: Array.isArray(rows) ? rows[0] ?? null : rows, error: null }; });
    query.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => { const rows = resolvedData(); return Promise.resolve({ data: rows, error: null, count: Array.isArray(rows) ? rows.length : null }).then(resolve, reject); };
    return query;
  });
  const client = { from, rpc: vi.fn(async () => rpcResult) };
  return { supabase: client as unknown as import("@supabase/supabase-js").SupabaseClient, client, from };
}

const event = {
  id: "event-1", name: "SPOGOMI", event_slug: "edition", mode: "casual", state: "certified",
  regulation_version: "v1", regulation_status: "complete", regulation_source_reference: "rulebook",
  regulation_config: {}, team_size_config: {},
};

describe("SPOGOMI reviewer and event access boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    organizerEventMock.mockResolvedValue(event);
    eventAccessMock.mockResolvedValue({ role: "organizer", reviewerRoles: [] });
  });

  it("resolves organizer, referee and fail-closed reviewer roles", async () => {
    const fixture = supabaseFor({});
    await expect(resolveSpogomiReviewerRole({ supabase: fixture.supabase, eventId: "event-1", userId: "owner" })).resolves.toBe("organizer");
    eventAccessMock.mockResolvedValueOnce({ role: "observer", reviewerRoles: ["referee"] });
    await expect(resolveSpogomiReviewerRole({ supabase: fixture.supabase, eventId: "event-1", userId: "referee" })).resolves.toBe("referee");
    eventAccessMock.mockResolvedValueOnce({ role: "observer", reviewerRoles: [] });
    await expect(resolveSpogomiReviewerRole({ supabase: fixture.supabase, eventId: "event-1", userId: "observer" })).resolves.toBe(false);
    eventAccessMock.mockResolvedValueOnce(null);
    await expect(resolveSpogomiReviewerRole({ supabase: fixture.supabase, eventId: "event-1", userId: "unknown" })).resolves.toBe(false);
  });

  it("assigns and revokes every event-scoped role with trimmed subjects and explicit operation", async () => {
    const fixture = supabaseFor({}, { data: { applied: true }, error: null });
    await expect(assignSpogomiEventAccess({ supabase: fixture.supabase, eventId: "event-1", clerkId: " observer ", role: "observer", assignedByClerkId: "owner" })).resolves.toEqual({ applied: true });
    await expect(assignSpogomiReferee({ supabase: fixture.supabase, eventId: "event-1", clerkId: "referee", assignedByClerkId: "owner" })).resolves.toEqual({ applied: true });
    await expect(assignSpogomiObserver({ supabase: fixture.supabase, eventId: "event-1", clerkId: "observer", assignedByClerkId: "owner" })).resolves.toEqual({ applied: true });
    await expect(assignSpogomiCheckin({ supabase: fixture.supabase, eventId: "event-1", clerkId: "checkin", assignedByClerkId: "owner" })).resolves.toEqual({ applied: true });
    await expect(revokeSpogomiObserver({ supabase: fixture.supabase, eventId: "event-1", clerkId: "observer", assignedByClerkId: "owner" })).resolves.toBeUndefined();
    expect(fixture.supabase.rpc).toHaveBeenLastCalledWith("spogomi_set_event_access", expect.objectContaining({ p_operation: "revoke", p_access_role: "observer" }));
  });

  it("refuses missing or unauthorized assignment and surfaces RPC errors", async () => {
    const fixture = supabaseFor({}, { error: { code: "42501", message: "denied" } });
    organizerEventMock.mockResolvedValueOnce(false);
    await expect(assignSpogomiEventAccess({ supabase: fixture.supabase, eventId: "e", clerkId: "u", role: "observer", assignedByClerkId: "intruder" })).rejects.toThrow("forbidden");
    organizerEventMock.mockResolvedValueOnce(null);
    await expect(assignSpogomiEventAccess({ supabase: fixture.supabase, eventId: "e", clerkId: "u", role: "observer", assignedByClerkId: "owner" })).rejects.toThrow("not found");
    organizerEventMock.mockResolvedValue(event);
    await expect(assignSpogomiEventAccess({ supabase: fixture.supabase, eventId: "e", clerkId: "u", role: "observer", assignedByClerkId: "owner" })).rejects.toMatchObject({ code: "42501" });
    organizerEventMock.mockResolvedValueOnce(false);
    await expect(revokeSpogomiEventAccess({ supabase: fixture.supabase, eventId: "e", clerkId: "u", role: "observer", assignedByClerkId: "intruder" })).rejects.toThrow("forbidden");
  });
});

describe("SPOGOMI result review service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventAccessMock.mockResolvedValue({ role: "observer", reviewerRoles: ["referee"] });
    teamSessionMock.mockResolvedValue(null);
  });

  it("returns explicit access and not-found states before reading review sources", async () => {
    const fixture = supabaseFor({});
    eventAccessMock.mockResolvedValueOnce({ role: "observer", reviewerRoles: [] });
    await expect(loadSpogomiEventResultReviews({ supabase: fixture.supabase, eventId: "event-1", userId: "observer" })).resolves.toBe(false);
    eventAccessMock.mockResolvedValueOnce(null);
    await expect(loadSpogomiEventResultReviews({ supabase: fixture.supabase, eventId: "event-1", userId: "observer" })).resolves.toBe(false);
    eventAccessMock.mockResolvedValue({ role: "organizer", reviewerRoles: [] });
    const missing = supabaseFor({ spogomi_events: [] });
    await expect(loadSpogomiEventResultReviews({ supabase: missing.supabase, eventId: "event-1", userId: "owner" })).resolves.toBeNull();
  });

  it("returns one review row per team, chooses the latest submission and counts only registered present members", async () => {
    eventAccessMock.mockResolvedValue({ role: "organizer", reviewerRoles: [] });
    const fixture = supabaseFor({
      spogomi_events: [event],
      spogomi_teams: [{ id: "team-1", division_id: "casual", team_number: 1, public_name: "Equipe 1" }, { id: "team-2", division_id: "casual", team_number: 2, public_name: "Equipe 2" }],
      spogomi_category_rules: [],
      spogomi_result_submissions: [
        { id: "submission-new", team_id: "team-1", version: 2, status: "submitted", submitted_at: "new" },
        { id: "submission-old", team_id: "team-1", version: 1, status: "draft", submitted_at: "old" },
      ],
      spogomi_result_items: [],
      spogomi_participants: [
        { team_id: "team-1", registration_status: "registered", attendance_status: "present" },
        { team_id: "team-1", registration_status: "withdrawn", attendance_status: "present" },
      ],
    });
    const result = await loadSpogomiEventResultReviews({ supabase: fixture.supabase, eventId: "event-1", userId: "owner" });
    expect(result).toEqual([
      expect.objectContaining({ teamId: "team-1", latestSubmission: expect.objectContaining({ id: "submission-new", version: 2 }), score: expect.any(Object) }),
      expect.objectContaining({ teamId: "team-2", latestSubmission: null, score: null }),
    ]);
  });

  it("uses the persisted division mapping to make an otherwise complete arbitration score available", async () => {
    eventAccessMock.mockResolvedValue({ role: "organizer", reviewerRoles: [] });
    const completeConfig = {
      rounding: { decimals: 0, mode: "half_up" },
      eligibility: { minimumPresentParticipants: null, requiresAllCategories: true },
      tiebreakers: ["sporting_score"], penalties: [],
    };
    const fixture = supabaseFor({
      spogomi_events: [{ ...event, mode: "mixed" }],
      spogomi_divisions: [{ id: "casual", event_id: "event-1", division_type: "casual", regulation_version: "v1", regulation_status: "complete", regulation_source_reference: "synthetic-rulebook", regulation_config: completeConfig, team_size_config: { casual: { minMembers: 1, maxMembers: 5 } } }],
      spogomi_teams: [{ id: "team-1", event_id: "event-1", division_id: "casual", team_number: 1, public_name: "Casual 1" }],
      spogomi_category_rules: [{ id: "category-1", event_id: "event-1", division_id: "casual", regulation_version: "v1", code: "plastic", label: "Plastique", measurement_kind: "mass", unit: "g", coefficient: 2, coefficient_status: "confirmed", environmental_category_slug: "plastic", display_order: 1, is_complete: true }],
      spogomi_environment_category_mappings: [{ id: "mapping-casual", event_id: "event-1", division_id: "casual", category_rule_id: "category-1", mapping_version: "v1", category_code: "plastic", environmental_category_slug: "plastic", source_field: "mass_grams", source_unit: "g", target_unit: "grams", unit_factor_to_target: 1, counts_toward_total: true, is_megots: false, mapping_status: "mapped", exclusion_reason: null }],
      spogomi_result_submissions: [{ id: "submission-1", event_id: "event-1", division_id: "casual", team_id: "team-1", version: 1, status: "certified", submitted_at: "2026-11-08T10:00:00Z" }],
      spogomi_result_items: [{ id: "item-1", event_id: "event-1", division_id: "casual", submission_id: "submission-1", category_rule_id: "category-1", measurement_kind: "mass", unit: "g", quantity: 12, mass_grams: 12, object_count: null, measurement_method: "balance", provenance: "synthetic fixture", arbitration_comment: null }],
      spogomi_participants: [{ id: "participant-1", event_id: "event-1", division_id: "casual", team_id: "team-1", registration_status: "registered", attendance_status: "present" }],
    }, {}, { filterRows: true });

    const result = await loadSpogomiEventResultReviews({ supabase: fixture.supabase, eventId: "event-1", userId: "owner", divisionId: "casual" });

    expect(result).toEqual([expect.objectContaining({ teamId: "team-1", score: expect.objectContaining({ scoreStatus: "official", officialScore: 24 }) })]);
  });

  it.each([
    ["missing", []],
    ["incomplete", [{ id: "mapping-casual", event_id: "event-1", division_id: "casual", category_rule_id: "category-1", mapping_version: "v1", category_code: "plastic", environmental_category_slug: "plastic", source_field: null, source_unit: "g", target_unit: null, unit_factor_to_target: null, counts_toward_total: true, is_megots: false, mapping_status: "unmapped", exclusion_reason: "À compléter" }]],
    ["incoherent", [{ id: "mapping-casual", event_id: "event-1", division_id: "casual", category_rule_id: "category-1", mapping_version: "v1", category_code: "other", environmental_category_slug: "plastic", source_field: "mass_grams", source_unit: "g", target_unit: "grams", unit_factor_to_target: 1, counts_toward_total: true, is_megots: false, mapping_status: "mapped", exclusion_reason: null }]],
  ] as const)("keeps the arbitration score unavailable when the persisted mapping is %s", async (_state, mappings) => {
    eventAccessMock.mockResolvedValue({ role: "organizer", reviewerRoles: [] });
    const config = { rounding: { decimals: 0, mode: "half_up" }, eligibility: { minimumPresentParticipants: null, requiresAllCategories: true }, tiebreakers: ["sporting_score"], penalties: [] };
    const fixture = supabaseFor({
      spogomi_events: [event],
      spogomi_divisions: [{ id: "casual", event_id: "event-1", division_type: "casual", regulation_version: "v1", regulation_status: "complete", regulation_source_reference: "synthetic-rulebook", regulation_config: config, team_size_config: { casual: { minMembers: 1, maxMembers: 5 } } }],
      spogomi_teams: [{ id: "team-1", event_id: "event-1", division_id: "casual", team_number: 1, public_name: "Casual 1" }],
      spogomi_category_rules: [{ id: "category-1", event_id: "event-1", division_id: "casual", regulation_version: "v1", code: "plastic", label: "Plastique", measurement_kind: "mass", unit: "g", coefficient: 2, coefficient_status: "confirmed", environmental_category_slug: "plastic", display_order: 1, is_complete: true }],
      spogomi_environment_category_mappings: mappings,
      spogomi_result_submissions: [{ id: "submission-1", event_id: "event-1", division_id: "casual", team_id: "team-1", version: 1, status: "certified", submitted_at: "2026-11-08T10:00:00Z" }],
      spogomi_result_items: [{ id: "item-1", event_id: "event-1", division_id: "casual", submission_id: "submission-1", category_rule_id: "category-1", measurement_kind: "mass", unit: "g", quantity: 12, mass_grams: 12, object_count: null, measurement_method: "balance", provenance: "synthetic fixture", arbitration_comment: null }],
      spogomi_participants: [{ id: "participant-1", event_id: "event-1", division_id: "casual", team_id: "team-1", registration_status: "registered", attendance_status: "present" }],
    }, {}, { filterRows: true });

    const result = await loadSpogomiEventResultReviews({ supabase: fixture.supabase, eventId: "event-1", userId: "owner", divisionId: "casual" });

    expect(result).toEqual([expect.objectContaining({ score: expect.objectContaining({ scoreStatus: "unavailable", officialScore: null, ineligibleReason: "regulation_incomplete" }) })]);
  });

  it("keeps Casual and World Cup mappings isolated when their regulations share category codes", async () => {
    eventAccessMock.mockResolvedValue({ role: "organizer", reviewerRoles: [] });
    const config = { rounding: { decimals: 0, mode: "half_up" }, eligibility: { minimumPresentParticipants: null, requiresAllCategories: true }, tiebreakers: ["sporting_score"], penalties: [] };
    const common = {
      spogomi_events: [{ ...event, mode: "mixed" }],
      spogomi_divisions: [
        { id: "casual", event_id: "event-1", division_type: "casual", regulation_version: "casual-v1", regulation_status: "complete", regulation_source_reference: "casual-source", regulation_config: config, team_size_config: { casual: { minMembers: 1, maxMembers: 5 } } },
        { id: "world", event_id: "event-1", division_type: "world_cup", regulation_version: "world-v1", regulation_status: "complete", regulation_source_reference: "world-source", regulation_config: config, team_size_config: { casual: { minMembers: null, maxMembers: null } } },
      ],
      spogomi_teams: [
        { id: "casual-team", event_id: "event-1", division_id: "casual", team_number: 1, public_name: "Casual" },
        { id: "world-team", event_id: "event-1", division_id: "world", team_number: 1, public_name: "World" },
      ],
      spogomi_category_rules: [
        { id: "casual-category", event_id: "event-1", division_id: "casual", regulation_version: "casual-v1", code: "mass", label: "Masse", measurement_kind: "mass", unit: "g", coefficient: 2, coefficient_status: "confirmed", environmental_category_slug: "plastic", display_order: 1, is_complete: true },
        { id: "world-category", event_id: "event-1", division_id: "world", regulation_version: "world-v1", code: "mass", label: "Masse", measurement_kind: "mass", unit: "g", coefficient: 5, coefficient_status: "confirmed", environmental_category_slug: "plastic", display_order: 1, is_complete: true },
      ],
      spogomi_environment_category_mappings: [
        { id: "casual-mapping", event_id: "event-1", division_id: "casual", category_rule_id: "casual-category", mapping_version: "casual-v1", category_code: "mass", environmental_category_slug: "plastic", source_field: "mass_grams", source_unit: "g", target_unit: "grams", unit_factor_to_target: 1, counts_toward_total: true, is_megots: false, mapping_status: "mapped", exclusion_reason: null },
        { id: "world-mapping", event_id: "event-1", division_id: "world", category_rule_id: "world-category", mapping_version: "world-v1", category_code: "mass", environmental_category_slug: "plastic", source_field: "mass_grams", source_unit: "g", target_unit: "grams", unit_factor_to_target: 1, counts_toward_total: true, is_megots: false, mapping_status: "mapped", exclusion_reason: null },
      ],
      spogomi_result_submissions: [
        { id: "casual-submission", event_id: "event-1", division_id: "casual", team_id: "casual-team", version: 1, status: "certified", submitted_at: "2026-11-08T10:00:00Z" },
        { id: "world-submission", event_id: "event-1", division_id: "world", team_id: "world-team", version: 1, status: "certified", submitted_at: "2026-11-08T10:00:00Z" },
      ],
      spogomi_result_items: [
        { id: "casual-item", event_id: "event-1", division_id: "casual", submission_id: "casual-submission", category_rule_id: "casual-category", measurement_kind: "mass", unit: "g", quantity: 10, mass_grams: 10, object_count: null, measurement_method: "balance", provenance: "fixture", arbitration_comment: null },
        { id: "world-item", event_id: "event-1", division_id: "world", submission_id: "world-submission", category_rule_id: "world-category", measurement_kind: "mass", unit: "g", quantity: 10, mass_grams: 10, object_count: null, measurement_method: "balance", provenance: "fixture", arbitration_comment: null },
      ],
      spogomi_participants: [
        { id: "casual-participant", event_id: "event-1", division_id: "casual", team_id: "casual-team", registration_status: "registered", attendance_status: "present" },
        { id: "world-participant", event_id: "event-1", division_id: "world", team_id: "world-team", registration_status: "registered", attendance_status: "present" },
      ],
    };

    const casual = await loadSpogomiEventResultReviews({ supabase: supabaseFor(common, {}, { filterRows: true }).supabase, eventId: "event-1", userId: "owner", divisionId: "casual" });
    const world = await loadSpogomiEventResultReviews({ supabase: supabaseFor(common, {}, { filterRows: true }).supabase, eventId: "event-1", userId: "owner", divisionId: "world" });

    expect(casual).toEqual([expect.objectContaining({ teamId: "casual-team", score: expect.objectContaining({ officialScore: 20 }) })]);
    expect(world).toEqual([expect.objectContaining({ teamId: "world-team", score: expect.objectContaining({ officialScore: 50 }) })]);
  });

  it("rejects self-certification and actor-role mismatches, then sends a division-scoped review RPC", async () => {
    const base = { eventId: "event-1", teamId: "team-1", submissionId: "submission-1", reviewerClerkId: "referee", decision: "certified" as const, reason: "ok", actorKind: "referee" as const };
    const self = supabaseFor({ spogomi_participants: [{ id: "member" }] });
    await expect(reviewSpogomiTeamSubmission({ ...base, supabase: self.supabase })).rejects.toThrow("self-certification");
    eventAccessMock.mockResolvedValueOnce({ role: "organizer", reviewerRoles: [] });
    await expect(reviewSpogomiTeamSubmission({ ...base, supabase: self.supabase })).rejects.toThrow("review is forbidden");

    eventAccessMock.mockResolvedValue({ role: "observer", reviewerRoles: ["referee"] });
    const fixture = supabaseFor({ spogomi_participants: [], spogomi_teams: [{ division_id: "world" }] }, { data: { status: "certified" }, error: null });
    await expect(reviewSpogomiTeamSubmission({ ...base, supabase: fixture.supabase })).resolves.toEqual({ status: "certified" });
    expect(fixture.supabase.rpc).toHaveBeenCalledWith("spogomi_review_team_submission_for_division", expect.objectContaining({ p_division_id: "world", p_actor_kind: "referee" }));

    const conflict = supabaseFor({ spogomi_participants: [], spogomi_teams: [{ division_id: "world" }] }, { error: { code: "40001", message: "stale" } });
    await expect(reviewSpogomiTeamSubmission({ ...base, supabase: conflict.supabase })).rejects.toThrow("Conflict: la décision");
  });

  it("loads a division-scoped team form with the latest items and certification readiness", async () => {
    teamSessionMock.mockResolvedValue({ eventId: "event-1", divisionId: "casual", teamId: "team-1" });
    const completeEvent = {
      ...event,
      regulation_config: {
        rounding: { decimals: 0, mode: "half_up" },
        eligibility: { minimumPresentParticipants: null, requiresAllCategories: true },
        tiebreakers: ["sporting_score"], penalties: [],
      },
      team_size_config: { casual: { minMembers: 1, maxMembers: 5 } },
    };
    const category = { id: "category-1", event_id: "event-1", division_id: "casual", regulation_version: "v1", code: "plastic", label: "Plastique", measurement_kind: "mass", unit: "g", coefficient: 1, coefficient_status: "confirmed", environmental_category_slug: "plastic", display_order: 1, is_complete: true };
    const fixture = supabaseFor({
      spogomi_events: [completeEvent],
      spogomi_divisions: [{ id: "casual", division_type: "casual", regulation_version: "v1", regulation_status: "complete", regulation_source_reference: "rulebook", regulation_config: completeEvent.regulation_config, team_size_config: completeEvent.team_size_config }],
      spogomi_teams: [{ id: "team-1", division_id: "casual", team_number: 1, public_name: "Equipe 1" }],
      spogomi_category_rules: [category],
      spogomi_environment_category_mappings: [{ id: "mapping-1", event_id: "event-1", division_id: "casual", category_rule_id: "category-1", mapping_version: "v1", category_code: "plastic", environmental_category_slug: "plastic", source_field: "mass_grams", source_unit: "g", target_unit: "grams", unit_factor_to_target: 1, counts_toward_total: true, is_megots: false, mapping_status: "mapped", exclusion_reason: null }],
      spogomi_result_submissions: [{ id: "submission-1", division_id: "casual", version: 2, status: "submitted", correction_reason: null }],
      spogomi_result_items: [{ category_rule_id: "category-1", quantity: null, mass_grams: 12, object_count: null, measurement_method: "balance", provenance: "photo", arbitration_comment: null }],
      spogomi_participants: [{}],
    });
    const form = await loadSpogomiTeamResultForm({ supabase: fixture.supabase, sessionToken: "opaque-session" });
    expect(form).toMatchObject({ team: { id: "team-1", teamNumber: 1 }, divisionId: "casual", presentParticipants: 1, officialScoreAvailable: true, latestSubmission: { id: "submission-1", version: 2, items: [{ category_rule_id: "category-1" }] } });
  });

  it("saves a draft through the division RPC and blocks incomplete submitted corrections", async () => {
    teamSessionMock.mockResolvedValue({ eventId: "event-1", divisionId: "casual", teamId: "team-1" });
    const completeEvent = { ...event, regulation_config: { eligibility: { minimumPresentParticipants: null, requiresAllCategories: true } }, team_size_config: { casual: { minMembers: 1, maxMembers: 5 } } };
    const category = { id: "category-1", event_id: "event-1", division_id: "casual", regulation_version: "v1", code: "plastic", label: "Plastique", measurement_kind: "mass", unit: "g", coefficient: 1, coefficient_status: "confirmed", environmental_category_slug: "plastic", display_order: 1, is_complete: true };
    const fixture = supabaseFor({
      spogomi_events: [completeEvent], spogomi_category_rules: [category], spogomi_result_submissions: [],
      spogomi_divisions: [{ division_type: "casual", regulation_version: "v1", regulation_status: "complete", regulation_source_reference: "rulebook", regulation_config: completeEvent.regulation_config, team_size_config: completeEvent.team_size_config }],
    }, { data: { saved: true }, error: null });
    const item = { categoryRuleId: "category-1", measurementKind: "mass" as const, unit: "g", quantity: null, massGrams: 12, objectCount: null, measurementMethod: "balance", provenance: "photo", arbitrationComment: null };
    await expect(saveSpogomiTeamSubmission({ supabase: fixture.supabase, sessionToken: "session", input: { submissionId: null, idempotencyKey: "key-1", status: "draft", correctionReason: null, items: [item] } })).resolves.toEqual({ saved: true });
    expect(fixture.supabase.rpc).toHaveBeenCalledWith("spogomi_save_team_submission_for_division", expect.objectContaining({ p_division_id: "casual", p_team_id: "team-1", p_idempotency_key: "key-1" }));

    await expect(saveSpogomiTeamSubmission({ supabase: fixture.supabase, sessionToken: "session", input: { submissionId: null, idempotencyKey: "key-2", status: "submitted", correctionReason: null, items: [{ ...item, measurementMethod: null }] } })).rejects.toThrow("every category");
  });
});
