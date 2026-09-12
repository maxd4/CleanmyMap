import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./app-navigation-block-dropdown.tsx", import.meta.url), "utf8");
const displayModes = readFileSync(
  new URL("../../styles/display-modes.css", import.meta.url),
  "utf8",
);

describe("app navigation block dropdown contract", () => {
  it("uses one close-aware navigation callback for all five blocks", () => {
    expect(source).toContain("onTrackNavigation={handleTrackNavigation}");
    expect(source.match(/onTrackNavigation=\{handleTrackNavigation\}/g)).toHaveLength(5);
    expect(source).not.toContain("onTrackNavigation={onTrackNavigation}");
    expect(source).toContain("setIsOpen(false);");
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

  it("uses stable Lucide block triggers instead of platform-dependent emoji", () => {
    expect(source).toContain("CmmIcon");
    expect(source).toContain("data-navigation-block-trigger");
    expect(source).toContain("return House");
    expect(source).toContain("return Zap");
    expect(source).toContain("return Map");
    expect(source).toContain("return Users");
    expect(source).toContain("return BookOpen");
    expect(source).not.toContain("space.icon");
    expect(source).not.toMatch(/[🏠⚡🗺️🤝📚]/u);
  });

  it("keeps block hover accents local and reserves the trigger border", () => {
    expect(source).toContain("buildNavigationBlockTriggerStyle(space.id)");
    expect(source).toContain("border border-transparent");
    expect(source).toContain("data-navigation-block-trigger");
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

  it("keeps sober hover neutral while preserving visible focus", () => {
    expect(displayModes).toContain(
      '[data-display-mode="sobre"] [data-navigation-block-trigger]:hover',
    );
    expect(displayModes).toContain("border-color: var(--border-default) !important;");
    expect(displayModes).toContain(
      '[data-display-mode="sobre"] [data-navigation-block-trigger]:focus-visible',
    );
    expect(displayModes).toContain("outline: 2px solid var(--text-primary);");
    expect(displayModes).toContain("box-shadow: none !important;");
  });

  it("does not pass unused ribbon chrome into the block dropdown", () => {
    expect(source).not.toContain("ribbonChrome");
  });
});
