import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deriveContextualCollectionUnits,
  normalizeActionCollectionContextReferenceRow,
  fetchActionCollectionReferenceAverages,
  invalidateActionCollectionReferenceAveragesCache,
  normalizeActionCollectionReferenceAverageRow,
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

  it("rejects malformed context rows and keeps zero values valid", () => {
    expect(normalizeActionCollectionContextReferenceRow({
      action_context: "school",
      waste_per_effective_unit: "0",
      butts_per_effective_unit: 0,
      waste_source_count: 2,
      butts_source_count: 2,
      eligible_action_count: 2,
      formula_version: "contextual-effective-units-v1",
      updated_at: null,
    })).toMatchObject({ wastePerEffectiveUnit: 0, buttsPerEffectiveUnit: 0 });
    expect(normalizeActionCollectionContextReferenceRow({
      action_context: "citizen",
      waste_source_count: "NaN",
      butts_source_count: 2,
      eligible_action_count: 2,
      formula_version: "contextual-effective-units-v1",
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
      updated_at: "2026-10-29T03:00:00.000Z",
    })).toEqual({
      wastePerVolunteer: 6,
      buttsPerVolunteer: 0,
      wasteSourceCount: 2,
      buttsSourceCount: 3,
      eligibleActionCount: 4,
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
});
