import { afterEach, describe, expect, it, vi } from "vitest";
import { createRateLimitModule } from "@/app/api/test-helpers";

vi.mock("@/lib/rate-limit/server", () => createRateLimitModule());

import { GET } from "./route";

describe("/api/geo/address-suggestions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns stable exact address labels within the national cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const response = await GET(
      new Request("http://localhost/api/geo/address-suggestions?q=Rivoli&limit=4"),
    );
    const body = (await response.json()) as {
      status: string;
      query: string;
      items: Array<{
        label: string;
        subtitle: string;
        latitude: number;
        longitude: number;
        importance: number | null;
      }>;
    };

    expect(body.status).toBe("ok");
    expect(body.query).toBe("Rivoli");
    expect(response.headers.get("cache-control")).toContain("private");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      label: "12 Rue de Rivoli, 75004 Paris",
      subtitle: "Paris 4e · Louvre",
      latitude: 48.8557,
      longitude: 2.3562,
      importance: 0.98,
    });
  });

  it("returns empty results for short queries", async () => {
    const response = await GET(
      new Request("http://localhost/api/geo/address-suggestions?q=ab"),
    );
    const body = (await response.json()) as { items: unknown[] };

    expect(body.items).toEqual([]);
  });

  it("falls back to geoplateforme completion outside the local cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            x: 4.8357,
            y: 45.764,
            fulltext: "Metz, 57000 Metz",
            city: "Metz",
            zipcode: "57000",
            kind: "municipality",
            classification: 2,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const response = await GET(
      new Request("http://localhost/api/geo/address-suggestions?q=Metz&limit=3"),
    );
    const body = (await response.json()) as {
      status: string;
      query: string;
      items: Array<{
        label: string;
        subtitle: string;
        latitude: number;
        longitude: number;
        importance: number | null;
      }>;
    };

    expect(body.status).toBe("ok");
    expect(body.query).toBe("Metz");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      label: "Metz, 57000 Metz",
      subtitle: "57000 Metz · municipality",
      latitude: 45.764,
      longitude: 4.8357,
    });
  });

  it("drops remote coordinates outside the territorial bounds", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{
          x: 151.2093,
          y: -33.8688,
          fulltext: "Sydney",
          city: "Sydney",
        }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const response = await GET(
      new Request("http://localhost/api/geo/address-suggestions?q=Sydney&limit=3"),
    );
    const body = (await response.json()) as { items: unknown[] };

    expect(body.items).toEqual([]);
  });

  it("uses bounded limits and skips the remote provider when local results already fill the page", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const response = await GET(
      new Request("http://localhost/api/geo/address-suggestions?q=Rivoli&limit=1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deduplicates valid remote labels and preserves safe fallbacks", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { x: 2.35, y: 48.85, names: ["  Point utile  "], city: "Paris", oldcity: "Ancien Paris", kind: "poi", poiType: ["service", ""], classification: 0 },
          { x: 2.35, y: 48.85, fulltext: "point utile", country: "France" },
          { x: 2.36, y: 48.86, city: "Paris", kind: "Paris", country: "France" },
          { x: 2.37, y: 48.87, country: "France" },
          { x: Number.NaN, y: 48.87, fulltext: "invalid" },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const response = await GET(new Request("http://localhost/api/geo/address-suggestions?q=Remote&limit=8"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Point utile", subtitle: "Paris · poi · service", importance: 1 }),
      expect.objectContaining({ label: "Paris", subtitle: "Paris", importance: null }),
      expect.objectContaining({ label: "Lieu sans libellé", subtitle: "France", importance: null }),
    ]));
    expect(body.items.filter((item: { label: string }) => item.label.toLowerCase() === "point utile")).toHaveLength(1);
  });

  it("returns a safe empty response when the remote provider fails or returns a non-success status", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("remote provider detail"));
    vi.stubGlobal("fetch", fetchMock as typeof fetch);
    const failed = await GET(new Request("http://localhost/api/geo/address-suggestions?q=Unknown&limit=3"));
    expect(failed.status).toBe(200);
    expect(await failed.json()).toMatchObject({ status: "ok", query: "Unknown", items: [] });

    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ results: [] }) });
    const nonSuccess = await GET(new Request("http://localhost/api/geo/address-suggestions?q=Remote&limit=3"));
    expect(nonSuccess.status).toBe(200);
    expect((await nonSuccess.json()).items).toEqual([]);
  });
});
