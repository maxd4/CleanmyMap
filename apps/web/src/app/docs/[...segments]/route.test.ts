import { describe, expect, it } from "vitest";
import { GET } from "./route";

function requestFor(segments: string[]) {
  return GET(new Request(`http://localhost/docs/${segments.join("/")}`), {
    params: Promise.resolve({ segments }),
  });
}

describe("/docs/[...segments] GET", () => {
  it.each([
    ["plans/journal_impact_DU.md"],
    ["plans/rapport_impact/impact_carbone_methodologie.md"],
    ["plans/rapport_impact/impact_IA.md"],
    ["product/methodologie-carte-actions.md"],
    ["architecture/methodologie-creation-itineraire.md"],
    ["plans/rapport_impact/quotas_plans_methodologie.md"],
  ])("serves the allowlisted document %s", async (documentPath) => {
    const response = await requestFor(documentPath.split("/"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
  });

  it("returns 404 for an existing documentation file that is not public", async () => {
    const response = await requestFor(["operations", "platform-cost-governance.md"]);

    expect(response.status).toBe(404);
  });

  it("does not resolve traversal segments through the documentation root", async () => {
    const response = await requestFor(["plans", "..", "operations", "platform-cost-governance.md"]);

    expect(response.status).toBe(404);
  });
});
