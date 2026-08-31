import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DISPLAY_MODES,
  ENABLED_DISPLAY_MODES,
  parseDisplayMode,
} from "./preferences";

const globalsCss = readFileSync(
  resolve(process.cwd(), "src/app/globals.css"),
  "utf8",
);
const tokensCss = readFileSync(
  resolve(process.cwd(), "src/styles/tokens.css"),
  "utf8",
);
const displayModesCss = readFileSync(
  resolve(process.cwd(), "src/styles/display-modes.css"),
  "utf8",
);
const baseCss = readFileSync(resolve(process.cwd(), "src/styles/base.css"), "utf8");
const providerSource = readFileSync(
  resolve(process.cwd(), "src/components/ui/site-preferences-provider.tsx"),
  "utf8",
);

describe("display mode preferences", () => {
  it("enables all declared display modes", () => {
    expect(DISPLAY_MODES).toEqual(["exhaustif", "minimaliste", "sobre"]);
    expect(ENABLED_DISPLAY_MODES).toEqual(["exhaustif", "minimaliste", "sobre"]);
  });

  it("parses all enabled modes and falls back for unknown values", () => {
    expect(parseDisplayMode("exhaustif")).toBe("exhaustif");
    expect(parseDisplayMode("minimaliste")).toBe("minimaliste");
    expect(parseDisplayMode("sobre")).toBe("sobre");
    expect(parseDisplayMode("unknown")).toBe("exhaustif");
    expect(parseDisplayMode(null)).toBe("exhaustif");
  });

  it("applies the selected mode globally through data-display-mode", () => {
    expect(providerSource).toContain(
      'document.documentElement.setAttribute("data-display-mode", displayMode);',
    );
    expect(displayModesCss).toContain('[data-display-mode="minimaliste"]');
    expect(displayModesCss).toContain('[data-display-mode="sobre"]');
    expect(baseCss).toContain("font-family: var(--font-base);");
    expect(globalsCss).toContain('@import "../styles/display-modes.css";');
    expect(globalsCss).toContain('@import "../styles/base.css";');
  });

  it("keeps the three visual mode contracts in global CSS", () => {
    expect(displayModesCss).toMatch(
      /\[data-display-mode="minimaliste"\]\s*\{[\s\S]*?--shadow-elevated:\s*var\(--shadow-soft\);[\s\S]*?--glass-blur:\s*none;/,
    );
    expect(displayModesCss).toMatch(
      /\[data-display-mode="sobre"\]\s*\{[\s\S]*?--shadow-soft:\s*none;[\s\S]*?--glass-blur:\s*none;/,
    );
  });

  it("uses one global local system stack for sober mode", () => {
    const soberStack =
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif';

    expect(tokensCss).toContain(`--font-sober: ${soberStack};`);
    expect(displayModesCss).toMatch(
      /\[data-display-mode="sobre"\]\s*\{[\s\S]*?--font-base:\s*var\(--font-sober\);[\s\S]*?--font-sans:\s*var\(--font-sober\);/,
    );
    expect(baseCss).toContain("font-family: var(--font-base);");
    expect(`${tokensCss}\n${displayModesCss}\n${baseCss}`).not.toMatch(
      /@font-face|fonts\.googleapis|@import\s+url/,
    );
  });
});
