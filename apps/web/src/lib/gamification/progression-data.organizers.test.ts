import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import { syncUserActionProgression } from "./progression-data";

type QueryResult<T> = {
  data: T[];
  error: null;
};

type QueryState = {
  eq: Record<string, string>;
  in: Record<string, string[]>;
};

type QueryChain<T> = {
  select: (columns: string) => QueryChain<T>;
  eq: (field: string, value: string) => QueryChain<T>;
  in: (field: string, values: string[]) => QueryChain<T>;
  neq: (field: string, value: string) => QueryChain<T>;
  is: (field: string, value: boolean | null) => QueryChain<T>;
  order: (field: string, options?: { ascending?: boolean }) => QueryChain<T>;
  limit: (value: number) => Promise<QueryResult<T>>;
  maybeSingle: () => Promise<{ data: T | null; error: null }>;
  then: (
    resolve: (value: QueryResult<T>) => void,
    reject: (reason: unknown) => void,
  ) => Promise<void>;
};

type DeleteChain = {
  error: null;
  eq: (field: string, value: string) => DeleteChain;
  delete: () => DeleteChain;
  select: (columns: string) => DeleteChain;
};

function buildAction(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "action-1",
    created_at: "2026-01-01",
    created_by_clerk_id: "user-creator",
    actor_name: "Alice",
    action_date: "2026-01-01",
    location_label: "Parc A",
    latitude: null,
    longitude: null,
    waste_kg: 4,
    cigarette_butts: 100,
    volunteers_count: 2,
    duration_minutes: 60,
    status: "approved",
    notes: appendActionMetadataToNotes("Action de terrain", {
      associationName: "Action spontanée",
    }),
    manual_drawing: null,
    ...overrides,
  };
}

function createQueryChain<T>(
  resolver: (state: QueryState) => Promise<QueryResult<T>> | QueryResult<T>,
): QueryChain<T> {
  const state = {
    eq: {} as Record<string, string>,
    in: {} as Record<string, string[]>,
  };
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn((field: string, value: string) => {
      state.eq[field] = value;
      return chain;
    }),
    in: vi.fn((field: string, values: string[]) => {
      state.in[field] = values;
      return chain;
    }),
    neq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => resolver(state)),
    maybeSingle: vi.fn(async () => {
      const result = await resolver(state);
      return { data: result.data[0] ?? null, error: result.error };
    }),
    then: (
      resolve: (value: QueryResult<T>) => void,
      reject: (reason: unknown) => void,
    ) =>
      Promise.resolve(resolver(state)).then(resolve, reject),
  } as QueryChain<T>;
  return chain;
}

function createDeleteChain(): DeleteChain {
  const chain = {
    error: null,
    eq: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    select: vi.fn(() => chain),
  } as DeleteChain;
  return chain;
}

function createProgressionDataOrganizersFixtures() {
  const action = buildAction();
  const organizerRows = [
    {
      action_id: "action-1",
      organizer_clerk_id: "user-creator",
      organizer_label: "Alice",
      organizer_handle: "alice",
      is_primary: true,
      created_at: "2026-01-01",
    },
    {
      action_id: "action-1",
      organizer_clerk_id: "user-co",
      organizer_label: "Bob",
      organizer_handle: "bob",
      is_primary: false,
      created_at: "2026-01-01",
    },
    {
      action_id: "action-1",
      organizer_clerk_id: "user-third",
      organizer_label: "Chloé",
      organizer_handle: "chloe",
      is_primary: false,
      created_at: "2026-01-01",
    },
  ];
  const forms = [
    {
      action_id: "action-1",
      group_id: "g1",
      status: "validated",
      created_at: "2026-01-02",
      validated_by_admin: true,
      is_duplicate: false,
      is_deleted: false,
      is_test: false,
    },
  ];

  return {
    action,
    organizerRows,
    forms,
  };
}

