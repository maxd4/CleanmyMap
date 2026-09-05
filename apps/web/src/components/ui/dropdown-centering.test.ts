import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const navigationDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../navigation",
);
const sourceRoot = path.resolve(navigationDirectory, "..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(sourceRoot, relativePath), "utf8");
}

describe("dropdown centering contract", () => {
  it("centers every floating dropdown on its trigger axis", () => {
    const dropdownSources = [
      readSource("navigation/app-navigation-ribbon-menus.tsx"),
      readSource("navigation/app-navigation-tree-menu.tsx"),
      `${readSource("navigation/app-navigation-block-dropdown.tsx")}\n${readSource("navigation/navigation-dropdown-size-theme.ts")}`,
      readSource("navigation/notification-bell.tsx"),
      readSource("account/account-identity-chip.tsx"),
      readSource("actions/map/actions-map-export-button.tsx"),
    ];

    for (const source of dropdownSources) {
      expect(source).toContain("left-1/2");
      expect(source).toMatch(/(?:-translate-x-1\/2|x: \"-50%\")/);
    }
  });

  it("does not retain edge-alignment decisions in the shared placement hook", () => {
    const placementSource = readFileSync(
      path.join(sourceRoot, "ui/use-dropdown-placement.ts"),
      "utf8",
    );

    expect(placementSource).not.toContain("alignRight");
    expect(placementSource).not.toContain("minPanelWidth");
  });
});
