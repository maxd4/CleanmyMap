import { describe, expect, it } from "vitest";
import type { CreateActionPayload } from "./types";
import { resolveCreateActionRouteTopology } from "./store-create-contract";

function createPayload(overrides: Partial<CreateActionPayload> = {}): CreateActionPayload {
  return {
    actionDate: "2026-09-26",
    locationLabel: "Paris",
    wasteKg: null,
    cigaretteButts: null,
    volunteersCount: 1,
    durationMinutes: 60,
    ...overrides,
  };
}

describe("create-action route topology contract", () => {
  it("uses the explicit topology before preparation or legacy arrival inference", () => {
    expect(
      resolveCreateActionRouteTopology(
        createPayload({
          routeTopology: "loop",
          arrivalLocationLabel: "Arrivée",
          preparationData: { routeTopology: "point_to_point" },
        }),
      ),
    ).toEqual({ recordType: "action", routeTopology: "loop" });
  });

  it("falls back to preparation data and then to the arrival label", () => {
    expect(
      resolveCreateActionRouteTopology(
        createPayload({ preparationData: { routeTopology: "point_to_point" } }),
      ),
    ).toEqual({ recordType: "action", routeTopology: "point_to_point" });
    expect(
      resolveCreateActionRouteTopology(createPayload({ arrivalLocationLabel: "Arrivée" })),
    ).toEqual({ recordType: "action", routeTopology: "point_to_point" });
  });

  it("keeps clean-place records on the loop topology", () => {
    expect(
      resolveCreateActionRouteTopology(
        createPayload({ recordType: "clean_place", arrivalLocationLabel: "Complément" }),
      ),
    ).toEqual({ recordType: "clean_place", routeTopology: "loop" });
  });
});
