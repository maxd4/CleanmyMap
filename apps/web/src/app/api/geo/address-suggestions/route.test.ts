import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
}));

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
});
