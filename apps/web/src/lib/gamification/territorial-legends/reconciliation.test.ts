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
      rpc: vi.fn(async (name: string, args?: Record<string, unknown>) => {
        if (name === "get_territorial_legend_fact_revision") {
          return { data: "2026-11-03T10:00:00.000Z", error: null };
        }
        calls.push(args ?? {});
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
    loadFactsMock.mockResolvedValue({ actions: [], participations: [], consents: [], profiles: [], clerkEligibilityUnavailableUserIds: [] });
    winnersMock.mockReturnValue([winner]);
  });

  it("aborts before publication when Clerk eligibility is unavailable", async () => {
    loadFactsMock.mockResolvedValue({
      actions: [],
      participations: [],
      consents: [{ userId: "user-1", enabled: true, activatedAt: "2026-09-01T00:00:00.000Z", ageEligible: undefined }],
      profiles: [],
      clerkEligibilityUnavailableUserIds: ["user-1"],
    });
    const fixture = supabase();

    await expect(reconcileTerritorialLegendSnapshot(fixture.client, new Date("2026-11-03T12:00:00.000Z"), { refreshMissingAttributions: false }))
      .rejects.toThrow("éligibilité Clerk est indisponible");
    expect(fixture.calls).toHaveLength(0);
    expect(fixture.client.rpc).toHaveBeenCalledTimes(1);
  });

  it("persists a verified eligibility loss before calculating and publishing winners", async () => {
    loadFactsMock
      .mockResolvedValueOnce({
        actions: [],
        participations: [],
        consents: [{ userId: "user-1", enabled: true, ageBand: "under_15", verifiedAgeBand: "15_or_over", activatedAt: "2026-09-01T00:00:00.000Z", ageEligible: false }],
        profiles: [],
        clerkEligibilityUnavailableUserIds: [],
      })
      .mockResolvedValueOnce({
        actions: [],
        participations: [],
        consents: [{ userId: "user-1", enabled: true, ageBand: "under_15", verifiedAgeBand: "15_or_over", activatedAt: "2026-09-01T00:00:00.000Z", ageEligible: false }],
        profiles: [],
        clerkEligibilityUnavailableUserIds: [],
      })
      .mockResolvedValueOnce({
        actions: [],
        participations: [],
        consents: [{ userId: "user-1", enabled: false, ageBand: "15_or_over", activatedAt: "2026-09-01T00:00:00.000Z", revokedAt: "2026-11-03T12:00:00.000Z", ageEligible: false }],
        profiles: [],
        clerkEligibilityUnavailableUserIds: [],
      });
    const fixture = supabase();

    await reconcileTerritorialLegendSnapshot(fixture.client, new Date("2026-11-03T12:00:00.000Z"), { refreshMissingAttributions: false });

    expect(fixture.calls[0]).toMatchObject({
      p_user_id: "user-1",
      p_enabled: false,
      p_age_band: "15_or_over",
    });
    expect(fixture.calls[1]).toMatchObject({ p_winners: expect.any(Array) });
    expect(winnersMock).toHaveBeenCalledTimes(1);
    expect(winnersMock).toHaveBeenCalledWith(expect.objectContaining({
      consents: [expect.objectContaining({ enabled: false, ageBand: "15_or_over" })],
    }));
  });

  it("reloads canonical facts after revocation and aborts on a newly ineligible user", async () => {
    const ineligible = (userId: string) => ({ userId, enabled: true, ageBand: "15_or_over" as const, verifiedAgeBand: "under_15" as const, activatedAt: "2026-09-01T00:00:00.000Z", ageEligible: false });
    loadFactsMock
      .mockResolvedValueOnce({ actions: [], participations: [], consents: [ineligible("user-1")], profiles: [], clerkEligibilityUnavailableUserIds: [] })
      .mockResolvedValueOnce({ actions: [], participations: [], consents: [ineligible("user-1")], profiles: [], clerkEligibilityUnavailableUserIds: [] })
      .mockResolvedValueOnce({
        actions: [],
        participations: [],
        consents: [
          { userId: "user-1", enabled: false, ageBand: "under_15", ageEligible: false, activatedAt: "2026-09-01T00:00:00.000Z" },
          ineligible("user-2"),
        ],
        profiles: [],
        clerkEligibilityUnavailableUserIds: [],
      });
    const fixture = supabase();

    await expect(reconcileTerritorialLegendSnapshot(fixture.client, new Date("2026-11-03T12:00:00.000Z"), { refreshMissingAttributions: false }))
      .rejects.toThrow("nouvelle perte d’éligibilité");
    expect(fixture.calls).toHaveLength(1);
    expect(winnersMock).not.toHaveBeenCalled();
  });

  it("rejects a concurrent mutation detected during the complete reload", async () => {
    loadFactsMock
      .mockResolvedValueOnce({ actions: [], participations: [], consents: [{ userId: "user-1", enabled: true, ageEligible: false }], profiles: [], clerkEligibilityUnavailableUserIds: [] })
      .mockResolvedValueOnce({ actions: [], participations: [], consents: [{ userId: "user-1", enabled: true, ageEligible: false }], profiles: [], clerkEligibilityUnavailableUserIds: [] })
      .mockResolvedValueOnce({ actions: [], participations: [], consents: [{ userId: "user-1", enabled: false, ageEligible: false }], profiles: [], clerkEligibilityUnavailableUserIds: [] });
    let revisionReads = 0;
    const client = {
      rpc: vi.fn(async (name: string) => {
        if (name === "get_territorial_legend_fact_revision") {
          revisionReads += 1;
          return { data: revisionReads < 3 ? "revision-1" : "revision-2", error: null };
        }
        return { data: { status: "applied" }, error: null };
      }),
    } as unknown as SupabaseClient;

    await expect(reconcileTerritorialLegendSnapshot(client, new Date("2026-11-03T12:00:00.000Z"), { refreshMissingAttributions: false }))
      .rejects.toThrow("modification concurrente");
    expect(client.rpc).toHaveBeenCalledTimes(4);
    expect(winnersMock).not.toHaveBeenCalled();
  });

  it("fails closed when Clerk becomes unavailable during the complete reload", async () => {
    const facts = { actions: [], participations: [], consents: [{ userId: "user-1", enabled: true, ageEligible: false }], profiles: [], clerkEligibilityUnavailableUserIds: [] };
    loadFactsMock
      .mockResolvedValueOnce(facts)
      .mockResolvedValueOnce(facts)
      .mockResolvedValueOnce({ ...facts, clerkEligibilityUnavailableUserIds: ["user-1"] });
    const fixture = supabase();

    await expect(reconcileTerritorialLegendSnapshot(fixture.client, new Date("2026-11-03T12:00:00.000Z"), { refreshMissingAttributions: false }))
      .rejects.toThrow("éligibilité Clerk est indisponible");
    expect(fixture.calls).toHaveLength(1);
    expect(winnersMock).not.toHaveBeenCalled();
  });

  it("does not revoke a holding when the eligibility recheck becomes unavailable", async () => {
    loadFactsMock
      .mockResolvedValueOnce({
        actions: [],
        participations: [],
        consents: [{ userId: "user-1", enabled: true, ageBand: "under_15", activatedAt: "2026-09-01T00:00:00.000Z", ageEligible: false }],
        profiles: [],
        clerkEligibilityUnavailableUserIds: [],
      })
      .mockResolvedValueOnce({
        actions: [],
        participations: [],
        consents: [{ userId: "user-1", enabled: true, ageBand: "under_15", activatedAt: "2026-09-01T00:00:00.000Z", ageEligible: false }],
        profiles: [],
        clerkEligibilityUnavailableUserIds: ["user-1"],
      });
    const fixture = supabase();

    await expect(reconcileTerritorialLegendSnapshot(fixture.client, new Date("2026-11-03T12:00:00.000Z"), { refreshMissingAttributions: false }))
      .rejects.toThrow("éligibilité Clerk est indisponible");
    expect(fixture.calls).toHaveLength(0);
  });

  it("uses one civil effective date and stable winner evidence for concurrent calls", async () => {
    const fixture = supabase();
    const now = new Date("2026-11-03T02:00:00.000Z");
    await Promise.all([
      reconcileTerritorialLegendSnapshot(fixture.client, now, { refreshMissingAttributions: false }),
      reconcileTerritorialLegendSnapshot(fixture.client, now, { refreshMissingAttributions: false }),
    ]);
    expect(fixture.calls).toHaveLength(2);
    expect(fixture.calls[0]).toEqual(fixture.calls[1]);
    expect(fixture.calls[0]).toMatchObject({
      p_effective_on: "2026-11-03",
      p_fact_revision: "2026-11-03T10:00:00.000Z",
      p_winners: [{ user_id: "user-1", territory_code: "75056", tie_size: 2 }],
    });
  });

  it("serializes every tied winner with the database field names", async () => {
    winnersMock.mockReturnValue([winner, tiedWinner]);
    const fixture = supabase();

    await reconcileTerritorialLegendSnapshot(fixture.client, new Date("2026-11-03T12:00:00.000Z"), { refreshMissingAttributions: false });

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
      rpc: vi.fn(async (name: string) => name === "get_territorial_legend_fact_revision"
        ? { data: "2026-11-03T10:00:00.000Z", error: null }
        : { data: { status: "conflict" }, error: null }),
    } as unknown as SupabaseClient;
    await expect(reconcileTerritorialLegendSnapshot(client, new Date("2026-11-03T12:00:00.000Z"), { refreshMissingAttributions: false }))
      .rejects.toThrow("réponse invalide");
  });

  it("refuses to publish when the canonical fact revision changes during calculation", async () => {
    let revisionReads = 0;
    const client = {
      rpc: vi.fn(async (name: string) => {
        if (name === "get_territorial_legend_fact_revision") {
          revisionReads += 1;
          return { data: revisionReads === 1 ? "2026-11-03T10:00:00.000Z" : "2026-11-03T10:01:00.000Z", error: null };
        }
        return { data: { status: "applied" }, error: null };
      }),
    } as unknown as SupabaseClient;

    await expect(reconcileTerritorialLegendSnapshot(client, new Date("2026-11-03T12:00:00.000Z"), { refreshMissingAttributions: false }))
      .rejects.toThrow("modification des faits sources");
    expect(client.rpc).toHaveBeenCalledTimes(2);
  });
});
