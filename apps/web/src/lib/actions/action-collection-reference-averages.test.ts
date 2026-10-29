import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchActionCollectionReferenceAverages,
  invalidateActionCollectionReferenceAveragesCache,
  normalizeActionCollectionReferenceAverageRow,
} from "./action-collection-reference-averages";

describe("action collection reference averages", () => {
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
