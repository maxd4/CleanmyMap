import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("/api/geo/reverse-location", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
});
