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
    expect(primitiveSource).toContain("left: panelLeft");
    expect(primitiveSource).toContain('panelAlignment?: "center" | "start"');
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

  it("keeps reduced-mode navigation rows geometrically stable across hover and focus", () => {
    const sizeTheme = readSource("navigation/navigation-dropdown-size-theme.ts");
    const itemTone = readSource("navigation/navigation-dropdown-item-theme.ts");
    const borderTheme = readSource("navigation/navigation-dropdown-border-theme.ts");
    const helpText = readSource("navigation/navigation-dropdown-help-text.tsx");
    const itemCard = readSource("navigation/navigation-dropdown-item-card.tsx");
    const itemText = readSource("navigation/navigation-item-text.tsx");

    expect(sizeTheme).toContain("cmm-text-caption text-left leading-snug");
    expect(sizeTheme).toContain("py-1.5");
    expect(sizeTheme).not.toContain("text-[0.56rem]");
    expect(sizeTheme).not.toContain("italic");
    expect(sizeTheme).not.toContain("cmm-line-clamp-2");
    expect(sizeTheme).not.toContain("overflow-hidden whitespace-normal");
    expect(sizeTheme).not.toContain("whitespace-nowrap text-[0.86rem]");
    expect(sizeTheme).toContain("cmm-text-small");
    expect(sizeTheme).not.toContain("max-w-0");
    expect(sizeTheme).not.toContain("group-hover/item:font-semibold");
    expect(sizeTheme).not.toContain("group-hover/item:p-[1.5px]");
    expect(sizeTheme).not.toContain("group-hover/item:scale-[1.03]");
    expect(itemTone).not.toContain("group-hover/item:font-bold");
    expect(itemTone).not.toContain("group-hover/item:text-transparent");
    expect(borderTheme).not.toContain("group-hover/item:[stroke-width");
    expect(helpText).toContain("NAVIGATION_DROPDOWN_HELP_TEXT_CLASS_NAME");
    expect(itemCard).toContain("NavigationItemText");
    expect(itemText).toContain("cmm-text-small");
    expect(itemText).toContain("cmm-text-caption");
    expect(itemText).toContain("break-words");
    expect(itemText).toContain("whitespace-normal");
  });

  it("keeps item rendering and accents in the shared navigation renderer", () => {
    const content = readSource("navigation/navigation-dropdown-content.tsx");
    const iconResolver = readSource("navigation/navigation-dropdown-item-icon.ts");

    expect(content).toContain("NavigationDropdownItemCard");
    expect(content).toContain("getNavigationDropdownItemIcon");
    expect(content).toContain("getNavigationDropdownItemIconClassName");
    expect(content).toContain("getNavigationDropdownCardBorderTokens");
    expect(iconResolver).toContain('funding: HandCoins');
    expect(iconResolver).toContain('"rejoindre-une-action": UserPlus');
    expect(iconResolver).toContain("Missing navigation dropdown item icon");
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
