import { describe, expect, it } from "vitest";
import { PUBLIC_DOCUMENTATION } from "@/lib/documentation/public-documentation-registry";
import { GET } from "./route";

function requestFor(segments: string[]) {
  return GET(new Request(`http://localhost/docs/${segments.join("/")}`), {
    params: Promise.resolve({ segments }),
  });
}

const reportMainDocuments = PUBLIC_DOCUMENTATION.filter((entry) =>
  /^plans\/rapport_impact\/impact_IA\/(?:0[1-9]|1[0-3])-[^/]+\.md$/.test(entry.docsPath ?? ""),
);
const publicDocuments = PUBLIC_DOCUMENTATION.filter((entry) => entry.docsPath);

describe("/docs/[...segments] GET", () => {
  it("keeps all thirteen report parts publicly registered", () => {
    expect(reportMainDocuments).toHaveLength(13);
    expect(reportMainDocuments.every((entry) => entry.docsPath)).toBe(true);
  });

  it("keeps the user-facing charter and quiz references on the canonical viewer", () => {
    expect(publicDocuments.map((entry) => entry.docsPath)).toEqual(
      expect.arrayContaining([
        "legal/charte-benevole.md",
        "features/quiz-authoring-guide.md",
        "features/quiz-quality-control.md",
      ]),
    );
  });

  it.each(publicDocuments.map((entry) => [entry.docsPath!] as const))(
    "serves every registered documentation route %s",
    async (documentPath) => {
      const response = await requestFor(documentPath.split("/"));

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/html");
    },
  );

  it("preserves the viewer headers and rendered HTML contract", async () => {
    const response = await requestFor(["legal", "charte-benevole.md"]);
    const body = await response.text();

    expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=0, must-revalidate");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
    expect(body).toContain("<!doctype html>");
    expect(body).toContain("CleanMyMap documentation viewer");
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
