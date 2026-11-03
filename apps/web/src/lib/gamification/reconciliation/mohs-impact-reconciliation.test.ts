import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  buildMohsScientificReconciliationId,
  buildMohsSourceFingerprint,
  reconcileMohsImpactProgression,
} from "./mohs-impact-reconciliation";

const loadConfirmedParticipantImpactAttributionsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/participation/group-participation-read", () => ({
  loadConfirmedParticipantImpactAttributions: loadConfirmedParticipantImpactAttributionsMock,
}));

function attribution(overrides: Record<string, unknown> = {}) {
  return {
    wasteKg: null,
    wasteKind: "unavailable",
    wasteEquivalentSecKg: null,
    wasteMohsValue: null,
    wasteMohsSource: null,
    cigaretteButts: null,
    cigaretteButtsKind: "unavailable",
    cigaretteButtsProvenance: null,
    wasteInconsistent: false,
    cigaretteButtsInconsistent: false,
    wasteMohsEligible: false,
    cigaretteButtsMohsEligible: false,
    ...overrides,
  };
}

function createSupabase(existing: Array<{ id: string; source_id: string; event_type: string }> = []) {
  const removedIds: string[] = [];
  const selected = {
    select: vi.fn(() => selected),
    eq: vi.fn(() => selected),
    in: vi.fn(() => selected),
    limit: vi.fn(async () => ({ data: existing, error: null })),
  };
  const deleted = {
    delete: vi.fn(() => ({
      in: vi.fn(async (_field: string, ids: string[]) => {
        removedIds.push(...ids);
        return { error: null };
      }),
    })),
  };
  const supabase = {
    from: vi.fn(() => ({ ...selected, ...deleted })),
    rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name !== "apply_mohs_impact_reconciliation" && name !== "apply_mohs_impact_reconciliation_with_receipt") {
        throw new Error(`Unexpected RPC ${name}`);
      }
      removedIds.push(...((args.p_events_to_remove as number[]) ?? []).map(String));
      return {
        data: {
          status: "applied",
          inserted: ((args.p_events_to_add as unknown[]) ?? []).length,
          updated: ((args.p_events_to_update as unknown[]) ?? []).length,
          removed: ((args.p_events_to_remove as unknown[]) ?? []).length,
        },
        error: null,
      };
    }),
  } as unknown as SupabaseClient;
  return { supabase, removedIds };
}

