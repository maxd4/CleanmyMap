import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const navigationDirectory = path.dirname(fileURLToPath(import.meta.url));

function readSource(fileName: string) {
  return fs.readFileSync(path.join(navigationDirectory, fileName), "utf8");
}

describe("top ribbon dropdown sizing contract", () => {
  it("keeps the role menu slightly narrower while preserving the viewport constraint", () => {
    const source = readSource("../account/account-identity-chip.tsx");

    expect(source).toContain('w-[min(16rem,calc(100vw-1rem))]');
    expect(source).toContain("account-role-menu-panel");
    expect(source).toContain("AccountEvolutionStatusLink");
  });

  it("uses compact viewport-safe widths for feedback and preferences", () => {
    const source = readSource("app-navigation-ribbon-menus.tsx");

    expect(source).toContain('w-[min(20rem,calc(100vw-1rem))]');
    expect(source).toContain('w-[min(18rem,calc(100vw-1rem))]');
    expect(source).toContain('<SitePreferencesControls variant="compact" />');
    expect(source).toContain("compact");
    expect(source).toContain("Signaler un problème technique");
    expect(source).toContain("Proposer une idée ou suggestion");
    expect(source).toContain("Nous contacter pour travailler ensemble");
  });

  it("keeps the feedback compact treatment local to RibbonDropdownItem", () => {
    const source = readSource("ribbon-dropdown-item.tsx");

    expect(source).toContain("compact?: boolean");
    expect(source).toContain("min-h-12 gap-2 px-2 py-2");
    expect(source).toContain("h-8 w-8");
    expect(source).not.toContain("group-hover:translate-x-0.5");
  });
});
