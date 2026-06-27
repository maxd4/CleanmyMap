import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import { loadUserLabelSummary } from "./progression-data";

const cacheState = vi.hoisted(() => new Map<string, Promise<unknown>>());

vi.mock("next/cache", () => ({
  unstable_cache: (factory: () => Promise<unknown>, keyParts: string[]) => {
    const key = keyParts.join("|");
    return async () => {
      if (!cacheState.has(key)) {
        cacheState.set(key, Promise.resolve(factory()));
      }
      return cacheState.get(key)!;
    };
  },
}));

type ActionLabelRow = {
  created_by_clerk_id: string;
  actor_name: string | null;
  notes: string | null;
  action_date: string;
};

function createLabelSummarySupabase(rows: ActionLabelRow[]) {
  const limit = vi.fn(async () => ({ data: rows, error: null }));
  const chain = {
    select: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit,
  };
  const from = vi.fn(() => chain);

  return {
    supabase: {
      from,
    } as unknown as SupabaseClient,
    from,
    limit,
  };
}

describe("loadUserLabelSummary", () => {
  beforeEach(() => {
    cacheState.clear();
    vi.clearAllMocks();
  });

  it("caches the label summary and keeps the latest spontaneous label per user", async () => {
    const spontaneousNotes = appendActionMetadataToNotes("Action de terrain", {
      associationName: "Action spontanée",
    });
    const { supabase, from, limit } = createLabelSummarySupabase([
      {
        created_by_clerk_id: "user-2",
        actor_name: null,
        notes: spontaneousNotes,
        action_date: "2026-01-03",
      },
      {
        created_by_clerk_id: "user-1",
        actor_name: "Ignored",
        notes: "Action classique",
        action_date: "2026-01-02",
      },
      {
        created_by_clerk_id: "user-1",
        actor_name: "Alice",
        notes: spontaneousNotes,
        action_date: "2026-01-01",
      },
    ]);

    const first = await loadUserLabelSummary(supabase);
    const second = await loadUserLabelSummary(supabase);

    expect(first).toBe(second);
    expect(from).toHaveBeenCalledTimes(1);
    expect(limit).toHaveBeenCalledTimes(1);
    expect(Array.from(first.entries())).toEqual([
      [
        "user-2",
        {
          actorName: "user-2",
          associationName: "Action spontanée",
        },
      ],
      [
        "user-1",
        {
          actorName: "Alice",
          associationName: "Action spontanée",
        },
      ],
    ]);
  });
});
