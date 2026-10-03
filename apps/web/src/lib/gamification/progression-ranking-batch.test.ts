import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import { describe, expect, it, vi } from "vitest";
import { loadActionRowsForUser } from "./progression-data";
import { buildIndividualLeaderboardCandidates } from "./progression-ranking";
import { loadLeaderboardBatchData } from "./progression-ranking-batch";

type FixtureRow = Record<string, unknown>;

type Fixture = {
  profiles: FixtureRow[];
  progression_profiles: FixtureRow[];
  actions: FixtureRow[];
  action_organizers: FixtureRow[];
  forms: FixtureRow[];
  progression_events: FixtureRow[];
  action_participants: FixtureRow[];
  action_geometry_contributions: FixtureRow[];
  user_visited_places: FixtureRow[];
  quiz_type_progress: FixtureRow[];
  trash_spotter_spots: FixtureRow[];
};

type QueryCall = {
  table: string;
  method: "range" | "limit";
  from?: number;
  to?: number;
  orders: string[];
  filters: Array<{ kind: "eq" | "in"; column: string; value: string | string[] }>;
};

function emptyFixture(): Fixture {
  return {
    profiles: [],
    progression_profiles: [],
    actions: [],
    action_organizers: [],
    forms: [],
    progression_events: [],
    action_participants: [],
    action_geometry_contributions: [],
    user_visited_places: [],
    quiz_type_progress: [],
    trash_spotter_spots: [],
  };
}

function buildBatchSupabase(fixture: Fixture) {
  const calls: QueryCall[] = [];
  const createChain = (table: string) => {
    const filters: QueryCall["filters"] = [];
    const orders: string[] = [];
    const rows = () => {
      let result = [...fixture[table as keyof Fixture]];
      for (const filter of filters) {
        if (filter.kind === "eq") {
          result = result.filter((row) => row[filter.column] === filter.value);
        } else {
          result = result.filter((row) => (filter.value as string[]).includes(String(row[filter.column])));
        }
      }
      for (const column of [...orders].reverse()) {
        result.sort((left, right) => String(left[column] ?? "").localeCompare(String(right[column] ?? "")));
      }
      return result;
    };
    const result = (method: QueryCall["method"], from?: number, to?: number) => {
      calls.push({ table, method, from, to, orders: [...orders], filters: [...filters] });
      const source = rows();
      return {
        data: method === "range" ? source.slice(from, (to ?? source.length - 1) + 1) : source,
        error: null,
      };
    };
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn((column: string, value: string) => {
        filters.push({ kind: "eq", column, value });
        return chain;
      }),
      in: vi.fn((column: string, value: string[]) => {
        filters.push({ kind: "in", column, value });
        return chain;
      }),
      order: vi.fn((column: string) => {
        orders.push(column);
        return chain;
      }),
      range: vi.fn(async (from: number, to: number) => result("range", from, to)),
      limit: vi.fn(async () => result("limit")),
    } as const;
    return chain;
  };

  const supabase = {
    from: vi.fn((table: string) => createChain(table)),
  };
  return { supabase, calls };
}

function buildProfile(userId: string): FixtureRow {
  return {
    id: userId,
    display_name: userId,
    display_name_mode: "full_name",
    handle: null,
    leaderboard_public_opt_in: true,
  };
}

function buildAction(
  id: string,
  creator: string,
  date: string,
  associationName: string,
  organizerType: string,
): FixtureRow {
  return {
    id,
    created_at: `${date}T09:00:00.000Z`,
    created_by_clerk_id: creator,
    actor_name: "Terrain",
    organizer_type: organizerType,
    organizer_id: null,
    organizer_name: associationName,
    action_date: date,
    location_label: "Parc test",
    latitude: null,
    longitude: null,
    waste_kg: 2,
    cigarette_butts: 4,
    volunteers_count: 2,
    duration_minutes: 30,
    status: "approved",
    notes: appendActionMetadataToNotes("Action de test", { associationName }),
    action_phase: "post_action_complete",
    preparation_data: null,
    published_at: `${date}T10:00:00.000Z`,
  };
}

function buildValidatedForm(actionId: string): FixtureRow {
  return {
    id: `form-${actionId}`,
    action_id: actionId,
    status: "validated",
    validated_by_admin: true,
    is_duplicate: false,
    is_deleted: false,
    is_test: false,
  };
}

