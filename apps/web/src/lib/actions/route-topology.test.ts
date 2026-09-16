import { describe, expect, it } from "vitest";
import {
  clearActionRouteArrivalForLoop,
  resolveActionRouteTopology,
} from "./route-topology";

describe("resolveActionRouteTopology", () => {
  it("uses point-to-point for legacy payloads with an arrival", () => {
    expect(resolveActionRouteTopology({ arrivalLocationLabel: "Arrivée" })).toBe("point_to_point");
  });

  it("uses loop for legacy payloads without an arrival", () => {
    expect(resolveActionRouteTopology({ arrivalLocationLabel: " " })).toBe("loop");
  });

  it("lets the explicit topology win over legacy arrival inference", () => {
    expect(resolveActionRouteTopology({ topology: "loop", arrivalLocationLabel: "Arrivée" })).toBe("loop");
    expect(resolveActionRouteTopology({ topology: "point_to_point" })).toBe("point_to_point");
  });

  it("keeps clean-place complements outside route topology", () => {
    expect(resolveActionRouteTopology({
      recordType: "clean_place",
      arrivalLocationLabel: "Complément du lieu",
    })).toBe("loop");
    expect(resolveActionRouteTopology({
      recordType: "clean_place",
      topology: "point_to_point",
      arrivalLocationLabel: "Complément du lieu",
    })).toBe("loop");
  });

  it("removes a residual arrival from an ordinary loop preparation", () => {
    expect(clearActionRouteArrivalForLoop({
      routeTopology: "loop",
      zoneCiblePrevue: "Ancienne arrivée",
      arrivalCoordinates: { latitude: 48.85, longitude: 2.35 },
    }, { recordType: "action", topology: "loop" })).toEqual({
      routeTopology: "loop",
    });
  });
});
