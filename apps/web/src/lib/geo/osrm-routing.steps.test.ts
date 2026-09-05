import { describe, expect, it, vi } from "vitest";
import { routePolylineThroughStreetNetwork } from "./osrm-routing";

describe("OSRM geometry steps", () => {
  it("parses provider steps and leaves fallback steps empty", async () => {
    const stops: [number, number][] = [
      [48.8566, 2.3522],
      [48.8576, 2.3532],
    ];
    const transport = vi.fn(async () =>
      new Response(JSON.stringify({
        code: "Ok",
        routes: [{
          distance: 1000,
          duration: 300,
          geometry: { coordinates: [[2.3522, 48.8566], [2.3532, 48.8576]] },
          legs: [{
            distance: 1000,
            duration: 300,
            steps: [{
              name: "Rue de test",
              distance: 1000,
              duration: 300,
              maneuver: { type: "depart" },
            }],
          }],
        }],
      }), { status: 200 }),
    );

    const network = await routePolylineThroughStreetNetwork(stops, { transport });
    expect(network.legs[0]?.steps).toEqual([{
      name: "Rue de test",
      distanceKm: 1,
      durationMinutes: 5,
      maneuver: "depart",
    }]);

    const fallback = await routePolylineThroughStreetNetwork(stops, {
      transport: vi.fn(async () => { throw new Error("offline"); }),
    });
    expect(fallback.mode).toBe("fallback");
    expect(fallback.legs).toEqual([]);
  });
});
