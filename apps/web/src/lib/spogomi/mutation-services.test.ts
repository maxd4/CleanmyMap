import { beforeEach, describe, expect, it, vi } from "vitest";

const authorizationMocks = vi.hoisted(() => ({
  resolveSpogomiEventAccess: vi.fn(),
  hasSpogomiCapability: vi.fn(),
}));
const identityMocks = vi.hoisted(() => ({ getCurrentUserIdentity: vi.fn() }));
const eventAccessMocks = vi.hoisted(() => ({
  canManageEvent: vi.fn(),
  loadSpogomiEventForOrganizer: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("./authorization", () => authorizationMocks);
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: identityMocks.getCurrentUserIdentity }));
vi.mock("./preparation-event-access", () => eventAccessMocks);

import {
  loadSpogomiAttendanceProjection,
  setSpogomiAttendanceStatus,
} from "./attendance-service";
import {
  lockSpogomiTeams,
  moveParticipantToTeam,
  SpogomiCompositionProtectionError,
} from "./composition-mutation-service";
import {
  assertSpogomiFieldCapability,
  callSpogomiFieldOperation,
  loadSpogomiFieldOperationsAccess,
  loadSpogomiFieldOperationsDashboard,
  setSpogomiOperationalAccess,
  spogomiFieldCapabilitiesForRoles,
} from "./field-operations-service";

type Row = Record<string, unknown>;

type Query = Record<string, unknown> & {
  calls: Record<string, unknown[][]>;
};

function queryFor(data: unknown, error: Row | null = null): Query {
  const calls: Record<string, unknown[][]> = {};
  const query: Query = { calls };
  const chain = (name: string) => (...args: unknown[]) => {
    (calls[name] ??= []).push(args);
    return query;
  };
  for (const method of ["select", "eq", "neq", "in", "is", "or", "order", "range", "limit", "insert", "update", "upsert"]) {
    query[method] = chain(method);
  }
  const result = () => ({ data, error, count: Array.isArray(data) ? data.length : null });
  query.maybeSingle = vi.fn(async () => ({ ...result(), data: Array.isArray(data) ? data[0] ?? null : data }));
  query.single = vi.fn(async () => ({ ...result(), data: Array.isArray(data) ? data[0] ?? null : data }));
  query.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(result()).then(resolve, reject);
  return query;
}

function supabaseFor(tables: Record<string, unknown>, rpcResult: { data?: unknown; error?: Row | null } = {}) {
  const queries = new Map<string, Query[]>();
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => ({
    data: rpcResult.data ?? { name, args },
    error: rpcResult.error ?? null,
  }));
  const supabase = {
    from: vi.fn((table: string) => {
      const query = queryFor(tables[table] ?? []);
      queries.set(table, [...(queries.get(table) ?? []), query]);
      return query;
    }),
    rpc,
  };
  return { supabase: supabase as unknown as import("@supabase/supabase-js").SupabaseClient, client: supabase, rpc, queries };
}

describe("SPOGOMI attendance and mutation services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorizationMocks.resolveSpogomiEventAccess.mockResolvedValue({ role: "checkin" });
    authorizationMocks.hasSpogomiCapability.mockReturnValue(true);
  });

  it("fails closed before reading a private roster without check-in capability", async () => {
    authorizationMocks.resolveSpogomiEventAccess.mockResolvedValue(null);
    const fixture = supabaseFor({});

    await expect(loadSpogomiAttendanceProjection({ supabase: fixture.supabase, eventId: "event-1", userId: "user-1" })).resolves.toBe(false);
    expect(fixture.supabase.from).not.toHaveBeenCalled();
  });

  it("normalizes division, numeric/name search and pagination while preserving team identity", async () => {
    const fixture = supabaseFor({
      spogomi_teams: [
        { id: "team-1", division_id: "casual", team_number: 7, public_name: "Les Éclaireurs" },
        { id: "team-2", division_id: "world", team_number: 8, public_name: "World" },
      ],
      spogomi_participants: [{
        id: "participant-1", division_id: "casual", display_name: "Ana", external_reference: "bib-7",
        source_row_number: 7, team_id: "team-1", attendance_status: "present", registration_status: "registered", updated_at: "now",
      }],
    });

    const result = await loadSpogomiAttendanceProjection({
      supabase: fixture.supabase,
      eventId: "event-1",
      userId: "user-1",
      divisionId: "casual",
      search: "  Les (Éclaireurs),  " + "x".repeat(100),
      page: -4,
      pageSize: 1000,
    });

    expect(result).toMatchObject({ eventId: "event-1", divisionId: "casual", page: 0, pageSize: 100, total: 1 });
    expect(result && "participants" in result ? result.participants : []).toEqual([expect.objectContaining({
      id: "participant-1", place: 7, team: { id: "team-1", number: 7, publicName: "Les Éclaireurs" },
    })]);
    const participantQuery = fixture.queries.get("spogomi_participants")?.[0];
    expect(participantQuery?.calls.or?.[0]?.[0]).toContain("display_name.ilike");
    expect(participantQuery?.calls.range?.[0]).toEqual([0, 99]);
  });

  it("uses a numeric team search and propagates RPC attendance provenance and optimistic version", async () => {
    const fixture = supabaseFor({ spogomi_teams: [], spogomi_participants: [] }, { data: { accepted: true } });
    await loadSpogomiAttendanceProjection({ supabase: fixture.supabase, eventId: "event-1", userId: "user-1", search: "12" });
    const participantQuery = fixture.queries.get("spogomi_participants")?.[0];
    expect(participantQuery?.calls.eq).toContainEqual(["source_row_number", 12]);

    await expect(setSpogomiAttendanceStatus({
      supabase: fixture.supabase,
      eventId: "event-1", divisionId: "world", participantId: "participant-1", status: "absent",
      actorClerkId: "checkin-1", reason: "  arrivée tardive  ", provenance: "  feuille papier  ", expectedUpdatedAt: "version-1",
    })).resolves.toEqual({ accepted: true });
    expect(fixture.rpc).toHaveBeenCalledWith("spogomi_set_attendance_status", expect.objectContaining({
      p_next_status: "absent", p_reason: "arrivée tardive", p_provenance: "feuille papier", p_expected_updated_at: "version-1",
    }));
  });

  it("surfaces read and write database errors instead of returning partial private data", async () => {
    const readFixture = supabaseFor({ spogomi_teams: [] });
    const teamQuery = readFixture.queries.get("spogomi_teams")?.[0];
    void teamQuery;
    readFixture.client.from = vi.fn(() => queryFor([], { message: "teams unavailable" }));
    await expect(loadSpogomiAttendanceProjection({ supabase: readFixture.supabase, eventId: "event-1", userId: "user-1" })).rejects.toMatchObject({ message: "teams unavailable" });

    const writeFixture = supabaseFor({}, { error: { code: "40001", message: "stale attendance" } });
    await expect(setSpogomiAttendanceStatus({ supabase: writeFixture.supabase, eventId: "e", divisionId: "d", participantId: "p", status: "present", actorClerkId: "a", reason: "r", provenance: "p" })).rejects.toMatchObject({ code: "40001" });
  });
});

