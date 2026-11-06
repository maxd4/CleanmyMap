import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACTION_COLLECTION_CONTEXT_FORMULA_VERSION,
  ACTION_COLLECTION_REFERENCE_FORMULA_VERSION,
} from "@/lib/impact/scientific-projection-versions";
import {
  deriveContextualCollectionUnits,
  normalizeActionCollectionContextReferenceRow,
  fetchActionCollectionReferenceAverages,
  invalidateActionCollectionReferenceAveragesCache,
  normalizeActionCollectionReferenceAverageRow,
  normalizeActionCollectionContextReferenceSnapshotPayload,
  referencesFromActionCollectionContextSnapshot,
  fetchActionCollectionContextReferenceAverages,
} from "./action-collection-reference-averages";

describe("action collection reference averages", () => {
  it.each([
    ["citizen", { childrenCount: 2, adultCount: 3, retiredCount: 0 }, 4, 4],
    ["company", { childrenCount: 4, adultCount: 17, retiredCount: 4 }, 21, 21],
    ["school", { childrenCount: 25, adultCount: 3, retiredCount: 0 }, 14.25, 3],
  ] as const)("derives %s operational units without mixing contexts", (actionContext, counts, wasteUnits, buttsUnits) => {
    expect(deriveContextualCollectionUnits({ actionContext: actionContext as "citizen" | "company" | "school", ...counts })).toEqual({
      wasteUnits,
      buttsUnits,
    });
  });

  it("keeps fractional contextual units positive and context-specific", () => {
    expect(deriveContextualCollectionUnits({
      actionContext: "citizen",
      childrenCount: 1,
      adultCount: 0,
      retiredCount: 0,
    })).toEqual({ wasteUnits: 0.5, buttsUnits: 0.5 });
    expect(deriveContextualCollectionUnits({
      actionContext: "school",
      childrenCount: 1,
      adultCount: 0,
      retiredCount: 0,
    })).toEqual({ wasteUnits: 0.45, buttsUnits: null });
  });

  it("does not invent a school butt denominator when there are no adults or when retirees are present", () => {
    expect(deriveContextualCollectionUnits({ actionContext: "school", childrenCount: 25, adultCount: 0, retiredCount: 0 })).toEqual({ wasteUnits: 11.25, buttsUnits: null });
    expect(deriveContextualCollectionUnits({ actionContext: "school", childrenCount: 25, adultCount: 3, retiredCount: 1 })).toEqual({ wasteUnits: null, buttsUnits: null });
  });

  it("rejects a complete composition when it does not reconcile with volunteersCount", () => {
    expect(deriveContextualCollectionUnits({
      actionContext: "school",
      childrenCount: 10,
      adultCount: 2,
      retiredCount: 0,
      volunteersCount: 11,
    })).toEqual({ wasteUnits: null, buttsUnits: null });
    expect(deriveContextualCollectionUnits({
      actionContext: "school",
      childrenCount: 10,
      adultCount: 2,
      retiredCount: 0,
      volunteersCount: 12,
    })).toEqual({ wasteUnits: 6.5, buttsUnits: 2 });
  });

  it("rejects malformed context rows and keeps zero values valid", () => {
    expect(normalizeActionCollectionContextReferenceRow({
      action_context: "school",
      waste_per_effective_unit: "0",
      butts_per_effective_unit: 0,
      waste_source_count: 2,
      butts_source_count: 2,
      eligible_action_count: 2,
      formula_version: ACTION_COLLECTION_CONTEXT_FORMULA_VERSION,
      updated_at: null,
    })).toMatchObject({ wastePerEffectiveUnit: 0, buttsPerEffectiveUnit: 0 });
    expect(normalizeActionCollectionContextReferenceRow({
      action_context: "citizen",
      waste_source_count: "NaN",
      butts_source_count: 2,
      eligible_action_count: 2,
      formula_version: ACTION_COLLECTION_CONTEXT_FORMULA_VERSION,
    })).toBeNull();
  });
  beforeEach(() => {
    invalidateActionCollectionReferenceAveragesCache();
  });

  it("keeps independent source counts and a zero as a valid average", () => {
    expect(normalizeActionCollectionReferenceAverageRow({
      waste_per_volunteer: "6",
      butts_per_volunteer: "0",
      waste_source_count: 2,
      butts_source_count: 3,
      eligible_action_count: 4,
      formula_version: ACTION_COLLECTION_REFERENCE_FORMULA_VERSION,
      updated_at: "2026-10-29T03:00:00.000Z",
    })).toEqual({
      wastePerVolunteer: 6,
      buttsPerVolunteer: 0,
      wasteSourceCount: 2,
      buttsSourceCount: 3,
      eligibleActionCount: 4,
      formulaVersion: ACTION_COLLECTION_REFERENCE_FORMULA_VERSION,
      updatedAt: "2026-10-29T03:00:00.000Z",
    });
  });

  it("reads the versioned average RPC without touching the map score RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        waste_per_volunteer: "6",
        butts_per_volunteer: "200",
        waste_source_count: 2,
        butts_source_count: 3,
        eligible_action_count: 4,
        formula_version: ACTION_COLLECTION_REFERENCE_FORMULA_VERSION,
        updated_at: "2026-10-29T03:00:00.000Z",
      }],
      error: null,
    });

    await expect(fetchActionCollectionReferenceAverages({ rpc } as never)).resolves.toMatchObject({
      wastePerVolunteer: 6,
      buttsPerVolunteer: 200,
      wasteSourceCount: 2,
      buttsSourceCount: 3,
    });
    expect(rpc).toHaveBeenCalledWith("action_collection_reference_averages_v1");
  });

  it("rejects malformed counts instead of fabricating a reference", () => {
    expect(normalizeActionCollectionReferenceAverageRow({
      waste_per_volunteer: 6,
      butts_per_volunteer: 200,
      waste_source_count: 1.5,
      butts_source_count: 3,
      eligible_action_count: 4,
    })).toBeNull();
  });

  it("does not serve a reference fetched with an obsolete formula version", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        waste_per_volunteer: 6,
        butts_per_volunteer: 200,
        waste_source_count: 2,
        butts_source_count: 3,
        eligible_action_count: 4,
        formula_version: "action-collection-reference-averages-v0",
      }],
      error: null,
    });

    await expect(fetchActionCollectionReferenceAverages({ rpc } as never)).resolves.toBeNull();
  });

  it("normalizes a monthly contextual snapshot without exposing action rows", () => {
    const payload = normalizeActionCollectionContextReferenceSnapshotPayload({
      period: "2026-11-01",
      generatedAt: "2026-11-01T03:20:00.000Z",
      formulaVersion: ACTION_COLLECTION_CONTEXT_FORMULA_VERSION,
      source: "action_collection_context_reference_averages_v1",
      references: Object.fromEntries([
        ["citizen", 10],
        ["company", 8],
        ["school", 6],
      ].map(([actionContext, value]) => [actionContext, {
        actionContext,
        waste: { value, sourceCount: 2, period: "2026-11-01", generatedAt: "2026-11-01T03:20:00.000Z" },
        butts: { value: 190, sourceCount: 2, period: "2026-11-01", generatedAt: "2026-11-01T03:20:00.000Z" },
        eligibleActionCount: 2,
        formulaVersion: ACTION_COLLECTION_CONTEXT_FORMULA_VERSION,
      }])),
    });

    expect(payload).not.toBeNull();
    const references = referencesFromActionCollectionContextSnapshot(payload!);
    expect(references.citizen).toMatchObject({
      wastePerEffectiveUnit: 10,
      wasteSourceCount: 2,
      wasteReferencePeriod: "2026-11-01",
    });
    expect(JSON.stringify(references)).not.toContain("actionId");
  });

  it("passes the monthly as-of boundary to the dated RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        action_context: "citizen",
        waste_per_effective_unit: 10,
        butts_per_effective_unit: 190,
        waste_source_count: 2,
        butts_source_count: 2,
        eligible_action_count: 2,
        formula_version: ACTION_COLLECTION_CONTEXT_FORMULA_VERSION,
        updated_at: "2026-10-31T23:00:00.000Z",
      }],
      error: null,
    });

    await fetchActionCollectionContextReferenceAverages({ rpc } as never, {
      asOfDate: "2026-10-31",
    });

    expect(rpc).toHaveBeenCalledWith(
      "action_collection_context_reference_averages_v1",
      { p_as_of_date: "2026-10-31" },
    );
  });
});
