import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(`${root}/src/${relativePath}`, "utf8");

describe("waste UX registry wiring", () => {
  it("uses the shared selector in the targeted forms", () => {
    expect(read("components/actions/quick-signalement-form.tsx")).toContain("WasteCategorySelector");
    expect(read("components/sections/rubriques/trash-spotter-components.tsx")).toContain("WasteCategorySelector");
    expect(read("components/actions/action-before-declaration-form.tsx")).toContain("WasteCategorySelector");
    expect(read("components/actions/action-declaration/sections/harvest-waste-section.tsx")).toContain("WasteCategorySelector");
  });

  it("does not retain the former local quick-report category catalog", () => {
    const quickForm = read("components/actions/quick-signalement-form.tsx");
    expect(quickForm).not.toContain("const WASTE_TYPES");
    expect(quickForm).not.toContain('id: "megots"');
    expect(quickForm).not.toContain('id: "plastique"');
    expect(quickForm).not.toContain('id: "mixte"');
  });

  it("keeps Quick Signalement state selection and clean-place category isolation explicit", () => {
    const quickForm = read("components/actions/quick-signalement-form.tsx");
    expect(quickForm).toContain("État observé du lieu");
    expect(quickForm).toContain('setRecordType("clean_place")');
    expect(quickForm).toContain("Les catégories déchets sont désactivées");
    expect(quickForm).toContain("buildQuickSignalementPayload");
  });

  it("keeps the storage boundary explicit", () => {
    expect(read("components/actions/action-declaration/payload.ts")).toContain("expectedWasteCategories");
    expect(read("components/sections/rubriques/use-trash-spotter.ts")).toContain("appendWasteCategoriesToNotes");
  });

  it("keeps the selector usable on narrow and wide layouts", () => {
    const selector = read("components/waste/waste-category-selector.tsx");
    expect(selector).toContain("min-h-12");
    expect(selector).toContain("sm:grid-cols-2");
    expect(selector).toContain("focus-visible:ring-2");
  });
});
