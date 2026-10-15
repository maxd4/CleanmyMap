import { beforeEach, describe, expect, it, vi } from "vitest";

const authorizationMocks = vi.hoisted(() => ({
  resolveSpogomiEventAccess: vi.fn(),
  hasSpogomiCapability: vi.fn(),
}));
const partnerMocks = vi.hoisted(() => ({
  listPublishedPartnerAnnuaireEntries: vi.fn(),
  loadSpogomiResultsProjection: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("./authorization", () => authorizationMocks);
vi.mock("@/lib/partners/published-annuaire-entries-store", () => partnerMocks);
vi.mock("./results-projection-service", () => ({ loadSpogomiResultsProjection: partnerMocks.loadSpogomiResultsProjection }));

import { loadSpogomiManagementProjection } from "./management-projection";
import { loadSpogomiObserverProjection } from "./observer-projection";
import {
  listPublishedSpogomiPartnerImpacts,
  loadSpogomiOrganizerForAction,
} from "./partner-impact-service";

type Row = Record<string, unknown>;
type Query = Record<string, unknown> & { calls: Record<string, unknown[][]> };

function supabaseFor(tables: Record<string, unknown>, errors: Record<string, Row | null> = {}, counts: Record<string, number> = {}) {
  const queries = new Map<string, Query[]>();
  const from = vi.fn((table: string) => {
    const calls: Record<string, unknown[][]> = {};
    const query: Query = { calls };
    const chain = (method: string) => (...args: unknown[]) => {
      (calls[method] ??= []).push(args);
      return query;
    };
    for (const method of ["select", "eq", "neq", "in", "is", "order", "range"]) query[method] = chain(method);
    const data = tables[table] ?? [];
    const error = errors[table] ?? null;
    query.maybeSingle = vi.fn(async () => ({ data: Array.isArray(data) ? data[0] ?? null : data, error }));
    query.single = vi.fn(async () => ({ data: Array.isArray(data) ? data[0] ?? null : data, error }));
    query.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve({ data, error, count: counts[table] ?? (Array.isArray(data) ? data.length : null) }).then(resolve, reject);
    queries.set(table, [...(queries.get(table) ?? []), query]);
    return query;
  });
  const client = { from, rpc: vi.fn() };
  return { supabase: client as unknown as import("@supabase/supabase-js").SupabaseClient, client, from, queries };
}

const event = {
  id: "event-1", action_id: "action-1", created_by_clerk_id: "owner", name: "SPOGOMI Paris", location_label: "Paris",
  mode: "mixed" as const, team_size_config: {}, creation_state: "event_ready", event_slug: "paris",
  public_visibility: "private" as const, public_results_visibility: "hidden" as const,
  starts_at: "2026-10-12T09:00:00Z", ends_at: null, state: "running", environmental_mapping_version: "v1", updated_at: "now",
};

describe("SPOGOMI management projection", () => {
  it("joins divisions, roster, teams, route, access and category rules and derives ticket eligibility", async () => {
    const fixture = supabaseFor({
      spogomi_divisions: [{ id: "casual", division_type: "casual" }],
      spogomi_participants: [
        { id: "p-1", source_system: "cachan_ticketing", ticket_status: "paid", ticket_deleted: false, registration_status: "registered" },
        { id: "p-2", source_system: "cachan_ticketing", ticket_status: "deleted", ticket_deleted: true, registration_status: "registered" },
      ],
      spogomi_teams: [{ id: "team-1", division_id: "casual", team_number: 1, public_name: "Equipe 1" }],
      spogomi_event_routes: [{ source: "official_reference", file_name: "route.gpx" }],
      spogomi_event_reviewers: [{ role: "observer", revoked_at: null }],
      spogomi_category_rules: [{ division_id: "casual", label: "Plastique", measurement_kind: "mass", unit: "g", is_complete: true }],
    });
    const result = await loadSpogomiManagementProjection({ supabase: fixture.supabase, event, divisionId: "casual" });
    expect(result).toMatchObject({ event, divisions: [{ id: "casual" }], teams: [{ id: "team-1" }], route: { file_name: "route.gpx" } });
    expect(result.participants.map((participant) => participant.composition_eligible)).toEqual([true, false]);
    expect(fixture.queries.get("spogomi_participants")?.[0].calls.eq).toContainEqual(["division_id", "casual"]);
  });

  it("does not hide database failures behind an empty management projection", async () => {
    const fixture = supabaseFor({ spogomi_divisions: [] }, { spogomi_divisions: { message: "division read failed" } });
    await expect(loadSpogomiManagementProjection({ supabase: fixture.supabase, event })).rejects.toMatchObject({ message: "division read failed" });
  });
});

describe("SPOGOMI observer projection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorizationMocks.resolveSpogomiEventAccess.mockResolvedValue({
      event: { id: "event-1", name: "SPOGOMI", event_slug: "paris", mode: "mixed", state: "certified", starts_at: "start", ends_at: null, public_visibility: "published", public_results_visibility: "published" },
    });
    authorizationMocks.hasSpogomiCapability.mockReturnValue(true);
  });

  it("distinguishes missing access from an authenticated user without observe capability", async () => {
    const fixture = supabaseFor({});
    authorizationMocks.resolveSpogomiEventAccess.mockResolvedValueOnce(null);
    await expect(loadSpogomiObserverProjection({ supabase: fixture.supabase, eventId: "event-1", userId: "user" })).resolves.toBeNull();
    authorizationMocks.hasSpogomiCapability.mockReturnValueOnce(false);
    await expect(loadSpogomiObserverProjection({ supabase: fixture.supabase, eventId: "event-1", userId: "user" })).resolves.toBe(false);
    expect(fixture.from).not.toHaveBeenCalled();
  });

  it("uses the highest version once per team and keeps certification division-scoped", async () => {
    const fixture = supabaseFor({
      spogomi_divisions: [{ id: "casual", division_type: "casual", division_key: "casual" }, { id: "world", division_type: "world_cup", division_key: "world_cup" }],
      spogomi_teams: [
        { id: "team-1", division_id: "casual", team_number: 1, public_name: "Casual 1", composition_state: "locked", certified_submission_id: "submission-1" },
        { id: "team-2", division_id: "world", team_number: 1, public_name: "World 1", composition_state: "draft", certified_submission_id: null },
      ],
      spogomi_result_submissions: [
        { team_id: "team-1", status: "certified", version: 2, submitted_at: "new" },
        { team_id: "team-1", status: "submitted", version: 1, submitted_at: "old" },
      ],
      spogomi_participants: [],
    }, {}, { spogomi_participants: 3 });
    const result = await loadSpogomiObserverProjection({ supabase: fixture.supabase, eventId: "event-1", userId: "observer" });
    expect(result).toMatchObject({ participation: { registered: 3, present: 3 }, divisions: [{ divisionType: "casual" }, { divisionType: "world_cup" }] });
    expect(result && "teams" in result ? result.teams : []).toEqual([
      expect.objectContaining({ id: "team-1", submissionStatus: "certified", submissionVersion: 2, certified: true }),
      expect.objectContaining({ id: "team-2", submissionStatus: null, submissionVersion: null, certified: false }),
    ]);
  });

  it("surfaces exact-count and division query errors", async () => {
    const failed = supabaseFor({ spogomi_divisions: [], spogomi_teams: [], spogomi_result_submissions: [], spogomi_participants: [] }, { spogomi_divisions: { message: "division read failed" } });
    await expect(loadSpogomiObserverProjection({ supabase: failed.supabase, eventId: "event-1", userId: "observer" })).rejects.toThrow("division read failed");
  });
});

