import { describe, expect, it } from "vitest";
import { resolveActionRouteTopology } from "./route-topology";

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
});