describe("SPOGOMI composition RPC boundaries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the division-scoped lock and the legacy parent lock only when no division is supplied", async () => {
    const fixture = supabaseFor({}, { data: { revision: 3 } });
    await lockSpogomiTeams(fixture.supabase, { id: "event-1", composition_revision: 2 }, "organizer", 3, "world-cup");
    expect(fixture.rpc).toHaveBeenCalledWith("spogomi_lock_team_composition_for_division", expect.objectContaining({ p_division_id: "world-cup", p_expected_revision: 3 }));

    await lockSpogomiTeams(fixture.supabase, { id: "event-1" }, "organizer");
    expect(fixture.rpc).toHaveBeenLastCalledWith("spogomi_lock_team_composition", expect.objectContaining({ p_expected_revision: 0 }));
  });

  it("propagates explicit division and default revision on participant moves", async () => {
    const fixture = supabaseFor({}, { data: { moved: true } });
    await moveParticipantToTeam({ supabase: fixture.supabase, event: { id: "event-1", composition_revision: 4 }, participantId: "p", teamId: null, actorClerkId: "a", divisionId: "casual" });
    expect(fixture.rpc).toHaveBeenCalledWith("spogomi_move_participant_to_team_for_division", expect.objectContaining({ p_division_id: "casual", p_team_id: null, p_expected_revision: 4 }));
    await moveParticipantToTeam({ supabase: fixture.supabase, event: { id: "event-1" }, participantId: "p", teamId: "team", actorClerkId: "a", expectedRevision: 8 });
    expect(fixture.rpc).toHaveBeenLastCalledWith("spogomi_move_participant_to_team", expect.objectContaining({ p_team_id: "team", p_expected_revision: 8 }));
  });

  it.each([
    [{ code: "40001", message: "serialization failure" }, /Conflict:/],
    [{ code: "42501", message: "explicit audited correction required" }, SpogomiCompositionProtectionError],
    [{ code: "42501", message: "preparation direct SPOGOMI team changes" }, /déplacements ordinaires/],
    [{ code: "23514", message: "team size" }, /Validation: team size/],
    [{ code: "XX000", message: "database unavailable" }, /database unavailable/],
  ])("maps RPC error %o to a stable application error", async (error, expected) => {
    const fixture = supabaseFor({}, { error });
    await expect(lockSpogomiTeams(fixture.supabase, { id: "event-1" }, "organizer")).rejects.toThrow(expected);
  });
});

