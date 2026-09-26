import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { reconcileMohsImpactProgression } from "./mohs-impact-reconciliation";

const loadConfirmedParticipantImpactAttributionsMock = vi.hoisted(() => vi.fn());
const insertProgressionEventMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/participation/group-participation-read", () => ({
  loadConfirmedParticipantImpactAttributions: loadConfirmedParticipantImpactAttributionsMock,
}));
vi.mock("./progression-data", () => ({
  insertProgressionEvent: insertProgressionEventMock,
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
  } as unknown as SupabaseClient;
  return { supabase, removedIds };
}

describe("Mohs impact event reconciliation", () => {
  it("writes no points ledger rows, is replay-safe, and removes a corrected threshold", async () => {
    loadConfirmedParticipantImpactAttributionsMock.mockResolvedValue([
      {
        actionId: "action-1",
        actionDate: "2026-09-26",
        userId: "user-1",
        attribution: attribution({ wasteKg: 180, wasteMohsValue: 180, wasteMohsSource: "equivalent_sec", wasteMohsEligible: true }),
      },
    ]);
    insertProgressionEventMock.mockResolvedValue(true);

    const first = createSupabase();
    const result = await reconcileMohsImpactProgression(first.supabase, "user-1");
    expect(result.inserted).toBe(9);
    expect(insertProgressionEventMock).toHaveBeenCalledTimes(9);
    expect(insertProgressionEventMock).toHaveBeenCalledWith(
      first.supabase,
      expect.objectContaining({
        eventType: "infinite_waste_milestone",
        sourceTable: "personal_impact_mohs",
        sourceId: "mohs:waste:grade:10",
        xpAwarded: 0.25,
        metadata: expect.objectContaining({ classification: "impact_badge" }),
      }),
    );
    expect(first.supabase.from).not.toHaveBeenCalledWith("points_ledger");

    insertProgressionEventMock.mockClear();
    const existing = Array.from({ length: 9 }, (_, index) => ({
      id: `event-${index + 1}`,
      source_id: `mohs:waste:grade:${index + 2}`,
      event_type: "infinite_waste_milestone",
    }));
    const replay = createSupabase(existing);
    const replayResult = await reconcileMohsImpactProgression(replay.supabase, "user-1");
    expect(replayResult.inserted).toBe(0);
    expect(replayResult.removed).toBe(0);
    expect(insertProgressionEventMock).not.toHaveBeenCalled();

    loadConfirmedParticipantImpactAttributionsMock.mockResolvedValue([]);
    const correction = createSupabase(existing);
    const correctionResult = await reconcileMohsImpactProgression(correction.supabase, "user-1");
    expect(correctionResult.inserted).toBe(0);
    expect(correctionResult.removed).toBe(9);
    expect(correction.removedIds).toEqual(existing.map((row) => row.id));
  });
});
