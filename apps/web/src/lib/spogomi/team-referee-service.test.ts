import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("server-only", () => ({}));
vi.mock("./preparation/registration-readiness-service", () => ({
  loadSpogomiRegistrationReadiness: async () => ({
    ready: false,
    registrationOpen: false,
    missing: [],
    divisions: [],
  }),
}));
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({
    users: {
      getUserList: async ({ userId }: { userId: string[] }) => ({
        data: userId.map((id) => ({ id, firstName: "Arbitre", lastName: id, username: null })),
      }),
    },
  }),
}));

import { loadSpogomiTeamRefereeState } from "./team-referee-service";
import { loadSpogomiManagementProjection } from "./management-projection";
import type { EventRow } from "./preparation/preparation-service";

type TableRow = Record<string, unknown>;

function createPagedSupabaseMock(params: {
  tables: Record<string, TableRow[]>;
  quizVersionByDivision?: Record<string, string>;
  recordedIsFilters?: Array<{ table: string; column: string; value: unknown }>;
}) {
  const { tables, quizVersionByDivision = {}, recordedIsFilters = [] } = params;

  const makeQuery = (table: string) => {
    const filters: Array<(row: TableRow) => boolean> = [];
    let rangeBounds: [number, number] | null = null;

    const execute = async () => {
      const source = tables[table] ?? [];
      const filtered = source.filter((row) => filters.every((fn) => fn(row)));
      const sliced = rangeBounds ? filtered.slice(rangeBounds[0], rangeBounds[1] + 1) : filtered;
      return { data: sliced, error: null, count: filtered.length };
    };

    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        filters.push((row) => row[col] === val);
        return builder;
      },
      is: (col: string, val: unknown) => {
        recordedIsFilters.push({ table, column: col, value: val });
        filters.push((row) => row[col] === val);
        return builder;
      },
      order: () => builder,
      range: (from: number, to: number) => {
        rangeBounds = [from, to];
        return builder;
      },
      maybeSingle: async () => {
        const res = await execute();
        return { data: res.data[0] ?? null, error: null };
      },
      then: (resolve: (value: unknown) => unknown, reject?: (err: unknown) => unknown) =>
        execute().then(resolve, reject),
    };
    return builder;
  };

  return {
    from: (table: string) => makeQuery(table),
    rpc: async (fn: string, args: { p_division_id?: string }) => {
      if (fn === "spogomi_referee_quiz_definition_internal" && args.p_division_id) {
        return {
          data: { quizVersion: quizVersionByDivision[args.p_division_id] ?? "quiz-default" },
          error: null,
        };
      }
      return { data: null, error: null };
    },
  } as unknown as SupabaseClient;
}