describe("SPOGOMI field operations", () => {
  const event = {
    id: "event-1", action_id: "action-1", created_by_clerk_id: "owner", name: "Edition",
    event_slug: "edition", mode: "mixed", state: "running", starts_at: "now", ends_at: null,
    public_visibility: "private", public_results_visibility: "hidden",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    identityMocks.getCurrentUserIdentity.mockResolvedValue({ userId: "operator" });
    eventAccessMocks.canManageEvent.mockReturnValue(false);
    eventAccessMocks.loadSpogomiEventForOrganizer.mockResolvedValue(event);
  });

  it("grants only the operational capabilities named by roles and gives organizers the full set", () => {
    expect([...spogomiFieldCapabilitiesForRoles(["timekeeper", "referee"], false)]).toEqual(["timing", "arrival", "arbitration"]);
    expect(spogomiFieldCapabilitiesForRoles([], true)).toEqual(new Set(["timing", "arrival", "weighing", "measurement_entry", "arbitration", "certification"]));
    expect(() => assertSpogomiFieldCapability(null, "timing")).toThrow("forbidden");
    const access = { capabilities: new Set(["timing"]) } as never;
    expect(() => assertSpogomiFieldCapability(access, "timing")).not.toThrow();
    expect(() => assertSpogomiFieldCapability(access, "weighing")).toThrow("forbidden");
  });

  it("fails closed for unknown identities and non-operational reviewers, then loads reviewer access", async () => {
    const fixture = supabaseFor({ spogomi_events: event, action_organizers: [], spogomi_event_reviewers: [] });
    identityMocks.getCurrentUserIdentity.mockResolvedValueOnce(null);
    await expect(loadSpogomiFieldOperationsAccess({ supabase: fixture.supabase, eventId: "event-1", userId: "operator" })).resolves.toBeNull();

    identityMocks.getCurrentUserIdentity.mockResolvedValue({ userId: "operator" });
    const noRoleFixture = supabaseFor({ spogomi_events: event, action_organizers: [], spogomi_event_reviewers: [{ role: "observer" }] });
    await expect(loadSpogomiFieldOperationsAccess({ supabase: noRoleFixture.supabase, eventId: "event-1", userId: "operator" })).resolves.toBeNull();

    const reviewerFixture = supabaseFor({ spogomi_events: event, action_organizers: [], spogomi_event_reviewers: [{ role: "weigher" }] });
    await expect(loadSpogomiFieldOperationsAccess({ supabase: reviewerFixture.supabase, eventId: "event-1", userId: "operator" })).resolves.toMatchObject({ roles: ["weigher"], isOrganizer: false });
  });

  it("loads both parent and division dashboards and excludes superseded measurement rows through the query contract", async () => {
    const fixture = supabaseFor({
      spogomi_divisions: [{ id: "casual", division_type: "casual" }],
      spogomi_teams: [{ id: "team-1", division_id: "casual" }],
      spogomi_category_rules: [{ id: "category-1", division_id: "casual" }],
      spogomi_field_operations: [], spogomi_team_returns: [], spogomi_field_incidents: [],
      spogomi_operational_measurements: [{ id: "measurement-1", status: "certified" }],
    });
    const parent = await loadSpogomiFieldOperationsDashboard({ supabase: fixture.supabase, eventId: "event-1" });
    const scoped = await loadSpogomiFieldOperationsDashboard({ supabase: fixture.supabase, eventId: "event-1", divisionId: "casual" });
    expect(parent.teams).toEqual([{ id: "team-1", division_id: "casual" }]);
    expect(scoped.categories).toEqual([{ id: "category-1", division_id: "casual" }]);
    expect(fixture.queries.get("spogomi_operational_measurements")?.at(-1)?.calls.neq).toEqual([["status", "superseded"]]);
  });

  it("keeps organizer grants server-owned and propagates trimmed subject ids", async () => {
    const fixture = supabaseFor({}, { data: { updated: true } });
    await expect(setSpogomiOperationalAccess({ supabase: fixture.supabase, eventId: "event-1", clerkId: " operator ", role: "data_entry", operation: "grant", actorClerkId: "owner" })).resolves.toEqual({ updated: true });
    expect(fixture.rpc).toHaveBeenCalledWith("spogomi_set_operational_access", expect.objectContaining({ p_subject_clerk_id: "operator", p_access_role: "data_entry" }));
    eventAccessMocks.loadSpogomiEventForOrganizer.mockResolvedValue(false);
    await expect(setSpogomiOperationalAccess({ supabase: fixture.supabase, eventId: "event-1", clerkId: "operator", role: "data_entry", operation: "revoke", actorClerkId: "intruder" })).rejects.toThrow("forbidden");
    eventAccessMocks.loadSpogomiEventForOrganizer.mockResolvedValue(null);
    await expect(setSpogomiOperationalAccess({ supabase: fixture.supabase, eventId: "event-1", clerkId: "operator", role: "data_entry", operation: "revoke", actorClerkId: "owner" })).rejects.toThrow("not found");
  });

  it("returns RPC results and surfaces field-operation failures", async () => {
    const fixture = supabaseFor({}, { data: { accepted: true } });
    await expect(callSpogomiFieldOperation({ supabase: fixture.supabase, rpc: "spogomi_record_return", args: { p_event_id: "event-1" } })).resolves.toEqual({ accepted: true });
    const failed = supabaseFor({}, { error: { code: "42501", message: "forbidden" } });
    await expect(callSpogomiFieldOperation({ supabase: failed.supabase, rpc: "spogomi_record_return", args: {} })).rejects.toMatchObject({ code: "42501" });
  });
});
