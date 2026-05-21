import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("/api/documentation/[slug] GET", () => {
  it("returns the graph documentation as a markdown attachment", async () => {
    const response = await GET(new Request("http://localhost/api/documentation/graphique-impact-co2e"), {
      params: Promise.resolve({ slug: "graphique-impact-co2e" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/markdown");
    expect(response.headers.get("Content-Disposition")).toContain("graphique_impact_CO2e.md");
    expect(await response.text()).toContain("Graphique d'impact CO2e de CleanMyMap");
  });

  it("returns a 404 for unknown documents", async () => {
    const response = await GET(new Request("http://localhost/api/documentation/unknown"), {
      params: Promise.resolve({ slug: "unknown" }),
    });

    expect(response.status).toBe(404);
  });
});
