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
    const layoutSource = readFileSync(new URL("../../app/layout.tsx", import.meta.url), "utf8");

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
      "--cmm-ribbon-text-size",
      "--cmm-page-header-title-size",
      "--cmm-home-hero-title-size",
      "--cmm-home-impact-title-size",
      "--cmm-rubrique-card-padding",
      "--cmm-rubrique-card-icon-padding",
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
    expect(tokensCss).not.toContain("--cmm-ribbon-max-width");
    expect(layoutCss).toContain(".cmm-ribbon-frame");
    expect(layoutCss).toMatch(
      /\.cmm-ribbon-frame\s*\{[\s\S]*?width:\s*100%\s*;[\s\S]*?margin-inline:\s*0\s*;/,
    );
    const ribbonFrameBlock = layoutCss.match(/\.cmm-ribbon-frame\s*\{[^}]*\}/)?.[0] ?? "";
    expect(ribbonFrameBlock).not.toMatch(
      /(?:cmm-grid-max-width|cmm-page-max-width|--cmm-ribbon-max-width)/,
    );
    expect(layoutCss).toContain(".cmm-page-width");
    expect(layoutCss).toContain("var(--cmm-page-max-width)");
    expect(layoutCss).toContain(".cmm-ribbon-text");
    expect(layoutCss).toContain("var(--cmm-ribbon-text-size)");
    expect(baseCss).not.toMatch(/html\s*\{[\s\S]*zoom\s*:/);
    expect(baseCss).not.toMatch(/font-size\s*:\s*80%/);
    expect(layoutSource).toContain('data-cmm-density="compact"');
    expect(tokensCss).toMatch(/html\[data-cmm-density="compact"\]/);
    expect(tokensCss).toContain("--cmm-density-factor: 0.8;");
    expect(tokensCss).toContain("--text-body: 1rem");
    expect(tokensCss).toContain("--text-caption: 0.75rem");

    const homepageSource = readFileSync(new URL("../../app/page.tsx", import.meta.url), "utf8");
    expect(homepageSource).not.toContain("[zoom:");
  });
});
