import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("homepage background contract", () => {
  it("keeps one vertical canvas for the public homepage sections", () => {
    const page = read("./page.tsx");
    const hero = read("../components/accueil/accueil-hero.tsx");
    const navigation = read("../components/accueil/accueil-navigation-schema.tsx");
    const community = read("../components/accueil/accueil-community-credibility.tsx");

    expect(page).toContain("data-homepage-canvas");
    expect(page).toMatch(/linear-gradient\(180deg/);
    expect(hero).toContain('data-homepage-section="hero"');
    expect(navigation).toContain('data-homepage-section="navigation"');
    expect(community).toContain('data-homepage-section="community-credibility"');
    expect(navigation).not.toContain("bg-[#fbfefd]");
    expect(community).not.toContain("bg-[radial-gradient");
  });
});
