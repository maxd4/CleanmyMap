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
    const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

    for (const token of [
      "--cmm-page-max-width",
      "--cmm-page-gutter-mobile",
      "--cmm-page-gutter-tablet",
      "--cmm-page-gutter-desktop",
      "--cmm-page-padding-block",
      "--cmm-page-header-content-gap",
      "--cmm-section-gap",
      "--cmm-content-group-gap",
    ]) {
      expect(css).toContain(token);
    }

    const displayModeBlocks = css.match(/\[data-display-mode=[^\]]+\][^{]*\{[^}]*\}/g) ?? [];
    expect(displayModeBlocks.join("\n")).not.toContain("--cmm-page-");
  });
});
