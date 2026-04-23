import { describe, expect, it } from "vitest";
import { deriveAutoDrawingFromLocation } from "./route-geometry";

describe("deriveAutoDrawingFromLocation", () => {
  it("reuses reference geometry for known places without network", async () => {
    const drawing = await deriveAutoDrawingFromLocation({
      locationLabel: "Jardin du Luxembourg",
    });

    expect(drawing).not.toBeNull();
    expect(drawing?.kind).toBe("polygon");
    expect(drawing?.coordinates.length).toBeGreaterThanOrEqual(4);
  });

  it("switches between direct and souple route profiles", async () => {
    const originalFetch = global.fetch;
    const fetchCalls: string[] = [];
    global.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      fetchCalls.push(url);
      if (url.includes("nominatim.openstreetmap.org")) {
        const lat = url.includes("depart") ? "48.85" : "48.86";
        const lon = url.includes("depart") ? "2.35" : "2.37";
        return new Response(JSON.stringify([{ lat, lon }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          code: "Ok",
          routes: [
            {
              geometry: {
                coordinates: [
                  [2.35, 48.85],
                  [2.36, 48.855],
                  [2.37, 48.86],
                ],
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }) as typeof fetch;

    try {
      await deriveAutoDrawingFromLocation({
        locationLabel: "depart",
        departureLocationLabel: "depart",
        arrivalLocationLabel: "arrivee",
        routeStyle: "direct",
      });
      const directRouteCall = fetchCalls.find((url) =>
        url.includes("router.project-osrm.org"),
      );
      expect(directRouteCall).toContain("2.350000,48.850000;2.370000,48.860000");

      fetchCalls.length = 0;
      await deriveAutoDrawingFromLocation({
        locationLabel: "depart",
        departureLocationLabel: "depart",
        arrivalLocationLabel: "arrivee",
        routeStyle: "souple",
      });
      const soupleRouteCall = fetchCalls.find((url) =>
        url.includes("router.project-osrm.org"),
      );
      expect(soupleRouteCall).toContain(";");
      expect(soupleRouteCall?.split(";").length).toBeGreaterThan(2);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