describe("SPOGOMI team referee division-scoped qualification and pagination", () => {
  it("validates qualification against each division regulation_version and quiz_version, and filters revoked rows at source", async () => {
    const recordedIsFilters: Array<{ table: string; column: string; value: unknown }> = [];
    const supabase = createPagedSupabaseMock({
      recordedIsFilters,
      quizVersionByDivision: {
        "div-casual": "quiz-casual-v2",
        "div-world": "quiz-world-v1",
      },
      tables: {
        spogomi_divisions: [
          { id: "div-casual", event_id: "event-1", regulation_version: "reg-casual-v2" },
          { id: "div-world", event_id: "event-1", regulation_version: "reg-world-v1" },
        ],
        spogomi_team_referee_assignments: [
          {
            event_id: "event-1",
            team_id: "team-casual",
            division_id: "div-casual",
            referee_clerk_id: "ref-casual",
            assigned_at: "2026-11-25T10:00:00Z",
            revoked_at: null,
          },
          {
            event_id: "event-1",
            team_id: "team-world",
            division_id: "div-world",
            referee_clerk_id: "ref-world-stale-quiz",
            assigned_at: "2026-11-25T10:00:00Z",
            revoked_at: null,
          },
          {
            event_id: "event-1",
            team_id: "team-revoked",
            division_id: "div-casual",
            referee_clerk_id: "ref-revoked",
            assigned_at: "2026-11-25T09:00:00Z",
            revoked_at: "2026-11-25T09:30:00Z",
          },
        ],
        spogomi_event_reviewers: [
          { event_id: "event-1", clerk_id: "ref-casual", role: "referee", revoked_at: null },
          { event_id: "event-1", clerk_id: "ref-world-stale-quiz", role: "referee", revoked_at: null },
        ],
        spogomi_referee_applications: [
          {
            event_id: "event-1",
            division_id: "div-casual",
            clerk_id: "ref-casual",
            status: "habilitated",
            regulation_version: "reg-casual-v2",
            quiz_version: "quiz-casual-v2",
            theory_proof_id: "proof-1",
            practical_confirmed_at: "2026-11-25T08:00:00Z",
          },
          {
            event_id: "event-1",
            division_id: "div-world",
            clerk_id: "ref-world-stale-quiz",
            status: "habilitated",
            regulation_version: "reg-world-v1",
            quiz_version: "quiz-world-OLD",
            theory_proof_id: "proof-2",
            practical_confirmed_at: "2026-11-25T08:00:00Z",
          },
        ],
        spogomi_participants: [],
      },
    });

    const result = await loadSpogomiTeamRefereeState({
      supabase,
      eventId: "event-1",
      eventRegulationVersion: "reg-global-mismatch",
      teams: [
        { id: "team-casual", division_id: "div-casual", public_name: "Casual 1" },
        { id: "team-world", division_id: "div-world", public_name: "World 1" },
        { id: "team-revoked", division_id: "div-casual", public_name: "Casual 2" },
      ],
      includeIdentityNames: true,
    });

    expect(recordedIsFilters).toContainEqual({
      table: "spogomi_team_referee_assignments",
      column: "revoked_at",
      value: null,
    });
    expect(result.teamReferees.find((t) => t.teamId === "team-casual")?.status).toBe("assigned");
    expect(result.teamReferees.find((t) => t.teamId === "team-world")?.status).toBe("pending_validation");
    expect(result.teamReferees.find((t) => t.teamId === "team-revoked")?.status).toBe("to_assign");
    expect(result.refereeCandidates.map((c) => c.clerkId)).toEqual(["ref-casual"]);
  });

  it("excludes competitors registered in another division in loadSpogomiManagementProjection", async () => {
    const supabase = createPagedSupabaseMock({
      quizVersionByDivision: { "div-a": "quiz-a", "div-b": "quiz-b" },
      tables: {
        spogomi_divisions: [
          { id: "div-a", event_id: "event-1", division_type: "casual", division_key: "casual", regulation_version: "reg-a" },
          { id: "div-b", event_id: "event-1", division_type: "world_cup", division_key: "world_cup", regulation_version: "reg-b" },
        ],
        spogomi_participants: [
          { id: "p-b", event_id: "event-1", division_id: "div-b", registration_status: "registered", clerk_id: "user-cross-div", source_row_number: 1 },
        ],
        spogomi_teams: [
          { id: "team-a", event_id: "event-1", division_id: "div-a", team_number: 1, public_name: "Team A", composition_state: "draft" },
        ],
        spogomi_team_referee_assignments: [
          { event_id: "event-1", team_id: "team-a", division_id: "div-a", referee_clerk_id: "user-cross-div", assigned_at: "2026-11-25T10:00:00Z", revoked_at: null },
        ],
        spogomi_event_reviewers: [
          { event_id: "event-1", clerk_id: "user-cross-div", role: "referee", revoked_at: null },
        ],
        spogomi_referee_applications: [
          { event_id: "event-1", division_id: "div-a", clerk_id: "user-cross-div", status: "habilitated", regulation_version: "reg-a", quiz_version: "quiz-a", theory_proof_id: "p1", practical_confirmed_at: "2026-11-25T08:00:00Z" },
        ],
        spogomi_event_routes: [],
        spogomi_category_rules: [],
        spogomi_environment_category_mappings: [],
        spogomi_team_join_requests: [],
        spogomi_admission_requests: [],
      },
    });

    const projection = await loadSpogomiManagementProjection({
      supabase,
      event: { id: "event-1", regulation_version: "reg-a" } as unknown as EventRow,
      divisionId: "div-a",
    });

    expect(projection.teamReferees[0]?.status).toBe("unavailable");
    expect(projection.refereeCandidates).toEqual([]);
  });

  it("paginates beyond 1000 rows without truncation", async () => {
    const participants = Array.from({ length: 1205 }, (_, i) => ({
      event_id: "event-1",
      clerk_id: `participant-${i}`,
      registration_status: "registered",
    }));
    const supabase = createPagedSupabaseMock({
      quizVersionByDivision: { "div-1": "quiz-1" },
      tables: {
        spogomi_divisions: [{ id: "div-1", event_id: "event-1", regulation_version: "reg-1" }],
        spogomi_team_referee_assignments: [
          { event_id: "event-1", team_id: "team-1", division_id: "div-1", referee_clerk_id: "participant-1204", assigned_at: "2026-11-25T10:00:00Z", revoked_at: null },
        ],
        spogomi_event_reviewers: [
          { event_id: "event-1", clerk_id: "participant-1204", role: "referee", revoked_at: null },
        ],
        spogomi_referee_applications: [
          { event_id: "event-1", division_id: "div-1", clerk_id: "participant-1204", status: "habilitated", regulation_version: "reg-1", quiz_version: "quiz-1", theory_proof_id: "p1", practical_confirmed_at: "2026-11-25T08:00:00Z" },
        ],
        spogomi_participants: participants,
      },
    });

    const result = await loadSpogomiTeamRefereeState({
      supabase,
      eventId: "event-1",
      teams: [{ id: "team-1", division_id: "div-1", public_name: "Team 1" }],
      includeIdentityNames: true,
    });

    // participant-1204 is on page 2 (> 1000) and must still be detected as an event participant.
    expect(result.teamReferees[0]?.status).toBe("unavailable");
    expect(result.refereeCandidates).toEqual([]);
  });
});
