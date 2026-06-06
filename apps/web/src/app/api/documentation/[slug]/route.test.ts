import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("/api/documentation/[slug] GET", () => {
  it("returns the graph documentation as a markdown attachment", async () => {
    const response = await GET(
      new Request("http://localhost/api/documentation/graphique-impact-co2e"),
      {
        params: Promise.resolve({ slug: "graphique-impact-co2e" }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/markdown");
    expect(response.headers.get("Content-Disposition")).toContain("graphique_impact_CO2e.md");
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=86400");
    expect(response.headers.get("Cache-Control")).not.toContain("no-store");
    expect(await response.text()).toContain("Graphique d'impact CO2e");
  });

  it("returns a 404 for unknown documents", async () => {
    const response = await GET(new Request("http://localhost/api/documentation/unknown"), {
      params: Promise.resolve({ slug: "unknown" }),
    });

    expect(response.status).toBe(404);
  });
});
