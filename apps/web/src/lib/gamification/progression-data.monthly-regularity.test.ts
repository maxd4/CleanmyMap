import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import { syncUserActionProgression } from "./progression-data";

type ActionRow = {
  id: string;
  created_at: string;
  created_by_clerk_id: string;
  actor_name: string | null;
  action_date: string;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  waste_kg: number;
  cigarette_butts: number;
  volunteers_count: number;
  duration_minutes: number;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  manual_drawing: null;
};

function buildAction(
  id: string,
  actionDate: string,
  status: "pending" | "approved" | "rejected",
): ActionRow {
  return {
    id,
    created_at: actionDate,
    created_by_clerk_id: "user-1",
    actor_name: "Alice",
    action_date: actionDate,
    location_label: "Parc central",
    latitude: null,
    longitude: null,
    waste_kg: 1,
    cigarette_butts: 10,
    volunteers_count: 1,
    duration_minutes: 45,
    status,
    notes: appendActionMetadataToNotes("Action de terrain", {
      associationName: "Action spontanée",
    }),
    manual_drawing: null,
  };
}

type QueryResult<T> = {
  data: T[];
  error: null;
};

type ActionQueryChain = {
  select: (columns: string) => ActionQueryChain;
  eq: (field: string, value: string) => ActionQueryChain;
  order: (field: string, options?: { ascending?: boolean }) => ActionQueryChain;
  limit: (value: number) => Promise<QueryResult<ActionRow>>;
  maybeSingle: () => Promise<QueryResult<ActionRow | null>>;
  then: (
    resolve: (value: QueryResult<ActionRow>) => void,
    reject: (reason: unknown) => void,
  ) => Promise<void>;
};

type EmptyChain = {
  select: (columns: string) => EmptyChain;
  eq: (field: string, value: string) => EmptyChain;
  in: (field: string, values: string[]) => EmptyChain;
  neq: (field: string, value: string) => EmptyChain;
  is: (field: string, value: boolean | null) => EmptyChain;
  order: (field: string, options?: { ascending?: boolean }) => Promise<QueryResult<never>>;
  limit: (value: number) => Promise<QueryResult<never>>;
  maybeSingle: () => Promise<QueryResult<null>>;
};

function createActionQuery(getRows: () => ActionRow[]): ActionQueryChain {
  const state = {
    eq: {} as Record<string, string>,
  };
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn((field: string, value: string) => {
      state.eq[field] = value;
      return chain;
    }),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => {
      const rows = getRows().filter((row) => {
        const createdBy = state.eq["created_by_clerk_id"];
        const id = state.eq["id"];
        if (createdBy && row.created_by_clerk_id !== createdBy) {
          return false;
        }
        if (id && row.id !== id) {
          return false;
        }
        return true;
      });
      return { data: rows, error: null };
    }),
    maybeSingle: vi.fn(async () => {
      const rows = getRows().filter((row) => {
        const createdBy = state.eq["created_by_clerk_id"];
        const id = state.eq["id"];
        if (createdBy && row.created_by_clerk_id !== createdBy) {
          return false;
        }
        if (id && row.id !== id) {
          return false;
        }
        return true;
      });
      return { data: rows[0] ?? null, error: null };
    }),
    then: (resolve: (value: unknown) => void, reject: (reason: unknown) => void) =>
      Promise.resolve({
        data: getRows().filter((row) => {
          const createdBy = state.eq["created_by_clerk_id"];
          const id = state.eq["id"];
          if (createdBy && row.created_by_clerk_id !== createdBy) {
            return false;
          }
          if (id && row.id !== id) {
            return false;
          }
          return true;
        }),
        error: null,
      }).then(resolve, reject),
  } as ActionQueryChain;
  return chain;
}

function createEmptyChain(): EmptyChain {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => ({ data: [], error: null })),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
  } as EmptyChain;
  return chain;
}

describe("syncUserActionProgression monthly regularity", () => {
  it("recalculates month streaks when a pending action is later rejected", async () => {
    const actions = [
      buildAction("action-jan", "2026-01-10", "pending"),
      buildAction("action-feb", "2026-02-10", "pending"),
      buildAction("action-mar", "2026-03-10", "pending"),
      buildAction("action-apr", "2026-04-10", "pending"),
    ];

    const insertedEvents: Array<Record<string, unknown>> = [];

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "actions") {
          return createActionQuery(() => actions);
        }
        if (table === "action_organizers") {
          return createEmptyChain();
        }
        if (table === "forms") {
          return createEmptyChain();
        }
        if (table === "progression_events") {
          const chain = {
            error: null,
            delete: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            insert: vi.fn(async (row: Record<string, unknown>) => {
              insertedEvents.push(row);
              return { error: null };
            }),
          } as {
            error: null;
            delete: () => { error: null; delete: () => unknown; eq: (field: string, value: string) => unknown };
            eq: (field: string, value: string) => unknown;
            insert: (row: Record<string, unknown>) => Promise<{ error: null }>;
          };
          return chain;
        }
        if (table === "points_ledger" || table === "xp_audit") {
          return {
            insert: vi.fn(async () => ({ error: null })),
            select: vi.fn(() => createEmptyChain()),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as unknown as SupabaseClient;

    const firstPass = await syncUserActionProgression(supabase, "user-1");
    const firstMonthlyEvents = insertedEvents.filter(
      (row) => row.event_type === "action_monthly_regularity",
    );

    expect(firstPass).toBe(0);
    expect(firstMonthlyEvents).toHaveLength(4);
    expect(firstMonthlyEvents.map((row) => row.source_id)).toEqual([
      "monthly-regularity:2026-01",
      "monthly-regularity:2026-02",
      "monthly-regularity:2026-03",
      "monthly-regularity:2026-04",
    ]);
    expect(firstMonthlyEvents.map((row) => row.xp_awarded)).toEqual([1, 2, 3, 4]);

    actions[2] = buildAction("action-mar", "2026-03-10", "rejected");
    insertedEvents.length = 0;

    const secondPass = await syncUserActionProgression(supabase, "user-1");
    const secondMonthlyEvents = insertedEvents.filter(
      (row) => row.event_type === "action_monthly_regularity",
    );

    expect(secondPass).toBe(0);
    expect(secondMonthlyEvents).toHaveLength(3);
    expect(secondMonthlyEvents.map((row) => row.source_id)).toEqual([
      "monthly-regularity:2026-01",
      "monthly-regularity:2026-02",
      "monthly-regularity:2026-04",
    ]);
    expect(secondMonthlyEvents.map((row) => row.xp_awarded)).toEqual([1, 2, 1]);
  });
});
