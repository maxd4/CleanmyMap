import { describe, expect, it } from "vitest";
import {
  composeReportThemePrototype,
  REPORT_THEME_PROTOTYPE_BLOCK_IDS,
  REPORT_THEME_PROTOTYPE_FIXTURE,
  renderReportThemePrototypeHtml,
} from "./report-theme-prototype";

function extractAttributeValues(html: string, attribute: string): string[] {
  return [...html.matchAll(new RegExp(`${attribute}="([^"]*)"`, "g"))].map((match) => match[1] ?? "");
}

function extractBlockOrder(html: string): string[] {
  return extractAttributeValues(html, "data-report-block");
}

function normalizeComposition(html: string): string {
  return html
    .replace(/<style>[\s\S]*?<\/style>/, "<style />")
    .replace(/data-report-theme="(?:impact|scientific)"/, 'data-report-theme="same"');
}

describe("report theme prototype", () => {
  it("uses one stable composition for both visual themes", () => {
    const blocks = composeReportThemePrototype(REPORT_THEME_PROTOTYPE_FIXTURE);
    const impact = renderReportThemePrototypeHtml(REPORT_THEME_PROTOTYPE_FIXTURE, "impact");
    const scientific = renderReportThemePrototypeHtml(REPORT_THEME_PROTOTYPE_FIXTURE, "scientific");

    expect(blocks.map((block) => block.id)).toEqual(REPORT_THEME_PROTOTYPE_BLOCK_IDS);
    expect(extractBlockOrder(impact)).toEqual(REPORT_THEME_PROTOTYPE_BLOCK_IDS);
    expect(extractBlockOrder(scientific)).toEqual(REPORT_THEME_PROTOTYPE_BLOCK_IDS);
    expect(normalizeComposition(impact)).toBe(normalizeComposition(scientific));
    expect(impact).not.toBe(scientific);
  });

  it("keeps values, units, detail level and modules identical", () => {
    const impact = renderReportThemePrototypeHtml(REPORT_THEME_PROTOTYPE_FIXTURE, "impact");
    const scientific = renderReportThemePrototypeHtml(REPORT_THEME_PROTOTYPE_FIXTURE, "scientific");

    expect(extractAttributeValues(impact, "data-report-value")).toEqual(
      extractAttributeValues(scientific, "data-report-value"),
    );
    expect(extractAttributeValues(impact, "data-report-unit")).toEqual(
      extractAttributeValues(scientific, "data-report-unit"),
    );
    expect(impact).toContain('data-detail-level="default"');
    expect(scientific).toContain('data-detail-level="default"');
    expect(impact).toContain('data-modules="{&quot;dataAndCartography&quot;:true,&quot;transparencyAndMethods&quot;:true,&quot;rawData&quot;:true,&quot;detailedFiles&quot;:false}"');
    expect(scientific).toContain('data-modules="{&quot;dataAndCartography&quot;:true,&quot;transparencyAndMethods&quot;:true,&quot;rawData&quot;:true,&quot;detailedFiles&quot;:false}"');
    expect(impact).toContain("0 signalement");
    expect(impact).toContain("Inconnu (m²)");
    expect(impact).toContain("Figure 01");
    expect(impact).toContain("Tableau 01");
  });

  it("keeps the A4 reference and produces a visible theme difference", () => {
    const impact = renderReportThemePrototypeHtml(REPORT_THEME_PROTOTYPE_FIXTURE, "impact");
    const scientific = renderReportThemePrototypeHtml(REPORT_THEME_PROTOTYPE_FIXTURE, "scientific");

    expect(impact).toContain("@page { size: A4 portrait;");
    expect(scientific).toContain("@page { size: A4 portrait;");
    expect(impact).toContain('data-report-theme="impact"');
    expect(scientific).toContain('data-report-theme="scientific"');
    expect(impact).toContain("linear-gradient");
    expect(scientific).not.toContain("linear-gradient(135deg, #FFFFFF");
    expect(impact).not.toContain("<img");
    expect(scientific).not.toContain("<img");
  });
});