function createProgressionDataOrganizersSupabase(
  fixtures: ReturnType<typeof createProgressionDataOrganizersFixtures>,
  progressionEventsInserted: Array<Record<string, unknown>>,
  pointsInsert: ReturnType<typeof vi.fn>,
  auditInsert: ReturnType<typeof vi.fn>,
) {
  const { action, organizerRows, forms } = fixtures;

  return {
    from: vi.fn((table: string) => {
      if (table === "actions") {
        return createQueryChain((state) => {
          const createdBy = state.eq["created_by_clerk_id"];
          const ids = state.in["id"] ?? [];
          if (createdBy && createdBy === "user-co") {
            return { data: [], error: null };
          }
          if (createdBy && createdBy !== "user-co") {
            return { data: [action], error: null };
          }
          if (ids.length > 0) {
            return {
              data: ids.includes("action-1") ? [action] : [],
              error: null,
            };
          }
          return { data: [], error: null };
        });
      }
      if (table === "action_organizers") {
        return createQueryChain((state) => {
          if (state.eq["organizer_clerk_id"]) {
            return {
              data: organizerRows.filter(
                (row) => row.organizer_clerk_id === state.eq["organizer_clerk_id"],
              ),
              error: null,
            };
          }
          if (state.eq["action_id"]) {
            return {
              data: organizerRows.filter((row) => row.action_id === state.eq["action_id"]),
              error: null,
            };
          }
          return { data: [], error: null };
        });
      }
      if (table === "forms") {
        return createQueryChain((state) => {
          const actionIds = state.in["action_id"] ?? [];
          return {
            data: forms.filter(
              (row) =>
                actionIds.length === 0 || actionIds.includes(row.action_id as string),
            ),
            error: null,
          };
        });
      }
      if (table === "progression_events") {
        return {
          delete: () => createDeleteChain(),
          insert: vi.fn(async (row: Record<string, unknown>) => {
            progressionEventsInserted.push(row);
            return { error: null };
          }),
        };
      }
      if (table === "points_ledger") {
        return {
          select: () => createQueryChain(() => ({ data: [], error: null })),
          insert: pointsInsert,
        };
      }
      if (table === "xp_audit") {
        return {
          insert: auditInsert,
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
  } as unknown as SupabaseClient;
}

function createProgressionDataOrganizersScenario() {
  const fixtures = createProgressionDataOrganizersFixtures();
  const progressionEventsInserted: Array<Record<string, unknown>> = [];
  const pointsInsert = vi.fn(async () => ({ error: null }));
  const auditInsert = vi.fn(async () => ({ error: null }));
  const supabase = createProgressionDataOrganizersSupabase(
    fixtures,
    progressionEventsInserted,
    pointsInsert,
    auditInsert,
  );

  return {
    supabase,
    progressionEventsInserted,
    pointsInsert,
    auditInsert,
  };
}

describe("syncUserActionProgression", () => {
  it("splits validated action XP between co-organizers", async () => {
    const { supabase, progressionEventsInserted, pointsInsert, auditInsert } =
      createProgressionDataOrganizersScenario();

    const validatedCount = await syncUserActionProgression(supabase, "user-co");

    expect(validatedCount).toBe(1);
    const validationEvent = progressionEventsInserted.find(
      (row) => row["event_type"] === "action_declare_validation",
    ) as Record<string, unknown> | undefined;

    expect(validationEvent).toBeDefined();
    expect(validationEvent?.["xp_awarded"]).toBeCloseTo(1 / 3);
    expect(validationEvent?.["metadata"]).toMatchObject({
      organizerCount: 3,
    });
    expect(pointsInsert).not.toHaveBeenCalled();
    expect(auditInsert).toHaveBeenCalledTimes(1);
    const auditCall = auditInsert.mock.calls[0] as unknown[] | undefined;
    const auditPayload = auditCall?.[0] as { xp_change?: number } | undefined;

    expect(auditPayload).toEqual(
      expect.objectContaining({
        xp_change: expect.any(Number),
        metadata: expect.objectContaining({
          organizerCount: 3,
        }),
      }),
    );
    expect(auditPayload?.xp_change).toBeCloseTo(1 / 3);
  });
});
