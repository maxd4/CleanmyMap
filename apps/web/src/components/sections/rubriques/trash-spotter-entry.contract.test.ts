import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(`${root}/src/${relativePath}`, "utf8");

describe("Trash Spotter observation entry", () => {
  it("uses the shared observation form instead of a second section form", () => {
    const section = read("components/sections/rubriques/trash-spotter-section.tsx");
    const legacyComponents = read("components/sections/rubriques/trash-spotter-components.tsx");

    expect(section).toContain("TrashSpotterObservationForm");
    expect(section).not.toContain("<SpotterForm");
    expect(legacyComponents).not.toContain("export const SpotterForm");
  });

  it("keeps the two observation states in the canonical form", () => {
    const form = read("components/actions/quick-signalement-form.tsx");

    expect(form).toContain('setRecordType("spot")');
    expect(form).toContain('setRecordType("clean_place")');
    expect(form).toContain("Les catégories déchets sont désactivées");
    expect(form).toContain("createAction");
    expect(form).toContain("buildQuickSignalementPayload");
  });
});
