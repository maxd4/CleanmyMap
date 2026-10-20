import { describe, expect, it } from "vitest";
import { buildOfficialReportCss, getReportPdfThemeTokens } from "./report-pdf-theme";

describe("official report theme readability", () => {
  it.each(["impact", "scientific"] as const)(
    "keeps hero text and hero data readable for the %s theme",
    (theme) => {
      const css = buildOfficialReportCss(theme);
      const tokens = getReportPdfThemeTokens(theme);

      expect(css).toContain(
        `.cmm-web-hero__left .cmm-web-header__title,\n    .cmm-web-hero__left .cmm-web-header__subtitle {\n      color: ${tokens.accentForeground};`,
      );
      expect(css).toContain(`.cmm-web-hero__left .cmm-callout {\n      color: ${tokens.ink};`);
      expect(css).toContain(`.cmm-web-hero__left .cmm-table-wrap {\n      background: ${tokens.white};`);
      expect(css).toContain("@page { size: A4 portrait;");
    },
  );
});
