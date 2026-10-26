import { vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ProgressionTestActionRow = {
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
};

type QueryResult<T> = { data: T[]; error: null };

function createActionQuery(getRows: () => ProgressionTestActionRow[]) {
  const state = {
    eq: {} as Record<string, string>,
    in: {} as Record<string, string[]>,
  };
  const filterRows = () =>
    getRows().filter((row) => {
      const createdBy = state.eq["created_by_clerk_id"];
      const id = state.eq["id"];
      const ids = state.in["id"];
      return (
        (!createdBy || row.created_by_clerk_id === createdBy) &&
        (!id || row.id === id) &&
        (!ids || ids.includes(row.id))
      );
    });
  const chain = {} as {
    select: (columns: string) => typeof chain;
    eq: (field: string, value: string) => typeof chain;
    in: (field: string, values: string[]) => typeof chain;
    order: (field: string, options?: { ascending?: boolean }) => typeof chain;
    limit: (value: number) => Promise<QueryResult<ProgressionTestActionRow>>;
    maybeSingle: () => Promise<{ data: ProgressionTestActionRow | null; error: null }>;
    then: (
      resolve: (value: QueryResult<ProgressionTestActionRow>) => void,
      reject: (reason: unknown) => void,
    ) => Promise<void>;
  };
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn((field: string, value: string) => {
    state.eq[field] = value;
    return chain;
  });
  chain.in = vi.fn((field: string, values: string[]) => {
    state.in[field] = values;
    return chain;
  });
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(async () => ({ data: filterRows(), error: null }));
  chain.maybeSingle = vi.fn(async () => ({ data: filterRows()[0] ?? null, error: null }));
  chain.then = (resolve, reject) => Promise.resolve({ data: filterRows(), error: null }).then(resolve, reject);
  return chain;
}

export function createEmptyChain() {
  const chain = {} as {
    select: (columns: string) => typeof chain;
    eq: (field: string, value: string) => typeof chain;
    in: (field: string, values: string[]) => typeof chain;
    neq: (field: string, value: string) => typeof chain;
    is: (field: string, value: boolean | null) => typeof chain;
    order: (field: string, options?: { ascending?: boolean }) => Promise<QueryResult<never>>;
    limit: (value: number) => Promise<QueryResult<never>>;
    maybeSingle: () => Promise<{ data: null; error: null }>;
  };
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.neq = vi.fn(() => chain);
  chain.is = vi.fn(() => chain);
  chain.order = vi.fn(async () => ({ data: [], error: null }));
  chain.limit = vi.fn(async () => ({ data: [], error: null }));
  chain.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
  return chain;
}

export function createActionOrganizerChain(getRows: () => ProgressionTestActionRow[]) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    limit: vi.fn(async () => ({
      data: getRows().map((row) => ({ action_id: row.id })),
      error: null,
    })),
  };
  return chain;
}

export function createValidatedFormsChain(getRows: () => ProgressionTestActionRow[]) {
  const chain = {
    select: vi.fn(() => chain),
    in: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(async () => ({
      data: getRows().map((row) => ({
        action_id: row.id,
        status: "validated",
        created_at: row.created_at,
        validated_by_admin: true,
        is_duplicate: false,
        is_deleted: false,
        is_test: false,
      })),
      error: null,
    })),
  };
  return chain;
}

export function createOrganizerChain() {
  const rows = [
    {
      action_id: "action-1",
      organizer_clerk_id: "user-1",
      organizer_label: "Alice",
      organizer_handle: "alice",
      is_primary: true,
      created_at: "2026-01-01",
    },
    {
      action_id: "action-1",
      organizer_clerk_id: "user-2",
      organizer_label: "Bob",
      organizer_handle: "bob",
      is_primary: false,
      created_at: "2026-01-01",
    },
  ];
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    then: (resolve: (value: { data: typeof rows; error: null }) => void, reject: (reason: unknown) => void) =>
      Promise.resolve({ data: [...rows], error: null }).then(resolve, reject),
  };
  return chain;
}

export function createFormsQuery() {
  const chain = {
    select: vi.fn(() => chain),
    in: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(async () => ({
      data: [{
        action_id: "action-1",
        group_id: "g1",
        status: "validated",
        created_at: "2026-01-02",
        validated_by_admin: true,
        is_duplicate: false,
        is_deleted: false,
        is_test: false,
      }],
      error: null,
    })),
  };
  return chain;
}

function createRecordingProgressionEvents(insertedEvents: Array<Record<string, unknown>>) {
  const chain = {
    error: null,
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    insert: vi.fn(async (row: Record<string, unknown>) => {
      insertedEvents.push(row);
      return { error: null };
    }),
  };
  return chain;
}

export function createNoopLedgerTable() {
  return {
    insert: vi.fn(async () => ({ error: null })),
    select: vi.fn(() => createEmptyChain()),
  };
}

export function createProgressionSupabase({
  actions,
  actionOrganizers,
  forms,
  progressionEvents,
  ledger = createNoopLedgerTable,
}: {
  actions: () => ProgressionTestActionRow[];
  actionOrganizers: () => unknown;
  forms: () => unknown;
  progressionEvents: () => unknown;
  ledger?: () => unknown;
}): SupabaseClient {
  return {
    from: vi.fn((table: string) => {
      if (table === "actions") {
        return createActionQuery(actions);
      }
      if (table === "action_organizers") {
        return actionOrganizers();
      }
      if (table === "forms") {
        return forms();
      }
      if (table === "progression_events") {
        return progressionEvents();
      }
      if (table === "points_ledger" || table === "xp_audit") {
        return ledger();
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  } as unknown as SupabaseClient;
}

export function createRecordingProgressionSupabase({
  actions,
  actionOrganizers,
  forms,
  insertedEvents,
}: {
  actions: ProgressionTestActionRow[];
  actionOrganizers: () => unknown;
  forms: () => unknown;
  insertedEvents: Array<Record<string, unknown>>;
}): SupabaseClient {
  return createProgressionSupabase({
    actions: () => actions,
    actionOrganizers,
    forms,
    progressionEvents: () => createRecordingProgressionEvents(insertedEvents),
  });
}