describe("batch user leaderboard source", () => {
  it("keeps database reads paged and never loads a catalog per user", async () => {
    const fixture = emptyFixture();
    fixture.profiles = Array.from({ length: 32 }, (_, index) => buildProfile(`user-${index}`));
    const { supabase, calls } = buildBatchSupabase(fixture);

    const rows = await buildIndividualLeaderboardCandidates(supabase as never, "level");

    expect(rows).toHaveLength(32);
    expect(calls.filter((call) => call.table === "progression_profiles" && call.method === "range")).toHaveLength(1);
    expect(calls.filter((call) => call.table === "progression_events" && call.method === "range")).toHaveLength(1);
    expect(calls.find((call) => call.table === "progression_profiles")?.orders).toEqual(["user_id"]);
    expect(calls.find((call) => call.table === "progression_profiles")?.orders).not.toContain("id");
    expect(calls.find((call) => call.table === "progression_events")?.orders).toEqual(["user_id", "id"]);
    expect(calls.find((call) => call.table === "profiles")?.orders).toEqual(["id"]);
    expect(calls.find((call) => call.table === "actions")?.orders).toEqual(["created_by_clerk_id", "id"]);
    expect(calls.find((call) => call.table === "action_organizers")?.orders).toEqual(["organizer_clerk_id", "id"]);
    expect(calls.find((call) => call.table === "action_participants")?.orders).toEqual(["user_id", "id"]);
    expect(calls.find((call) => call.table === "user_visited_places")?.orders).toEqual(["user_id", "id"]);
    expect(calls.find((call) => call.table === "quiz_type_progress")?.orders).toEqual(["user_id", "id"]);
    expect(calls.find((call) => call.table === "trash_spotter_spots")?.orders).toEqual(["user_id", "id"]);
    expect(calls.some((call) => call.table === "gamification_catalog")).toBe(false);
  });

  it("matches CURRENT ownership: spontaneous ownership plus action_organizers only", async () => {
    const fixture = emptyFixture();
    fixture.profiles = [buildProfile("user-1")];
    fixture.actions = [
      buildAction("spontaneous-owned", "user-1", "2026-01-10", "Action spontanée", "spontaneous"),
      buildAction("organized", "user-2", "2026-02-10", "Entreprise test", "company"),
      buildAction("structured-unorganized", "user-1", "2026-03-10", "Association test", "association"),
    ];
    fixture.action_organizers = [{ id: "organizer-1", action_id: "organized", organizer_clerk_id: "user-1" }];
    fixture.forms = fixture.actions.map((action) => buildValidatedForm(String(action.id)));
    const { supabase, calls } = buildBatchSupabase(fixture);

    const currentRows = await loadActionRowsForUser(supabase as never, "user-1");
    expect(new Set(currentRows.map((row) => row.id))).toEqual(new Set(["spontaneous-owned", "organized"]));

    const callCountBeforeBatch = calls.length;
    const batch = await loadLeaderboardBatchData(supabase as never);
    expect(batch.badgeCounts.get("user-1")).toEqual({ badgeTotal: 2, gradeCount: 2, oneShotCount: 0 });
    expect(calls.slice(callCountBeforeBatch).filter((call) => call.table === "actions").map((call) => call.orders)).toEqual([
      ["created_by_clerk_id", "id"],
      ["id"],
    ]);
    expect(calls.slice(callCountBeforeBatch).find((call) => call.table === "forms")?.orders).toEqual(["action_id", "id"]);
  });

  it.each([
    ["pending", "rejected", "requested"],
    ["pending", "rejected", null],
  ])("does not turn %s/%s/%s participation into Participation", async (...statuses) => {
    const fixture = emptyFixture();
    fixture.profiles = [buildProfile("user-1")];
    fixture.action_participants = statuses.map((participation_status, index) => ({
      id: `participant-${index}`,
      user_id: "user-1",
      action_id: `action-${index}`,
      participation_status,
    }));
    const { supabase } = buildBatchSupabase(fixture);

    const batch = await loadLeaderboardBatchData(supabase as never);
    expect(batch.badgeCounts.get("user-1")).toEqual({ badgeTotal: 0, gradeCount: 0, oneShotCount: 0 });
  });

  it("counts a confirmed participation and exhausts paged profile reads", async () => {
    const fixture = emptyFixture();
    fixture.profiles = Array.from({ length: 1001 }, (_, index) => buildProfile(`user-${index}`));
    fixture.action_participants = [{
      id: "participant-1",
      user_id: "user-1",
      action_id: "action-1",
      participation_status: "confirmed",
    }];
    const { supabase, calls } = buildBatchSupabase(fixture);

    const batch = await loadLeaderboardBatchData(supabase as never);

    expect(batch.profiles).toHaveLength(1001);
    expect(batch.badgeCounts.get("user-1")).toEqual({ badgeTotal: 1, gradeCount: 1, oneShotCount: 0 });
    expect(calls.filter((call) => call.table === "profiles" && call.method === "range")).toHaveLength(2);
    expect(calls.filter((call) => call.table === "action_participants" && call.method === "range").every((call) =>
      call.filters.some((filter) => filter.kind === "eq" && filter.column === "participation_status" && filter.value === "confirmed"),
    )).toBe(true);
  });
});
