import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import {
  loadUserLabelSummary,
  loadUserLevelRankingSummary,
} from "./progression-data";

const cacheState = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  promises: new Map<string, Promise<unknown>>(),
}));
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  unstable_cache: (factory: () => Promise<unknown>, keyParts: string[]) => {
    const key = keyParts.join("|");
    return async () => {
      if (!cacheState.promises.has(key)) {
        const value = await factory();
        cacheState.values.set(key, value);
        cacheState.promises.set(key, Promise.resolve(JSON.parse(JSON.stringify(value))));
      }
      return cacheState.promises.get(key)!;
    };
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
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
    cacheState.values.clear();
    cacheState.promises.clear();
    vi.clearAllMocks();
  });

  it("round-trips a serializable cache payload and reconstructs the latest labels Map", async () => {
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

    expect(first).toBeInstanceOf(Map);
    expect(second).toBeInstanceOf(Map);
    expect(first).not.toBe(second);
    expect(cacheState.values.get("gamification-user-label-summary|limit:10000")).toEqual([
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
    expect(cacheState.values.get("gamification-user-label-summary|limit:10000")).not.toBeInstanceOf(Map);
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

  it("keeps loadUserLevelRankingSummary usable after the label cache round-trip", async () => {
    const spontaneousNotes = appendActionMetadataToNotes("Action de terrain", {
      associationName: "Action spontanée",
    });
    const labelRows: ActionLabelRow[] = [
      {
        created_by_clerk_id: "user-2",
        actor_name: "Alice",
        notes: spontaneousNotes,
        action_date: "2026-01-03",
      },
    ];
    const { supabase, from: labelFrom, limit: labelLimit } = createLabelSummarySupabase(labelRows);
    const profileChain = {
      select: vi.fn(() => profileChain),
      order: vi.fn(() => profileChain),
      limit: vi.fn(async () => ({
        data: [{ user_id: "user-2", current_level: 3, xp_validated: 25 }],
        error: null,
      })),
    };
    const originalFrom = supabase.from;
    (supabase as unknown as { from: typeof supabase.from }).from = vi.fn((table: string) =>
      table === "progression_profiles" ? profileChain : originalFrom(table),
    ) as typeof supabase.from;
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const first = await loadUserLevelRankingSummary("user-2");
    const second = await loadUserLevelRankingSummary("user-2");

    expect(first.currentUserRow).toMatchObject({
      userId: "user-2",
      actorName: "Alice",
      currentLevel: 3,
      xpValidated: 25,
    });
    expect(second.currentUserRow).toEqual(first.currentUserRow);
    expect(labelFrom).toHaveBeenCalledTimes(1);
    expect(labelLimit).toHaveBeenCalledTimes(1);
  });
});
