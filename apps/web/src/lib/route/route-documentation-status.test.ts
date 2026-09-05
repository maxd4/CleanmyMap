import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function findRepositoryRoot(): string {
  let directory = process.cwd();

  for (let depth = 0; depth < 6; depth += 1) {
    if (existsSync(path.join(directory, "documentation", "architecture", "methodologie-creation-itineraire.md"))) {
      return directory;
    }
    directory = path.dirname(directory);
  }

  throw new Error("Repository root not found for route documentation checks");
}

function sectionBetween(document: string, start: string, end: string): string {
  const startIndex = document.indexOf(start);
  const endIndex = document.indexOf(end, startIndex + start.length);

  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);

  return document.slice(startIndex, endIndex);
}

describe("route documentation status", () => {
  it("keeps current, foundation, and future capabilities distinct", () => {
    const root = findRepositoryRoot();
    const methodology = readFileSync(
      path.join(root, "documentation", "architecture", "methodologie-creation-itineraire.md"),
      "utf8",
    );
    const normalizedMethodology = methodology.replace(/\s+/g, " ");
    const current = sectionBetween(normalizedMethodology, "## 9. Capacités actuelles", "## 10. Fondations et intégrations en cours");
    const foundation = sectionBetween(normalizedMethodology, "## 10. Fondations et intégrations en cours", "## 11. Évolutions futures");
    const future = normalizedMethodology.slice(normalizedMethodology.indexOf("## 11. Évolutions futures"));

    expect(current).toContain("urban-pressure-model");
    expect(current).toContain("risque prédit de déchets diffus");
    expect(current).toContain("risque prédit de mégots");
    expect(current).toContain("pression événementielle");
    expect(current).toContain("ne signifie pas qu’un mode");

    expect(foundation).toContain("municipal-cleaning-serviceability");
    expect(foundation).toContain("event-centered");
    expect(foundation).toContain("pas encore branchée");

    expect(future).toContain("additionnalité bénévole");
    expect(future).toContain("météo");
    expect(future).not.toContain("modèle de risque séparé");
  });

  it("does not document removed event modules as route README files", () => {
    const root = findRepositoryRoot();
    const routeReadme = readFileSync(path.join(root, "apps", "web", "src", "lib", "route", "README.md"), "utf8");

    for (const fileName of ["route-event-pressure.ts", "route-event-centered.ts", "route-planning-mode.ts"]) {
      expect(routeReadme).not.toContain(fileName);
    }
  });
});
