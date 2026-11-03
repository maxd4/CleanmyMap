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
  level: "commune",
  territoryCode: "75056",
  territoryLabel: "Paris",
  effectiveOn: "2026-11-03",
  score: 2,
  rank: 1,
  tieSize: 2,
  sourceFingerprint: "source-1",
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
    expect(fixture.calls[0]).toMatchObject({ p_effective_on: "2026-11-03", p_winners: [winner] });
  });

  it("fails closed when the persistence RPC does not apply", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: { status: "conflict" }, error: null }),
    } as unknown as SupabaseClient;
    await expect(reconcileTerritorialLegendSnapshot(client, new Date("2026-11-03T12:00:00.000Z")))
      .rejects.toThrow("réponse invalide");
  });
});
