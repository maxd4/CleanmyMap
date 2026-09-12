import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function readSource(relativePath: string): string {
  return readFileSync(path.join(sourceRoot, relativePath), "utf8");
}

describe("dropdown centering contract", () => {
  it("keeps placement, dismissal, and centering in the shared primitive", () => {
    const primitiveSource = readSource("ui/cmm-dropdown.tsx");

    expect(primitiveSource).toContain("useDropdownPlacement");
    expect(primitiveSource).toContain("left: triggerCenter");
    expect(primitiveSource).toContain("-translate-x-1/2");
    expect(primitiveSource).toContain("Escape");
    expect(primitiveSource).toContain("pointerdown");
    expect(primitiveSource).toContain("height: `${verticalGap}px`");
    expect(primitiveSource).not.toContain("top-[calc(100%+0.75rem)]");
    expect(primitiveSource).not.toContain("bottom-[calc(100%+0.75rem)]");
  });

  it("keeps the block consumer free of local alignment and backdrop shells", () => {
    const blockSource = readSource("navigation/app-navigation-block-dropdown.tsx");

    expect(blockSource).toContain("CmmDropdown");
    expect(blockSource).not.toContain("left-1/2");
    expect(blockSource).not.toContain("-translate-x-1/2");
    expect(blockSource).not.toContain("fixed inset-0");
    expect(blockSource).not.toContain("mt-2");
    expect(blockSource).not.toContain("0.75rem");
  });

  it("keeps ribbon item styling and non-modal notification semantics canonical", () => {
    const ribbonMenus = readSource("navigation/app-navigation-ribbon-menus.tsx");
    const ribbonItem = readSource("navigation/ribbon-dropdown-item.tsx");
    const notificationBell = readSource("navigation/notification-bell.tsx");

    expect(ribbonMenus).toContain("RibbonDropdownItem");
    expect(ribbonMenus).not.toContain('tone="tertiary"');
    expect(ribbonMenus).not.toContain("title=");
    expect(ribbonItem).toContain("text-white");
    expect(ribbonItem).toContain("hover:bg-white/10");
    expect(ribbonItem).toContain("focus-visible:ring");
    expect(notificationBell).toContain('panelRole="region"');
    expect(notificationBell).not.toContain('role="dialog"');
    expect(notificationBell).not.toContain("aria-modal");
    expect(notificationBell).not.toContain("fixed inset-0");
  });

  it("removes redundant native tooltips from the ribbon controls", () => {
    const ribbonMenus = readSource("navigation/app-navigation-ribbon-menus.tsx");
    const ribbonAccount = readSource("navigation/app-navigation-ribbon-account.tsx");
    const globalSearch = readSource("navigation/global-search.tsx");

    expect(ribbonMenus).not.toContain('title="Réglages"');
    expect(ribbonMenus).not.toContain('title="Feedback"');
    expect(ribbonMenus).not.toContain("title=");
    expect(ribbonAccount).not.toContain("title={activityStatusLabel}");
    expect(globalSearch).not.toContain('title={`${placeholder} (Ctrl+K)`');
  });

  it("does not retain edge-alignment decisions in the placement hook", () => {
    const placementSource = readSource("ui/use-dropdown-placement.ts");

    expect(placementSource).not.toContain("alignRight");
    expect(placementSource).not.toContain("minPanelWidth");
  });

  it("keeps navigation rows geometrically stable across hover and focus", () => {
    const sizeTheme = readSource("navigation/navigation-dropdown-size-theme.ts");
    const itemTone = readSource("navigation/navigation-dropdown-item-theme.ts");
    const borderTheme = readSource("navigation/navigation-dropdown-border-theme.ts");
    const helpText = readSource("navigation/navigation-dropdown-help-text.tsx");

    expect(sizeTheme).toContain("w-[min(11rem,35%)]");
    expect(sizeTheme).not.toContain("max-w-0");
    expect(sizeTheme).not.toContain("group-hover/item:font-semibold");
    expect(sizeTheme).not.toContain("group-hover/item:p-[1.5px]");
    expect(sizeTheme).not.toContain("group-hover/item:scale-[1.03]");
    expect(itemTone).not.toContain("group-hover/item:font-bold");
    expect(itemTone).not.toContain("group-hover/item:text-transparent");
    expect(borderTheme).not.toContain("group-hover/item:[stroke-width");
    expect(helpText).toContain("NAVIGATION_DROPDOWN_HELP_TEXT_CLASS_NAME");
  });

  it("keeps all item accents in the shared theme helpers", () => {
    const home = readSource("navigation/app-navigation-block-dropdown-home.tsx");
    const act = readSource("navigation/app-navigation-block-dropdown-act.tsx");
    const network = readSource("navigation/app-navigation-block-dropdown-network.tsx");
    const learn = readSource("navigation/app-navigation-block-dropdown-learn.tsx");

    for (const source of [home, act, network, learn]) {
      expect(source).toContain("getNavigationDropdownItemIconClassName");
      expect(source).not.toContain("bg-gradient-to-br");
    }
    expect(network).not.toContain("getNetworkItemAccent");
  });

  it("keeps the dropdown surface compatible with minimal and sober modes", () => {
    const sizeTheme = readSource("navigation/navigation-dropdown-size-theme.ts");
    const displayModes = readSource("../styles/display-modes.css");

    expect(sizeTheme).toContain("cmm-minimal");
    expect(sizeTheme).toContain("cmm-sober");
    expect(displayModes).toContain(".cmm-navigation-dropdown-surface");
    expect(displayModes).toContain(".cmm-navigation-dropdown-item");
    expect(displayModes).toContain("prefers-reduced-motion");
  });
});
