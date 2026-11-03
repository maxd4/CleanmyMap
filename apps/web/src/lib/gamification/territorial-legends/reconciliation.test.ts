import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TerritorialLegendWinnerSnapshot } from "./types";

const loadFactsMock = vi.hoisted(() => vi.fn());
const winnersMock = vi.hoisted(() => vi.fn());

vi.mock("./engine", () => ({
  loadTerritorialLegendFacts: loadFactsMock,
  buildTerritorialLegendWinnerSnapshots: winnersMock,
}));

import { reconcileTerritorialLegendSnapshot } from "./reconciliation";

const winner: TerritorialLegendWinnerSnapshot = {
  userId: "user-1",
  campaignYear: 2026,
  level: "commune",
  territoryCode: "75056",
  territoryLabel: "Paris",
  effectiveOn: "2026-11-03",
  score: 2,
  rank: 1,
  tieSize: 2,
  sourceFingerprint: "source-1",
};

const tiedWinner: TerritorialLegendWinnerSnapshot = {
  ...winner,
  userId: "user-2",
  sourceFingerprint: "source-2",
};

function supabase() {
  const calls: Array<Record<string, unknown>> = [];
  return {
    calls,
    client: {
      rpc: vi.fn(async (_name: string, args: Record<string, unknown>) => {
        calls.push(args);
        return {
          data: { status: "applied", affectedUserIds: ["user-1"], insertedProofs: 1, extendedPeriods: 0, closedPeriods: 0 },
          error: null,
        };
      }),
    } as unknown as SupabaseClient,
  };
}

describe("territorial legend snapshot reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadFactsMock.mockResolvedValue({ actions: [], participations: [], consents: [], profiles: [] });
    winnersMock.mockReturnValue([winner]);
  });

  it("uses one civil effective date and stable winner evidence for concurrent calls", async () => {
    const fixture = supabase();
    const now = new Date("2026-11-03T02:00:00.000Z");
    await Promise.all([
      reconcileTerritorialLegendSnapshot(fixture.client, now),
      reconcileTerritorialLegendSnapshot(fixture.client, now),
    ]);
    expect(fixture.calls).toHaveLength(2);
    expect(fixture.calls[0]).toEqual(fixture.calls[1]);
    expect(fixture.calls[0]).toMatchObject({
      p_effective_on: "2026-11-03",
      p_winners: [{ user_id: "user-1", territory_code: "75056", tie_size: 2 }],
    });
  });

  it("serializes every tied winner with the database field names", async () => {
    winnersMock.mockReturnValue([winner, tiedWinner]);
    const fixture = supabase();

    await reconcileTerritorialLegendSnapshot(fixture.client, new Date("2026-11-03T12:00:00.000Z"));

    expect(fixture.calls[0]?.p_winners).toEqual([
      {
        user_id: "user-1",
        campaign_year: 2026,
        level: "commune",
        territory_code: "75056",
        territory_label: "Paris",
        effective_on: "2026-11-03",
        score: 2,
        rank: 1,
        tie_size: 2,
        source_fingerprint: "source-1",
      },
      {
        user_id: "user-2",
        campaign_year: 2026,
        level: "commune",
        territory_code: "75056",
        territory_label: "Paris",
        effective_on: "2026-11-03",
        score: 2,
        rank: 1,
        tie_size: 2,
        source_fingerprint: "source-2",
      },
    ]);
    expect(fixture.calls[0]?.p_winners).not.toEqual(expect.arrayContaining([expect.objectContaining({ userId: "user-1" })]));
  });

  it("fails closed when the persistence RPC does not apply", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: { status: "conflict" }, error: null }),
    } as unknown as SupabaseClient;
    await expect(reconcileTerritorialLegendSnapshot(client, new Date("2026-11-03T12:00:00.000Z")))
      .rejects.toThrow("réponse invalide");
  });
});
