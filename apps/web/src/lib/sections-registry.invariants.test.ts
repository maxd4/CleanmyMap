import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  RUBRIQUE_REGISTRY,
  getSectionRouteParams,
  isSectionRouteEnabled,
} from "@/lib/sections-registry";
import { FINALIZED_SECTION_RENDERERS } from "@/components/sections/rubriques/section-renderer";

type SectionDefinition = Extract<
  (typeof RUBRIQUE_REGISTRY)[number],
  { kind: "section" }
>;

function isSection(
  item: (typeof RUBRIQUE_REGISTRY)[number],
): item is SectionDefinition {
  return item.kind === "section";
}

function listFilesRecursively(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return listFilesRecursively(fullPath);
    }

    return [fullPath];
  });
}

describe("sections registry invariants", () => {
  it("keeps rubrique ids and routes unique", () => {
    const ids = RUBRIQUE_REGISTRY.map((item) => item.id);
    const routes = RUBRIQUE_REGISTRY.map((item) => item.route);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("keeps section routes aligned with section ids", () => {
    const sections = RUBRIQUE_REGISTRY.filter(isSection);

    for (const section of sections) {
      expect(section.route).toBe(`/sections/${section.id}`);
      expect(isSectionRouteEnabled(section.id)).toBe(section.availability === "available");
    }
  });

  it("requires an explicit anonymous presentation for every available finalized section", () => {
    const sections = RUBRIQUE_REGISTRY.filter(
      (item): item is SectionDefinition =>
        isSection(item) &&
        item.availability === "available" &&
        item.implementation === "finalized",
    );

    for (const section of sections) {
      expect(
        Object.prototype.hasOwnProperty.call(section, "anonymousPresentation"),
      ).toBe(true);
      expect(["visible", "blur", "disabled"]).toContain(
        section.anonymousPresentation,
      );
    }

    const byId = new Map(sections.map((section) => [section.id, section]));
    expect(byId.get("community")?.anonymousPresentation).toBe("visible");
    expect(byId.get("annuaire")?.anonymousPresentation).toBe("visible");
    expect(byId.get("gamification")?.anonymousPresentation).toBe("disabled");
    expect(byId.get("elus")?.anonymousPresentation).toBe("disabled");
    expect(byId.get("messagerie")?.anonymousPresentation).toBe("blur");
    expect(byId.get("trash-spotter")?.anonymousPresentation).toBe("blur");
  });

  it("keeps standalone app routes out of the section namespace", () => {
    const standaloneRoutes = RUBRIQUE_REGISTRY.filter(
      (item) => item.kind === "app-route",
    );

    for (const item of standaloneRoutes) {
      expect(item.route.startsWith("/sections/")).toBe(false);
    }
  });

  it("keeps the main impact and feedback routes in coherent categories", () => {
    const byId = new Map(RUBRIQUE_REGISTRY.map((item) => [item.id, item]));

    expect(byId.get("reports")?.categoryId).toBe("analysis");
    expect(byId.get("open-data")?.categoryId).toBe("analysis");
    expect(byId.get("feedback")?.categoryId).toBe("community");
  });

  it("exposes only enabled sections as route params", () => {
    const enabledSectionIds = RUBRIQUE_REGISTRY
      .filter((item) => item.kind === "section" && item.availability === "available")
      .map((item) => item.id)
      .sort();

    const paramsSectionIds = getSectionRouteParams()
      .map((item) => item.sectionId)
      .sort();

    expect(paramsSectionIds).toEqual(enabledSectionIds);
  });

  it("keeps the registry layer free from UI imports", () => {
    const registryFiles = listFilesRecursively(
      join(process.cwd(), "src/lib/sections-registry"),
    ).filter((file) =>
      /\.(ts|tsx)$/.test(file),
    );

    for (const file of registryFiles) {
      const content = readFileSync(file, "utf8");
      expect(content).not.toMatch(/from\s+["']react["']/);
      expect(content).not.toMatch(/from\s+["']@\/components\//);
      expect(content).not.toContain('"use client"');
    }
  });

  it("keeps a renderer entry for every finalized visible section", () => {
    const visibleFinalSectionIds = RUBRIQUE_REGISTRY
      .filter(
        (item) =>
          item.kind === "section" &&
          item.availability === "available" &&
          item.implementation === "finalized",
      )
      .map((item) => item.id)
      .sort();

    expect(Object.keys(FINALIZED_SECTION_RENDERERS).sort()).toEqual(
      visibleFinalSectionIds,
    );
  });
});
