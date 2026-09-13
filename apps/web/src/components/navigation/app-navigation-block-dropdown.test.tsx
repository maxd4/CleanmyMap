import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getNavigationBlockTriggerStateClassName,
  resolveOpenNavigationSpaceId,
} from "./navigation-block-trigger-state";

const source = readFileSync(new URL("./app-navigation-block-dropdown.tsx", import.meta.url), "utf8");
const shellSource = readFileSync(new URL("./app-navigation-ribbon-shell.tsx", import.meta.url), "utf8");
const displayModes = readFileSync(
  new URL("../../styles/display-modes.css", import.meta.url),
  "utf8",
);

describe("app navigation block dropdown contract", () => {
  it("uses one close-aware navigation callback through the common renderer", () => {
    expect(source).toContain("onTrackNavigation={handleTrackNavigation}");
    expect(source.match(/onTrackNavigation=\{handleTrackNavigation\}/g)).toHaveLength(1);
    expect(source).toContain("<NavigationDropdownContent");
    expect(source).not.toContain("onTrackNavigation={onTrackNavigation}");
    expect(source).toContain("onOpenChange(space.id, false);");
  });

  it("uses the shared non-menu navigation semantics and one gap contract", () => {
    expect(source).toContain("triggerHasPopup={null}");
    expect(source).not.toContain('aria-haspopup="menu"');
    expect(source).not.toContain("mt-2");
    expect(source).not.toContain("0.75rem");
    expect(source).toContain("DEFAULT_DROPDOWN_VERTICAL_GAP_PX");
    expect(source).toContain("NAVIGATION_DROPDOWN_HOVER_CLOSE_DELAY_MS");
    expect(source).not.toContain("framer-motion");
    expect(source).not.toContain("AnimatePresence");
  });

  it("keeps exhaustive block icons distinct from reduced-mode Lucide icons", () => {
    expect(source).toContain("CmmIcon");
    expect(source).toContain("data-navigation-block-trigger");
    expect(source).toContain('displayMode === "exhaustif"');
    expect(source).toContain("{space.icon}");
    expect(source).toContain("getNavigationBlockIcon(space.id)");
    expect(source).toContain("return House");
    expect(source).toContain("return Zap");
    expect(source).toContain("return Map");
    expect(source).toContain("return Users");
    expect(source).toContain("return BookOpen");
    expect(source).not.toMatch(/[🏠⚡🗺️🤝📚]/u);
  });

  it("keeps block hover accents local and reserves the trigger border", () => {
    expect(source).toContain("buildNavigationBlockTriggerStyle(space.id)");
    expect(source).toContain("border border-transparent");
    expect(source).toContain("data-navigation-block-trigger");
    expect(source).not.toContain('"group inline-flex');
    expect(source).not.toContain("motion-safe:transition-colors");
    expect(displayModes).toContain(
      '[data-display-mode="minimaliste"] [data-navigation-block-trigger]:hover',
    );
    expect(displayModes).toContain("border-color: var(--navigation-block-accent);");
    expect(displayModes).not.toContain(
      '[data-navigation-block-trigger] ~ [data-navigation-block-trigger]',
    );
    expect(displayModes).not.toContain(".group:hover [data-navigation-block-trigger]");

    const minimalHoverRule = displayModes.match(
      /\[data-display-mode="minimaliste"\] \[data-navigation-block-trigger\]:hover\s*\{([^}]*)\}/u,
    )?.[1] ?? "";
    expect(minimalHoverRule).toContain("border-color");
    expect(minimalHoverRule).not.toMatch(/(?:width|height|padding|transform|box-shadow)/u);
  });

  it("isolates hover/open illumination and keeps only one block open", () => {
    const activeState = getNavigationBlockTriggerStateClassName({
      isActiveSpace: true,
      isOpen: false,
    });
    const neutralState = getNavigationBlockTriggerStateClassName({
      isActiveSpace: false,
      isOpen: false,
    });
    const openState = getNavigationBlockTriggerStateClassName({
      isActiveSpace: false,
      isOpen: true,
    });

    expect(activeState).toContain("bg-white/[0.08]");
    expect(activeState).not.toContain("bg-white/[0.16]");
    expect(neutralState).toContain("hover:bg-white/[0.16]");
    expect(openState).toContain("bg-white/[0.16]");

    expect(resolveOpenNavigationSpaceId("network", "learn", true)).toBe("learn");
    expect(resolveOpenNavigationSpaceId("learn", "network", false)).toBe("learn");
    expect(resolveOpenNavigationSpaceId("network", "network", false)).toBeNull();

    expect(shellSource).toContain("openSpaceId");
    expect(shellSource).toContain("open={openSpaceId === space.id}");
    expect(shellSource).toContain("resolveOpenNavigationSpaceId");
    expect(source).not.toMatch(/\[data-navigation-block-trigger\][^\n]*~/u);
    expect(source).not.toContain(".group:hover [data-navigation-block-trigger]");
    expect(displayModes).not.toContain(
      '[data-navigation-block-trigger] ~ [data-navigation-block-trigger]',
    );
    expect(displayModes).not.toContain(".group:hover [data-navigation-block-trigger]");
  });

  it("keeps sober hover neutral while preserving visible focus", () => {
    expect(displayModes).toContain(
      '[data-display-mode="sobre"] [data-navigation-block-trigger]:hover',
    );
    expect(displayModes).toContain("border-color: var(--border-default) !important;");
    expect(displayModes).toContain(
      '[data-display-mode="sobre"] [data-navigation-block-trigger]:focus-visible',
    );
    expect(displayModes).toContain(
      "background-color: color-mix(in srgb, var(--bg-elevated) 24%, transparent);",
    );
    expect(displayModes).not.toContain("outline: 2px solid var(--text-inverse);");
    expect(displayModes).toContain("box-shadow: none !important;");
  });

  it("uses one neutral focus ring instead of a blue trigger contour", () => {
    expect(source).toContain("focus-visible:outline-none");
    expect(source).toContain("focus-visible:ring-0");
    expect(source).toContain("focus-visible:bg-white/10");
    expect(source).not.toContain("focus-visible:outline-white");
    expect(source).not.toContain("focus-visible:ring-white/80");
    expect(source).not.toContain("focus-visible:ring-cyan-300/40");
  });

  it("does not pass unused ribbon chrome into the block dropdown", () => {
    expect(source).not.toContain("ribbonChrome");
  });
});
