import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("/api/documentation/[slug] GET", () => {
  it.each([
    ["graphique-impact-co2e", "graphique_impact_CO2e.md"],
    ["atelier_DU", "atelier_DU.md"],
    ["journal_DU", "journal_DU.md"],
    ["journal_impact_DU", "journal_impact_DU.md"],
  ])("returns %s as a markdown attachment", async (slug, filename) => {
    const response = await GET(new Request(`http://localhost/api/documentation/${slug}`), {
      params: Promise.resolve({ slug }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/markdown");
    expect(response.headers.get("Content-Disposition")).toContain(filename);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=86400");
    expect(response.headers.get("Cache-Control")).not.toContain("no-store");
    expect((await response.text()).length).toBeGreaterThan(0);
  });

  it("returns a 404 for unknown documents", async () => {
    const response = await GET(new Request("http://localhost/api/documentation/unknown"), {
      params: Promise.resolve({ slug: "unknown" }),
    });

    expect(response.status).toBe(404);
  });
});
