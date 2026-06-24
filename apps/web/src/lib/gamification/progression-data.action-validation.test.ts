import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import { loadValidatedActionIdsForUser } from "./progression-data";

const SPONTANEOUS_NOTES = appendActionMetadataToNotes("Action de terrain", {
  associationName: "Action spontanée",
});

const VALIDATION_ACTIONS = [
  {
    id: "action-1",
    created_at: "2026-01-01",
    created_by_clerk_id: "user-1",
    actor_name: "Alice",
    action_date: "2026-01-01",
    location_label: "Parc A",
    latitude: null,
    longitude: null,
    waste_kg: 0,
    cigarette_butts: 0,
    volunteers_count: 1,
    duration_minutes: 45,
    status: "approved" as const,
    notes: SPONTANEOUS_NOTES,
    manual_drawing: null,
  },
  {
    id: "action-2",
    created_at: "2026-01-02",
    created_by_clerk_id: "user-1",
    actor_name: "Alice",
    action_date: "2026-01-02",
    location_label: "Parc B",
    latitude: null,
    longitude: null,
    waste_kg: 0,
    cigarette_butts: 0,
    volunteers_count: 1,
    duration_minutes: 30,
    status: "approved" as const,
    notes: SPONTANEOUS_NOTES,
    manual_drawing: null,
  },
  {
    id: "action-3",
    created_at: "2026-01-03",
    created_by_clerk_id: "user-1",
    actor_name: "Alice",
    action_date: "2026-01-03",
    location_label: "Parc C",
    latitude: null,
    longitude: null,
    waste_kg: 0,
    cigarette_butts: 0,
    volunteers_count: 1,
    duration_minutes: 20,
    status: "pending" as const,
    notes: SPONTANEOUS_NOTES,
    manual_drawing: null,
  },
] as const;

const VALIDATION_FORMS = [
  {
    action_id: "action-1",
    group_id: "g1",
    status: "validated",
    created_at: "2026-01-04",
    validated_by_admin: true,
    is_duplicate: false,
    is_deleted: false,
    is_test: false,
  },
  {
    action_id: "action-1",
    group_id: "g1",
    status: "validated",
    created_at: "2026-01-05",
    validated_by_admin: true,
    is_duplicate: false,
    is_deleted: false,
    is_test: false,
  },
  {
    action_id: "action-2",
    group_id: "g2",
    status: "draft",
    created_at: "2026-01-06",
    validated_by_admin: false,
    is_duplicate: false,
    is_deleted: false,
    is_test: false,
  },
  {
    action_id: "action-3",
    group_id: "g3",
    status: "validated",
    created_at: "2026-01-07",
    validated_by_admin: true,
    is_duplicate: false,
    is_deleted: false,
    is_test: false,
  },
] as const;

type QueryResult<T> = {
  data: T[];
  error: null;
};

type QueryChain<T> = {
  select: (columns: string) => QueryChain<T>;
  eq: (field: string, value: string) => QueryChain<T>;
  in: (field: string, values: string[]) => QueryChain<T>;
  order: (field: string, options?: { ascending?: boolean }) => QueryChain<T>;
  limit: (value: number) => Promise<QueryResult<T>>;
};

type FormsQuery = {
  select: (columns: string) => FormsQuery;
  in: (field: string, values: string[]) => FormsQuery;
  neq: (field: string, value: string) => FormsQuery;
  eq: (field: string, value: string | boolean) => FormsQuery;
  is: (field: string, value: boolean | null) => FormsQuery;
  order: (
    field: string,
    options?: { ascending?: boolean },
  ) => Promise<QueryResult<{
    action_id?: string;
    status?: string;
    validated_by_admin?: boolean;
    is_duplicate?: boolean;
    is_deleted?: boolean;
    is_test?: boolean;
  }>>;
};

type EmptyChain = {
  select: (columns: string) => EmptyChain;
  eq: (field: string, value: string) => EmptyChain;
  limit: (value: number) => Promise<QueryResult<never>>;
};

function createActionsQuery(data: unknown[]): QueryChain<unknown> {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => ({ data, error: null })),
  } as QueryChain<unknown>;
  return chain;
}

function createFormsQuery(data: unknown[]): FormsQuery {
  let requestedActionIds: string[] | null = null;
  const chain = {
    select: vi.fn(() => chain),
    in: vi.fn((field: string, values: string[]) => {
      if (field === "action_id") {
        requestedActionIds = values;
      }
      return chain;
    }),
    neq: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(async () => {
      const rows = (data as Array<{
        action_id?: string;
        status?: string;
        validated_by_admin?: boolean;
        is_duplicate?: boolean;
        is_deleted?: boolean;
        is_test?: boolean;
      }>).filter((row) => {
        if (requestedActionIds && row.action_id && !requestedActionIds.includes(row.action_id)) {
          return false;
        }
        if (row.status === "draft" || row.status === "deleted" || row.status === "incomplete") {
          return false;
        }
        if (row.validated_by_admin === false) {
          return false;
        }
        if (row.is_duplicate || row.is_deleted || row.is_test) {
          return false;
        }
        return true;
      });
      return { data: rows, error: null };
    }),
  } as FormsQuery;
  return chain;
}

describe("loadValidatedActionIdsForUser", () => {
  it("counts only approved spontaneous actions with at least one validated form", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "actions") {
          return createActionsQuery([...VALIDATION_ACTIONS]);
        }
        if (table === "action_organizers") {
          const chain = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            limit: vi.fn(async () => ({ data: [], error: null })),
          } as EmptyChain;
          return chain;
        }
        if (table === "forms") {
          return createFormsQuery([...VALIDATION_FORMS]);
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as unknown as SupabaseClient;

    const validatedActionIds = await loadValidatedActionIdsForUser(supabase, "user-1");

    expect(Array.from(validatedActionIds)).toEqual(["action-1"]);
  });

  it("uses preloaded action rows without querying actions again", async () => {
    const actions = [VALIDATION_ACTIONS[0]];
    const forms = [VALIDATION_FORMS[0]];

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "actions") {
          throw new Error("actions table should not be queried when rows are preloaded");
        }
        if (table === "action_organizers") {
          const chain = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            limit: vi.fn(async () => ({ data: [], error: null })),
          } as EmptyChain;
          return chain;
        }
        if (table === "forms") {
          return createFormsQuery(forms);
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as unknown as SupabaseClient;

    const validatedActionIds = await loadValidatedActionIdsForUser(supabase, "user-1", {
      actionRows: actions,
    });

    expect(Array.from(validatedActionIds)).toEqual(["action-1"]);
  });
});
