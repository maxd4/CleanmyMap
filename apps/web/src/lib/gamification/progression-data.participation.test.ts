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
  it("counts action_participants in collective events", async () => {
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
        if (table === "action_participants") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(async () => ({ data: null, error: null, count: 3 })),
            })),
          } as any;
        }
        if (table === "forms") {
          return createQueryChain([]);
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as any;

    const stats = await loadUserProgressionStats(supabase, "user-1");

    expect(stats.collectiveEvents).toBe(3);
  });
});
