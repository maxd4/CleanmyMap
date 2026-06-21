import { describe, expect, it, vi } from "vitest";
import { loadUserProgressionStats } from "./progression-data";

function createQueryChain<T>(result: T[]) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => ({ data: result, error: null })),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    then: (resolve: (value: any) => void, reject: (reason: unknown) => void) =>
      Promise.resolve({ data: result, error: null }).then(resolve, reject),
  };

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
    } as any;

    const stats = await loadUserProgressionStats(supabase, "user-1");

    expect(stats.collectiveEvents).toBe(3);
  });
});
