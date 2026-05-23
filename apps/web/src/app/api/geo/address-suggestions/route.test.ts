import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("/api/geo/address-suggestions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns stable exact address labels within greater paris", async () => {
    const fetchMock = vi.fn();
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
    expect(fetchMock).not.toHaveBeenCalled();
    expect(body.items).toHaveLength(2);
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
});
