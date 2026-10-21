import {
  DEFAULT_REPORT_PDF_THEME,
  getReportPdfThemeTokens,
  reportPdfPage,
  reportPdfSpacing,
  reportPdfTypography,
  type ReportPdfTheme,
} from "./report-pdf-theme.tokens";
import { buildReportHeaderCss, buildReportHeroCss } from "./report-pdf-theme-hero";
import {
  buildReportDocumentFrameCss,
  buildReportSectionsAndCalloutsCss,
  buildReportTablesAndFooterCss,
  buildReportSectionChromeCss,
} from "./report-pdf-theme-content";
import { buildPageAndTypographyCss, buildReportLayoutCss } from "./report-pdf-theme-page";
import { buildReportPrintCss } from "./report-pdf-theme-print";

export {
  DEFAULT_REPORT_PDF_THEME,
  getReportPdfThemeTokens,
  REPORT_PDF_THEME_OPTIONS,
  reportPdfColors,
} from "./report-pdf-theme.tokens";
export type {
  ReportPdfTheme,
} from "./report-pdf-theme.tokens";

export function buildOfficialReportCss(theme: ReportPdfTheme = DEFAULT_REPORT_PDF_THEME): string {
  const tokens = getReportPdfThemeTokens(theme);

  return [
    buildPageAndTypographyCss(tokens, reportPdfTypography, reportPdfSpacing, reportPdfPage),
    buildReportHeaderCss(tokens, reportPdfTypography),
    buildReportLayoutCss(tokens, reportPdfTypography),
    `    ${buildReportHeroCss(tokens, reportPdfTypography)}\n`,
    buildReportSectionChromeCss(tokens, reportPdfTypography),
    buildReportDocumentFrameCss(
      tokens,
      reportPdfTypography,
      reportPdfSpacing,
      reportPdfPage,
    ),
    buildReportSectionsAndCalloutsCss(tokens, reportPdfTypography, reportPdfSpacing),
    buildReportTablesAndFooterCss(tokens, reportPdfTypography),
    `${buildReportPrintCss(tokens)}  `,
  ].join("");
}
