import { describe, expect, it } from "vitest";
import {
  RUBRIQUE_REGISTRY,
  getSectionRouteParams,
  isSectionRouteEnabled,
} from "@/lib/sections-registry";

describe("sections registry invariants", () => {
  it("keeps rubrique ids and routes unique", () => {
    const ids = RUBRIQUE_REGISTRY.map((item) => item.id);
    const routes = RUBRIQUE_REGISTRY.map((item) => item.route);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("keeps section routes aligned with section ids", () => {
    const sections = RUBRIQUE_REGISTRY.filter((item) => item.kind === "section");

    for (const section of sections) {
      expect(section.route).toBe(`/sections/${section.id}`);
      expect(isSectionRouteEnabled(section.id)).toBe(section.availability === "available");
    }
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
});
