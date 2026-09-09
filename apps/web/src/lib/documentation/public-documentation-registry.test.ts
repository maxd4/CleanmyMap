import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  findPublicDocumentationByApiSlug,
  findPublicDocumentationByDocsPath,
  PUBLIC_DOCUMENTATION,
} from "./public-documentation-registry";

function findRepositoryRoot(): string {
  let directory = process.cwd();

  for (let depth = 0; depth < 6; depth += 1) {
    if (existsSync(path.join(directory, "documentation", "plans"))) {
      return directory;
    }
    directory = path.dirname(directory);
  }

  throw new Error("Repository root not found for documentation registry checks");
}

describe("public documentation registry", () => {
  it("contains only existing canonical documentation files", () => {
    const root = findRepositoryRoot();

    for (const entry of PUBLIC_DOCUMENTATION) {
      expect(entry.canonicalPath).not.toMatch(/^\//);
      expect(entry.canonicalPath).not.toContain("..");
      expect(existsSync(path.join(root, "documentation", entry.canonicalPath))).toBe(true);
    }
  });

  it("keeps the product documentation URLs and API slugs explicit", () => {
    expect(
      PUBLIC_DOCUMENTATION.filter((entry) => entry.docsPath).map((entry) => entry.docsPath),
    ).toEqual([
      "plans/journal_impact_DU.md",
      "plans/rapport_impact/impact_carbone_methodologie.md",
      "plans/rapport_impact/impact_IA.md",
      "product/methodologie-carte-actions.md",
      "architecture/methodologie-creation-itineraire.md",
      "plans/rapport_impact/quotas_plans_methodologie.md",
    ]);

    expect(
      PUBLIC_DOCUMENTATION.flatMap((entry) => entry.apiRoutes?.map((route) => route.slug) ?? []),
    ).toEqual(["graphique-impact-co2e", "atelier_DU", "journal_DU", "journal_impact_DU"]);
  });

  it("resolves only the registered route identifiers", () => {
    expect(findPublicDocumentationByDocsPath("operations/platform-cost-governance.md")).toBeUndefined();
    expect(findPublicDocumentationByDocsPath("../plans/rapport_impact/impact_IA.md")).toBeUndefined();
    expect(findPublicDocumentationByApiSlug("unknown")).toBeUndefined();

    expect(findPublicDocumentationByApiSlug("journal_DU")?.filename).toBe("journal_DU.md");
    expect(findPublicDocumentationByApiSlug("journal_impact_DU")?.filename).toBe("journal_impact_DU.md");
  });
});
