import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import { loadValidatedCompleteActionCountForUser } from "./progression-data";

type QueryResult<T> = {
  data: T[];
  error: null;
};

type ActionsQuery<T> = {
  select: (columns: string) => ActionsQuery<T>;
  eq: (field: string, value: string) => ActionsQuery<T>;
  order: (
    field: string,
    options?: { ascending?: boolean },
  ) => ActionsQuery<T>;
  limit: (value: number) => Promise<QueryResult<T>>;
};

type FormsQuery<T> = {
  select: (columns: string) => FormsQuery<T>;
  in: (field: string, values: string[]) => FormsQuery<T>;
  neq: (field: string, value: string) => FormsQuery<T>;
  eq: (field: string, value: string | boolean) => FormsQuery<T>;
  is: (field: string, value: boolean | null) => FormsQuery<T>;
  order: (
    field: string,
    options?: { ascending?: boolean },
  ) => Promise<QueryResult<T>>;
};

type OrganizerQuery = {
  select: (columns: string) => OrganizerQuery;
  eq: (field: string, value: string) => OrganizerQuery;
  limit: (value: number) => Promise<QueryResult<never>>;
};

function createActionsQuery<T>(data: T[]): ActionsQuery<T> {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => ({ data, error: null })),
  } as ActionsQuery<T>;
  return chain;
}

function createFormsQuery<T extends { action_id?: string }>(data: T[]): FormsQuery<T> {
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
      const rows = data.filter((row) => {
        if (
          requestedActionIds &&
          row.action_id &&
          !requestedActionIds.includes(row.action_id)
        ) {
          return false;
        }
        return true;
      });
      return { data: rows, error: null };
    }),
  } as FormsQuery<T>;
  return chain;
}

describe("loadValidatedCompleteActionCountForUser", () => {
  it("counts only validated approved actions with complete data", async () => {
    const completeNotes = appendActionMetadataToNotes("Action de terrain", {
      associationName: "Action spontanée",
    });

    const actions = [
      {
        id: "action-1",
        created_at: "2026-01-01",
        created_by_clerk_id: "user-1",
        actor_name: "Alice",
        action_date: "2026-01-01",
        location_label: "Parc A",
        latitude: 48.85,
        longitude: 2.35,
        waste_kg: 3,
        cigarette_butts: 12,
        volunteers_count: 4,
        duration_minutes: 45,
        status: "approved",
        notes: completeNotes,
        manual_drawing: null,
      },
      {
        id: "action-2",
        created_at: "2026-01-02",
        created_by_clerk_id: "user-1",
        actor_name: null,
        action_date: "2026-01-02",
        location_label: "Parc B",
        latitude: 48.86,
        longitude: 2.34,
        waste_kg: 3,
        cigarette_butts: 12,
        volunteers_count: 4,
        duration_minutes: 45,
        status: "approved",
        notes: completeNotes,
        manual_drawing: null,
      },
      {
        id: "action-3",
        created_at: "2026-01-03",
        created_by_clerk_id: "user-1",
        actor_name: "Alice",
        action_date: "2026-01-03",
        location_label: "Parc C",
        latitude: 48.87,
        longitude: 2.33,
        waste_kg: 3,
        cigarette_butts: 12,
        volunteers_count: 4,
        duration_minutes: 45,
        status: "pending",
        notes: completeNotes,
        manual_drawing: null,
      },
    ];

    const forms = [
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
        action_id: "action-2",
        group_id: "g2",
        status: "validated",
        created_at: "2026-01-04",
        validated_by_admin: true,
        is_duplicate: false,
        is_deleted: false,
        is_test: false,
      },
      {
        action_id: "action-3",
        group_id: "g3",
        status: "validated",
        created_at: "2026-01-04",
        validated_by_admin: true,
        is_duplicate: false,
        is_deleted: false,
        is_test: false,
      },
    ];

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "actions") {
          return createActionsQuery(actions);
        }
        if (table === "action_organizers") {
          const chain = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            limit: vi.fn(async () => ({ data: [], error: null })),
          } as OrganizerQuery;
          return chain;
        }
        if (table === "forms") {
          return createFormsQuery(forms);
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as unknown as SupabaseClient;

    const count = await loadValidatedCompleteActionCountForUser(supabase, "user-1");

    expect(count).toBe(1);
  });

  it("returns the same count when approved rows are preloaded", async () => {
    const completeNotes = appendActionMetadataToNotes("Action de terrain", {
      associationName: "Action spontanée",
    });

    const actions = [
      {
        id: "action-1",
        created_at: "2026-01-01",
        created_by_clerk_id: "user-1",
        actor_name: "Alice",
        action_date: "2026-01-01",
        location_label: "Parc A",
        latitude: 48.85,
        longitude: 2.35,
        waste_kg: 3,
        cigarette_butts: 12,
        volunteers_count: 4,
        duration_minutes: 45,
        status: "approved",
        notes: completeNotes,
        manual_drawing: null,
      },
      {
        id: "action-2",
        created_at: "2026-01-02",
        created_by_clerk_id: "user-1",
        actor_name: null,
        action_date: "2026-01-02",
        location_label: "Parc B",
        latitude: 48.86,
        longitude: 2.34,
        waste_kg: 3,
        cigarette_butts: 12,
        volunteers_count: 4,
        duration_minutes: 45,
        status: "approved",
        notes: completeNotes,
        manual_drawing: null,
      },
      {
        id: "action-3",
        created_at: "2026-01-03",
        created_by_clerk_id: "user-1",
        actor_name: "Alice",
        action_date: "2026-01-03",
        location_label: "Parc C",
        latitude: 48.87,
        longitude: 2.33,
        waste_kg: 3,
        cigarette_butts: 12,
        volunteers_count: 4,
        duration_minutes: 45,
        status: "pending",
        notes: completeNotes,
        manual_drawing: null,
      },
    ];

    const forms = [
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
        action_id: "action-2",
        group_id: "g2",
        status: "validated",
        created_at: "2026-01-04",
        validated_by_admin: true,
        is_duplicate: false,
        is_deleted: false,
        is_test: false,
      },
      {
        action_id: "action-3",
        group_id: "g3",
        status: "validated",
        created_at: "2026-01-04",
        validated_by_admin: true,
        is_duplicate: false,
        is_deleted: false,
        is_test: false,
      },
    ];

    const directSupabase = {
      from: vi.fn((table: string) => {
        if (table === "actions") {
          return createActionsQuery(actions);
        }
        if (table === "action_organizers") {
          const chain = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            limit: vi.fn(async () => ({ data: [], error: null })),
          } as OrganizerQuery;
          return chain;
        }
        if (table === "forms") {
          return createFormsQuery(forms);
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as unknown as SupabaseClient;

    const preloadedSupabase = {
      from: vi.fn((table: string) => {
        if (table === "actions") {
          throw new Error("actions table should not be queried when rows are preloaded");
        }
        if (table === "action_organizers") {
          const chain = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            limit: vi.fn(async () => ({ data: [], error: null })),
          } as OrganizerQuery;
          return chain;
        }
        if (table === "forms") {
          return createFormsQuery(forms);
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as unknown as SupabaseClient;

    const directCount = await loadValidatedCompleteActionCountForUser(directSupabase, "user-1");
    const preloadedCount = await loadValidatedCompleteActionCountForUser(preloadedSupabase, "user-1", {
      actionRows: actions,
    });

    expect(directCount).toBe(1);
    expect(preloadedCount).toBe(1);
  });
});