describe("Mohs impact event reconciliation", () => {
  it("keeps the scientific reconciliation identity fixed-size for large source sets", () => {
    const fingerprints = [1, 40, 50, 6000].map((count) =>
      buildMohsSourceFingerprint(
        Array.from({ length: count }, (_, index) => ({
          actionId: `action-${index}`,
          actionDate: "2026-09-25",
          attribution: attribution({
            wasteMohsValue: index,
            wasteMohsSource: "equivalent_sec",
          }),
        })) as never,
      ),
    );
    const identities = fingerprints.map((fingerprint) =>
      buildMohsScientificReconciliationId(
        "user-1",
        "mohs-impact-v1|mass-v2",
        fingerprint,
      ),
    );

    expect(new Set(identities.map((identity) => identity.length)).size).toBe(1);
    expect(identities.every((identity) =>
      /^scientific-impact-reconciliation-v2\|[0-9a-f]{64}$/.test(identity),
    )).toBe(true);
    expect(identities.every((identity) => identity.length < 2704)).toBe(true);
    expect(new Set(identities).size).toBe(4);
  });

  it("changes the bounded identity when the canonical source or method changes", () => {
    const source = buildMohsSourceFingerprint([
      {
        actionId: "action-identity",
        actionDate: "2026-09-25",
        attribution: attribution({ wasteMohsValue: 10, wasteMohsSource: "equivalent_sec" }),
      },
    ] as never);

    const current = buildMohsScientificReconciliationId("user-1", "method-v1", source);
    const changedSource = buildMohsScientificReconciliationId("user-1", "method-v1", `${source}:changed`);
    const changedMethod = buildMohsScientificReconciliationId("user-1", "method-v2", source);

    expect(changedSource).not.toBe(current);
    expect(changedMethod).not.toBe(current);
  });

  it("does not create a butt threshold from a non-recalculable historical lot", async () => {
    loadConfirmedParticipantImpactAttributionsMock.mockResolvedValue([
      {
        actionId: "action-unknown-lot",
        actionDate: "2026-09-25",
        userId: "user-1",
        attribution: attribution({
          cigaretteButts: 600,
          cigaretteButtsKind: "individual",
          cigaretteButtsProvenance: "derived",
          cigaretteButtsMohsEligible: false,
        }),
      },
    ]);
    const supabase = createSupabase().supabase as unknown as { rpc: ReturnType<typeof vi.fn> };

    const result = await reconcileMohsImpactProgression(supabase as unknown as SupabaseClient, "user-1");

    expect(result.inserted).toBe(0);
    expect(supabase.rpc).toHaveBeenCalledWith(
      "apply_mohs_impact_reconciliation",
      expect.objectContaining({ p_events_to_add: [] }),
    );
  });

  it("writes no points ledger rows, is replay-safe, and removes a corrected threshold", async () => {
    loadConfirmedParticipantImpactAttributionsMock.mockResolvedValue([
      {
        actionId: "action-1",
        actionDate: "2026-09-26",
        userId: "user-1",
        attribution: attribution({ wasteKg: 180, wasteMohsValue: 180, wasteMohsSource: "equivalent_sec", wasteMohsEligible: true }),
      },
    ]);
    const first = createSupabase();
    const result = await reconcileMohsImpactProgression(first.supabase, "user-1");
    expect(result.inserted).toBe(9);
    expect(loadConfirmedParticipantImpactAttributionsMock).toHaveBeenLastCalledWith(
      first.supabase,
      "user-1",
      6000,
      { recalculateDerived: true },
    );
    expect(first.supabase.rpc).toHaveBeenCalledWith(
      "apply_mohs_impact_reconciliation",
      expect.objectContaining({
        p_events_to_add: expect.arrayContaining([
          expect.objectContaining({
            event_type: "infinite_waste_milestone",
            source_table: "personal_impact_mohs",
            source_id: "mohs:waste:grade:10",
            xp_awarded: 0.25,
            metadata: expect.objectContaining({ classification: "impact_badge" }),
          }),
        ]),
      }),
    );
    expect(first.supabase.from).not.toHaveBeenCalledWith("points_ledger");

    const existing = Array.from({ length: 9 }, (_, index) => ({
      id: String(index + 1),
      source_id: `mohs:waste:grade:${index + 2}`,
      event_type: "infinite_waste_milestone",
      metadata: { mohsVersion: "mohs-impact-v1" },
    }));
    const replay = createSupabase(existing);
    const replayResult = await reconcileMohsImpactProgression(replay.supabase, "user-1");
    expect(replayResult.inserted).toBe(0);
    expect(replayResult.removed).toBe(0);

    loadConfirmedParticipantImpactAttributionsMock.mockResolvedValue([]);
    const correction = createSupabase(existing);
    const correctionResult = await reconcileMohsImpactProgression(correction.supabase, "user-1");
    expect(correctionResult.inserted).toBe(0);
    expect(correctionResult.removed).toBe(9);
    expect(correction.removedIds).toEqual(existing.map((row) => row.id));
  });

  it("keeps a legacy event and retries a stale concurrent snapshot", async () => {
    loadConfirmedParticipantImpactAttributionsMock.mockResolvedValue([
      {
        actionId: "action-2",
        actionDate: "2026-09-27",
        userId: "user-1",
        attribution: attribution({ wasteMohsValue: 20, wasteMohsSource: "equivalent_sec", wasteMohsEligible: true }),
      },
    ]);
    const existing = [{
      id: "20",
      source_id: "mohs:waste:grade:2",
      event_type: "infinite_waste_milestone",
      metadata: { legacy: true },
    }];
    const supabase = createSupabase(existing).supabase as unknown as { rpc: ReturnType<typeof vi.fn> };
    let calls = 0;
    supabase.rpc.mockImplementation(async () => {
      calls += 1;
      return calls === 1
        ? { data: { status: "conflict" }, error: null }
        : { data: { status: "applied", inserted: 0, updated: 0, removed: 0 }, error: null };
    });

    const result = await reconcileMohsImpactProgression(supabase as unknown as SupabaseClient, "user-1");
    expect(calls).toBe(2);
    expect(result.inserted).toBe(0);
    expect(result.removed).toBe(0);
  });

  it("does not remove current Mohs events when the scientific source read fails", async () => {
    loadConfirmedParticipantImpactAttributionsMock.mockRejectedValue(
      new Error("participant projection unavailable"),
    );
    const existing = [{
      id: "30",
      source_id: "mohs:waste:grade:2",
      event_type: "infinite_waste_milestone",
    }];
    const failed = createSupabase(existing);

    await expect(reconcileMohsImpactProgression(failed.supabase, "user-1"))
      .rejects.toThrow("participant projection unavailable");
    expect(failed.supabase.rpc).not.toHaveBeenCalled();
    expect(failed.removedIds).toEqual([]);
  });

  it("writes the pending scientific receipt intent in the same RPC call when requested", async () => {
    loadConfirmedParticipantImpactAttributionsMock.mockResolvedValue([
      {
        actionId: "action-3",
        actionDate: "2026-09-28",
        userId: "user-1",
        attribution: attribution({ wasteMohsValue: 20, wasteMohsSource: "equivalent_sec", wasteMohsEligible: true }),
      },
    ]);
    const { supabase } = createSupabase();

    await reconcileMohsImpactProgression(supabase, "user-1", {
      persistScientificReceiptIntent: true,
    });

    expect(supabase.rpc).toHaveBeenCalledWith(
      "apply_mohs_impact_reconciliation_with_receipt",
      expect.objectContaining({
        p_scientific_receipt_intent: expect.objectContaining({
          kind: "scientific_impact_reconciliation_pending",
          reconciliationId: expect.stringMatching(/^scientific-impact-reconciliation-v2\|[0-9a-f]{64}$/),
          scientificImpact: expect.objectContaining({ eventsAdded: 1 }),
        }),
      }),
    );
  });
});
