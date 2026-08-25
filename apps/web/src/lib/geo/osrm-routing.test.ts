import { describe, expect, it, vi } from "vitest";
import {
  buildOsrmRouteUrl,
  routePolylineThroughStreetNetwork,
  snapPolylineToStreetNetwork,
} from "./osrm-routing";

const stops: [number, number][] = [
  [48.8566, 2.3522],
  [48.8576, 2.3532],
  [48.8586, 2.3542],
];

describe("OSRM routing capability", () => {
  it("returns validated network geometry and provider legs through an injected transport", async () => {
    const transport = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain("/route/v1/foot/");
      return new Response(
        JSON.stringify({
          code: "Ok",
          routes: [
            {
              distance: 1800,
              duration: 900,
              geometry: {
                coordinates: [
                  [2.3522, 48.8566],
                  [2.353, 48.8574],
                  [2.3542, 48.8586],
                ],
              },
              legs: [
                { distance: 1200, duration: 600 },
                { distance: 600, duration: 300 },
              ],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const result = await routePolylineThroughStreetNetwork(stops, {
      transport,
    });

    expect(result).toMatchObject({
      provider: "osrm",
      profile: "foot",
      mode: "network",
      estimated: false,
      distanceKm: 1.8,
      durationMinutes: 15,
    });
    expect(result.coordinates).toEqual([
      [48.8566, 2.3522],
      [48.8574, 2.353],
      [48.8586, 2.3542],
    ]);
    expect(result.legs).toEqual([
      {
        fromStopIndex: 0,
        toStopIndex: 1,
        distanceKm: 1.2,
        estimatedMinutes: 10,
      },
      {
        fromStopIndex: 1,
        toStopIndex: 2,
        distanceKm: 0.6,
        estimatedMinutes: 5,
      },
    ]);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("returns a deterministic estimated fallback on provider errors", async () => {
    const transport = vi.fn(async () => {
      throw new Error("offline test transport");
    });

    const result = await routePolylineThroughStreetNetwork(stops, {
      transport,
      fallbackDurationMinutes: 42,
    });

    expect(result).toMatchObject({
      coordinates: stops,
      mode: "fallback",
      provider: "none",
      profile: null,
      estimated: true,
      durationMinutes: 42,
    });
    expect(result.legs).toEqual([]);
  });

  it("aborts a slow provider and falls back without leaking the request", async () => {
    const transport = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );

    const result = await routePolylineThroughStreetNetwork(stops, {
      transport,
      timeoutMs: 1,
      fallbackDurationMinutes: 17,
    });

    expect(result).toMatchObject({
      mode: "fallback",
      estimated: true,
      durationMinutes: 17,
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("falls back for invalid provider payloads and makes no call for an empty route", async () => {
    const transport = vi.fn(async () =>
      new Response(JSON.stringify({ code: "NoRoute", routes: [] }), {
        status: 200,
      }),
    );
    const invalidProvider = await routePolylineThroughStreetNetwork(stops, {
      transport,
    });
    expect(invalidProvider.mode).toBe("fallback");

    transport.mockClear();
    const empty = await routePolylineThroughStreetNetwork([], { transport });
    expect(empty).toMatchObject({ mode: "fallback", coordinates: [] });
    expect(transport).not.toHaveBeenCalled();
  });

  it("preserves the compatibility snap API", async () => {
    expect(buildOsrmRouteUrl(stops)).toContain("/route/v1/foot/");
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          code: "Ok",
          routes: [
            {
              distance: 100,
              duration: 60,
              geometry: {
                coordinates: [
                  [2.3522, 48.8566],
                  [2.3532, 48.8576],
                ],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    ) as typeof fetch;

    try {
      await expect(snapPolylineToStreetNetwork(stops.slice(0, 2))).resolves.toEqual([
        [48.8566, 2.3522],
        [48.8576, 2.3532],
      ]);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
