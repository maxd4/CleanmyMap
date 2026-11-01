import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  previewScientificImpactGamification,
  reconcileScientificImpactGamification,
} from "./scientific-impact-gamification-reconciliation";

const calls = vi.hoisted(() => [] as string[]);
const loadSnapshotMock = vi.hoisted(() => vi.fn());
const reconcileUserMock = vi.hoisted(() => vi.fn());
const previewMohsMock = vi.hoisted(() => vi.fn());
const reconcileMohsMock = vi.hoisted(() => vi.fn());
const buildReceiptMock = vi.hoisted(() => vi.fn());
const persistReceiptMock = vi.hoisted(() => vi.fn());

vi.mock("./gamification-reconciliation-plan", () => ({
  loadGamificationReconciliationSnapshot: loadSnapshotMock,
}));
vi.mock("./gamification-reconciliation", () => ({
  reconcileUserGamification: reconcileUserMock,
}));
vi.mock("./mohs-impact-reconciliation", () => ({
  MOHS_IMPACT_CALCULATION_VERSION: "mohs-impact-v1|mass-v2",
  previewMohsImpactProgression: previewMohsMock,
  reconcileMohsImpactProgression: reconcileMohsMock,
}));
vi.mock("./gamification-reconciliation-receipt", () => ({
  buildGamificationReconciliationReceipt: buildReceiptMock,
  persistGamificationReconciliationReceipt: persistReceiptMock,
}));

function plan() {
  return {
    userId: "user-1",
    rulesVersionBefore: "v2",
    rulesVersionAfter: "v2",
    rulesRevisionBefore: 2,
    rulesRevisionAfter: 2,
    xpBefore: 2,
    xpExpected: 2,
    xpDelta: 0,
    levelBefore: 1,
    levelAfter: 1,
    eventsToAdd: [],
    eventsToUpdate: [],
    eventsToRemove: [],
    badgesAdded: [],
    badgesRemoved: [],
    milestonesAdded: [],
    milestonesRemoved: [],
    currentEventCountBefore: 1,
    legacyEventCountPreserved: 1,
    expected: {} as never,
    currentPersisted: [],
  };
}

function impact(overrides: Record<string, unknown> = {}) {
  return {
    totals: {
      wasteRawKg: 0,
      wasteEquivalentSecKg: 0,
      wasteMohsKg: 0,
      wasteQuotePartRawKg: 0,
      wasteUnknownConditionCount: 0,
      butts: 0,
      buttsCounted: 0,
      buttsDerived: 0,
    },
    methodVersion: "mohs-impact-v1|mass-v2",
    eligibleSourceRows: 1,
    sourceFingerprint: "fingerprint-1",
    inserted: 0,
    updated: 0,
    removed: 0,
    ...overrides,
  };
}

describe("scientific impact gamification reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calls.length = 0;
  });

  it("previews without writes and attaches the source-derived diff", async () => {
    loadSnapshotMock.mockResolvedValue({ plan: plan() });
    previewMohsMock.mockResolvedValue({
      ...impact(),
      eventsToAdd: 1,
      eventsToUpdate: 0,
      eventsToRemove: 0,
    });

    const result = await previewScientificImpactGamification({} as SupabaseClient, "user-1");

    expect(result.plan.scientificImpact).toMatchObject({
      eventsToAdd: 1,
      sourceFingerprint: "fingerprint-1",
    });
    expect(reconcileUserMock).not.toHaveBeenCalled();
    expect(reconcileMohsMock).not.toHaveBeenCalled();
    expect(persistReceiptMock).not.toHaveBeenCalled();
  });

  it("converges Mohs before gamification and persists one traceable impact receipt", async () => {
    reconcileMohsMock.mockImplementation(async () => {
      calls.push("mohs");
      return impact({ inserted: 1, updated: 1, removed: 1 });
    });
    reconcileUserMock.mockImplementation(async () => {
      calls.push("gamification");
      return { plan: plan(), receipt: null, inserted: 0, updated: 0, removed: 0 };
    });
    buildReceiptMock.mockReturnValue({
      reconciliationId: "scientific-impact-reconciliation|user-1|mohs-impact-v1|fingerprint-1",
      hasUserVisibleChanges: false,
    });
    persistReceiptMock.mockResolvedValue(undefined);

    const result = await reconcileScientificImpactGamification({} as SupabaseClient, "user-1");

    expect(calls).toEqual(["mohs", "gamification"]);
    expect(reconcileUserMock).toHaveBeenCalledWith(expect.anything(), "user-1", expect.objectContaining({
      reasonCategory: "scientific_impact_update",
    }));
    expect(persistReceiptMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      scientificImpact: expect.objectContaining({ eventsAdded: 1, eventsUpdated: 1, eventsRemoved: 1 }),
      hasUserVisibleChanges: true,
    }));
    expect(result.impact.inserted).toBe(1);
    expect(result.plan.scientificImpact?.eventsToAdd).toBe(1);
    expect(result.receipt).toMatchObject({
      scientificImpact: { eventsAdded: 1, eventsUpdated: 1, eventsRemoved: 1 },
      hasUserVisibleChanges: true,
    });
  });

  it("does not create an impact receipt for an idempotent zero-diff replay", async () => {
    reconcileMohsMock.mockResolvedValue(impact());
    reconcileUserMock.mockResolvedValue({ plan: plan(), receipt: null, inserted: 0, updated: 0, removed: 0 });

    await reconcileScientificImpactGamification({} as SupabaseClient, "user-1");

    expect(persistReceiptMock).not.toHaveBeenCalled();
  });

  it("does not refresh gamification or persist a receipt after a failed scientific read", async () => {
    reconcileMohsMock.mockRejectedValue(new Error("participant projection unavailable"));

    await expect(reconcileScientificImpactGamification({} as SupabaseClient, "user-1"))
      .rejects.toThrow("participant projection unavailable");
    expect(reconcileUserMock).not.toHaveBeenCalled();
    expect(buildReceiptMock).not.toHaveBeenCalled();
    expect(persistReceiptMock).not.toHaveBeenCalled();
  });
});
