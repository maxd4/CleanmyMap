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
      const urlString = String(input);
      fetchCalls.push(urlString);
      // Safe URL validation: parse and check hostname exactly
      const url = new URL(urlString);
      if (url.hostname === "nominatim.openstreetmap.org") {
        const lat = url.searchParams.get("q")?.includes("depart") ? "48.85" : "48.86";
        const lon = url.searchParams.get("q")?.includes("depart") ? "2.35" : "2.37";
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
      // Safe URL validation: parse and check hostname exactly
      const directRouteCall = fetchCalls.find((url) => {
        try {
          return new URL(url).hostname === "router.project-osrm.org";
        } catch {
          return false;
        }
      });
      expect(directRouteCall).toContain("2.350000,48.850000;2.370000,48.860000");

      fetchCalls.length = 0;
      await deriveAutoDrawingFromLocation({
        locationLabel: "depart",
        departureLocationLabel: "depart",
        arrivalLocationLabel: "arrivee",
        routeStyle: "souple",
      });
      // Safe URL validation: parse and check hostname exactly
      const soupleRouteCall = fetchCalls.find((url) => {
        try {
          return new URL(url).hostname === "router.project-osrm.org";
        } catch {
          return false;
        }
      });
      expect(soupleRouteCall).toContain(";");
      expect(soupleRouteCall?.split(";").length).toBeGreaterThan(2);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("falls back to a raw or flexible polyline when OSRM fails", async () => {
    const originalFetch = global.fetch;
    global.fetch = (async (input: RequestInfo | URL) => {
      const urlString = String(input);
      // Safe URL validation: parse and check hostname exactly
      const url = new URL(urlString);
      if (url.hostname === "nominatim.openstreetmap.org") {
        const lat = url.searchParams.get("q")?.includes("depart") ? "48.85" : "48.86";
        const lon = url.searchParams.get("q")?.includes("depart") ? "2.35" : "2.37";
        return new Response(JSON.stringify([{ lat, lon }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("Service unavailable", { status: 503 });
    }) as typeof fetch;

    try {
      const directFallback = await deriveAutoDrawingFromLocation({
        locationLabel: "depart",
        departureLocationLabel: "depart",
        arrivalLocationLabel: "arrivee",
        routeStyle: "direct",
      });

      expect(directFallback).not.toBeNull();
      expect(directFallback?.kind).toBe("polyline");
      expect(directFallback?.coordinates).toEqual([
        [48.85, 2.35],
        [48.86, 2.37],
      ]);

      const soupleFallback = await deriveAutoDrawingFromLocation({
        locationLabel: "depart",
        departureLocationLabel: "depart",
        arrivalLocationLabel: "arrivee",
        routeStyle: "souple",
      });

      expect(soupleFallback).not.toBeNull();
      expect(soupleFallback?.kind).toBe("polyline");
      expect(soupleFallback?.coordinates.length).toBe(3);
      expect(soupleFallback?.coordinates[0]).toEqual([48.85, 2.35]);
      expect(soupleFallback?.coordinates[2]).toEqual([48.86, 2.37]);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
