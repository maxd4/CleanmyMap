import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const navigationSource = readFileSync(
  new URL("./app-navigation-block-dropdown.tsx", import.meta.url),
  "utf8",
);
const contentSource = readFileSync(
  new URL("./navigation-dropdown-content.tsx", import.meta.url),
  "utf8",
);
const cardThemeSource = readFileSync(
  new URL("./navigation-dropdown-card-theme.ts", import.meta.url),
  "utf8",
);

describe("navigation dropdown renderer contract", () => {
  it("routes every block through the common renderer and one item card", () => {
    expect(navigationSource).toContain('import { NavigationDropdownContent }');
    expect(navigationSource).toContain("<NavigationDropdownContent");
    expect(navigationSource).not.toContain("app-navigation-block-dropdown-home");
    expect(navigationSource).not.toContain("app-navigation-block-dropdown-act");
    expect(navigationSource).not.toContain("app-navigation-block-dropdown-network");
    expect(navigationSource).not.toContain("app-navigation-block-dropdown-learn");
    expect(navigationSource).not.toContain("getVisualizeItemIcon");
    expect(navigationSource).not.toContain("NavigationDropdownHelpText");
    expect(navigationSource).not.toContain("<Link");

    expect(contentSource).toContain("NavigationDropdownItemCard");
    expect(contentSource).toContain("getNavigationDropdownItemIconClassName");
    expect(contentSource).toContain("Aucune rubrique accessible pour ce bloc.");
    expect(contentSource).toContain("NAVIGATION_DROPDOWN_CARD_GEOMETRY");
    expect(cardThemeSource).toContain(
      "export const NAVIGATION_DROPDOWN_CARD_GEOMETRY",
    );
    expect(cardThemeSource).not.toContain("Record<NavigationBlockId");
  });

  it("does not keep the deleted block-specific renderers", () => {
    for (const block of ["home", "act", "network", "learn"]) {
      expect(
        existsSync(
          new URL(`./app-navigation-block-dropdown-${block}.tsx`, import.meta.url),
        ),
      ).toBe(false);
    }
  });
});
