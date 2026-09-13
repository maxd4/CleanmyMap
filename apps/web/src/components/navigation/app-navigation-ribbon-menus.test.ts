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
    expect(source).toContain('w-[min(17rem,calc(100vw-1rem))]');
    expect(source).toContain('<SitePreferencesControls variant="compact" />');
    expect(source).toContain("compact");
    expect(source).toContain("Signaler un problème technique");
    expect(source).toContain("Proposer une idée ou suggestion");
    expect(source).toContain('label: "Nous contacter"');
    expect(source).not.toContain("Nous contacter pour travailler ensemble");
  });

  it("keeps the feedback compact treatment local to RibbonDropdownItem", () => {
    const source = readSource("ribbon-dropdown-item.tsx");

    expect(source).toContain("compact?: boolean");
    expect(source).toContain("min-h-10 gap-1.5 px-1.5 py-1.5");
    expect(source).toContain("h-7 w-7");
    expect(source).toContain("whitespace-nowrap max-[320px]:whitespace-normal");
    expect(source).not.toContain("group-hover:translate-x-0.5");
  });

  it("keeps ribbon triggers icon-only below the desktop control breakpoint", () => {
    const menusSource = readSource("app-navigation-ribbon-menus.tsx");
    const treeSource = readSource("app-navigation-tree-menu.tsx");
    const accountSource = readSource("app-navigation-ribbon-account.tsx");
    const identitySource = readSource("../account/account-identity-chip.tsx");

    expect(menusSource).toContain("hidden text-sm font-semibold lg:inline");
    expect(menusSource).not.toContain("hidden text-sm font-semibold sm:inline");
    expect(treeSource).toContain("hidden cmm-text-caption font-bold uppercase tracking-[0.16em] lg:inline");
    expect(treeSource).not.toContain("tracking-[0.16em] sm:inline");
    expect(accountSource).toContain("<LogIn className=\"h-4 w-4 lg:hidden\"");
    expect(accountSource).toContain("<UserPlus className=\"h-4 w-4 lg:hidden\"");
    expect(accountSource).not.toContain("active:scale-");
    expect(identitySource).toContain("h-11 min-h-11 w-11 min-w-11");
    expect(identitySource).toContain("hidden truncate text-sm font-bold lg:inline");
  });
});
