import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CmmPageLayout, CmmSectionGroup } from "./cmm-section";

describe("canonical page layout primitives", () => {
  it("renders the canonical page shell and section rhythm classes", () => {
    const markup = renderToStaticMarkup(
      <CmmPageLayout>
        <h1>Page</h1>
        <CmmSectionGroup>
          <section>First</section>
          <section>Second</section>
        </CmmSectionGroup>
      </CmmPageLayout>,
    );

    expect(markup).toContain('class="cmm-page-layout"');
    expect(markup).toContain('class="cmm-section-group"');
  });

  it("does not expose structural variants from the primitive API", () => {
    const source = readFileSync(new URL("./cmm-section.tsx", import.meta.url), "utf8");

    expect(source).not.toMatch(/(?:maxWidth|padding|spacing)\??\s*:/);
    expect(source).not.toContain('"space-y-');
    expect(source).not.toContain('"max-w-');
  });

  it("keeps page geometry in shared tokens for every display mode", () => {
    const globalsCss = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
    const tokensCss = readFileSync(new URL("../../styles/tokens.css", import.meta.url), "utf8");
    const layoutCss = readFileSync(new URL("../../styles/layout.css", import.meta.url), "utf8");
    const baseCss = readFileSync(new URL("../../styles/base.css", import.meta.url), "utf8");
    const displayModesCss = readFileSync(
      new URL("../../styles/display-modes.css", import.meta.url),
      "utf8",
    );

    expect(globalsCss).toContain('@import "../styles/tokens.css";');
    expect(globalsCss).toContain('@import "../styles/display-modes.css";');

    for (const token of [
      "--cmm-page-max-width",
      "--cmm-page-gutter-mobile",
      "--cmm-page-gutter-tablet",
      "--cmm-page-gutter-desktop",
      "--cmm-page-padding-block",
      "--cmm-page-header-content-gap",
      "--cmm-section-gap",
      "--cmm-content-group-gap",
      "--cmm-ribbon-max-width",
      "--cmm-ribbon-text-size",
    ]) {
      expect(tokensCss).toContain(token);
    }

    const displayModeBlocks =
      displayModesCss.match(/\[data-display-mode=[^\]]+\][^{]*\{[^}]*\}/g) ?? [];
    expect(displayModeBlocks.join("\n")).not.toContain("--cmm-page-");

    expect(tokensCss).toMatch(/--cmm-grid-max-width:\s*90rem\s*;/);
    expect(tokensCss).toMatch(/--cmm-page-max-width:\s*112rem\s*;/);
    expect(tokensCss).not.toMatch(
      /--cmm-page-max-width:\s*var\(--cmm-grid-max-width\)\s*;/,
    );
    expect(tokensCss).toMatch(
      /--cmm-ribbon-max-width:\s*var\(--cmm-page-max-width\)\s*;/,
    );
    expect(layoutCss).toContain(".cmm-ribbon-frame");
    expect(layoutCss).toContain("var(--cmm-ribbon-max-width)");
    expect(layoutCss).toContain(".cmm-page-width");
    expect(layoutCss).toContain("var(--cmm-page-max-width)");
    expect(layoutCss).toContain(".cmm-ribbon-text");
    expect(layoutCss).toContain("var(--cmm-ribbon-text-size)");
    expect(baseCss).toMatch(/html\s*\{[\s\S]*zoom:\s*80%\s*;/);
    expect(baseCss).toMatch(
      /@supports not \(zoom:\s*1\)[\s\S]*font-size:\s*80%\s*;/,
    );
  });
});
