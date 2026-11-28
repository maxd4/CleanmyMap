import { describe, expect, it, vi } from "vitest";
import {
  mapActionStatusToSpotStatuses,
  normalizeExternalActionImport,
  toCanonicalSpotContract,
} from "@/lib/actions/unified-source/contracts";
import type { ActionContractCreatePayload } from "@/lib/actions/contracts/contract-builders";
import type { TrashSpotterSpotRow } from "@/lib/actions/unified-source/types";

vi.mock("server-only", () => ({}));

function buildSpot(overrides: Partial<TrashSpotterSpotRow> = {}): TrashSpotterSpotRow {
  return {
    id: "spot-projection",
    created_at: "2026-11-27T10:00:00.000Z",
    created_by_clerk_id: "clerk-spot-owner",
    label: "Place observée",
    spot_type: "spot",
    latitude: 48.85,
    longitude: 2.35,
    derived_geometry_kind: "polyline",
    derived_geometry_geojson: JSON.stringify({ type: "LineString", coordinates: [[2.35, 48.85], [2.36, 48.86]] }),
    geometry_confidence: 0.9,
    geometry_source: "manual",
    status: "validated",
    notes: "Note terrain\n[cmm-waste:plastic,unknown,plastic]",
    ...overrides,
  };
}

describe("unified source contract projections", () => {
  it("maps every action status into the canonical spot status contract", () => {
    expect(mapActionStatusToSpotStatuses(null)).toBeNull();
    expect(mapActionStatusToSpotStatuses("pending")).toEqual(["new"]);
    expect(mapActionStatusToSpotStatuses("approved")).toEqual(["validated", "cleaned"]);
    expect(mapActionStatusToSpotStatuses("rejected")).toEqual([]);
  });

  it("normalizes external import values and returns data quality from the declared measurements", () => {
    const imported: ActionContractCreatePayload = {
      type: "action",
      source: "external_partner",
      location: { label: "Parc", latitude: 48.85, longitude: 2.35 },
      dates: { observedAt: "2026-11-26" },
      metadata: { wasteKg: 4.5, cigaretteButts: 12, volunteersCount: 3, durationMinutes: 60 },
    };

    const result = normalizeExternalActionImport(imported);

    expect(result.payload).toMatchObject({
      actionDate: "2026-11-26",
      locationLabel: "Parc",
      latitude: 48.85,
      longitude: 2.35,
      wasteKg: 4.5,
      cigaretteButts: 12,
      volunteersCount: 3,
      durationMinutes: 60,
    });
    expect(result.dataQuality).toMatchObject({ status: expect.any(String) });
  });

  it("preserves spot categories and geometry while mapping validated and cleaned place semantics", () => {
    const spot = toCanonicalSpotContract(buildSpot());
    expect(spot.type).toBe("spot");
    expect(spot.status).toBe("approved");
    expect(spot.sourceStatus).toBe("validated");
    expect(spot.metadata.wasteCategories).toEqual(["plastic"]);
    expect(spot.metadata.notes).toBe("Note terrain");
    expect(spot.geometry.geometrySource).toBe("manual");

    const cleanedPlace = toCanonicalSpotContract(buildSpot({ spot_type: "  PLACE " , status: "cleaned" }));
    expect(cleanedPlace.type).toBe("clean_place");
    expect(cleanedPlace.status).toBe("approved");
    expect(cleanedPlace.metadata.wasteCategories).toEqual([]);
  });

  it("maps new observations into new action status without inferring missing identity", () => {
    const fresh = toCanonicalSpotContract(buildSpot({
      spot_type: null,
      created_by_clerk_id: null,
      status: "new",
      notes: null,
      derived_geometry_kind: null,
      derived_geometry_geojson: null,
      geometry_confidence: null,
      geometry_source: null,
    }));
    expect(fresh.type).toBe("clean_place");
    expect(fresh.status).toBe("pending");
    expect(fresh.createdByClerkId).toBeNull();
    expect(fresh.metadata.wasteCategories).toEqual([]);
  });
});
