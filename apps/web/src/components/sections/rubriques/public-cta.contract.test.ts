import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(new URL(`./${relativePath}`, import.meta.url), "utf8");

describe("public rubrique CTA contracts", () => {
  it("routes the full compost-bin report CTA to the canonical signalement entry", () => {
    const compostSection = read("compost/compost-section.tsx");

    expect(compostSection).toContain(
      '<CmmButton href="/signalement" tone="primary" variant="pill"',
    );
    expect(compostSection).not.toContain('type="button" tone="primary"');
  });

  it("keeps the recycling stream label informational until a canonical search exists", () => {
    const recyclingSection = read("recycling-section.tsx");

    expect(recyclingSection).toContain("Rechercher une filière");
    expect(recyclingSection).not.toContain("cursor-pointer");
    expect(recyclingSection).not.toContain("group/search");
    expect(recyclingSection).not.toContain("group-hover/search");
  });
});
