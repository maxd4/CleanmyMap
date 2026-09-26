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
    let signal: AbortSignal | undefined;
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new Error("aborted")), {
          once: true,
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const responsePromise = GET(
      new Request("http://localhost/api/geo/reverse-location?lat=48.8566&lon=2.3522"),
    );
    await vi.advanceTimersByTimeAsync(4_000);
    const response = await responsePromise;
    const body = (await response.json()) as { location: unknown };

    expect(signal?.aborted).toBe(true);
    expect(body.location).toBeNull();
  });
});
