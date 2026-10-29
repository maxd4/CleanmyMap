import { describe, expect, it } from "vitest";
import { mapFeedRowsToPublicContracts } from "./map-http-contracts";

function row(overrides: Record<string, unknown> = {}) {
  return {
    source: "actions",
    entity_type: "action",
    id: "action-1",
    created_at: "2026-10-29T10:00:00.000Z",
    updated_at: "2026-10-29T10:05:00.000Z",
    status: "approved",
    observed_at: "2026-10-29",
    location_label: "Paris",
    latitude: 48.85,
    longitude: 2.35,
    waste_kg: 1,
    cigarette_butts: 10,
    volunteers_count: 15,
    duration_minutes: 60,
    notes: null,
    derived_geometry_kind: "point",
    derived_geometry_geojson: null,
    geometry_confidence: 1,
    geometry_source: "fallback_point",
    ...overrides,
  };
}

describe("public action map classification hydration", () => {
  it("hydrates the three public classification fields without a creator identity", () => {
    const [contract] = mapFeedRowsToPublicContracts([row({
      action_context: "school",
      action_context_source: "automatic_children_ratio",
      school_context_confirmed: null,
    })]);

    expect(contract?.metadata).toMatchObject({
      actionContext: "school",
      actionContextSource: "automatic_children_ratio",
      schoolContextConfirmed: null,
    });
    expect(contract?.createdByClerkId).toBeNull();
  });

  it("keeps historical NULL context and sanitizes public preparation data", () => {
    const [contract] = mapFeedRowsToPublicContracts([row({
      action_context: null,
      action_context_source: null,
      school_context_confirmed: null,
      public_preparation_data: {
        routeTargetDistanceKm: 4,
        privateOwnerId: "must-not-cross-the-boundary",
      },
    })]);

    expect(contract?.metadata.actionContext).toBeNull();
    expect(contract?.metadata.actionContextSource).toBeNull();
    expect(contract?.metadata.preparationData).toMatchObject({ routeTargetDistanceKm: 4 });
    expect(contract?.metadata.preparationData).not.toHaveProperty("privateOwnerId");
  });

  it("keeps the application mapper bound to the public status projection", () => {
    expect(mapFeedRowsToPublicContracts([row({ status: "pending" })])).toEqual([]);
  });
});
