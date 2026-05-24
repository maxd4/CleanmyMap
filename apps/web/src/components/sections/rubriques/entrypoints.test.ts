import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const packageRoot = existsSync(join(process.cwd(), "src"))
  ? process.cwd()
  : join(process.cwd(), "apps/web");

const rubriquesRoot = join(packageRoot, "src/components/sections/rubriques");
const rendererPath = join(rubriquesRoot, "section-renderer.tsx");
const recyclingSectionPath = join(rubriquesRoot, "recycling-section.tsx");

const complexEntrypoints = [
  join(rubriquesRoot, "community", "index.tsx"),
  join(rubriquesRoot, "annuaire", "index.tsx"),
  join(rubriquesRoot, "feedback", "index.ts"),
  join(rubriquesRoot, "route", "index.tsx"),
  join(rubriquesRoot, "recycling-question-assistant", "index.tsx"),
  join(rubriquesRoot, "gamification", "index.tsx"),
];

describe("rubrique entrypoints", () => {
  it("exposes one public entrypoint per complex rubrique", () => {
    for (const entrypoint of complexEntrypoints) {
      expect(existsSync(entrypoint)).toBe(true);
    }
  });

  it("routes the renderer through folder-level entrypoints", () => {
    const renderer = readFileSync(rendererPath, "utf8");

    expect(renderer).toContain('from "./community"');
    expect(renderer).toContain('from "./annuaire"');
    expect(renderer).toContain('from "./feedback"');
    expect(renderer).toContain('from "./route"');
    expect(renderer).toContain('from "./gamification"');
    expect(renderer).toContain('from "./actors-section"');
    expect(renderer).not.toContain('from "./community-section"');
    expect(renderer).not.toContain('from "./annuaire-section"');
    expect(renderer).not.toContain('from "./feedback-section"');
    expect(renderer).not.toContain('from "./route-section"');
    expect(renderer).not.toContain('from "./engagement-sections"');
  });

  it("uses the explicit assistant entrypoint from recycling", () => {
    const recyclingSection = readFileSync(recyclingSectionPath, "utf8");
    expect(recyclingSection).toContain('from "./recycling-question-assistant/index"');
  });
});
