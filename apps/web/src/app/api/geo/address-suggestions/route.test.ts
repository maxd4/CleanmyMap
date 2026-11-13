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

  it("falls back to Photon when Geoplateforme throws", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("Geoplateforme unavailable"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [{
            geometry: { coordinates: [2.3522, 48.8566] },
            properties: { name: "Paris", countrycode: "fr" },
          }],
        }),
      });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const response = await GET(
      new Request("http://localhost/api/geo/address-suggestions?q=Unknown%20Paris&limit=3&country=FR"),
    );

    expect((await response.json()).items).toEqual([
      expect.objectContaining({ label: "Paris", latitude: 48.8566, longitude: 2.3522 }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toContain("photon.komoot.io/api");
  });

  it("rejects Photon results whose exposed country contradicts the requested country", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          { geometry: { coordinates: [2.35, 48.85] }, properties: { name: "Paris", countrycode: "fr" } },
          { geometry: { coordinates: [4.3528, 50.8466] }, properties: { name: "Bruxelles", countrycode: "be" } },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const response = await GET(
      new Request("http://localhost/api/geo/address-suggestions?q=Bruxelles&limit=3&country=BE"),
    );

    expect((await response.json()).items).toEqual([
      expect.objectContaining({ label: "Bruxelles", latitude: 50.8466, longitude: 4.3528 }),
    ]);
  });

  it.each([
    [null, ""],
    ["", ""],
    ["not-a-number", "2.35"],
    ["91", "2.35"],
  ])("does not turn malformed provider coordinates (%s, %s) into a point", async (latitude, longitude) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [{ geometry: { coordinates: [longitude, latitude] }, properties: { name: "Invalide", countrycode: "ca" } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const response = await GET(
      new Request("http://localhost/api/geo/address-suggestions?q=Invalide&limit=3&country=CA"),
    );

    expect((await response.json()).items).toEqual([]);
  });

  it("keeps a valid zero coordinate instead of treating it as missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [{ geometry: { coordinates: [0, 0] }, properties: { name: "Équateur", countrycode: "GH" } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const response = await GET(
      new Request("http://localhost/api/geo/address-suggestions?q=Équateur&limit=3&country=GH"),
    );

    expect((await response.json()).items[0]).toMatchObject({ latitude: 0, longitude: 0 });
  });

  it("uses the requested country for an international suggestion", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [{
          geometry: { coordinates: [-71.208, 46.8139] },
          properties: {
            name: "Québec",
            state: "Québec",
            country: "Canada",
            countrycode: "ca",
          },
        }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const response = await GET(
      new Request("http://localhost/api/geo/address-suggestions?q=Québec&limit=3&country=CA"),
    );
    const body = await response.json();

    expect(body.items).toEqual([
      expect.objectContaining({
        label: "Québec",
        subtitle: "Québec",
        latitude: 46.8139,
        longitude: -71.208,
      }),
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("photon.komoot.io/api"),
      expect.objectContaining({ headers: { Accept: "application/json" }, signal: expect.any(AbortSignal) }),
    );
  });

  it("keeps Paris on the Geoplateforme France path", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{
          x: 2.3522,
          y: 48.8566,
          fulltext: "Paris",
          city: "Paris",
          country: "France",
        }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const response = await GET(
      new Request("http://localhost/api/geo/address-suggestions?q=Paris%2015e&limit=3&country=FR"),
    );
    const body = await response.json();

    expect(body.items[0]).toMatchObject({ label: "Paris", latitude: 48.8566, longitude: 2.3522 });
    expect(fetchMock.mock.calls[0]?.[0]).toContain("data.geopf.fr");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["Bruxelles", "BE", 50.8466, 4.3528, "be"],
    ["Lausanne", "CH", 46.5197, 6.6323, "ch"],
    ["Montréal", "CA", 45.5019, -73.5674, "ca"],
    ["Dakar", "SN", 14.7167, -17.4677, "sn"],
    ["Papeete", "PF", -17.5516, -149.5585, "pf"],
  ])("resolves %s through the international provider", async (label, country, latitude, longitude, countrycode) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [{
          geometry: { coordinates: [longitude, latitude] },
          properties: { name: label, countrycode },
        }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const response = await GET(
      new Request(`http://localhost/api/geo/address-suggestions?q=${encodeURIComponent(label)}&limit=3&country=${country}`),
    );
    const body = await response.json();

    expect(body.items[0]).toMatchObject({ label, latitude, longitude });
    expect(fetchMock.mock.calls[0]?.[0]).toContain("photon.komoot.io/api");
  });

  it("keeps Geoplateforme as the France provider and falls back to overseas France", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [{
            geometry: { coordinates: [55.4504, -20.8789] },
            properties: { name: "Saint-Denis", countrycode: "fr", country: "France" },
          }],
        }),
      });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const response = await GET(
      new Request("http://localhost/api/geo/address-suggestions?q=Saint-Denis%20La%20Réunion&limit=3&country=FR"),
    );
    const body = await response.json();

    expect(body.items[0]).toMatchObject({
      label: "Saint-Denis",
      latitude: -20.8789,
      longitude: 55.4504,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toContain("data.geopf.fr");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("photon.komoot.io/api");
  });
});