describe("SPOGOMI partner impact service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    partnerMocks.listPublishedPartnerAnnuaireEntries.mockResolvedValue([
      { id: "partner-1", organizerDirectoryId: "org-1", websiteUrl: "https://example.test", publicationStatus: "accepted", verificationStatus: "verifie" },
    ]);
    partnerMocks.loadSpogomiResultsProjection.mockResolvedValue({ results: { environmental: {
      status: "available", totalWasteMassGrams: 10_000, cigaretteButtsMassGrams: 2_000, cigaretteButtsCount: 100,
      participantsPresent: 2, projectionVersion: "v1", sourceHash: "source-1",
    } } });
  });

  it("returns no organizer when the action is missing, then resolves only verified canonical partner data", async () => {
    const noOrganizer = supabaseFor({ actions: null });
    await expect(loadSpogomiOrganizerForAction({ supabase: noOrganizer.supabase, actionId: "action-1", eventTerritory: "Paris" })).resolves.toBeNull();
    const fixture = supabaseFor({ actions: { id: "action-1", organizer_id: "org-1", organizer_name: "Organizer", status: "approved", published_at: "now", moderation_visibility: "visible" } });
    await expect(loadSpogomiOrganizerForAction({ supabase: fixture.supabase, actionId: "action-1", eventTerritory: "Paris" })).resolves.toMatchObject({ organizerId: "org-1", officialSiteUrl: "https://example.test", partnerEntryId: "partner-1" });
  });

  it("filters unpublished/cancelled/non-owned actions and preserves uncertainty for incomplete identities", async () => {
    const fixture = supabaseFor({
      spogomi_events: [{ id: "event-1", event_slug: "edition-1", name: "Edition 1", location_label: "Paris", mode: "casual", state: "certified", starts_at: "2026-01-01T10:00:00Z", action_id: "action-1" }],
      actions: [{ id: "action-1", organizer_id: "org-1", organizer_name: "Organizer", status: "approved", published_at: "now", moderation_visibility: "visible" }],
      spogomi_participants: [
        { event_id: "event-1", clerk_id: "user-1", account_link_status: "verified", registration_status: "registered", attendance_status: "present" },
        { event_id: "event-1", clerk_id: null, account_link_status: "unverified", registration_status: "registered", attendance_status: "present" },
      ],
      spogomi_recognition_attestations: [
        { id: "mission-1", event_id: "event-1", kind: "organizer", status: "certified", evidence_reference: "evidence" },
        { id: "mission-2", event_id: "event-1", kind: "volunteer", status: "certified", evidence_reference: " " },
      ],
    });
    const result = await listPublishedSpogomiPartnerImpacts({ supabase: fixture.supabase });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ publishedEditionCount: 1, identifiedUniqueVolunteers: null, uniqueVolunteerStatus: "unavailable" });
    expect(result[0].provenance[0]).toMatchObject({ projectionVersion: "v1", sourceHash: "source-1" });
  });

  it("does not manufacture impacts when no published event points to an action", async () => {
    const fixture = supabaseFor({ spogomi_events: [] });
    await expect(listPublishedSpogomiPartnerImpacts({ supabase: fixture.supabase })).resolves.toEqual([]);
  });
});
