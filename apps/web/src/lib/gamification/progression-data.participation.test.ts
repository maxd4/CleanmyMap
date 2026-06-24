import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { loadUserProgressionStats } from "./progression-data";

type QueryResult<T> = {
  data: T[];
  error: null;
};

type QueryChain<T> = {
  select: (columns: string) => QueryChain<T>;
  eq: (field: string, value: string) => QueryChain<T>;
  in: (field: string, values: string[]) => QueryChain<T>;
  neq: (field: string, value: string) => QueryChain<T>;
  is: (field: string, value: boolean | null) => QueryChain<T>;
  order: (field: string, options?: { ascending?: boolean }) => QueryChain<T>;
  limit: (value: number) => Promise<QueryResult<T>>;
  maybeSingle: () => Promise<{ data: null; error: null }>;
  then: (
    resolve: (value: QueryResult<T>) => void,
    reject: (reason: unknown) => void,
  ) => Promise<void>;
};

function createQueryChain<T>(result: T[]): QueryChain<T> {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => ({ data: result, error: null })),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    then: (
      resolve: (value: QueryResult<T>) => void,
      reject: (reason: unknown) => void,
    ) => Promise.resolve({ data: result, error: null }).then(resolve, reject),
  } as QueryChain<T>;
  return chain;
}

describe("loadUserProgressionStats", () => {
  it("uses the Supabase aggregate for participation counts", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "progression_events") {
          return createQueryChain([]);
        }
        if (table === "actions") {
          return createQueryChain([]);
        }
        if (table === "action_organizers") {
          return createQueryChain([]);
        }
        if (table === "forms") {
          return createQueryChain([]);
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === "load_gamification_user_counters") {
          return {
            data: [
              {
                total_points: 0,
                approved_actions_count: 0,
                complete_actions_count: 0,
                visited_places_count: 0,
                eligible_forms_count: 0,
                participation_count: 3,
              },
            ],
            error: null,
          };
        }
        throw new Error(`Unexpected rpc: ${name}`);
      }),
    } as unknown as SupabaseClient;

    const stats = await loadUserProgressionStats(supabase, "user-1");

    expect(stats.collectiveEvents).toBe(3);
  });
});
