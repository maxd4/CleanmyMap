import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRateLimitModule, rateLimitMocks } from "@/app/api/test-helpers";

vi.mock("@/lib/rate-limit/server", () => createRateLimitModule());

import { GET } from "./route";

describe("/api/geo/reverse-location", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  beforeEach(() => {
    rateLimitMocks.verifyRateLimit.mockResolvedValue({
      allowed: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60_000,
    });
    rateLimitMocks.createServerRateLimitResponse.mockReturnValue(null);
  });

  it("returns a selected city from geoplateforme reverse geocoding", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            geometry: {
              coordinates: [2.3522, 48.8566],
            },
            properties: {
              city: "Paris",
              postcode: "75001",
              label: "1 Rue de Rivoli, 75001 Paris",
              score: 0.98,
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const response = await GET(
      new Request("http://localhost/api/geo/reverse-location?lat=48.8566&lon=2.3522"),
    );
    const body = (await response.json()) as {
      status: string;
      location: {
        label: string;
        subtitle: string;
        latitude: number;
        longitude: number;
        importance: number | null;
      } | null;
    };

    expect(body.status).toBe("ok");
    expect(response.headers.get("cache-control")).toContain("private");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        method: "GET",
        signal: expect.any(AbortSignal),
      }),
    );
    expect(body.location).toMatchObject({
      label: "Paris",
      subtitle: "75001 Paris",
      latitude: 48.8566,
      longitude: 2.3522,
      importance: 0.98,
    });
  });

  it("returns null when coordinates are missing", async () => {
    const response = await GET(
      new Request("http://localhost/api/geo/reverse-location"),
    );
    const body = (await response.json()) as { location: unknown };

    expect(body.location).toBeNull();
  });

  it.each([
    "?lat=48.8566",
    "?lon=2.3522",
    "?lat=&lon=2.3522",
  ])("rejects incomplete or blank coordinate parameters: %s", async (search) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const response = await GET(new Request(`http://localhost/api/geo/reverse-location${search}`));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts zero as a valid coordinate", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ features: [] }),
    });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const response = await GET(
      new Request("http://localhost/api/geo/reverse-location?lat=0&lon=0"),
    );

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("photon.komoot.io/reverse");
  });

  it("falls back to Photon for a non-metropolitan coordinate", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [{
            geometry: { coordinates: [-149.5585, -17.5516] },
            properties: {
              name: "Papeete",
              country: "French Polynesia",
              countrycode: "pf",
            },
          }],
        }),
      });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const response = await GET(
      new Request("http://localhost/api/geo/reverse-location?lat=-17.5516&lon=-149.5585"),
    );
    const body = await response.json();

    expect(body.location).toMatchObject({
      label: "Papeete",
      latitude: -17.5516,
      longitude: -149.5585,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("photon.komoot.io/reverse");
  });

  it("falls back to Photon after a Geoplateforme exception with a fresh signal", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("Geoplateforme unavailable"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [{
            geometry: { coordinates: [2.3522, 48.8566] },
            properties: { name: "Paris", country: "France" },
          }],
        }),
      });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const response = await GET(
      new Request("http://localhost/api/geo/reverse-location?lat=48.8566&lon=2.3522"),
    );
    const body = await response.json();

    expect(body.location).toMatchObject({ label: "Paris", latitude: 48.8566, longitude: 2.3522 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]?.signal).not.toBe(fetchMock.mock.calls[1]?.[1]?.signal);
  });

  it.each([
    ["latitude above the valid range", "91", "2.3522"],
    ["longitude below the valid range", "48.8566", "-181"],
    ["non-numeric latitude", "not-a-number", "2.3522"],
  ])("rejects %s before the external request", async (_label, lat, lon) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const response = await GET(
      new Request(`http://localhost/api/geo/reverse-location?lat=${lat}&lon=${lon}`),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 429 without calling the external geocoder when rate limited", async () => {
    rateLimitMocks.verifyRateLimit.mockResolvedValueOnce({
      allowed: false,
      limit: 60,
      remaining: 0,
      reset: Date.now() + 60_000,
      retryAfter: 60,
    });
    rateLimitMocks.createServerRateLimitResponse.mockReturnValueOnce(
      new Response(JSON.stringify({ status: "rate_limited" }), { status: 429 }),
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const response = await GET(
      new Request("http://localhost/api/geo/reverse-location?lat=48.8566&lon=2.3522"),
    );

    expect(response.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("aborts a slow external geocoder request after four seconds", async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal;
      signals.push(signal);
      if (signals.length === 1) {
        return new Promise<Response>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")), {
            once: true,
          });
        });
      }
      return Promise.resolve({ ok: false } as Response);
    });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const responsePromise = GET(
      new Request("http://localhost/api/geo/reverse-location?lat=48.8566&lon=2.3522"),
    );
    await vi.advanceTimersByTimeAsync(4_000);
    const response = await responsePromise;
    const body = (await response.json()) as { location: unknown };

    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]).toBeDefined();
    expect(signals[0]).not.toBe(signals[1]);
    expect(body.location).toBeNull();
  });
});
